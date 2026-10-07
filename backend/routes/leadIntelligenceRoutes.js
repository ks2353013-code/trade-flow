const express = require("express");
const mongoose = require("mongoose");
const CRMLead = require("../models/CRMLead");
const { buildLeadIntelligence } = require("../services/tradeLeadIntelligence");

const router = express.Router();

function tenantFilter(req) {
  const ownerEmail = String(req.tenant?.ownerEmail || req.user?.email || "").toLowerCase().trim();
  const filter = { ownerEmail };

  if (req.tenant?.companyId) filter.companyId = req.tenant.companyId;
  if (req.tenant?.workspaceId) filter.workspaceId = req.tenant.workspaceId;

  return filter;
}

function context(req) {
  return {
    product: req.query.product || "",
    market: req.query.market || ""
  };
}

router.get("/", async (req, res) => {
  try {
    const leads = await CRMLead.find(tenantFilter(req))
      .sort({ tradeIntentScore: -1, verificationScore: -1, createdAt: -1 })
      .limit(50)
      .lean();

    const enriched = leads.map(lead => ({
      leadId: String(lead._id),
      companyName: lead.companyName,
      leadType: lead.leadType,
      country: lead.country,
      verificationScore: lead.verificationScore,
      verificationStatus: lead.verificationStatus,
      freshnessScore: lead.freshnessScore,
      freshnessStatus: lead.freshnessStatus,
      tradeIntentScore: lead.tradeIntentScore,
      tradeIntentStatus: lead.tradeIntentStatus,
      evidence: lead.intelligenceEvidence || [],
      warnings: lead.verificationWarnings || []
    }));

    return res.json({
      success: true,
      count: enriched.length,
      leads: enriched
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lead intelligence listing failed",
      error: error.message
    });
  }
});

router.get("/:leadId", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.leadId)) {
      return res.status(400).json({ success: false, message: "Valid lead id is required" });
    }

    const lead = await CRMLead.findOne({
      _id: req.params.leadId,
      ...tenantFilter(req)
    }).lean();

    if (!lead) {
      return res.status(404).json({ success: false, message: "CRM lead not found" });
    }

    return res.json({
      success: true,
      leadId: String(lead._id),
      intelligence: buildLeadIntelligence(lead, context(req))
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lead intelligence calculation failed",
      error: error.message
    });
  }
});

router.post("/:leadId/refresh", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.leadId)) {
      return res.status(400).json({ success: false, message: "Valid lead id is required" });
    }

    const lead = await CRMLead.findOne({
      _id: req.params.leadId,
      ...tenantFilter(req)
    });

    if (!lead) {
      return res.status(404).json({ success: false, message: "CRM lead not found" });
    }

    const intelligence = buildLeadIntelligence(lead.toObject(), {
      product: req.body?.product || "",
      market: req.body?.market || ""
    });

    lead.freshnessScore = intelligence.freshness.score;
    lead.freshnessStatus = intelligence.freshness.status;
    lead.freshnessAgeDays = intelligence.freshness.ageDays;
    lead.tradeIntentScore = intelligence.intent.score;
    lead.tradeIntentStatus = intelligence.intent.status;
    lead.intelligenceEvidence = intelligence.intent.evidence;
    lead.verificationEvidence = intelligence.verification.evidence;
    lead.verificationWarnings = intelligence.verification.warnings;
    lead.intelligenceUpdatedAt = new Date();

    await lead.save();

    return res.json({
      success: true,
      lead,
      intelligence
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lead intelligence refresh failed",
      error: error.message
    });
  }
});

module.exports = router;
