"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("../backend/node_modules/express");
const { createRouter } = require("../backend/routes/stagingAcceptanceRoutes");
const {
  assertSafeStartup,
  cleanupDisabledEvidence,
  constantTimeTokenEqual,
  enabledByEnvironment,
  normalizeCleanupScope,
  redact
} = require("../backend/services/stagingAcceptanceControl");

const TOKEN = "a".repeat(48);

async function serverFor(control, mounted = true) {
  const app = express();
  if (mounted) app.use("/api/internal/staging-acceptance", createRouter(control));
  app.use("/api", (_req, res) => res.status(404).json({ success: false, message: "API route not found" }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

function request(url, path, options = {}) {
  return fetch(`${url}${path}`, options);
}

test("activation is exact and production enablement fails closed", () => {
  assert.equal(enabledByEnvironment({ NODE_ENV: "test", BUSINESS_VERIFICATION_STAGING_ACCEPTANCE_ENABLED: "true" }), false);
  assert.equal(enabledByEnvironment({ NODE_ENV: "staging", BUSINESS_VERIFICATION_STAGING_ACCEPTANCE_ENABLED: "false" }), false);
  assert.equal(enabledByEnvironment({ NODE_ENV: "staging", BUSINESS_VERIFICATION_STAGING_ACCEPTANCE_ENABLED: "true" }), true);
  assert.throws(() => assertSafeStartup({ NODE_ENV: "production", BUSINESS_VERIFICATION_STAGING_ACCEPTANCE_ENABLED: "true" }), /forbidden/);
});


test("disabled staging startup deletes only synthetic acceptance evidence in the exact isolated database", async () => {
  let query;
  const EvidenceModel = {
    deleteMany: async (value) => {
      query = value;
      return { deletedCount: 1 };
    }
  };
  const result = await cleanupDisabledEvidence({
    env: { NODE_ENV: "staging", BUSINESS_VERIFICATION_STAGING_ACCEPTANCE_ENABLED: "false" },
    EvidenceModel,
    connection: { readyState: 1, name: "tradeflow_verification_staging" }
  });
  assert.deepEqual(result, { attempted: true, deletedCount: 1 });
  assert.equal(String(query.runId.$regex), String(/^bva_[A-Za-z0-9_-]{32}$/));

  const refused = await cleanupDisabledEvidence({
    env: { NODE_ENV: "production", BUSINESS_VERIFICATION_STAGING_ACCEPTANCE_ENABLED: "false" },
    EvidenceModel,
    connection: { readyState: 1, name: "tradeflow_verification_staging" }
  });
  assert.deepEqual(refused, { attempted: false, deletedCount: 0 });
});
test("control token comparison uses fixed-width timing safe equality", () => {
  assert.equal(constantTimeTokenEqual(TOKEN, TOKEN), true);
  assert.equal(constantTimeTokenEqual("wrong", TOKEN), false);
  assert.equal(constantTimeTokenEqual("", TOKEN), false);
  assert.equal(constantTimeTokenEqual("short", "short"), false);
  assert.match(constantTimeTokenEqual.toString(), /timingSafeEqual/);
});

test("disabled control plane is indistinguishable from an absent JSON API route", async (t) => {
  const { server, url } = await serverFor({}, false); t.after(() => server.close());
  const response = await request(url, "/api/internal/staging-acceptance/runs");
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { success: false, message: "API route not found" });
});

test("bearer authentication is exclusive and responses cannot be cached", async (t) => {
  process.env.STAGING_ACCEPTANCE_CONTROL_TOKEN = TOKEN;
  t.after(() => delete process.env.STAGING_ACCEPTANCE_CONTROL_TOKEN);
  const control = { start: async () => ({ runId: `bva_${"b".repeat(32)}`, status: "Pending" }) };
  const { server, url } = await serverFor(control); t.after(() => server.close());
  for (const authorization of [undefined, "Basic abc", "Bearer wrong"]) {
    const response = await request(url, "/api/internal/staging-acceptance/runs", { method: "POST", headers: authorization ? { authorization } : {} });
    assert.equal(response.status, 401); assert.equal((await response.json()).message, "Unauthorized");
  }
  const response = await request(url, "/api/internal/staging-acceptance/runs", { method: "POST", headers: { authorization: `Bearer ${TOKEN}` } });
  assert.equal(response.status, 202); assert.match(response.headers.get("cache-control"), /no-store/);
});

test("status, incomplete artifact, cleanup, exact deletion, and unknown runs are safe", async (t) => {
  process.env.STAGING_ACCEPTANCE_CONTROL_TOKEN = TOKEN;
  t.after(() => delete process.env.STAGING_ACCEPTANCE_CONTROL_TOKEN);
  const id = `bva_${"c".repeat(32)}`;
  let deleted = false;
  const control = {
    find: async (runId, artifact) => deleted || runId !== id ? null : { runId: id, status: artifact ? "Running" : "Pending", startedAt: new Date(0).toISOString(), finishedAt: null, summary: {} },
    verifyCleanup: async () => ({ incomplete: true }),
    remove: async (runId) => { if (runId !== id || deleted) return false; deleted = true; return true; }
  };
  const { server, url } = await serverFor(control); t.after(() => server.close());
  const headers = { authorization: `Bearer ${TOKEN}` };
  assert.equal((await request(url, `/api/internal/staging-acceptance/runs/${id}`, { headers })).status, 200);
  assert.equal((await request(url, `/api/internal/staging-acceptance/runs/${id}/artifact`, { headers })).status, 409);
  assert.equal((await request(url, `/api/internal/staging-acceptance/runs/${id}/verify-cleanup`, { method: "POST", headers })).status, 409);
  assert.equal((await request(url, "/api/internal/staging-acceptance/runs/bva_unknown", { headers })).status, 404);
  assert.equal((await request(url, `/api/internal/staging-acceptance/runs/${id}`, { method: "DELETE", headers })).status, 200);
  assert.equal((await request(url, `/api/internal/staging-acceptance/runs/${id}`, { headers })).status, 404);
});

test("redaction recursively removes privileged evidence", () => {
  const secret = "s".repeat(48);
  const clean = redact({ token: secret, storageKey: "private/key", nested: { uri: "mongodb://host/db", safe: "PASS" }, stack: "trace", steps: [{ name: "scenario", status: "PASS" }] });
  const text = JSON.stringify(clean);
  assert.equal(text.includes(secret), false);
  assert.equal(/mongodb|private\/key|trace/.test(text), false);
  assert.equal(clean.nested.safe, "PASS");
});

test("concurrent trigger receives conflict", async (t) => {
  process.env.STAGING_ACCEPTANCE_CONTROL_TOKEN = TOKEN;
  t.after(() => delete process.env.STAGING_ACCEPTANCE_CONTROL_TOKEN);
  let active = false;
  const control = { start: async () => active ? null : (active = true, { runId: `bva_${"d".repeat(32)}`, status: "Pending" }) };
  const { server, url } = await serverFor(control); t.after(() => server.close());
  const options = { method: "POST", headers: { authorization: `Bearer ${TOKEN}` } };
  assert.equal((await request(url, "/api/internal/staging-acceptance/runs", options)).status, 202);
  assert.equal((await request(url, "/api/internal/staging-acceptance/runs", options)).status, 409);
});


test("cleanup scopes are validated, bounded, and never public", () => {
  const scope = normalizeCleanupScope({
    users: ["64b64c0f0f0f0f0f0f0f0f0f", "not-an-id", "64b64c0f0f0f0f0f0f0f0f0f"],
    companies: [],
    keys: [
      "clean/tenant/synthetic/11111111-1111-4111-8111-111111111111.pdf",
      "../../secret",
      "https://objects.invalid/private"
    ],
    token: "must-not-survive"
  });
  assert.deepEqual(scope.users, ["64b64c0f0f0f0f0f0f0f0f0f"]);
  assert.deepEqual(scope.keys, ["clean/tenant/synthetic/11111111-1111-4111-8111-111111111111.pdf"]);
  assert.equal(Object.hasOwn(scope, "token"), false);
  assert.equal(JSON.stringify(redact({ privateCleanupScope: scope, safe: "PASS" })).includes("64b64c0f"), false);
});

test("completed runs persist a private cleanup scope instead of process memory", async () => {
  const updates = [];
  const EvidenceModel = {
    create: async () => {},
    updateOne: async (_query, update) => { updates.push(update); }
  };
  const control = createControl({
    Evidence: EvidenceModel,
    runner: async () => ({
      status: "FAIL",
      cleanupPassed: true,
      artifact: { steps: [{ name: "synthetic-step", status: "FAIL" }] },
      cleanupScope: {
        users: ["64b64c0f0f0f0f0f0f0f0f0f"],
        companies: [], workspaces: [], verifications: [], notifications: [], audits: [],
        keys: ["quarantine/tenant/synthetic/11111111-1111-4111-8111-111111111111.pdf"]
      }
    })
  });
  const started = await control.start();
  assert.match(started.runId, /^bva_[A-Za-z0-9_-]{32}$/);
  await new Promise((resolve) => setTimeout(resolve, 25));
  const terminal = updates.find((update) => update.$set?.privateCleanupScope);
  assert.ok(terminal);
  assert.equal(terminal.$set.status, "Failed");
  assert.deepEqual(terminal.$set.privateCleanupScope.users, ["64b64c0f0f0f0f0f0f0f0f0f"]);
  assert.equal(JSON.stringify(started).includes("privateCleanupScope"), false);
});
