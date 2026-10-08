const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const TradeOpportunity = require("../models/TradeOpportunity");
const CRMLead = require("../models/CRMLead");
const TradeMission = require("../models/TradeMission");

function identity(req) {
  return {
    ownerEmail: String(req.user?.email || req.tenant?.ownerEmail || "").toLowerCase().trim(),
    workspaceId: req.workspaceId || req.tenant?.workspaceId || req.headers["x-workspace-id"] || "",
    companyId: req.tenant?.companyId || req.user?.companyId || null
  };
}

function scope(req) {
  const id = identity(req);
  return {
    ownerEmail: id.ownerEmail,
    workspaceId: id.workspaceId,
    ...(id.companyId ? { companyId: id.companyId } : {})
  };
}


function nextBestActionFor(lead = {}) {
  const score = Number(lead.verificationScore || lead.confidenceScore || 0);
  const stage = String(lead.stage || "New Lead").toLowerCase();
  if (stage.includes("negotiat")) return { action: "Review negotiation position", reason: "The opportunity is already in negotiation; protect margin and move toward a commercial decision." };
  if (stage.includes("contact") || stage.includes("outreach")) return { action: "Follow up on approved outreach", reason: "The opportunity has entered the contact stage and needs a response or follow-up." };
  if (score >= 85) return { action: "Prepare approval-first outreach", reason: "High verification confidence makes this a strong candidate for the next controlled commercial action." };
  if (score >= 70) return { action: "Review evidence and qualify", reason: "The lead is CRM-eligible but should be qualified before external outreach." };
  return { action: "Re-verify opportunity", reason: "Evidence confidence is not yet strong enough for a high-value external action." };
}

router.post("/sync-mission/:missionId", async (req, res) => {
  try {
    const s = scope(req);
    if (!s.ownerEmail || !s.workspaceId) return res.status(400).json({ success:false, message:"Workspace context required" });
    if (!mongoose.isValidObjectId(req.params.missionId)) return res.status(400).json({ success:false, message:"Valid missionId required" });
    const mission = await TradeMission.findOne({ _id:req.params.missionId, ...s }).lean();
    if (!mission) return res.status(404).json({ success:false, message:"Mission not found" });
    const leads = await CRMLead.find({ missionId:mission._id, ...s }).lean();
    const results = [];
    for (const lead of leads) {
      const nba = nextBestActionFor(lead);
      const existing = await TradeOpportunity.findOne({
        ...s, crmLeadId: lead._id
      });
      const payload = {
        ...s,
        missionId: mission._id,
        crmLeadId: lead._id,
        type: /supplier/i.test(lead.leadType) ? "Supplier" : "Buyer",
        companyName: lead.companyName,
        country: lead.country,
        website: lead.website,
        email: lead.email,
        phone: lead.phone,
        stage: String(lead.stage || "New Lead").toLowerCase().replace(/\s+/g, "_"),
        fitScore: Number(lead.confidenceScore || 0),
        verificationScore: Number(lead.verificationScore || 0),
        confidenceScore: Number(lead.confidenceScore || 0),
        freshness: lead.verificationStatus && /verified/i.test(lead.verificationStatus) ? "fresh" : "unknown",
        nextBestAction: nba.action,
        nextBestActionReason: nba.reason,
        evidence: Array.isArray(mission.sourceEvidence?.counterparties) ? mission.sourceEvidence.counterparties.slice(0,10) : []
      };
      results.push(existing
        ? await TradeOpportunity.findOneAndUpdate({ _id:existing._id, ...s }, {$set:payload}, {new:true})
        : await TradeOpportunity.create(payload));
    }
    res.json({ success:true, missionId:String(mission._id), synced:results.length, opportunities:results });
  } catch (error) {
    res.status(500).json({ success:false, message:"Failed to sync mission opportunities" });
  }
});

router.get("/", async (req, res) => {
  try {
    const s = scope(req);
    if (!s.ownerEmail || !s.workspaceId) return res.status(400).json({ success:false, message:"Workspace context required" });
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 100);
    const opportunities = await TradeOpportunity.find(s).sort({ fitScore:-1, updatedAt:-1 }).limit(limit).lean();
    res.json({ success:true, opportunities });
  } catch (error) {
    res.status(500).json({ success:false, message:"Failed to load opportunities" });
  }
});

router.post("/", async (req, res) => {
  try {
    const s = scope(req);
    if (!s.ownerEmail || !s.workspaceId) return res.status(400).json({ success:false, message:"Workspace context required" });
    const body = req.body || {};
    if (!body.companyName || !body.type) return res.status(400).json({ success:false, message:"companyName and type are required" });
    const opportunity = await TradeOpportunity.create({
      ...body,
      ...s,
      evidence: Array.isArray(body.evidence) ? body.evidence : []
    });
    res.status(201).json({ success:true, opportunity });
  } catch (error) {
    res.status(500).json({ success:false, message:"Failed to create opportunity" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const opportunity = await TradeOpportunity.findOneAndUpdate(
      { _id:req.params.id, ...scope(req) },
      { $set:req.body || {} },
      { new:true, runValidators:true }
    );
    if (!opportunity) return res.status(404).json({ success:false, message:"Opportunity not found" });
    res.json({ success:true, opportunity });
  } catch (error) {
    res.status(500).json({ success:false, message:"Failed to update opportunity" });
  }
});

module.exports = router;
