/* TradeFlow Research Agent V1
   Analysis only. No external actions.
*/

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

function scoreOpportunity({ product, market }) {
  let score = 55;

  if (product && product !== "General Product") score += 15;
  if (market && market !== "Global Market") score += 15;

  const premiumProducts = ["Basmati Rice", "Medicine", "Textile"];
  const premiumMarkets = ["UAE", "Europe", "USA"];

  if (premiumProducts.includes(product)) score += 8;
  if (premiumMarkets.includes(market)) score += 7;

  return Math.min(score, 95);
}

function run(input = {}) {
  const ctx = normalizeInput(input);
  const opportunityScore = scoreOpportunity(ctx);

  return {
    agent: "Research Agent",
    status: "Completed",
    marketOverview: `${ctx.market} is being evaluated as a target market for ${ctx.direction.toLowerCase()} of ${ctx.product}. The opportunity depends on buyer demand, pricing, logistics, compliance requirements, and competitor presence.`,
    demandAnalysis: `Demand should be validated through importer activity, distributor interest, trade directories, inquiry volume, and product-specific buying behavior for ${ctx.product}.`,
    competitorAnalysis: `Main competition may come from established exporters, local distributors, regional suppliers, and price-focused trading companies already serving ${ctx.market}.`,
    riskAnalysis: [
      "Price volatility",
      "Unverified buyers or suppliers",
      "Freight and logistics cost changes",
      "Payment default risk",
      "Compliance or documentation gaps"
    ],
    pricingAnalysis: `Pricing should compare landed cost, export price, logistics cost, margin expectation, buyer MOQ, and competitor pricing for ${ctx.product} in ${ctx.market}.`,
    opportunityScore,
    executiveSummary:
      opportunityScore >= 80
        ? `Strong ${ctx.direction.toLowerCase()} opportunity detected for ${ctx.product} in ${ctx.market}. Recommended to proceed with verified lead discovery and controlled outreach.`
        : `Developing opportunity for ${ctx.product} in ${ctx.market}. More buyer/supplier validation is recommended before aggressive outreach.`,
    nextActions: [
      "Validate market demand",
      "Find verified buyers/suppliers",
      "Compare competitor pricing",
      "Prepare outreach draft",
      "Review compliance requirements"
    ]
  };
}

module.exports = {
  run
};