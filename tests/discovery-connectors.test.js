const test = require("node:test");
const assert = require("node:assert/strict");

const { discoverBuyers } = require("../backend/services/connectors/buyerSourceConnector");
const { discoverSuppliers } = require("../backend/services/connectors/supplierSourceConnector");

test("buyer discovery never fabricates companies when no live provider is configured", async () => {
  const result = await discoverBuyers({ product: "Basmati Rice", market: "UAE", direction: "Export" });
  if (!process.env.SERP_API_KEY) {
    assert.equal(result.sourceMode, "unavailable");
    assert.equal(result.total, 0);
    assert.deepEqual(result.buyers, []);
  }
});

test("supplier discovery never fabricates companies when no live provider is configured", async () => {
  const result = await discoverSuppliers({ product: "Industrial Machinery", market: "India", direction: "Import" });
  if (!process.env.SERP_API_KEY) {
    assert.equal(result.sourceMode, "unavailable");
    assert.equal(result.total, 0);
    assert.deepEqual(result.suppliers, []);
  }
});
