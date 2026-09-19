const assert = require("assert");

const { SYSTEM_CATALOG } = require("../backend/services/governmentTradeGateway");

describe("Government Trade Gateway catalog", function () {
  it("contains the core official trade systems", function () {
    const keys = SYSTEM_CATALOG.map((system) => system.systemKey);
    for (const key of ["dgft", "trade_connect", "icegate", "ecgc", "apeda", "msme", "export_promotion_councils"]) {
      assert.ok(keys.includes(key), `Missing ${key}`);
    }
  });

  it("does not advertise direct API execution for portal-only systems", function () {
    const portalSystems = SYSTEM_CATALOG.filter((system) =>
      ["dgft", "icegate", "ecgc", "apeda", "msme", "export_promotion_councils"].includes(system.systemKey)
    );
    assert.ok(portalSystems.every((system) => system.connectionMode === "guided_portal"));
  });

  it("keeps Trade Connect as an official-data layer", function () {
    const tradeConnect = SYSTEM_CATALOG.find((system) => system.systemKey === "trade_connect");
    assert.strictEqual(tradeConnect.connectionMode, "official_data");
    assert.ok(tradeConnect.capabilityKeys.includes("tariff_explorer"));
    assert.ok(tradeConnect.capabilityKeys.includes("trade_agreements"));
  });
});
