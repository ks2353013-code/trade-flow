const path = require("node:path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const { connectDB, isMongoConnected } = require("../config/db");
const { getBusinessVerificationReadiness } = require("../services/businessVerificationReadiness");

function isDryRunEmail() {
  return !(
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS &&
    (process.env.EMAIL_HOST || process.env.SMTP_HOST)
  );
}

function stagingDatabaseAcknowledged() {
  if (process.env.BUSINESS_VERIFICATION_STAGING_MONGO_CONFIRMED !== "true") return false;
  if (!process.env.MONGO_URI) return false;
  if (
    process.env.PRODUCTION_MONGO_URI &&
    process.env.PRODUCTION_MONGO_URI === process.env.MONGO_URI
  ) return false;
  return true;
}

async function main() {
  const environmentOk = process.env.TRADEFLOW_ENVIRONMENT === "staging";
  const mongoIsolation = stagingDatabaseAcknowledged();
  const emailDryRun = isDryRunEmail();
  const schedulersDisabled = process.env.ENABLE_SCHEDULERS !== "true";
  let mongoConnected = false;

  if (environmentOk && mongoIsolation) {
    mongoConnected = Boolean(await connectDB()) && isMongoConnected();
  }

  const verification = await getBusinessVerificationReadiness({ live: true });
  const result = {
    ready:
      environmentOk &&
      mongoIsolation &&
      mongoConnected &&
      emailDryRun &&
      schedulersDisabled &&
      verification.ready,
    environment: environmentOk ? "staging" : "invalid",
    mongo: {
      isolated: mongoIsolation,
      connected: mongoConnected
    },
    businessVerification: verification,
    emailMode: emailDryRun ? "dry-run" : "external-enabled",
    schedulers: schedulersDisabled ? "disabled" : "enabled"
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
