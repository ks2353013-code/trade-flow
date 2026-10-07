const test = require("node:test");
const assert = require("node:assert/strict");

const {
  calculateFreshnessScore,
  calculateTradeIntentScore,
  buildVerificationEvidence,
  buildLeadIntelligence
} = require("../backend/services/tradeLeadIntelligence");

test("freshness score decays as verification data ages", () => {
  const now = new Date("2026-10-08T00:00:00.000Z");
  assert.equal(calculateFreshnessScore({ verifiedAt: "2026-10-08T00:00:00.000Z" }, now).score, 100);
  assert.equal(calculateFreshnessScore({ verifiedAt: "2026-07-10T00:00:00.000Z" }, now).status, "Aging");
  assert.equal(calculateFreshnessScore({ verifiedAt: "2025-01-01T00:00:00.000Z" }, now).status, "Very Stale");
});

test("trade intent is explainable and rewards verified, fresh, relevant leads", () => {
  const lead = {
    companyName: "Example Foods",
    product: "Organic Turmeric Powder",
    country: "Germany",
    email: "buyer@example.com",
    emailValid: true,
    verificationScore: 92,
    confidenceScore: 88,
    verifiedAt: "2026-10-06T00:00:00.000Z"
  };

  const result = calculateTradeIntentScore(
    lead,
    { product: "Organic Turmeric Powder", market: "Germany" },
    new Date("2026-10-08T00:00:00.000Z")
  );

  assert.ok(result.score >= 80);
  assert.equal(result.status, "High Intent");
  assert.ok(result.evidence.length >= 3);
});

test("verification evidence never claims evidence that is not present", () => {
  const result = buildVerificationEvidence({
    verificationScore: 55,
    verificationStatus: "Needs Verification",
    verificationWarnings: ["No registry evidence"],
    website: "https://example.com"
  });

  assert.equal(result.evidence.length, 1);
  assert.equal(result.evidence[0].type, "business_website");
  assert.ok(result.warnings.includes("No registry evidence"));
  assert.ok(result.warnings.some(item => item.includes("below CRM confidence threshold")));
});

test("lead intelligence returns verification, intent and freshness together", () => {
  const result = buildLeadIntelligence({
    companyName: "Example",
    website: "https://example.com",
    sourceUrl: "https://source.example.org/company",
    verificationScore: 80,
    confidenceScore: 80,
    verifiedAt: "2026-10-01T00:00:00.000Z"
  }, { product: "Rice", market: "UAE" }, new Date("2026-10-08T00:00:00.000Z"));

  assert.equal(typeof result.verification.verificationScore, "number");
  assert.equal(typeof result.intent.score, "number");
  assert.equal(typeof result.freshness.score, "number");
});
