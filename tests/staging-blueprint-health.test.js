"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const blueprint = fs.readFileSync(
  path.resolve(__dirname, "../deploy/staging/render.staging.yaml"),
  "utf8"
);

function serviceBlock(type, name) {
  return blueprint.match(
    new RegExp(`  - type: ${type}\\r?\\n    name: ${name}[\\s\\S]*?(?=\\r?\\n  - type:|$)`)
  );
}

test("staging Blueprint pins the reviewed per-service branches", () => {
  const expected = [
    ["web", "tradeflow-verification-backend-staging"],
    ["pserv", "tradeflow-verification-clamav-staging"],
    ["web", "tradeflow-verification-frontend-staging"]
  ];

  for (const [type, name] of expected) {
    const service = serviceBlock(type, name);
    assert.ok(service, `${name} service block must exist`);
    assert.match(
      service[0],
      /^    branch: business-verification-staging-acceptance\s*$/m,
      `${name} must preserve its verified staging branch`
    );
  }
});

test("staging backend Blueprint promotes only through /api/health", () => {
  const backendService = serviceBlock("web", "tradeflow-verification-backend-staging");
  assert.ok(backendService, "staging backend service block must exist");
  assert.match(backendService[0], /^    healthCheckPath: \/api\/health\s*$/m);
  assert.doesNotMatch(backendService[0], /^    healthCheckPath: \/api\/ready\s*$/m);
});

test("staging Blueprint keeps acceptance disabled and never commits its token", () => {
  const backendService = serviceBlock("web", "tradeflow-verification-backend-staging");
  assert.ok(backendService, "staging backend service block must exist");
  assert.match(
    backendService[0],
    /      - key: BUSINESS_VERIFICATION_STAGING_ACCEPTANCE_ENABLED\r?\n        value: false/
  );
  assert.match(
    backendService[0],
    /      - key: STAGING_ACCEPTANCE_CONTROL_TOKEN\r?\n        sync: false/
  );
  assert.doesNotMatch(
    backendService[0],
    /      - key: STAGING_ACCEPTANCE_CONTROL_TOKEN\r?\n        value:/
  );
});

test("staging Blueprint contains no production service or main-branch reference", () => {
  assert.doesNotMatch(blueprint, /name:\s*\S*production\S*/i);
  assert.doesNotMatch(blueprint, /^\s*branch:\s*main\s*$/m);
});
