const EXPECTED_STAGING_DATABASE = "tradeflow_verification_staging";

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

function validateStagingRuntimeConfiguration({ env = process.env, activeDatabaseName = "" } = {}) {
  const configuredName = configuredDatabaseName(env);
  const databaseName = activeDatabaseName || configuredName;
  const databaseIsolated =
    env.BUSINESS_VERIFICATION_STAGING_MONGO_CONFIRMED === "true" &&
    configuredName === EXPECTED_STAGING_DATABASE &&
    activeDatabaseName === EXPECTED_STAGING_DATABASE &&
    !(hasValue(env.PRODUCTION_MONGO_URI) && env.PRODUCTION_MONGO_URI === env.MONGO_URI);
  const databaseConnected = activeDatabaseName === EXPECTED_STAGING_DATABASE;

  const twilioCredentialsConfigured = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN"
  ].some((name) => hasValue(env[name]));
  const whatsappConfigured = [
    "TWILIO_WHATSAPP_FROM",
    "WHATSAPP_FROM",
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID"
  ].some((name) => hasValue(env[name]));
  const callConfigured = [
    "TWILIO_PHONE_NUMBER",
    "TWILIO_VOICE_FROM",
    "CALL_AUTOMATION_WEBHOOK_URL"
  ].some((name) => hasValue(env[name]));

  const whatsapp = isEnabled(env.ENABLE_WHATSAPP_AUTOMATION) ||
    whatsappConfigured || twilioCredentialsConfigured;
  const calls = isEnabled(env.ENABLE_CALL_AUTOMATION) ||
    isEnabled(env.ENABLE_CALLS) || callConfigured || twilioCredentialsConfigured;
  const autonomousExecution = isEnabled(env.ENABLE_AUTONOMOUS_EXECUTION);
  const schedulers = isEnabled(env.ENABLE_SCHEDULERS) ||
    isEnabled(env.ENABLE_AI_AUTONOMOUS_HTTP_SCHEDULER);
  const liveEmail = isEnabled(env.ENABLE_EMAIL_AUTOMATION) ||
    ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"].some(
      (name) => hasValue(env[name])
    );
  const otherExternalAutomation =
    schedulers ||
    liveEmail;
  const externalAutomationEnabled =
    whatsapp || calls || autonomousExecution || otherExternalAutomation;

  return {
    database: {
      name: databaseName,
      isolated: databaseIsolated,
      connected: databaseConnected
    },
    externalAutomation: {
      enabled: externalAutomationEnabled,
      whatsapp,
      calls,
      autonomousExecution,
      schedulers
    },
    emailMode: liveEmail ? "live" : "dry-run",
    acceptance: {
      enabled: env.BUSINESS_VERIFICATION_STAGING_ACCEPTANCE_ENABLED === "true",
      ready: false,
      // Presence is checked without reading or transforming the credential.
      controlTokenConfigured: Object.prototype.hasOwnProperty.call(env, "STAGING_ACCEPTANCE_CONTROL_TOKEN")
    }
  };
}

module.exports = {
  EXPECTED_STAGING_DATABASE,
  configuredDatabaseName,
  validateStagingRuntimeConfiguration
};
