/* TradeFlow Revenue Agent V1
   Revenue estimation only. Not financial advice.
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

function baseValue(product = "", market = "") {
  let value = 500000;

  const p = product.toLowerCase();
  const m = market.toLowerCase();

  if (p.includes("basmati")) value += 900000;
  else if (p.includes("rice")) value += 650000;
  else if (p.includes("medicine") || p.includes("pharma")) value += 1500000;
  else if (p.includes("jaggery")) value += 450000;
  else if (p.includes("textile")) value += 700000;

  if (m.includes("uae") || m.includes("dubai")) value += 500000;
  else if (m.includes("europe")) value += 900000;
  else if (m.includes("usa")) value += 1000000;
  else if (m.includes("africa")) value += 650000;

  return value;
}

function riskAdjustedScore(product = "", market = "") {
  let score = 55;

  if (product && product !== "General Product") score += 15;
  if (market && market !== "Global Market") score += 15;

  const p = product.toLowerCase();
  const m = market.toLowerCase();

  if (p.includes("basmati") || p.includes("medicine")) score += 5;
  if (m.includes("uae") || m.includes("europe") || m.includes("usa")) score += 5;

  return Math.min(score, 95);
}

function run(input = {}) {
  const ctx = normalizeInput(input);

  const estimatedDealValue = baseValue(ctx.product, ctx.market);
  const estimatedMonthlyPotential = Math.round(estimatedDealValue * 1.8);

  const revenueScenarioLow = Math.round(estimatedDealValue * 0.45);
  const revenueScenarioBase = estimatedDealValue;
  const revenueScenarioHigh = Math.round(estimatedDealValue * 2.25);

  const score = riskAdjustedScore(ctx.product, ctx.market);

  return {
    agent: "Revenue Agent",
    status: "Completed",

    estimatedDealValue,
    estimatedMonthlyPotential,

    marginAssumption: {
      low: "5%",
      base: "10%",
      high: "18%",
      note: "Margin depends on sourcing cost, logistics, payment terms, buyer strength and compliance cost."
    },

    revenueScenarioLow,
    revenueScenarioBase,
    revenueScenarioHigh,

    riskAdjustedScore: score,

    executiveSummary:
      score >= 80
        ? `Strong revenue opportunity detected for ${ctx.direction.toLowerCase()} of ${ctx.product} in ${ctx.market}. Recommended to proceed with verified lead discovery and controlled outreach.`
        : `Revenue opportunity exists for ${ctx.product} in ${ctx.market}, but more buyer/supplier validation is recommended before aggressive execution.`,

    recommendedNextActions: [
      "Validate buyer demand",
      "Collect supplier quotations",
      "Estimate landed cost",
      "Compare competitor pricing",
      "Calculate minimum profitable order quantity",
      "Move qualified opportunity into CRM"
    ]
  };
}

module.exports = {
  run
};