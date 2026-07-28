"use strict";

const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const test = require("node:test");
const express = require("../backend/node_modules/express");
const {
  CONTROL_PREFIX,
  configuredDatabaseName,
  createBusinessVerificationStagingAcceptanceRoutes,
  createFixedWindowLimiter,
  createRunManager,
  evidenceTtlMs,
  exactStagingEnabled,
  exactStagingTopology,
  suppliedBearer,
  validBearer
} = require("../backend/routes/businessVerificationStagingAcceptanceRoutes");

const TEST_CONTROL_TOKEN = "test_Only-Control_Plane-Token_2026-AbCdEfGhIjKlMnOpQrStUv";
const CONTROL_ENV = [
  "BUSINESS_VERIFICATION_STAGING_ACCEPTANCE_ENABLED",
  "BUSINESS_VERIFICATION_STAGING_E2E_CONFIRMED",
  "BUSINESS_VERIFICATION_ENABLED",
  "TRADEFLOW_ENVIRONMENT",
  "MONGO_URI",
  "PRODUCTION_MONGO_URI",
  "BUSINESS_VERIFICATION_STAGING_MONGO_CONFIRMED",
  "BUSINESS_VERIFICATION_STAGING_BASE_URL",
  "BUSINESS_VERIFICATION_STORAGE_DRIVER",
  "BUSINESS_VERIFICATION_S3_ENDPOINT",
  "BUSINESS_VERIFICATION_S3_REGION",
  "BUSINESS_VERIFICATION_S3_BUCKET",
  "BUSINESS_VERIFICATION_S3_ACCESS_KEY_ID",
  "BUSINESS_VERIFICATION_S3_SECRET_ACCESS_KEY",
  "BUSINESS_VERIFICATION_S3_PUBLIC_ACCESS_BLOCKED",
  "BUSINESS_VERIFICATION_SCANNER_DRIVER",
  "BUSINESS_VERIFICATION_CLAMAV_HOST",
  "BUSINESS_VERIFICATION_CLAMAV_PORT",
  "ENABLE_SCHEDULERS",
  "ENABLE_WHATSAPP_AUTOMATION",
  "ENABLE_AUTONOMOUS_EXECUTION",
  "ENABLE_AI_AUTONOMOUS_HTTP_SCHEDULER",
  "EMAIL_MODE",
  "EMAIL_DELIVERY_MODE",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
  "EMAIL_USER",
  "EMAIL_PASS",
  "BUSINESS_VERIFICATION_ACCEPTANCE_CONTROL_TOKEN",
  "BUSINESS_VERIFICATION_ACCEPTANCE_EVIDENCE_TTL_SECONDS"
];

