/* TradeFlow Buyer Source Connector V1
   Provider-ready buyer discovery connector.
   No outreach. No auto-contact. Discovery only.
*/

const axios = require("axios");

function normalizeInput(input = {}) {
  return {
    product: input.product || "General Product",
    market: input.market || "Global Market",
    direction: input.direction || "Export"
  };
}

function scoreBuyer(buyer = {}, ctx = {}) {
  let score = 0;

  if (buyer.companyName) score += 10;
  if (buyer.website) score += 20;
  if (buyer.email) score += 20;
  if (buyer.phone) score += 15;
  if (buyer.country) score += 15;
  if (
    buyer.product &&
    ctx.product &&
    buyer.product.toLowerCase().includes(ctx.product.toLowerCase().split(" ")[0])
  ) {
    score += 20;
  }

  return Math.min(score, 100);
}

function getVerificationStatus(score) {
  if (score >= 85) return "High Confidence";
  if (score >= 70) return "CRM Ready";
  if (score >= 50) return "Needs Verification";
  return "Unverified";
}

function normalizeBuyer(raw = {}, ctx = {}) {
  const buyer = {
    companyName:
      raw.companyName ||
      raw.name ||
      raw.title ||
      "Unknown Buyer",

    country:
      raw.country ||
      ctx.market ||
      "",

    product:
      raw.product ||
      ctx.product ||
      "",

    website:
      raw.website ||
      raw.link ||
      raw.url ||
      "",

    email:
      raw.email ||
      "",

    phone:
      raw.phone ||
      "",

    buyerType:
      raw.buyerType ||
      raw.type ||
      "Importer",

    source:
      raw.source ||
      "Buyer Source Connector",

    sourceUrl:
      raw.sourceUrl ||
      raw.website ||
      raw.link ||
      "",

    discoveredAt: new Date().toISOString()
  };

  const confidenceScore = scoreBuyer(buyer, ctx);

  return {
    ...buyer,
    confidenceScore,
    verificationStatus: getVerificationStatus(confidenceScore),
    outreachAllowed: false,
    humanApprovalRequired: true
  };
}

function mockBuyerSource(ctx) {
  const productSlug = ctx.product.toLowerCase().replace(/\s+/g, "-");
  const marketSlug = ctx.market.toLowerCase().replace(/\s+/g, "-");

  return [
    {
      companyName: `${ctx.market} ${ctx.product} Import Network`,
      country: ctx.market,
      product: ctx.product,
      website: `https://${marketSlug}-${productSlug}-import-network.example`,
      email: `sourcing@${marketSlug}-${productSlug}-import-network.example`,
      phone: "+971-50-000-1001",
      buyerType: "Importer",
      source: "Mock Buyer Source"
    },
    {
      companyName: `${ctx.market} Food Distribution Group`,
      country: ctx.market,
      product: ctx.product,
      website: `https://${marketSlug}-food-distribution.example`,
      email: `procurement@${marketSlug}-food-distribution.example`,
      phone: "+971-50-000-1002",
      buyerType: "Distributor",
      source: "Mock Buyer Source"
    },
    {
      companyName: `${ctx.market} Wholesale Trade Desk`,
      country: ctx.market,
      product: ctx.product,
      website: `https://${marketSlug}-wholesale-trade.example`,
      email: "",
      phone: "+971-50-000-1003",
      buyerType: "Wholesaler",
      source: "Mock Buyer Source"
    }
  ];
}

async function serpApiBuyerSource(ctx) {
  if (!process.env.SERP_API_KEY) return [];

  const query = `${ctx.product} importers buyers distributors ${ctx.market}`;

  const response = await axios.get("https://serpapi.com/search.json", {
    params: {
      engine: "google",
      q: query,
      api_key: process.env.SERP_API_KEY,
      num: 10
    },
    timeout: 15000
  });

  const results = response.data?.organic_results || [];

  return results.map((item) => ({
    companyName: item.title || "Buyer Result",
    country: ctx.market,
    product: ctx.product,
    website: item.link || "",
    email: "",
    phone: "",
    buyerType: "Potential Buyer",
    source: "SerpAPI",
    sourceUrl: item.link || ""
  }));
}

async function discoverBuyers(input = {}) {
  const ctx = normalizeInput(input);

  let rawBuyers = [];

  try {
    const serpResults = await serpApiBuyerSource(ctx);
    rawBuyers = rawBuyers.concat(serpResults);
  } catch (error) {
    console.warn("Buyer SerpAPI source failed:", error.message);
  }

  if (!rawBuyers.length) {
    rawBuyers = mockBuyerSource(ctx);
  }

  const buyers = rawBuyers
    .map((buyer) => normalizeBuyer(buyer, ctx))
    .sort((a, b) => b.confidenceScore - a.confidenceScore);

  return {
    sourceMode: process.env.SERP_API_KEY ? "provider" : "mock",
    product: ctx.product,
    market: ctx.market,
    total: buyers.length,
    buyers,
    crmReadyBuyers: buyers.filter((buyer) => buyer.confidenceScore >= 70),
    humanApprovalRequired: true,
    note: "Discovery only. Outreach is disabled until user approval."
  };
}

module.exports = {
  discoverBuyers,
  normalizeBuyer,
  scoreBuyer
};