"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("staging backend Blueprint promotes only through /api/health", () => {
  const blueprint = fs.readFileSync(
    path.resolve(__dirname, "../deploy/staging/render.staging.yaml"),
    "utf8"
  );
  const backendService = blueprint.match(
    /  - type: web\r?\n    name: tradeflow-verification-backend-staging[\s\S]*?(?=\r?\n  - type:|$)/
  );

  assert.ok(backendService, "staging backend service block must exist");
  assert.match(backendService[0], /^    healthCheckPath: \/api\/health\s*$/m);
  assert.doesNotMatch(backendService[0], /^    healthCheckPath: \/api\/ready\s*$/m);
});
