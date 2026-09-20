const express = require("express");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const {
  runTradeMission
} = require("../services/tradeflowAgentOrchestrator");
const {
  buildTradeIntelligence,
  calculateTradeOpportunityScore,
  searchHsCodes
} = require("../services/tradeIntelligenceService");

const router = express.Router();

const challengeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.PUBLIC_EXPORT_CHALLENGE_RATE_LIMIT || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Export Challenge rate limit reached. Please retry later." }
});

const hsSearchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.PUBLIC_HS_SEARCH_RATE_LIMIT || 60),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "HS search rate limit reached. Please retry later." }
});

const challengeCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

function clean(value, max = 120) {
  return String(value || "").trim().slice(0, max);
}

function cacheKey(product, market, hsCode) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ product: product.toLowerCase(), market: market.toLowerCase(), hsCode }))
    .digest("hex");
}

function compactSources(research = {}) {
  return Array.isArray(research.liveResearchResults)
    ? research.liveResearchResults.slice(0, 8).map(item => ({
        title: item.title,
        url: item.url,
        snippet: item.snippet
      }))
    : [];
}

router.get("/hs-search", hsSearchLimiter, async (req, res) => {
  try {
    const query = clean(req.query?.q, 80);
    if (query.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search requires at least 2 characters."
      });
    }

    const results = await searchHsCodes(query);
    return res.json({
      success: true,
      data: {
        query,
        results,
        source: "World Bank WITS / UNCTAD TRAINS HS product reference",
        message: results.length
          ? "Select a returned HS-6 classification. TradeFlow does not silently classify a product."
          : "No matching HS-6 reference records were found."
      }
    });
  } catch (error) {
    console.error("Public HS search failed:", error);
    return res.status(503).json({
      success: false,
      message: "HS reference search is temporarily unavailable. TradeFlow will not guess a classification."
    });
  }
});

router.post("/export-challenge", challengeLimiter, async (req, res) => {
  try {
    const product = clean(req.body?.product);
    const market = clean(req.body?.market || req.body?.country);
    const hsCode = clean(req.body?.hsCode, 12).replace(/\D/g, "").slice(0, 6);

    if (!product || !market) {
      return res.status(400).json({
        success: false,
        message: "Product and target market are required."
      });
    }

    if (hsCode.length !== 6) {
      return res.status(400).json({
        success: false,
        message: "A valid 6-digit HS code must be selected. TradeFlow does not guess product classification."
      });
    }

    const key = cacheKey(product, market, hsCode);
    const cached = challengeCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({ ...cached.payload, meta: { ...(cached.payload.meta || {}), cached: true } });
    }

    const tradeIntelligence = await buildTradeIntelligence({ product, market, hsCode });
    if (tradeIntelligence.status !== "Live Data" || !tradeIntelligence.data) {
      return res.status(503).json({
        success: false,
        message: tradeIntelligence.message || "Live trade data is unavailable. No synthetic result was generated."
      });
    }

    const result = await runTradeMission(
      `Export ${product} to ${market}`,
      { direction: "Export", product, market }
    );

    const research = result.agentReports?.research || {};
    const buyers = result.agentReports?.buyerDiscovery || {};

    const marketSources = compactSources(research);
    const discoveredBuyers = Array.isArray(buyers.discoveredBuyers)
      ? buyers.discoveredBuyers.slice(0, 10).map(item => ({
          companyName: item.companyName,
          country: item.country,
          website: item.website,
          sourceUrl: item.sourceUrl || item.website,
          confidenceScore: item.confidenceScore ?? null,
          verificationScore: item.verificationScore ?? null,
          verificationStatus: item.verificationStatus || "Unverified",
          verificationSignals: item.verificationSignals || [],
          verificationWarnings: item.verificationWarnings || []
        }))
      : [];

    const verifiedBuyers = Array.isArray(buyers.verifiedBuyerLeads) ? buyers.verifiedBuyerLeads.length : 0;
    const crmReadyBuyers = Array.isArray(buyers.crmReadyVerifiedBuyers) ? buyers.crmReadyVerifiedBuyers.length : 0;
    const opportunity = calculateTradeOpportunityScore({
      tradeData: tradeIntelligence.data,
      verifiedBuyers,
      buyersDiscovered: Array.isArray(buyers.discoveredBuyers) ? buyers.discoveredBuyers.length : 0
    });

    const payload = {
      success: true,
      data: {
        product,
        market,
        hsCode,
        status: result.status,
        sourceMode: "live-trade-data",
        numbers: {
          liveMarketSources: marketSources.length,
          buyersDiscovered: Array.isArray(buyers.discoveredBuyers) ? buyers.discoveredBuyers.length : 0,
          buyersVerified: verifiedBuyers,
          buyersCrmReady: crmReadyBuyers
        },
        opportunityScore: opportunity.score,
        opportunityScoreMethod: opportunity.method,
        opportunityScoreBreakdown: opportunity.components,
        tradeIntelligence,
        sources: marketSources,
        buyerEvidence: discoveredBuyers,
        regulatorySources: {
          spsTbt: {
            status: "Source available",
            provider: "WTO ePing SPS & TBT Platform",
            url: "https://eping.wto.org/",
            note: "TradeFlow exposes the authoritative source. No SPS/TBT requirement is inferred without a matching notification record."
          },
          quantitativeRestrictions: {
            status: "Source available",
            provider: "WTO Quantitative Restrictions database",
            url: "https://apiportal.wto.org/apis",
            note: "No restriction is inferred when a product-specific API result is unavailable."
          }
        },
        nextStep: "Sign in to run the full TradeFlow mission and continue into CRM and approval-gated outreach."
      },
      meta: {
        cached: false,
        generatedAt: new Date().toISOString(),
        methodologyVersion: "trade-opportunity-v1"
      }
    };

    challengeCache.set(key, { payload, expiresAt: Date.now() + CACHE_TTL_MS });

    return res.json(payload);
  } catch (error) {
    console.error("Public export challenge failed:", error);
    return res.status(503).json({
      success: false,
      message: "Live trade intelligence is temporarily unavailable. No synthetic result was generated."
    });
  }
});

module.exports = router;
