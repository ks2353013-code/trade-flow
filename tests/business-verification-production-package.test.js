"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const blueprint = fs.readFileSync(path.join(root, "deploy/production/render.production.yaml"), "utf8");

test("production Blueprint is disabled-first, isolated and manual", () => {
  assert.match(blueprint, /name: tradeflow-verification-backend-production/);
  assert.match(blueprint, /name: tradeflow-verification-clamav-production/);
  assert.equal((blueprint.match(/autoDeploy: false/g) || []).length, 2);
  assert.match(blueprint, /healthCheckPath: \/api\/health/);
  assert.doesNotMatch(blueprint, /healthCheckPath: \/api\/ready/);
  assert.match(blueprint, /- key: BUSINESS_VERIFICATION_ENABLED\r?\n\s+value: false/);
  assert.match(blueprint, /- key: EMAIL_MODE\r?\n\s+value: dry-run/);
});

test("production Blueprint rejects staging and acceptance-control resource reuse", () => {
  assert.doesNotMatch(blueprint, /tradeflow-verification-(backend|clamav|frontend)-staging/);
  assert.doesNotMatch(blueprint, /STAGING_ACCEPTANCE_CONTROL_TOKEN/);
  assert.doesNotMatch(blueprint, /BUSINESS_VERIFICATION_STAGING_ACCEPTANCE_ENABLED/);
  assert.doesNotMatch(blueprint, /(TWILIO_|SMTP_|EMAIL_USER|EMAIL_PASS)/);
  assert.match(blueprint, /BUSINESS_VERIFICATION_S3_BUCKET\r?\n\s+value: tradeflow-verification-production/);
  assert.match(blueprint, /BUSINESS_VERIFICATION_CLAMAV_HOST\r?\n\s+value: tradeflow-verification-clamav-production/);
});
