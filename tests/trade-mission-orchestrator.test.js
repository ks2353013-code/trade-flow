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