async function withControlEnvironment(callback) {
  const previous = Object.fromEntries(CONTROL_ENV.map((name) => [name, process.env[name]]));
  Object.assign(process.env, {
    BUSINESS_VERIFICATION_STAGING_ACCEPTANCE_ENABLED: "true",
    BUSINESS_VERIFICATION_STAGING_E2E_CONFIRMED: "true",
    BUSINESS_VERIFICATION_ENABLED: "true",
    TRADEFLOW_ENVIRONMENT: "staging",
    MONGO_URI: "mongodb://127.0.0.1:27017/tradeflow_verification_staging",
    PRODUCTION_MONGO_URI: "",
    BUSINESS_VERIFICATION_STAGING_MONGO_CONFIRMED: "true",
    BUSINESS_VERIFICATION_STAGING_BASE_URL: "https://tradeflow-verification-backend-staging.onrender.com",
    BUSINESS_VERIFICATION_STORAGE_DRIVER: "s3",
    BUSINESS_VERIFICATION_S3_ENDPOINT: `https://${"0".repeat(32)}.r2.cloudflarestorage.com`,
    BUSINESS_VERIFICATION_S3_REGION: "auto",
    BUSINESS_VERIFICATION_S3_BUCKET: "tradeflow-verification-staging",
    BUSINESS_VERIFICATION_S3_ACCESS_KEY_ID: "x",
    BUSINESS_VERIFICATION_S3_SECRET_ACCESS_KEY: "x",
    BUSINESS_VERIFICATION_S3_PUBLIC_ACCESS_BLOCKED: "true",
    BUSINESS_VERIFICATION_SCANNER_DRIVER: "clamav",
    BUSINESS_VERIFICATION_CLAMAV_HOST: "tradeflow-verification-clamav-staging",
    BUSINESS_VERIFICATION_CLAMAV_PORT: "3310",
    ENABLE_SCHEDULERS: "false",
    ENABLE_WHATSAPP_AUTOMATION: "false",
    ENABLE_AUTONOMOUS_EXECUTION: "false",
    ENABLE_AI_AUTONOMOUS_HTTP_SCHEDULER: "false",
    EMAIL_MODE: "dry-run",
    SMTP_HOST: "",
    SMTP_PORT: "",
    SMTP_USER: "",
    SMTP_PASS: "",
    SMTP_FROM: "",
    EMAIL_USER: "",
    EMAIL_PASS: "",
    BUSINESS_VERIFICATION_ACCEPTANCE_CONTROL_TOKEN: TEST_CONTROL_TOKEN,
    BUSINESS_VERIFICATION_ACCEPTANCE_EVIDENCE_TTL_SECONDS: "900"
  });
  try {
    return await callback();
  } finally {
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

test("control plane is available only under every exact staging fail-closed guard", async () => {
  await withControlEnvironment(() => {
    assert.equal(configuredDatabaseName(), "tradeflow_verification_staging");
    assert.equal(exactStagingTopology(), true);
    assert.equal(exactStagingEnabled(), true);
    for (const [name, value] of [
      ["BUSINESS_VERIFICATION_STAGING_ACCEPTANCE_ENABLED", "false"],
      ["BUSINESS_VERIFICATION_STAGING_E2E_CONFIRMED", "false"],
      ["BUSINESS_VERIFICATION_ENABLED", "false"],
      ["TRADEFLOW_ENVIRONMENT", "production"],
      ["MONGO_URI", "mongodb://127.0.0.1:27017/tradeflow_production"],
      ["BUSINESS_VERIFICATION_STAGING_MONGO_CONFIRMED", "false"],
      ["BUSINESS_VERIFICATION_STAGING_BASE_URL", "https://tradeflowai.in"],
      ["BUSINESS_VERIFICATION_STORAGE_DRIVER", "local"],
      ["BUSINESS_VERIFICATION_S3_BUCKET", "production"],
      ["BUSINESS_VERIFICATION_S3_ENDPOINT", "https://example.com"],
      ["BUSINESS_VERIFICATION_S3_PUBLIC_ACCESS_BLOCKED", "false"],
      ["BUSINESS_VERIFICATION_SCANNER_DRIVER", "test"],
      ["BUSINESS_VERIFICATION_CLAMAV_HOST", "localhost"],
      ["ENABLE_SCHEDULERS", "true"],
      ["ENABLE_WHATSAPP_AUTOMATION", "true"],
      ["ENABLE_AUTONOMOUS_EXECUTION", "true"],
      ["ENABLE_AI_AUTONOMOUS_HTTP_SCHEDULER", "true"],
      ["EMAIL_MODE", "smtp"],
      ["SMTP_HOST", "smtp.example.invalid"],
      ["BUSINESS_VERIFICATION_ACCEPTANCE_CONTROL_TOKEN", "weak"]
    ]) {
      const original = process.env[name];
      process.env[name] = value;
      assert.equal(exactStagingEnabled(), false, `${name} must fail closed`);
      process.env[name] = original;
    }
  });
});

test("authentication accepts only the dedicated strong Authorization bearer token", async () => {
  await withControlEnvironment(() => {
    const token = TEST_CONTROL_TOKEN;
    assert.equal(validBearer({ headers: { authorization: `Bearer ${token}` } }), true);
    assert.equal(validBearer({ headers: { authorization: "Bearer invalid" } }), false);
    assert.equal(validBearer({ headers: { cookie: `token=${token}` }, query: { token }, body: { token } }), false);
    assert.equal(suppliedBearer({ headers: { "x-control-token": token } }), "");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../backend/routes/businessVerificationStagingAcceptanceRoutes.js"),
      "utf8"
    );
    assert.match(source, /crypto\.timingSafeEqual/);
    assert.doesNotMatch(source, /req\.(?:body|query|cookies).*CONTROL_TOKEN/i);
  });
});

test("fixed-window limiter rejects requests over its strict bound", () => {
  const allow = createFixedWindowLimiter({ limit: 2, windowMs: 1000 });
  assert.equal(allow(100).allowed, true);
  assert.equal(allow(101).allowed, true);
  assert.equal(allow(102).allowed, false);
  assert.equal(allow(1101).allowed, true);
});

test("evidence TTL is short and hard-bounded", async () => {
  await withControlEnvironment(() => {
    process.env.BUSINESS_VERIFICATION_ACCEPTANCE_EVIDENCE_TTL_SECONDS = "1";
    assert.equal(evidenceTtlMs(), 300000);
    process.env.BUSINESS_VERIFICATION_ACCEPTANCE_EVIDENCE_TTL_SECONDS = "99999";
    assert.equal(evidenceTtlMs(), 3600000);
    process.env.BUSINESS_VERIFICATION_ACCEPTANCE_EVIDENCE_TTL_SECONDS = "900";
    assert.equal(evidenceTtlMs(), 900000);
  });
});

function fakeRunManager() {
  const runId = `bvsa_${"B".repeat(32)}`;
  const record = {
    runId,
    status: "passed",
    startedAt: "2026-07-29T00:00:00.000Z",
    finishedAt: "2026-07-29T00:01:00.000Z",
    expiresAtMs: Date.parse("2026-07-29T00:16:00.000Z"),
    artifact: { runId, status: "PASS", steps: [], cleanup: {} },
    ledger: { ids: {}, objectKeys: [] },
    residue: null
  };
  let removed = false;
  return {
    trigger: () => ({ conflict: false, status: {
      runId,
      status: "running",
      startedAt: record.startedAt,
      finishedAt: null,
      expiresAt: "2026-07-29T00:15:00.000Z",
      evidenceAvailable: false,
      zeroResidueCheckedAt: null
    } }),
    get: (requested) => (!removed && requested === runId ? record : null),
    publicStatus: () => ({
      runId,
      status: record.status,
      startedAt: record.startedAt,
      finishedAt: record.finishedAt,
      expiresAt: new Date(record.expiresAtMs).toISOString(),
      evidenceAvailable: true,
      zeroResidueCheckedAt: null
    }),
    checkResidue: async () => ({
      residue: {
        checkedAt: "2026-07-29T00:02:00.000Z",
        zeroResidue: true,
        mongo: { zeroResidue: true, counts: {} },
        r2: { zeroResidue: true, trackedObjectsRemaining: 0, bucketObjectCount: 0 }
      }
    }),
    remove: () => {
      removed = true;
      return { removed: true };
    }
  };
}

async function withServer(router, callback) {
  const app = express();
  app.use(CONTROL_PREFIX, router);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("HTTP surface hides disabled/non-HTTPS access and rejects public-origin and fallback credentials", async () => {
  const manager = fakeRunManager();
  await withServer(createBusinessVerificationStagingAcceptanceRoutes({
    manager,
    isEnabled: () => false,
    isHttps: () => true
  }), async (base) => {
    const response = await fetch(`${base}${CONTROL_PREFIX}/runs`, { method: "POST" });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { success: false, message: "API route not found" });
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  });

  await withServer(createBusinessVerificationStagingAcceptanceRoutes({
    manager,
    isEnabled: () => true,
    isHttps: () => false,
    authenticate: () => true
  }), async (base) => {
    assert.equal((await fetch(`${base}${CONTROL_PREFIX}/runs`, { method: "POST" })).status, 404);
  });

  await withServer(createBusinessVerificationStagingAcceptanceRoutes({
    manager,
    isEnabled: () => true,
    isHttps: () => true,
    authenticate: (req) => req.headers.authorization === `Bearer ${TEST_CONTROL_TOKEN}`,
    isRuntimeDatabaseExact: () => true
  }), async (base) => {
    const origin = await fetch(`${base}${CONTROL_PREFIX}/runs`, {
      method: "POST",
      headers: { Origin: "https://tradeflowai.in", Authorization: `Bearer ${TEST_CONTROL_TOKEN}` }
    });
    assert.equal(origin.status, 403);
    assert.equal(origin.headers.get("access-control-allow-origin"), null);
    const fallback = await fetch(`${base}${CONTROL_PREFIX}/runs?token=${TEST_CONTROL_TOKEN}`, {
      method: "POST",
      headers: { Cookie: `token=${TEST_CONTROL_TOKEN}`, "x-control-token": TEST_CONTROL_TOKEN }
    });
    assert.equal(fallback.status, 401);
  });
});

test("HTTP surface returns 202, supports polling/redacted evidence/residue/deletion, and rate-limits triggers", async () => {
  const manager = fakeRunManager();
  const token = TEST_CONTROL_TOKEN;
  await withServer(createBusinessVerificationStagingAcceptanceRoutes({
    manager,
    isEnabled: () => true,
    isHttps: () => true,
    authenticate: (req) => req.headers.authorization === `Bearer ${token}`,
    isRuntimeDatabaseExact: () => true
  }), async (base) => {
    const options = { headers: { Authorization: `Bearer ${token}` } };
    const trigger = await fetch(`${base}${CONTROL_PREFIX}/runs`, { method: "POST", ...options });
    assert.equal(trigger.status, 202);
    const accepted = await trigger.json();
    assert.match(accepted.runId, /^bvsa_[A-Za-z0-9_-]{32}$/);
    assert.equal(trigger.headers.get("location"), `${CONTROL_PREFIX}/runs/${accepted.runId}`);

    const throttled = await fetch(`${base}${CONTROL_PREFIX}/runs`, { method: "POST", ...options });
    assert.equal(throttled.status, 429);
    assert.ok(Number(throttled.headers.get("retry-after")) > 0);

    assert.equal((await fetch(`${base}${CONTROL_PREFIX}/runs/${accepted.runId}`, options)).status, 200);
    const artifactResponse = await fetch(`${base}${CONTROL_PREFIX}/runs/${accepted.runId}/artifact`, options);
    assert.equal(artifactResponse.status, 200);
    const artifact = await artifactResponse.json();
    assert.equal(artifact.status, "PASS");
    assert.equal(JSON.stringify(artifact).includes("createdIds"), false);

    const residue = await fetch(`${base}${CONTROL_PREFIX}/runs/${accepted.runId}/verify-zero-residue`, {
      method: "POST",
      ...options
    });
    assert.equal(residue.status, 200);
    assert.equal((await residue.json()).zeroResidue, true);

    const deleted = await fetch(`${base}${CONTROL_PREFIX}/runs/${accepted.runId}/evidence`, {
      method: "DELETE",
      ...options
    });
    assert.equal(deleted.status, 204);
    assert.equal((await fetch(`${base}${CONTROL_PREFIX}/runs/${accepted.runId}`, options)).status, 404);
  });
});

test("run manager prevents concurrent execution, accepts only child IPC cleanup ledger, and expires evidence", async () => {
  let child;
  let childOptions;
  const spawnRunner = (_path, options) => {
    childOptions = options;
    child = new EventEmitter();
    child.stdout = { resume() {} };
    child.stderr = { resume() {} };
    return child;
  };
  let currentTime = Date.parse("2026-07-29T00:00:00.000Z");
  await withControlEnvironment(async () => {
    const manager = createRunManager({
      spawnRunner,
      now: () => currentTime,
      acquireDistributedLock: async () => true,
      releaseDistributedLock: async () => {},
      verifyResidue: async ({ ledger }) => ({
        checkedAt: new Date(currentTime).toISOString(),
        zeroResidue: ledger.ids.users[0] === "507f1f77bcf86cd799439011",
        mongo: { zeroResidue: true, counts: {} },
        r2: { zeroResidue: true, trackedObjectsRemaining: 0, bucketObjectCount: 0 }
      })
    });
    const first = await manager.trigger();
    assert.equal(first.conflict, false);
    assert.equal((await manager.trigger()).conflict, true);
    const runId = first.status.runId;
    const artifact = {
      runId,
      startedAt: first.status.startedAt,
      finishedAt: "2026-07-29T00:01:00.000Z",
      status: "PASS",
      commit: "93cfa2c1da052470416c6bbbbe3e4ce1b3f65028",
      companyTypes: {},
      steps: [],
      objectCount: 0,
      cleanup: {},
      failure: ""
    };
    fs.writeFileSync(childOptions.env.BUSINESS_VERIFICATION_STAGING_E2E_RESULT, JSON.stringify(artifact), { mode: 0o600 });
    child.emit("message", {
      type: "business-verification-acceptance-ledger",
      runId,
      ledger: { ids: { users: ["507f1f77bcf86cd799439011"] }, objectKeys: [] }
    });
    child.emit("close", 0);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(manager.get(runId).status, "passed");
    assert.equal((await manager.checkResidue(runId)).residue.zeroResidue, true);
    assert.equal(manager.remove(runId).removed, true);
    assert.equal(manager.get(runId), null);
  });
});

test("saved runner evidence is redacted and explicit coverage includes malware and exact cleanup", () => {
  const runner = fs.readFileSync(
    path.resolve(__dirname, "../backend/scripts/business-verification-staging-e2e.js"),
    "utf8"
  );
  const residue = fs.readFileSync(
    path.resolve(__dirname, "../backend/services/businessVerificationAcceptanceResidue.js"),
    "utf8"
  );
  for (const required of [
    '"Exporter"',
    '"Importer"',
    '"Trading Company"',
    "malware-rejected",
    "request_information",
    "resubmission-version",
    "duplicate-block",
    "master-admin-queue",
    "non-master-review-denial",
    "approved-badge-disclaimer",
    'noBadge(primary, "expired")',
    "cross-tenant-denial",
    "immutable-review-audit-history",
    "masked-response",
    "cleanup.zero-run-records",
    "cleanup.zero-run-objects"
  ]) {
    assert.ok(runner.includes(required), `missing live coverage: ${required}`);
  }
  assert.doesNotMatch(runner, /result\.createdIds/);
  assert.doesNotMatch(runner, /primaryVerificationId|rejectedVerificationId/);
  assert.match(residue, /countDocuments/);
  assert.match(residue, /HeadObjectCommand/);
  assert.match(residue, /ListObjectsV2Command/);
  assert.match(residue, /connection\.name !== STAGING_DATABASE/);
});
