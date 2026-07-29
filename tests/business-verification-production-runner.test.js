"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

test("production runner bounds unavailable dependencies and never emits connection details", {
  timeout: 12000
}, () => {
  const root = path.resolve(__dirname, "..");
  const script = path.join(root, "backend/scripts/business-verification-production-readiness.js");
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
    timeout: 10000,
    env: {
      ...process.env,
      NODE_ENV: "production",
      TRADEFLOW_ENVIRONMENT: "production",
      MONGO_URI: "mongodb://synthetic-user@203.0.113.1/tradeflow_verification_production",
      BUSINESS_VERIFICATION_PRODUCTION_MONGO_CONFIRMED: "true",
      BUSINESS_VERIFICATION_PRODUCTION_MONGO_USER_CONFIRMED: "true",
      BUSINESS_VERIFICATION_PRODUCTION_STORAGE_CONFIRMED: "true",
      BUSINESS_VERIFICATION_ENABLED: "false",
      BUSINESS_VERIFICATION_STORAGE_DRIVER: "s3",
      BUSINESS_VERIFICATION_S3_ENDPOINT: "https://storage.invalid",
      BUSINESS_VERIFICATION_S3_REGION: "auto",
      BUSINESS_VERIFICATION_S3_BUCKET: "tradeflow-verification-production",
      BUSINESS_VERIFICATION_S3_ACCESS_KEY_ID: "synthetic-access",
      BUSINESS_VERIFICATION_S3_SECRET_ACCESS_KEY: "synthetic-secret",
      BUSINESS_VERIFICATION_S3_PUBLIC_ACCESS_BLOCKED: "true",
      BUSINESS_VERIFICATION_SCANNER_DRIVER: "clamav",
      BUSINESS_VERIFICATION_CLAMAV_HOST: "tradeflow-verification-clamav-production",
      BUSINESS_VERIFICATION_CLAMAV_PORT: "3310",
      BUSINESS_VERIFICATION_ENCRYPTION_KEY: "",
      BUSINESS_VERIFICATION_HASH_KEY: "",
      EMAIL_MODE: "dry-run",
      ENABLE_EMAIL_AUTOMATION: "false",
      ENABLE_SCHEDULERS: "false",
      ENABLE_WHATSAPP_AUTOMATION: "false",
      ENABLE_CALL_AUTOMATION: "false",
      ENABLE_CALLS: "false",
      ENABLE_AUTONOMOUS_EXECUTION: "false",
      ENABLE_AI_AUTONOMOUS_HTTP_SCHEDULER: "false",
      TWILIO_ACCOUNT_SID: "",
      TWILIO_AUTH_TOKEN: "",
      SMTP_HOST: "",
      SMTP_PORT: "",
      SMTP_USER: "",
      SMTP_PASS: "",
      SMTP_FROM: "",
      SMTP_EMAIL: "",
      SMTP_PASSWORD: "",
      EMAIL_USER: "",
      EMAIL_PASS: ""
    }
  });
  const elapsedMs = Date.now() - startedAt;
  const serialized = `${result.stdout || ""}\n${result.stderr || ""}`;

  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.ok(elapsedMs < 9000, `runner exceeded bound: ${elapsedMs}ms`);
  assert.match(result.stdout, /"readyForControlledActivation": false/);
  assert.doesNotMatch(serialized, /synthetic-user|203\.0\.113\.1|storage\.invalid/);
  assert.doesNotMatch(serialized, /synthetic-access|synthetic-secret/);
  assert.doesNotMatch(serialized, /mongodb:\/\//);
});
