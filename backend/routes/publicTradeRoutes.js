const express = require("express");
const { runTradeMission } = require("../services/tradeflowAgentOrchestrator");
const { buildTradeIntelligence } = require("../services/tradeIntelligenceService");

const router = express.Router();

function clean(value, max = 120) {
  return String(value || "").trim().slice(0, max);
}

router.post("/export-challenge", async (req, res) => {
  try {
    const product = clean(req.body?.product);
    const market = clean(req.body?.market || req.body?.country);
    const hsCode = clean(req.body?.hsCode, 12);

    if (!product || !market) {
      return res.status(400).json({
        success: false,
        message: "Product and target market are required."
      });
    }

    const tradeIntelligence = await buildTradeIntelligence({ product, market, hsCode });

    const result = await runTradeMission(
      `Export ${product} to ${market}`,
      { direction: "Export", product, market }
    );

    const research = result.agentReports?.research || {};
    const buyers = result.agentReports?.buyerDiscovery || {};

    const marketSources = Array.isArray(research.liveResearchResults)
      ? research.liveResearchResults.slice(0, 8).map(item => ({
          title: item.title,
          url: item.url,
          snippet: item.snippet
        }))
      : [];

    const discoveredBuyers = Array.isArray(buyers.discoveredBuyers)
      ? buyers.discoveredBuyers.slice(0, 10).map(item => ({
          companyName: item.companyName,
          country: item.country,
          website: item.website,
          sourceUrl: item.sourceUrl || item.website,
          confidenceScore: item.confidenceScore ?? null,
          verificationScore: item.verificationScore ?? null,
          verificationStatus: item.verificationStatus || "Unverified"
        }))
      : [];

    const verifiedBuyers = Array.isArray(buyers.verifiedBuyerLeads)
      ? buyers.verifiedBuyerLeads.length
      : 0;

    const crmReadyBuyers = Array.isArray(buyers.crmReadyVerifiedBuyers)
      ? buyers.crmReadyVerifiedBuyers.length
      : 0;

    return res.json({
      success: true,
      data: {
        product,
        market,
        status: result.status,
        sourceMode: research.sourceMode === "provider" || buyers.sourceMode === "provider"
          ? "live-provider"
          : "unavailable",
        numbers: {
          liveMarketSources: marketSources.length,
          buyersDiscovered: Array.isArray(buyers.discoveredBuyers) ? buyers.discoveredBuyers.length : 0,
          buyersVerified: verifiedBuyers,
          buyersCrmReady: crmReadyBuyers
        },
        opportunityScore: result.opportunityScore ?? null,
        opportunityScoreMethod: research.opportunityScoreMethod || null,
        tradeIntelligence,
        sources: marketSources,
        buyerEvidence: discoveredBuyers,
        nextStep: "Sign in to run the full TradeFlow mission and continue into CRM and approval-gated outreach."
      }
    });
  } catch (error) {
    console.error("Public export challenge failed:", error);
    return res.status(500).json({
      success: false,
      message: "Live trade intelligence is temporarily unavailable. No synthetic result was generated."
    });
  }
});

module.exports = router;
