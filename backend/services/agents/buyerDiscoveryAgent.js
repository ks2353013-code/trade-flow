/* TradeFlow Buyer Discovery Agent V1
   Analysis and strategy only. No external outreach.
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

function run(input = {}) {
  const ctx = normalizeInput(input);

  const targetBuyerTypes = getBuyerTypes(ctx);

  const estimatedBuyerFitScore =
    ctx.product !== "General Product" && ctx.market !== "Global Market"
      ? 86
      : 62;

  return {
    agent: "Buyer Discovery Agent",
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
    recommendedNextActions: [
      "Generate buyer lead list",
      "Verify buyer contact details",
      "Score buyer fit",
      "Prepare outreach message",
      "Push qualified buyers into CRM"
    ]
  };
}

module.exports = {
  run
};