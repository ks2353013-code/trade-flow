const path = require("node:path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const { connectDB, isMongoConnected } = require("../config/db");
const { getBusinessVerificationReadiness } = require("../services/businessVerificationReadiness");
const {
  configuredDatabaseName,
  validateStagingRuntimeConfiguration
} = require("../services/stagingReadinessConfiguration");

function isDryRunEmail() {
  return !(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM
  );
}

async function main() {
  const environmentOk = process.env.TRADEFLOW_ENVIRONMENT === "staging";
  const configuredDatabase = configuredDatabaseName();
  const emailDryRun = isDryRunEmail();
  const schedulersDisabled = process.env.ENABLE_SCHEDULERS !== "true";
  let mongoConnected = false;

  if (environmentOk && configuredDatabase === "tradeflow_verification_staging") {
    mongoConnected = Boolean(await connectDB()) && isMongoConnected();
  }

  const runtime = validateStagingRuntimeConfiguration({
    activeDatabaseName: mongoConnected ? mongoose.connection.name : ""
  });

  const verification = await getBusinessVerificationReadiness({ live: true });
  const result = {
    ready:
      environmentOk &&
      runtime.database.isolated &&
      mongoConnected &&
      emailDryRun &&
      schedulersDisabled &&
      !runtime.externalAutomation.enabled &&
      verification.ready,
    environment: environmentOk ? "staging" : "invalid",
    database: runtime.database,
    mongo: { connected: mongoConnected },
    businessVerification: verification,
    emailMode: emailDryRun ? "dry-run" : "external-enabled",
    schedulers: schedulersDisabled ? "disabled" : "enabled",
    externalAutomation: runtime.externalAutomation
  };

  console.log(JSON.stringify(result, null, 2));
  if (!result.ready) process.exitCode = 1;
}

main()
  .catch(() => {
    console.error("Staging readiness check failed without exposing configuration details");
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect().catch(() => {});
  });
