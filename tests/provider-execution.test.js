const test = require("node:test");
const assert = require("node:assert/strict");
const { verifyWebhookSignature, buildComplianceRequirements } = require("../backend/services/tradeIntegrationService");
const crypto = require("crypto");

test("webhook signatures fail closed and accept canonical HMAC", () => {
  const body = JSON.stringify({ type: "shipment.updated", status: "in_transit" });
  const secret = "test-secret";
  const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(verifyWebhookSignature(body, "sha256=" + signature, secret), true);
  assert.equal(verifyWebhookSignature(body, "sha256=" + signature.slice(0, -1) + "0", secret), false);
  assert.equal(verifyWebhookSignature(body, "", secret), false);
});

test("compliance blocks precision without HS code", () => {
  const plan = buildComplianceRequirements({ direction: "Export", product: "Basmati Rice", destination: "UAE" });
  assert.equal(plan.requirements.find(x => x.key === "hs_classification").status, "blocked");
  assert.equal(plan.requirements.some(x => x.key === "agri_export"), true);
});
