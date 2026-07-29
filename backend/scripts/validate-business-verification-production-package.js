"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const blueprintPath = path.join(root, "deploy/production/render.production.yaml");
const failures = [];

function requireMatch(text, pattern, message) {
  if (!pattern.test(text)) failures.push(message);
}

const blueprint = fs.readFileSync(blueprintPath, "utf8");
const serviceBlocks = blueprint.split(/\n(?=  - type: )/);
const backend = serviceBlocks.find((block) => /name: tradeflow-verification-backend-production/.test(block)) || "";
const scanner = serviceBlocks.find((block) => /name: tradeflow-verification-clamav-production/.test(block)) || "";

if (serviceBlocks.filter((block) => /^  - type: /m.test(block)).length !== 2) {
  failures.push("production Blueprint must define exactly two services");
}

for (const [name, block] of [["backend", backend], ["scanner", scanner]]) {
  requireMatch(block, /branch: business-verification-production-readiness/, `${name} branch must be production-readiness`);
  requireMatch(block, /autoDeploy: false/, `${name} auto-deploy must be disabled`);
}

requireMatch(backend, /healthCheckPath: \/api\/health/, "backend health check must use /api/health");
if (/healthCheckPath: \/api\/ready/.test(backend)) failures.push("backend health check must not use /api/ready");
requireMatch(backend, /plan: starter/, "backend plan must remain starter");
requireMatch(scanner, /plan: standard/, "private scanner plan must remain standard");
requireMatch(scanner, /dockerfilePath: \.\/deploy\/production\/clamav\/Dockerfile/, "scanner must use production Dockerfile");

for (const [key, value] of [
  ["NODE_ENV", "production"],
  ["TRADEFLOW_ENVIRONMENT", "production"],
  ["BUSINESS_VERIFICATION_ENABLED", "false"],
  ["EMAIL_MODE", "dry-run"],
  ["ENABLE_EMAIL_AUTOMATION", "false"],
  ["ENABLE_SCHEDULERS", "false"],
  ["ENABLE_WHATSAPP_AUTOMATION", "false"],
  ["ENABLE_CALL_AUTOMATION", "false"],
  ["ENABLE_CALLS", "false"],
  ["ENABLE_AUTONOMOUS_EXECUTION", "false"],
  ["ENABLE_AI_AUTONOMOUS_HTTP_SCHEDULER", "false"],
  ["BUSINESS_VERIFICATION_S3_BUCKET", "tradeflow-verification-production"],
  ["BUSINESS_VERIFICATION_CLAMAV_HOST", "tradeflow-verification-clamav-production"]
]) {
  const pattern = new RegExp(`- key: ${key}\\r?\\n\\s+value: ${value}`);
  requireMatch(backend, pattern, `${key} must be ${value}`);
}

for (const key of [
  "BUSINESS_VERIFICATION_PRODUCTION_MONGO_CONFIRMED",
  "BUSINESS_VERIFICATION_PRODUCTION_MONGO_USER_CONFIRMED",
  "BUSINESS_VERIFICATION_PRODUCTION_STORAGE_CONFIRMED"
]) {
  const pattern = new RegExp(`- key: ${key}\\r?\\n\\s+sync: false`);
  requireMatch(backend, pattern, `${key} must require owner confirmation`);
}

if (/(STAGING_ACCEPTANCE_CONTROL_TOKEN|BUSINESS_VERIFICATION_STAGING_ACCEPTANCE_ENABLED)/.test(blueprint)) {
  failures.push("production Blueprint must not include staging acceptance control settings");
}
if (/(TWILIO_|SMTP_|EMAIL_USER|EMAIL_PASS)/.test(blueprint)) {
  failures.push("production Blueprint must not configure live communication credentials");
}
if (/tradeflow-verification-(backend|clamav|frontend)-staging|tradeflow-verification-staging/.test(blueprint)) {
  failures.push("production Blueprint must not reuse staging resources");
}

const result = { ready: failures.length === 0, failures };
console.log(JSON.stringify(result));
if (!result.ready) process.exitCode = 1;
