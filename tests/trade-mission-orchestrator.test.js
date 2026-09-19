const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseGoal
} = require("../backend/services/tradeMissionOrchestrator");
const { detectMission } = require("../backend/services/tradeflowAgentOrchestrator");

test("parses arbitrary natural-language export goals without losing product or market", () => {
  const goal = parseGoal({ goal: "I want to export Organic Turmeric Powder from India to Germany" });
  assert.equal(goal.direction, "Export");
  assert.equal(goal.product, "Organic Turmeric Powder");
  assert.equal(goal.market, "Germany");
});

test("parses import goals", () => {
  const goal = parseGoal({ goal: "I want to import industrial machinery into India" });
  assert.equal(goal.direction, "Import");
  assert.equal(goal.product, "industrial machinery");
  assert.equal(goal.market, "India");
});

test("structured mission context overrides legacy keyword detection", () => {
  const detected = detectMission("I want to export my product to Germany", {
    direction: "Export",
    product: "Organic Turmeric Powder",
    market: "Germany"
  });
  assert.deepEqual(detected, {
    direction: "Export",
    product: "Organic Turmeric Powder",
    market: "Germany"
  });
});

test("mission execution exports real orchestration entry points", () => {
  const source = require("../backend/services/tradeMissionOrchestrator");
  assert.equal(typeof source.createMission, "function");
  assert.equal(typeof source.advanceMission, "function");
  assert.equal(typeof source.completeMissionAction, "function");
});


test("research agent supports live exploration without fabricating results", async () => {
  const research = require("../backend/services/agents/researchAgent");
  const result = await research.run({ product: "Basmati Rice", market: "UAE", direction: "Export" });
  if (!process.env.SERP_API_KEY) {
    assert.equal(result.status, "Source Unavailable");
    assert.deepEqual(result.liveResearchResults, []);
    assert.equal(result.opportunityScore, null);
  }
});


test("supplier discovery does not reference results before initialization", async () => {
  const supplier = require("../backend/services/agents/supplierDiscoveryAgent");
  const result = await supplier.run({ product: "Basmati Rice", market: "UAE", direction: "Import" });
  assert.ok(["Completed", "Source Unavailable"].includes(result.status));
  assert.ok(Array.isArray(result.discoveredSuppliers));
});

test("revenue agent does not invent a deal value without commercial inputs", () => {
  const revenue = require("../backend/services/agents/revenueAgent");
  const result = revenue.run({ product: "Basmati Rice", market: "UAE", direction: "Export" });
  assert.equal(result.estimatedDealValue, null);
  assert.equal(result.riskAdjustedScore, null);
});

test("revenue agent calculates only from supplied commercial inputs", () => {
  const revenue = require("../backend/services/agents/revenueAgent");
  const result = revenue.run({ product: "Rice", market: "UAE", quantity: 1000, unitPrice: 120, currency: "USD", expectedMargin: 10 });
  assert.equal(result.estimatedDealValue, 120000);
  assert.equal(result.estimatedGrossMargin, 12000);
});

test("compliance agent remains preliminary without live official-source evidence", async () => {
  const compliance = require("../backend/services/agents/complianceAgent");
  const result = await compliance.run({ product: "Basmati Rice", market: "UAE", direction: "Export" });
  assert.ok(["Completed", "Preliminary"].includes(result.status));
  assert.ok(Array.isArray(result.requiredDocuments));
});
