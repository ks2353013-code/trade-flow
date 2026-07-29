"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  withTimeout
} = require("../backend/services/businessVerificationReadiness");

test("live Business Verification readiness has a hard fallback bound", async () => {
  const fallback = { ready: false, error: "unavailable" };
  const started = Date.now();
  const result = await withTimeout(new Promise(() => {}), 25, fallback);
  assert.equal(result, fallback);
  assert.ok(Date.now() - started < 250);
});

test("health is dependency-light and ready runs bounded live checks concurrently", () => {
  const server = fs.readFileSync(path.resolve(__dirname, "../backend/server.js"), "utf8");
  const health = server.slice(
    server.indexOf('app.get("/api/health"'),
    server.indexOf('app.get("/api/ready"')
  );
  const ready = server.slice(
    server.indexOf('app.get("/api/ready"'),
    server.indexOf("/* Public Auth Routes */")
  );

  assert.doesNotMatch(health, /activation\(/);
  assert.doesNotMatch(health, /live:\s*true/);
  assert.match(ready, /Promise\.all/);
  assert.match(ready, /addStagingVerification/);
});
