"use strict";

const path = require("node:path");

require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const { getBusinessVerificationReadiness } = require("../services/businessVerificationReadiness");
const {
  EXPECTED_PRODUCTION_DATABASE,
  configuredDatabaseName,
  validateProductionRuntimeConfiguration
} = require("../services/productionReadinessConfiguration");

const MONGO_TIMEOUT_MS = 4000;
const DISCONNECT_TIMEOUT_MS = 500;

async function connectProductionMongo() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      connectTimeoutMS: MONGO_TIMEOUT_MS,
      serverSelectionTimeoutMS: MONGO_TIMEOUT_MS,
      socketTimeoutMS: MONGO_TIMEOUT_MS
    });
    return mongoose.connection.readyState === 1;
  } catch {
    return false;
  }
}

async function disconnectProductionMongo() {
  if (!mongoose.connection.readyState) return;
  let timer;
  await Promise.race([
    mongoose.disconnect().catch(() => {}),
    new Promise((resolve) => {
      timer = setTimeout(resolve, DISCONNECT_TIMEOUT_MS);
      timer.unref?.();
    })
  ]).finally(() => clearTimeout(timer));
}

async function main() {
  const configuredDatabase = configuredDatabaseName();
  const environmentOk =
    String(process.env.NODE_ENV || "").toLowerCase() === "production" &&
    String(process.env.TRADEFLOW_ENVIRONMENT || "").toLowerCase() === "production";
  let mongoConnected = false;

  if (environmentOk && configuredDatabase === EXPECTED_PRODUCTION_DATABASE) {
    mongoConnected = await connectProductionMongo();
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
      runtime.resources.isolated &&
      securityServicesReady &&
      safeDisabledState,
    environment: runtime.environment,
    database: runtime.database,
    mongo: { connected: mongoConnected },
    resources: runtime.resources,
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
  return result;
}

async function runCli() {
  try {
    await main();
  } catch {
    console.error("Production readiness check failed without exposing configuration details");
    process.exitCode = 1;
  } finally {
    await disconnectProductionMongo();
  }
  process.exit(process.exitCode || 0);
}

if (require.main === module) runCli();

module.exports = {
  DISCONNECT_TIMEOUT_MS,
  MONGO_TIMEOUT_MS,
  connectProductionMongo,
  disconnectProductionMongo,
  main
};
