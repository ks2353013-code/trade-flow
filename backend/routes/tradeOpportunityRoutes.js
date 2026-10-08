const express = require("express");
const router = express.Router();
const TradeOpportunity = require("../models/TradeOpportunity");

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
