"use strict";

const EXPECTED_PRODUCTION_DATABASE = "tradeflow_verification_production";
const EXPECTED_PRODUCTION_BUCKET = "tradeflow-verification-production";
const EXPECTED_PRODUCTION_CLAMAV_HOST = "tradeflow-verification-clamav-production";

const hasValue = (value) => typeof value === "string" && value.trim().length > 0;
const isEnabled = (value) => String(value || "").trim().toLowerCase() === "true";

function configuredDatabaseName(env = process.env) {
  if (!hasValue(env.MONGO_URI)) return "";
  try {
    return new URL(env.MONGO_URI).pathname.replace(/^\/+|\/+$/g, "");
  } catch {
    return "";
  }
}

function connectionIdentity(value) {
  if (!hasValue(value)) return null;
  try {
    const parsed = new URL(value);
    return { host: parsed.host.toLowerCase(), username: parsed.username };
  } catch {
    return null;
  }
}

function externalAutomationState(env = process.env) {
  const twilio = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"].some((name) => hasValue(env[name]));
  const whatsappConfigured = [
    "TWILIO_WHATSAPP_FROM",
    "WHATSAPP_FROM",
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID"
  ].some((name) => hasValue(env[name]));
  const callsConfigured = [
    "TWILIO_PHONE_NUMBER",
    "TWILIO_VOICE_FROM",
    "CALL_AUTOMATION_WEBHOOK_URL"
  ].some((name) => hasValue(env[name]));

  const whatsapp = isEnabled(env.ENABLE_WHATSAPP_AUTOMATION) || whatsappConfigured || twilio;
  const calls = isEnabled(env.ENABLE_CALL_AUTOMATION) || isEnabled(env.ENABLE_CALLS) || callsConfigured || twilio;
  const autonomousExecution = isEnabled(env.ENABLE_AUTONOMOUS_EXECUTION);
  const schedulers = isEnabled(env.ENABLE_SCHEDULERS) || isEnabled(env.ENABLE_AI_AUTONOMOUS_HTTP_SCHEDULER);
  const emailMode = String(env.EMAIL_MODE || env.EMAIL_DELIVERY_MODE || "").trim().toLowerCase();
  const liveEmail = isEnabled(env.ENABLE_EMAIL_AUTOMATION) ||
    (hasValue(emailMode) && emailMode !== "dry-run") ||
    [
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASS",
      "SMTP_FROM",
      "SMTP_EMAIL",
      "SMTP_PASSWORD",
      "EMAIL_USER",
      "EMAIL_PASS"
    ].some((name) => hasValue(env[name]));

  return {
    enabled: whatsapp || calls || autonomousExecution || schedulers || liveEmail,
    whatsapp,
    calls,
    autonomousExecution,
    schedulers,
    liveEmail
  };
}

function validateProductionRuntimeConfiguration({
  env = process.env,
  activeDatabaseName = ""
} = {}) {
  const configuredName = configuredDatabaseName(env);
  const productionEnvironment =
    String(env.NODE_ENV || "").toLowerCase() === "production" &&
    String(env.TRADEFLOW_ENVIRONMENT || "").toLowerCase() === "production";
  const databaseConfirmed = env.BUSINESS_VERIFICATION_PRODUCTION_MONGO_CONFIRMED === "true";
  const databaseUserConfirmed = env.BUSINESS_VERIFICATION_PRODUCTION_MONGO_USER_CONFIRMED === "true";
  const productionIdentity = connectionIdentity(env.MONGO_URI);
  const stagingIdentity = connectionIdentity(env.STAGING_MONGO_URI);
  const distinctFromStaging = !hasValue(env.STAGING_MONGO_URI) || Boolean(
    env.STAGING_MONGO_URI !== env.MONGO_URI &&
    productionIdentity &&
    stagingIdentity &&
    (productionIdentity.host !== stagingIdentity.host ||
      productionIdentity.username !== stagingIdentity.username)
  );
  const databaseIsolated =
    productionEnvironment &&
    databaseConfirmed &&
    databaseUserConfirmed &&
    configuredName === EXPECTED_PRODUCTION_DATABASE &&
    activeDatabaseName === EXPECTED_PRODUCTION_DATABASE &&
    distinctFromStaging;
  const automation = externalAutomationState(env);
  const featureEnabled = env.BUSINESS_VERIFICATION_ENABLED === "true";

  const storageIsolated =
    env.BUSINESS_VERIFICATION_STORAGE_DRIVER === "s3" &&
    env.BUSINESS_VERIFICATION_S3_BUCKET === EXPECTED_PRODUCTION_BUCKET &&
    env.BUSINESS_VERIFICATION_S3_PUBLIC_ACCESS_BLOCKED === "true" &&
    env.BUSINESS_VERIFICATION_PRODUCTION_STORAGE_CONFIRMED === "true";
  const scannerIsolated =
    env.BUSINESS_VERIFICATION_SCANNER_DRIVER === "clamav" &&
    env.BUSINESS_VERIFICATION_CLAMAV_HOST === EXPECTED_PRODUCTION_CLAMAV_HOST;
  const resourcesIsolated = productionEnvironment && storageIsolated && scannerIsolated;

  return {
    environment: productionEnvironment ? "production" : "invalid",
    database: {
      name: activeDatabaseName || configuredName,
      isolated: databaseIsolated,
      connected: activeDatabaseName === EXPECTED_PRODUCTION_DATABASE,
      userIsolated: databaseUserConfirmed && distinctFromStaging
    },
    resources: {
      isolated: resourcesIsolated,
      storage: { isolated: storageIsolated },
      scanner: { isolated: scannerIsolated }
    },
    externalAutomation: {
      enabled: automation.enabled,
      whatsapp: automation.whatsapp,
      calls: automation.calls,
      autonomousExecution: automation.autonomousExecution,
      schedulers: automation.schedulers
    },
    emailMode: automation.liveEmail ? "live" : "dry-run",
    feature: { enabled: featureEnabled }
  };
}

module.exports = {
  EXPECTED_PRODUCTION_BUCKET,
  EXPECTED_PRODUCTION_CLAMAV_HOST,
  EXPECTED_PRODUCTION_DATABASE,
  configuredDatabaseName,
  connectionIdentity,
  externalAutomationState,
  validateProductionRuntimeConfiguration
};
