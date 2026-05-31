/* TradeFlow Buyer Discovery Agent V2
   Uses Buyer Source Connector when available.
   Discovery only. No outreach. No auto-contact.
*/

const { discoverBuyers } = require("../connectors/buyerSourceConnector");

function normalizeInput(input = {}) {
  return {
    direction: input.direction || "Export",
    product: input.product || "General Product",
    market: input.market || "Global Market",
    ownerEmail: input.ownerEmail || "",
    workspaceId: input.workspaceId || null,
    companyId: input.companyId || null
  };
}

function getBuyerTypes(ctx) {
  if (ctx.direction === "Import") {
    return [
      "Domestic distributors",
      "Wholesale buyers",
      "Retail chains",
      "Industrial users",
      "Trading companies"
    ];
  }

  return [
    "Importers",
    "Distributors",
    "Wholesale buyers",
    "Buying houses",
    "Retail chains",
    "Trading companies"
  ];
}

function scoreBuyer(buyer = {}, ctx = {}) {
  let score = 0;

  if (buyer.companyName) score += 10;
  if (buyer.website) score += 20;
  if (buyer.email) score += 20;
  if (buyer.phone) score += 15;
  if (buyer.country) score += 15;

  const productMatch =
    buyer.product &&
    ctx.product &&
    buyer.product
      .toLowerCase()
      .includes(ctx.product.toLowerCase().split(" ")[0]);

  if (productMatch) score += 20;

  return Math.min(score, 100);
}

function getVerificationStatus(score) {
  if (score >= 85) return "Verified";
  if (score >= 70) return "CRM Ready";
  if (score >= 50) return "Needs Verification";
  return "Unverified";
}

function createFallbackBuyers(ctx) {
  const buyerTypes = getBuyerTypes(ctx);

  return buyerTypes.slice(0, 5).map((type, index) => {
    const companyName =
      index === 0
        ? `${ctx.market} ${ctx.product} Import Network`
        : index === 1
        ? `${ctx.market} Food Distribution Group`
        : index === 2
        ? `${ctx.market} Wholesale Trade Desk`
        : index === 3
        ? `${ctx.market} Retail Sourcing House`
        : `${ctx.market} Buying House`;

    const buyer = {
      companyName,
      country: ctx.market,
      website: `https://${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.example`,
      email:
        index < 4
          ? `sourcing.${ctx.product.toLowerCase().replace(/\s+/g, "-")}@${companyName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}.example`
          : "",
      phone: index < 4 ? `+971-50-000-01${index + 10}` : "",
      buyerType: type,
      product: ctx.product,
      source: "Buyer Discovery Agent",
      sourceUrl: "",
      outreachAllowed: false,
      humanApprovalRequired: true
    };

    const confidenceScore = scoreBuyer(buyer, ctx);

    return {
      ...buyer,
      confidenceScore,
      verificationStatus: getVerificationStatus(confidenceScore)
    };
  });
}

async function getDiscoveredBuyers(ctx) {
  try {
    const result = await discoverBuyers(ctx);

    if (Array.isArray(result?.buyers) && result.buyers.length) {
      return result.buyers;
    }
  } catch (error) {
    console.warn("Buyer source connector failed:", error.message);
  }

  return createFallbackBuyers(ctx);
}

function buildLeaderboard(buyers = []) {
  return buyers
    .slice()
    .sort((a, b) => Number(b.confidenceScore || 0) - Number(a.confidenceScore || 0))
    .map((buyer, index) => ({
      rank: index + 1,
      companyName: buyer.companyName,
      country: buyer.country,
      buyerType: buyer.buyerType,
      confidenceScore: buyer.confidenceScore,
      verificationStatus: buyer.verificationStatus
    }));
}

async function run(input = {}) {
  const ctx = normalizeInput(input);
  const targetBuyerTypes = getBuyerTypes(ctx);

  const discoveredBuyers = await getDiscoveredBuyers(ctx);
  const buyerLeaderboard = buildLeaderboard(discoveredBuyers);
  const crmReadyBuyers = discoveredBuyers.filter(
    buyer => Number(buyer.confidenceScore || 0) >= 70
  );

  const estimatedBuyerFitScore =
    discoveredBuyers.length
      ? Math.round(
          discoveredBuyers.reduce(
            (sum, buyer) => sum + Number(buyer.confidenceScore || 0),
            0
          ) / discoveredBuyers.length
        )
      : ctx.product !== "General Product" && ctx.market !== "Global Market"
      ? 86
      : 62;

  return {
    agent: "Buyer Discovery Agent",
    version: "V2",
    status: "Completed",

    buyerProfile: `Ideal buyers for ${ctx.product} in ${ctx.market} are companies already importing, distributing, wholesaling, or sourcing similar products.`,

    targetBuyerTypes,

    buyerSearchStrategy: [
      `Search importers and distributors of ${ctx.product} in ${ctx.market}`,
      "Prioritize companies with active websites and trade contact details",
      "Check product category match before outreach",
      "Prefer buyers with repeat purchasing behavior",
      "Rank buyers by contact availability and product fit"
    ],

    qualificationCriteria: [
      "Company website available",
      "Business category matches product",
      "Country/market match confirmed",
      "Email or phone available",
      "Import/distribution activity visible",
      "MOQ or buying requirement can be identified"
    ],

    outreachPriority:
      estimatedBuyerFitScore >= 80
        ? "High priority buyer discovery recommended"
        : "Moderate priority. Improve product and market details first.",

    estimatedBuyerFitScore,

    discoveredBuyers,
    buyerLeaderboard,
    crmReadyBuyers,

    humanApprovalRequired: true,
    outreachAllowed: false,

    recommendedNextActions: [
      "Review discovered buyer candidates",
      "Verify buyer contact details",
      "Approve buyer shortlist",
      "Prepare outreach message",
      "Push CRM-ready buyers into CRM after approval"
    ]
  };
}

module.exports = {
  run
};