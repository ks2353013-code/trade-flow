"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  EXPECTED_PRODUCTION_BUCKET,
  EXPECTED_PRODUCTION_CLAMAV_HOST,
  EXPECTED_PRODUCTION_DATABASE,
  configuredDatabaseName,
  validateProductionRuntimeConfiguration
} = require("../backend/services/productionReadinessConfiguration");

function safeEnv(overrides = {}) {
  return {
    NODE_ENV: "production",
    TRADEFLOW_ENVIRONMENT: "production",
    MONGO_URI: "mongodb://production-user@production-db.invalid/tradeflow_verification_production",
    BUSINESS_VERIFICATION_PRODUCTION_MONGO_CONFIRMED: "true",
    BUSINESS_VERIFICATION_PRODUCTION_MONGO_USER_CONFIRMED: "true",
    BUSINESS_VERIFICATION_PRODUCTION_STORAGE_CONFIRMED: "true",
    BUSINESS_VERIFICATION_ENABLED: "false",
    BUSINESS_VERIFICATION_STORAGE_DRIVER: "s3",
    BUSINESS_VERIFICATION_S3_BUCKET: EXPECTED_PRODUCTION_BUCKET,
    BUSINESS_VERIFICATION_S3_PUBLIC_ACCESS_BLOCKED: "true",
    BUSINESS_VERIFICATION_SCANNER_DRIVER: "clamav",
    BUSINESS_VERIFICATION_CLAMAV_HOST: EXPECTED_PRODUCTION_CLAMAV_HOST,
    ENABLE_SCHEDULERS: "false",
    ENABLE_WHATSAPP_AUTOMATION: "false",
    ENABLE_CALL_AUTOMATION: "false",
    ENABLE_AUTONOMOUS_EXECUTION: "false",
    ENABLE_AI_AUTONOMOUS_HTTP_SCHEDULER: "false",
    ENABLE_EMAIL_AUTOMATION: "false",
    EMAIL_MODE: "dry-run",
    ...overrides
  };
}

test("requires exact isolated production database, storage and scanner resources", () => {
  const result = validateProductionRuntimeConfiguration({
    env: safeEnv(),
    activeDatabaseName: EXPECTED_PRODUCTION_DATABASE
  });
  assert.deepEqual(result.database, {
    name: EXPECTED_PRODUCTION_DATABASE,
    isolated: true,
    connected: true,
    userIsolated: true
  });
  assert.equal(result.environment, "production");
  assert.equal(result.feature.enabled, false);
  assert.equal(result.resources.isolated, true);
});

test("rejects an incorrect or staging database", () => {
  for (const name of ["tradeflow", "tradeflow_verification_staging", "production"]) {
    const result = validateProductionRuntimeConfiguration({
      env: safeEnv({ MONGO_URI: `mongodb://production-user@db.invalid/${name}` }),
      activeDatabaseName: name
    });
    assert.equal(result.database.isolated, false);
  }
});

test("rejects a production URI shared with staging", () => {
  const uri = "mongodb://shared-user@db.invalid/tradeflow_verification_production";
  const result = validateProductionRuntimeConfiguration({
    env: safeEnv({ MONGO_URI: uri, STAGING_MONGO_URI: uri }),
    activeDatabaseName: EXPECTED_PRODUCTION_DATABASE
  });
  assert.equal(result.database.isolated, false);
});

test("fails isolation without explicit owner confirmation", () => {
  const result = validateProductionRuntimeConfiguration({
    env: safeEnv({ BUSINESS_VERIFICATION_PRODUCTION_MONGO_CONFIRMED: "false" }),
    activeDatabaseName: EXPECTED_PRODUCTION_DATABASE
  });
  assert.equal(result.database.isolated, false);
});

