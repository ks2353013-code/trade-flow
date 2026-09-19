const assert = require("assert");

describe("Trade Mission Orchestrator", function () {
  it("parses a natural-language export goal", function () {
    const source = require("../backend/services/tradeMissionOrchestrator");
    assert.ok(source.createMission);
    assert.ok(source.advanceMission);
    assert.ok(source.completeMissionAction);
  });
});
