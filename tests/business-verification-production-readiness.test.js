"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  EXPECTED_PRODUCTION_DATABASE,
  configuredDatabaseName,
  validateProductionRuntimeConfiguration
} = require("../backend/services/productionReadinessConfiguration");

function safeEnv(overrides = {}) {
  return {
    NODE_ENV: "production",
    TRADEFLOW_ENVIRONMENT: "production",
    MONGO_URI: "mongodb://db.invalid/tradeflow_verification_production",
    BUSINESS_VERIFICATION_PRODUCTION_MONGO_CONFIRMED: "true",
    BUSINESS_VERIFICATION_ENABLED: "false",
    ENABLE_SCHEDULERS: "false",
    ENABLE_WHATSAPP_AUTOMATION: "false",
    ENABLE_CALL_AUTOMATION: "false",
    ENABLE_AUTONOMOUS_EXECUTION: "false",
    ENABLE_EMAIL_AUTOMATION: "false",
    ...overrides
  };
}

test("requires the exact production database and a live matching connection", () => {
  const env = safeEnv();
  const result = validateProductionRuntimeConfiguration({
    env,
    activeDatabaseName: EXPECTED_PRODUCTION_DATABASE
  });

  assert.deepEqual(result.database, {
    name: EXPECTED_PRODUCTION_DATABASE,
    isolated: true,
    connected: true
  });
  assert.equal(result.environment, "production");
  assert.equal(result.feature.enabled, false);
});

test("rejects an incorrect or staging database", () => {
  for (const name of ["tradeflow", "tradeflow_verification_staging", "production"]) {
    const env = safeEnv({ MONGO_URI: `mongodb://db.invalid/${name}` });
    const result = validateProductionRuntimeConfiguration({
      env,
      activeDatabaseName: name
    });
    assert.equal(result.database.isolated, false);
  }
});

test("rejects a production URI shared with staging", () => {
  const uri = "mongodb://db.invalid/tradeflow_verification_production";
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

test("database-name parser never returns URI credentials", () => {
  const name = configuredDatabaseName({
    MONGO_URI: "mongodb://username:password@db.invalid/tradeflow_verification_production"
  });
  assert.equal(name, EXPECTED_PRODUCTION_DATABASE);
  assert.doesNotMatch(name, /username|password|@/);
});
