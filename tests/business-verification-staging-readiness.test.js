const assert = require("node:assert/strict");
const test = require("node:test");

const {
  validateStagingRuntimeConfiguration
} = require("../backend/services/stagingReadinessConfiguration");

function safeEnvironment(overrides = {}) {
  return {
    MONGO_URI: "mongodb://database.invalid/tradeflow_verification_staging",
    BUSINESS_VERIFICATION_STAGING_MONGO_CONFIRMED: "true",
    ENABLE_SCHEDULERS: "false",
    ENABLE_WHATSAPP_AUTOMATION: "false",
    ENABLE_CALL_AUTOMATION: "false",
    ENABLE_AUTONOMOUS_EXECUTION: "false",
    ENABLE_AI_AUTONOMOUS_HTTP_SCHEDULER: "false",
    ...overrides
  };
}

test("reports the actual sanitized database and disabled automation state", () => {
  const result = validateStagingRuntimeConfiguration({
    env: safeEnvironment(),
    activeDatabaseName: "tradeflow_verification_staging"
  });

  assert.deepEqual(result, {
    database: { name: "tradeflow_verification_staging", isolated: true },
    externalAutomation: {
      enabled: false,
      whatsapp: false,
      calls: false,
      autonomousExecution: false
    }
  });
});

test("rejects a connected database other than the dedicated staging database", () => {
  const result = validateStagingRuntimeConfiguration({
    env: safeEnvironment({ MONGO_URI: "mongodb://database.invalid/wrong_database" }),
    activeDatabaseName: "wrong_database"
  });

  assert.equal(result.database.name, "wrong_database");
  assert.equal(result.database.isolated, false);
});

for (const [name, configured, field] of [
  ["WhatsApp flag", { ENABLE_WHATSAPP_AUTOMATION: "true" }, "whatsapp"],
  ["WhatsApp configuration", { WHATSAPP_ACCESS_TOKEN: "configured" }, "whatsapp"],
  ["call flag", { ENABLE_CALL_AUTOMATION: "true" }, "calls"],
  ["call configuration", { TWILIO_VOICE_FROM: "+10000000000" }, "calls"],
  ["scheduler", { ENABLE_SCHEDULERS: "true" }, null],
  ["autonomous scheduler", { ENABLE_AI_AUTONOMOUS_HTTP_SCHEDULER: "true" }, null],
  ["autonomous execution", { ENABLE_AUTONOMOUS_EXECUTION: "true" }, "autonomousExecution"],
  ["other external automation", { SMTP_HOST: "mail.invalid" }, null]
]) {
  test(`rejects enabled or configured ${name}`, () => {
    const result = validateStagingRuntimeConfiguration({
      env: safeEnvironment(configured),
      activeDatabaseName: "tradeflow_verification_staging"
    });

    assert.equal(result.externalAutomation.enabled, true);
    if (field) assert.equal(result.externalAutomation[field], true);
  });
}

test("never returns secrets or connection details", () => {
  const secrets = [
    "mongo-user",
    "mongo-password",
    "secret-token",
    "internal.mongo.local",
    "encryption-secret",
    "bucket-secret"
  ];
  const result = validateStagingRuntimeConfiguration({
    env: safeEnvironment({
      MONGO_URI: "mongodb://mongo-user:mongo-password@internal.mongo.local/tradeflow_verification_staging",
      WHATSAPP_ACCESS_TOKEN: "secret-token",
      BUSINESS_VERIFICATION_ENCRYPTION_KEY: "encryption-secret",
      BUSINESS_VERIFICATION_S3_SECRET_ACCESS_KEY: "bucket-secret"
    }),
    activeDatabaseName: "tradeflow_verification_staging"
  });
  const json = JSON.stringify(result);

  for (const secret of secrets) assert.equal(json.includes(secret), false);
  assert.deepEqual(Object.keys(result.database).sort(), ["isolated", "name"]);
  assert.deepEqual(Object.keys(result.externalAutomation).sort(), [
    "autonomousExecution", "calls", "enabled", "whatsapp"
  ]);
});
