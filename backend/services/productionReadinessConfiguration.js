"use strict";

const EXPECTED_PRODUCTION_DATABASE = "tradeflow_verification_production";

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
  const liveEmail = isEnabled(env.ENABLE_EMAIL_AUTOMATION) ||
    ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"].some((name) => hasValue(env[name]));

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
  const distinctFromStaging =
    !(hasValue(env.STAGING_MONGO_URI) && env.STAGING_MONGO_URI === env.MONGO_URI);
  const databaseIsolated =
    productionEnvironment &&
    databaseConfirmed &&
    configuredName === EXPECTED_PRODUCTION_DATABASE &&
    activeDatabaseName === EXPECTED_PRODUCTION_DATABASE &&
    distinctFromStaging;
  const automation = externalAutomationState(env);
  const featureEnabled = env.BUSINESS_VERIFICATION_ENABLED === "true";

  return {
    environment: productionEnvironment ? "production" : "invalid",
    database: {
      name: activeDatabaseName || configuredName,
      isolated: databaseIsolated,
      connected: activeDatabaseName === EXPECTED_PRODUCTION_DATABASE
    },
    externalAutomation: {
      enabled: automation.enabled,
      whatsapp: automation.whatsapp,
      calls: automation.calls,
      autonomousExecution: automation.autonomousExecution,
      schedulers: automation.schedulers
    },
    emailMode: automation.liveEmail ? "live" : "dry-run",
    feature: {
      enabled: featureEnabled
    }
  };
}

module.exports = {
  EXPECTED_PRODUCTION_DATABASE,
  configuredDatabaseName,
  externalAutomationState,
  validateProductionRuntimeConfiguration
};
