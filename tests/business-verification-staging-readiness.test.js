const assert = require("node:assert/strict");
const test = require("node:test");

const {
  validateStagingRuntimeConfiguration
} = require("../backend/services/stagingReadinessConfiguration");
const {
  ACCEPTANCE_OBJECT_PREFIX,
  calculateStagingAcceptanceResidue
} = require("../backend/services/stagingAcceptanceResidue");
const { addStagingVerification } = require("../backend/services/stagingReadyResponse");

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
    database: { name: "tradeflow_verification_staging", isolated: true, connected: true },
    externalAutomation: {
      enabled: false,
      whatsapp: false,
      calls: false,
      autonomousExecution: false,
      schedulers: false
    },
    emailMode: "dry-run",
    acceptance: { enabled: false, ready: false, controlTokenConfigured: false }
  });
});

test("rejects a connected database other than the dedicated staging database", () => {
  const result = validateStagingRuntimeConfiguration({
    env: safeEnvironment({ MONGO_URI: "mongodb://database.invalid/wrong_database" }),
    activeDatabaseName: "wrong_database"
  });

  assert.equal(result.database.name, "wrong_database");
  assert.equal(result.database.isolated, false);
  assert.equal(result.database.connected, false);
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
  assert.deepEqual(Object.keys(result.database).sort(), ["connected", "isolated", "name"]);
  assert.deepEqual(Object.keys(result.externalAutomation).sort(), [
    "autonomousExecution", "calls", "enabled", "schedulers", "whatsapp"
  ]);
});

test("reports token presence as only a boolean and never serializes its value", () => {
  const token = "top-secret-control-token-that-must-never-escape";
  const result = validateStagingRuntimeConfiguration({
    env: safeEnvironment({ STAGING_ACCEPTANCE_CONTROL_TOKEN: token }),
    activeDatabaseName: "tradeflow_verification_staging"
  });
  assert.equal(result.acceptance.controlTokenConfigured, true);
  assert.equal(JSON.stringify(result).includes(token), false);
});

test("live email configuration is unsafe", () => {
  const result = validateStagingRuntimeConfiguration({
    env: safeEnvironment({ SMTP_HOST: "smtp.invalid" }),
    activeDatabaseName: "tradeflow_verification_staging"
  });
  assert.equal(result.emailMode, "live");
  assert.equal(result.externalAutomation.enabled, true);
});

function residueEnvironment() {
  return {
    BUSINESS_VERIFICATION_S3_ENDPOINT: "https://objects.invalid",
    BUSINESS_VERIFICATION_S3_REGION: "auto",
    BUSINESS_VERIFICATION_S3_BUCKET: "private-staging",
    BUSINESS_VERIFICATION_S3_ACCESS_KEY_ID: "bucket-user",
    BUSINESS_VERIFICATION_S3_SECRET_ACCESS_KEY: "bucket-password"
  };
}

function evidenceCount(count, capture) {
  return {
    countDocuments(query) {
      capture.query = query;
      return { maxTimeMS: async () => count };
    }
  };
}

test("independently reports clean staging acceptance residue", async () => {
  const capture = {};
  const result = await calculateStagingAcceptanceResidue({
    env: residueEnvironment(),
    EvidenceModel: evidenceCount(0, capture),
    s3Client: { send: async (command) => {
      capture.input = command.input;
      return { KeyCount: 0, IsTruncated: false };
    } }
  });
  assert.deepEqual(result, { runRecords: 0, artifactObjects: 0, clean: true });
  assert.equal(String(capture.query.runId.$regex), "/^bva_[A-Za-z0-9_-]{32}$/");
  assert.equal(capture.input.Prefix, ACCEPTANCE_OBJECT_PREFIX);
});

test("reports non-clean staging acceptance residue using counts only", async () => {
  const result = await calculateStagingAcceptanceResidue({
    env: residueEnvironment(),
    EvidenceModel: evidenceCount(2, {}),
    s3Client: { send: async () => ({ KeyCount: 3, IsTruncated: false, Contents: [{ Key: "must-not-escape" }] }) }
  });
  assert.deepEqual(result, { runRecords: 2, artifactObjects: 3, clean: false });
  assert.equal(JSON.stringify(result).includes("must-not-escape"), false);
});

test("residue is unverifiable rather than inferred zero when either resource cannot be counted", async () => {
  const missingConfiguration = await calculateStagingAcceptanceResidue({ env: {} });
  const failedListing = await calculateStagingAcceptanceResidue({
    env: residueEnvironment(),
    EvidenceModel: evidenceCount(0, {}),
    s3Client: { send: async () => { throw new Error("credential and object-key detail"); } }
  });
  assert.deepEqual(missingConfiguration, { clean: false, verifiable: false });
  assert.deepEqual(failedListing, { clean: false, verifiable: false });
});

test("the ready response exposes sanitized evidence only in exact staging mode", async () => {
  const env = safeEnvironment({ NODE_ENV: "staging" });
  const staging = await addStagingVerification({ ok: true }, {
    env,
    activeDatabaseName: "tradeflow_verification_staging",
    calculateResidue: async () => ({ runRecords: 0, artifactObjects: 0, clean: true })
  });
  assert.equal(staging.ready, true);
  assert.deepEqual(staging.payload.stagingVerification.database, {
    name: "tradeflow_verification_staging", isolated: true, connected: true
  });
  assert.equal(staging.payload.stagingVerification.emailMode, "dry-run");

  for (const NODE_ENV of ["production", "Staging", "staging "]) {
    const response = await addStagingVerification({ ok: true }, { env: { NODE_ENV } });
    assert.equal(Object.hasOwn(response.payload, "stagingVerification"), false);
  }
});

test("the ready response fails closed for unsafe runtime state and unverifiable residue", async () => {
  for (const overrides of [
    { MONGO_URI: "mongodb://database.invalid/wrong", SMTP_HOST: undefined },
    { ENABLE_WHATSAPP_AUTOMATION: "true" },
    { SMTP_HOST: "smtp.invalid" }
  ]) {
    const response = await addStagingVerification({}, {
      env: safeEnvironment({ NODE_ENV: "staging", ...overrides }),
      activeDatabaseName: overrides.MONGO_URI ? "wrong" : "tradeflow_verification_staging",
      calculateResidue: async () => ({ runRecords: 0, artifactObjects: 0, clean: true })
    });
    assert.equal(response.ready, false);
  }
  const unverifiable = await addStagingVerification({}, {
    env: safeEnvironment({ NODE_ENV: "staging" }),
    activeDatabaseName: "tradeflow_verification_staging",
    calculateResidue: async () => ({ clean: false, verifiable: false })
  });
  assert.equal(unverifiable.ready, false);
});
