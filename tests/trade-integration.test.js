const test = require("node:test");
const assert = require("node:assert/strict");
const service = require("../backend/services/tradeIntegrationService");

test("integration catalog is truthful about supported execution modes", () => {
  const providers = service.catalog();
  const dgft = providers.find(x => x.providerKey === "dgft");
  const icegate = providers.find(x => x.providerKey === "icegate");
  const portal = providers.find(x => x.providerKey === "trade_connect");
  assert.equal(dgft.mode, "official_portal");
  assert.equal(icegate.mode, "official_portal");
  assert.equal(portal.mode, "official_portal");
});

test("compliance matrix blocks precision when HS code is missing", () => {
  const plan = service.buildComplianceRequirements({ direction: "Export", product: "Basmati Rice", destination: "UAE" });
  assert.equal(plan.requirements.find(x => x.key === "hs_classification").status, "blocked");
  assert.ok(plan.requirements.some(x => x.key === "agri_export"));
});

test("compliance matrix becomes actionable when HS code is supplied", () => {
  const plan = service.buildComplianceRequirements({ direction: "Export", product: "Basmati Rice", hsCode: "10063020", destination: "UAE" });
  assert.equal(plan.requirements.find(x => x.key === "hs_classification").status, "ready");
});

test("webhook signature verification is fail-closed", () => {
  assert.equal(service.verifyWebhookSignature("body", "", "secret"), false);
  assert.equal(service.verifyWebhookSignature("body", "bad", "secret"), false);
});
