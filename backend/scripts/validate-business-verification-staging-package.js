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
