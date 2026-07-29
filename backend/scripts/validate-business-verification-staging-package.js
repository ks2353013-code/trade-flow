const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const required = [
  "deploy/staging/business-verification.env.template",
  "deploy/staging/clamav/Dockerfile",
  "deploy/staging/clamav/clamd.conf",
  "deploy/staging/s3-public-access-block.json",
  "deploy/staging/s3-bucket-policy.template.json",
  "deploy/staging/s3-service-policy.template.json",
  "deploy/staging/generate-runtime-config.js",
  "docs/business-verification-staging-runbook.md"
];
const failures = [];

for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) failures.push(`missing:${relative}`);
}

const blueprint = fs.readFileSync(
  path.join(root, "deploy/staging/render.staging.yaml"),
  "utf8"
);
const backendService = blueprint.match(
  /  - type: web\r?\n    name: tradeflow-verification-backend-staging[\s\S]*?(?=\r?\n  - type:|$)/
);
if (!backendService || !/^    healthCheckPath: \/api\/health\s*$/m.test(backendService[0])) {
  failures.push("backend-health-check-must-use-api-health");
}const expectedServices = [
  ["web", "tradeflow-verification-backend-staging"],
  ["pserv", "tradeflow-verification-clamav-staging"],
  ["web", "tradeflow-verification-frontend-staging"]
];
for (const [type, name] of expectedServices) {
  const service = blueprint.match(
    new RegExp(`  - type: ${type}\\r?\\n    name: ${name}[\\s\\S]*?(?=\\r?\\n  - type:|$)`)
  );
  if (!service || !/^    branch: business-verification-staging-acceptance\s*$/m.test(service[0])) {
    failures.push(`service-branch-mismatch:${name}`);
  }
}
if (
  !backendService ||
  !/      - key: BUSINESS_VERIFICATION_STAGING_ACCEPTANCE_ENABLED\r?\n        value: false/.test(backendService[0])
) {
  failures.push("staging-acceptance-must-default-disabled");
}
if (
  !backendService ||
  !/      - key: STAGING_ACCEPTANCE_CONTROL_TOKEN\r?\n        sync: false/.test(backendService[0]) ||
  /      - key: STAGING_ACCEPTANCE_CONTROL_TOKEN\r?\n        value:/.test(backendService[0])
) {
  failures.push("staging-control-token-must-remain-uncommitted");
}
if (/name:\s*\S*production\S*/i.test(blueprint) || /^\s*branch:\s*main\s*$/m.test(blueprint)) {
  failures.push("production-reference-forbidden");
}

const envTemplate = fs.readFileSync(path.join(root, required[0]), "utf8");
for (const line of envTemplate.split(/\r?\n/).filter(Boolean)) {
  if (!/^[A-Z0-9_]+=$/.test(line)) failures.push("environment-template-contains-value");
}

const publicBlock = JSON.parse(
  fs.readFileSync(path.join(root, "deploy/staging/s3-public-access-block.json"), "utf8")
).PublicAccessBlockConfiguration;
if (!Object.values(publicBlock).every((value) => value === true)) {
  failures.push("public-access-block-incomplete");
}

const scanner = fs.readFileSync(path.join(root, "deploy/staging/clamav/clamd.conf"), "utf8");
for (const control of ["StreamMaxLength 9M", "MaxScanSize 16M", "MaxRecursion 8"]) {
  if (!scanner.includes(control)) failures.push(`scanner-control-missing:${control}`);
}

const result = { ready: failures.length === 0, failures };
console.log(JSON.stringify(result));
if (!result.ready) process.exitCode = 1;
