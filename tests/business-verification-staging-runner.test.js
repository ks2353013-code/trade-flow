"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const runnerPath = path.join(root, "backend/scripts/business-verification-staging-e2e.js");
const runner = fs.readFileSync(runnerPath, "utf8");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "backend/package.json"), "utf8"));

test("staging acceptance runner has an explicit short package command", () => {
  assert.equal(
    packageJson.scripts["test:verification:staging-e2e"],
    "node scripts/business-verification-staging-e2e.js"
  );
});

test("runner rejects non-staging execution and requires the exact isolated database", () => {
  assert.match(runner, /BUSINESS_VERIFICATION_STAGING_E2E_CONFIRMED/);
  assert.match(runner, /TRADEFLOW_ENVIRONMENT/);
  assert.match(runner, /tradeflow_verification_staging/);
  assert.match(runner, /production URL rejected/);
  assert.match(runner, /production-database-rejected/);
});

test("runner covers every approved synthetic category and review state", () => {
  for (const category of ["Exporter", "Importer", "Trading Company"]) {
    assert.ok(runner.includes(`"${category}"`));
  }
  for (const action of [
    "request_information",
    "verify",
    "reject",
    "suspend",
    "expire"
  ]) {
    assert.ok(runner.includes(`"${action}"`));
  }
  assert.match(runner, /Duplicate identifier review is required before verification/);
  assert.match(runner, /Explicit confirmation is required/);
  assert.match(runner, /A review reason is required/);
});

test("runner writes redacted evidence and proves exact database and R2 cleanup", () => {
  assert.match(runner, /safeError/);
  assert.match(runner, /writeFileSync/);
  assert.match(runner, /createdIds/);
  assert.match(runner, /HeadObjectCommand/);
  assert.doesNotMatch(runner, /ListObjectsV2Command/);
  assert.match(runner, /httpStatusCode/);
  assert.match(runner, /cleanup\.zero-run-records/);
  assert.match(runner, /cleanup\.zero-run-objects/);
  assert.match(runner, /finally/);
  assert.match(runner, /process\.exitCode = 1/);
  assert.doesNotMatch(runner, /\.\.\/synthetic-/);
  assert.match(runner, /payload\.message \|\| payload\.code/);
});
