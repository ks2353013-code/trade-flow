const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateTradeOpportunityScore } = require("../backend/services/tradeIntelligenceService");
const { verifyLead } = require("../backend/services/leadVerificationEngine");

test("trade opportunity score uses live evidence inputs and returns bounded score", () => {
  const result = calculateTradeOpportunityScore({
    tradeData: {
      marketImports: { latest: { valueUsd: 100000000 }, cagrPercent: 8 },
      indiaMarketSharePercent: 12,
      supplierCompetition: { hhi: 0.2 },
      tariffIntelligence: { latest: { appliedPercent: 5 } }
    },
    verifiedBuyers: 3,
    buyersDiscovered: 6
  });

  assert.equal(result.status, "Calculated from live trade evidence");
  assert.ok(result.score >= 0 && result.score <= 100);
  assert.equal(result.components.length, 6);
});

test("trade opportunity score refuses to fabricate missing market data", () => {
  const result = calculateTradeOpportunityScore({ tradeData: null, verifiedBuyers: 10, buyersDiscovered: 10 });
  assert.equal(result.score, null);
});

test("buyer verification does not label a candidate Verified without independent source evidence", () => {
  const lead = verifyLead({
    companyName: "Example Importer",
    website: "https://example-importer.test",
    email: "buyer@example-importer.test",
    country: "United Arab Emirates",
    product: "oranges",
    source: "serpapi",
    sourceUrl: "https://example-importer.test/about"
  }, {
    product: "oranges",
    market: "United Arab Emirates"
  });

  assert.notEqual(lead.verificationStatus, "Verified");
  assert.equal(lead.independentSourceEvidence, false);
});

test("buyer verification can become Verified only when the evidence criteria are satisfied", () => {
  const lead = verifyLead({
    companyName: "Example Importer",
    website: "https://example-importer.test",
    email: "buyer@example-importer.test",
    country: "United Arab Emirates",
    product: "oranges",
    source: "serpapi",
    sourceUrl: "https://trade-directory.test/example-importer"
  }, {
    product: "oranges",
    market: "United Arab Emirates"
  });

  assert.equal(lead.verificationStatus, "Verified");
  assert.equal(lead.verificationCriteriaMet, true);
});
