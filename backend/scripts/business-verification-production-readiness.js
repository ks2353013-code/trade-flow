"use strict";

const path = require("node:path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const { connectDB, isMongoConnected } = require("../config/db");
const { getBusinessVerificationReadiness } = require("../services/businessVerificationReadiness");
const {
  EXPECTED_PRODUCTION_DATABASE,
  configuredDatabaseName,
  validateProductionRuntimeConfiguration
} = require("../services/productionReadinessConfiguration");

async function main() {
  const configuredDatabase = configuredDatabaseName();
  const environmentOk =
    String(process.env.NODE_ENV || "").toLowerCase() === "production" &&
    String(process.env.TRADEFLOW_ENVIRONMENT || "").toLowerCase() === "production";
  let mongoConnected = false;

  if (environmentOk && configuredDatabase === EXPECTED_PRODUCTION_DATABASE) {
    mongoConnected = Boolean(await connectDB()) && isMongoConnected();
  }

  const runtime = validateProductionRuntimeConfiguration({
    activeDatabaseName: mongoConnected ? mongoose.connection.name : ""
  });
  const verification = await getBusinessVerificationReadiness({ live: true });
  const securityServicesReady = Boolean(
    verification.encryption?.ready &&
    verification.storage?.ready &&
    verification.storage?.private &&
    verification.storage?.durable &&
    verification.storage?.quarantine &&
    verification.scanner?.ready &&
    verification.scanner?.private &&
    verification.scanner?.failClosed
  );
  const safeDisabledState =
    !runtime.feature.enabled &&
    runtime.emailMode === "dry-run" &&
    !runtime.externalAutomation.enabled;

  const result = {
    readyForControlledActivation:
      runtime.environment === "production" &&
      runtime.database.isolated &&
      mongoConnected &&
      securityServicesReady &&
      safeDisabledState,
    environment: runtime.environment,
    database: runtime.database,
    mongo: { connected: mongoConnected },
    businessVerification: {
      enabled: runtime.feature.enabled,
      securityServicesReady,
      encryption: verification.encryption,
      storage: verification.storage,
      scanner: verification.scanner
    },
    emailMode: runtime.emailMode,
    externalAutomation: runtime.externalAutomation,
    safeDisabledState
  };

  console.log(JSON.stringify(result, null, 2));
  if (!result.readyForControlledActivation) process.exitCode = 1;
}

main()
  .catch(() => {
    console.error("Production readiness check failed without exposing configuration details");
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect().catch(() => {});
  });