test("rejects a reused staging Mongo principal and missing user confirmation", () => {
  const reused = validateProductionRuntimeConfiguration({
    env: safeEnv({
      MONGO_URI: "mongodb://shared-user@cluster.invalid/tradeflow_verification_production",
      STAGING_MONGO_URI: "mongodb://shared-user@cluster.invalid/tradeflow_verification_staging"
    }),
    activeDatabaseName: EXPECTED_PRODUCTION_DATABASE
  });
  assert.equal(reused.database.isolated, false);
  assert.equal(reused.database.userIsolated, false);

  const unconfirmed = validateProductionRuntimeConfiguration({
    env: safeEnv({ BUSINESS_VERIFICATION_PRODUCTION_MONGO_USER_CONFIRMED: "false" }),
    activeDatabaseName: EXPECTED_PRODUCTION_DATABASE
  });
  assert.equal(unconfirmed.database.isolated, false);
});

test("rejects staging or unconfirmed storage and scanner resources", () => {
  for (const overrides of [
    { BUSINESS_VERIFICATION_S3_BUCKET: "tradeflow-verification-staging" },
    { BUSINESS_VERIFICATION_CLAMAV_HOST: "tradeflow-verification-clamav-staging" },
    { BUSINESS_VERIFICATION_PRODUCTION_STORAGE_CONFIRMED: "false" }
  ]) {
    const result = validateProductionRuntimeConfiguration({
      env: safeEnv(overrides),
      activeDatabaseName: EXPECTED_PRODUCTION_DATABASE
    });
    assert.equal(result.resources.isolated, false);
  }
});

test("detects every prohibited external automation category", () => {
  const cases = [
    ["ENABLE_WHATSAPP_AUTOMATION", "whatsapp"],
    ["ENABLE_CALL_AUTOMATION", "calls"],
    ["ENABLE_AUTONOMOUS_EXECUTION", "autonomousExecution"],
    ["ENABLE_SCHEDULERS", "schedulers"]
  ];
  for (const [flag, field] of cases) {
    const result = validateProductionRuntimeConfiguration({
      env: safeEnv({ [flag]: "true" }),
      activeDatabaseName: EXPECTED_PRODUCTION_DATABASE
    });
    assert.equal(result.externalAutomation.enabled, true);
    assert.equal(result.externalAutomation[field], true);
  }
});

test("detects configured live email and keeps output sanitized", () => {
  const env = safeEnv({
    SMTP_HOST: "smtp.invalid",
    SMTP_PASS: "do-not-return-this",
    BUSINESS_VERIFICATION_ENCRYPTION_KEY: "do-not-return-this-either",
    BUSINESS_VERIFICATION_S3_SECRET_ACCESS_KEY: "not-visible"
  });
  const result = validateProductionRuntimeConfiguration({
    env,
    activeDatabaseName: EXPECTED_PRODUCTION_DATABASE
  });
  const serialized = JSON.stringify(result);
  assert.equal(result.emailMode, "live");
  assert.equal(result.externalAutomation.enabled, true);
  assert.doesNotMatch(serialized, /do-not-return|not-visible|mongodb:\/\//);
  assert.doesNotMatch(serialized, /SMTP_PASS|ENCRYPTION_KEY|SECRET_ACCESS_KEY/);
});

test("detects every legacy email credential path and non-dry-run mode", () => {
  for (const overrides of [
    { SMTP_EMAIL: "synthetic@example.invalid" },
    { SMTP_PASSWORD: "synthetic-password" },
    { EMAIL_USER: "synthetic@example.invalid" },
    { EMAIL_PASS: "synthetic-password" },
    { EMAIL_MODE: "live" },
    { EMAIL_DELIVERY_MODE: "production", EMAIL_MODE: "" }
  ]) {
    const result = validateProductionRuntimeConfiguration({
      env: safeEnv(overrides),
      activeDatabaseName: EXPECTED_PRODUCTION_DATABASE
    });
    assert.equal(result.emailMode, "live");
    assert.equal(result.externalAutomation.enabled, true);
  }
});

test("database-name parser never returns URI credentials", () => {
  const name = configuredDatabaseName({
    MONGO_URI: "mongodb://username:password@db.invalid/tradeflow_verification_production"
  });
  assert.equal(name, EXPECTED_PRODUCTION_DATABASE);
  assert.doesNotMatch(name, /username|password|@/);
});
