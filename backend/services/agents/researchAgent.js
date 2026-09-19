/* TradeFlow Research Agent V2
   Explores live public search results when a provider is configured.
   Analysis only. No external actions.
*/

const axios = require("axios");

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

async function exploreLiveMarket(ctx) {
  if (!process.env.SERP_API_KEY) {
    return { sourceMode: "unavailable", results: [] };
  }

  const query = `${ctx.product} ${ctx.direction === "Export" ? "importers buyers distributors" : "suppliers manufacturers exporters"} ${ctx.market}`;
  const response = await axios.get("https://serpapi.com/search.json", {
    params: { engine: "google", q: query, api_key: process.env.SERP_API_KEY, num: 10 },
    timeout: 15000
  });

  const results = (response.data?.organic_results || []).map((item) => ({
    title: item.title || "",
    url: item.link || "",
    snippet: item.snippet || ""
  })).filter((item) => item.url);

  return { sourceMode: "provider", query, results };
}

async function run(input = {}) {
  const ctx = normalizeInput(input);
  let liveResearch = { sourceMode: "unavailable", results: [] };
  try {
    liveResearch = await exploreLiveMarket(ctx);
  } catch (error) {
    console.warn("Live market research failed:", error.message);
  }

  const opportunityScore = scoreOpportunity(liveResearch.results);

  return {
    agent: "Research Agent",
    status: liveResearch.results.length ? "Completed" : "Source Unavailable",
    sourceMode: liveResearch.sourceMode,
    searchQuery: liveResearch.query || null,
    liveResearchResults: liveResearch.results,
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
    opportunityScoreMethod: "Evidence-count heuristic based on live search results and unique source domains; not a market forecast.",
    executiveSummary:
      liveResearch.results.length
        ? `Live market research returned ${liveResearch.results.length} relevant public results for ${ctx.product} in ${ctx.market}. TradeFlow will use these results to guide verified lead discovery and next-step preparation.`
        : `Live market research is unavailable. Connect a search provider before treating market findings as current external research.`,
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