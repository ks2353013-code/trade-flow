const express = require("express");
const mongoose = require("mongoose");
const CRMLead = require("../models/CRMLead");
const TradeMission = require("../models/TradeMission");
const { writeAuditLog } = require("../utils/auditLogger");
const { enforceLimit } = require("../middleware/planLimitMiddleware");
const { usageTracker } = require("../middleware/usageMiddleware");

const router = express.Router();

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeEmail(value = "") {
  return normalizeText(value).toLowerCase();
}

function normalizeWebsite(value = "") {
  let website = normalizeText(value).toLowerCase();

  if (!website) return "";

  website = website.replace(/^http:\/\//, "https://");

  if (!website.startsWith("https://")) {
    website = "https://" + website;
  }

  return website.replace(/\/+$/, "");
}

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getOwnerEmail(req) {
  const ownerEmail = req.tenant?.ownerEmail || req.user?.email;

  if (!ownerEmail) {
    throw new Error("Tenant owner email missing");
  }

  return normalizeEmail(ownerEmail);
}

function requireWorkspace(req) {
  const workspaceId = req.tenant?.workspaceId;

  if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
    return null;
  }

  return workspaceId;
}

function missionTenantFilter(req) {
  const ownerEmail = getOwnerEmail(req);
  const userEmail = normalizeEmail(req.user?.email);
  const emails = [...new Set([ownerEmail, userEmail].filter(Boolean))];
  const filter = {};

  if (emails.length) {
    filter.ownerEmail = { $in: emails };
  }

  if (req.tenant?.companyId) {
    filter.companyId = req.tenant.companyId;
  }

  const workspaceId = requireWorkspace(req);
  if (workspaceId) {
    filter.workspaceId = workspaceId;
  }

  return filter;
}

function getLeadType(lead = {}) {
  if (lead.leadType) return normalizeText(lead.leadType);
  if (lead.buyerType) return "Buyer";
  if (lead.supplierType) return "Supplier";
  return "Lead";
}

function getSourceType(lead = {}) {
  return normalizeText(
    lead.sourceType ||
      lead.buyerType ||
      lead.supplierType ||
      getLeadType(lead)
  );
}

function getSourceAgent(lead = {}) {
  if (lead.sourceAgent) return normalizeText(lead.sourceAgent);
  if (lead.buyerType || getLeadType(lead) === "Buyer") return "Buyer Discovery Agent";
  if (lead.supplierType || getLeadType(lead) === "Supplier") return "Supplier Discovery Agent";
  return "Lead Verification Engine";
}

function buildLeadPayload(req, missionId, lead = {}) {
  const companyName = normalizeText(lead.companyName);
  const verificationScore = Number(lead.verificationScore || 0);

  return {
    companyName,
    leadType: getLeadType(lead),
    sourceType: getSourceType(lead),
    country: normalizeText(lead.country),
    website: normalizeWebsite(lead.website || lead.sourceUrl),
    email: normalizeEmail(lead.email),
    phone: normalizeText(lead.phone),
    confidenceScore: Number(lead.confidenceScore || 0),
    verificationScore,
    verificationStatus: normalizeText(lead.verificationStatus || "Unverified"),
    missionId,
    sourceAgent: getSourceAgent(lead),
    status: "Open",
    stage: "New Lead",
    ownerEmail: getOwnerEmail(req),
    workspaceId: requireWorkspace(req),
    companyId: req.tenant?.companyId || null
  };
}

async function findTenantMission(req, missionId) {
  const filter = {
    _id: missionId,
    ...missionTenantFilter(req)
  };

  return TradeMission.findOne(filter).select("_id").lean();
}

async function findDuplicateLead(payload) {
  return CRMLead.findOne({
    ownerEmail: payload.ownerEmail,
    companyId: payload.companyId,
    workspaceId: payload.workspaceId,
    companyName: new RegExp(`^${escapeRegExp(payload.companyName)}$`, "i"),
    website: payload.website,
    email: payload.email
  });
}

function tenantLeadFilter(req, leadId) {
  const filter = {
    _id: leadId,
    ownerEmail: getOwnerEmail(req)
  };

  const workspaceId = requireWorkspace(req);
  if (workspaceId) {
    filter.workspaceId = workspaceId;
  }

  if (req.tenant?.companyId) {
    filter.companyId = req.tenant.companyId;
  }

  return filter;
}

function safeLeadUpdate(body = {}) {
  const {
    ownerEmail,
    workspaceId,
    companyId,
    missionId,
    sourceAgent,
    createdAt,
    _id,
    id,
    ...safe
  } = body;

  return safe;
}

async function writeCrmLeadAudit(req, action, lead, metadata = {}, severity = "Low") {
  await writeAuditLog(req, {
    module: "CRM",
    action,
    entityType: "CRMLead",
    entityId: String(lead?._id || ""),
    severity,
    metadata: {
      companyName: lead?.companyName || "",
      leadType: lead?.leadType || "",
      stage: lead?.stage || "",
      status: lead?.status || "",
      missionId: lead?.missionId ? String(lead.missionId) : "",
      ...metadata
    }
  });
}

router.post(
  "/push",
  enforceLimit("crm_lead_create"),
  usageTracker("crm_push"),
  async (req, res) => {
  try {
    const { missionId, lead } = req.body || {};

    if (!requireWorkspace(req)) {
      return res.status(400).json({
        success: false,
        message: "Active workspace is required before pushing leads to CRM"
      });
    }

    if (!mongoose.isValidObjectId(missionId)) {
      return res.status(400).json({
        success: false,
        message: "Valid missionId is required"
      });
    }

    if (!lead || typeof lead !== "object") {
      return res.status(400).json({
        success: false,
        message: "Lead payload is required"
      });
    }

    const payload = buildLeadPayload(req, missionId, lead);

    if (!payload.companyName) {
      return res.status(400).json({
        success: false,
        message: "Lead companyName is required"
      });
    }

    if (payload.verificationScore < 70) {
      return res.status(422).json({
        success: false,
        message: "Only leads with verificationScore >= 70 can be pushed to CRM"
      });
    }

    const mission = await findTenantMission(req, missionId);

    if (!mission) {
      return res.status(404).json({
        success: false,
        message: "Mission not found for active tenant/workspace"
      });
    }

    const duplicate = await findDuplicateLead(payload);

    if (duplicate) {
      await writeCrmLeadAudit(req, "Duplicate skipped", duplicate, {
        source: "Mission Center",
        duplicate: true
      });

      return res.status(200).json({
        success: true,
        duplicate: true,
        message: "Lead already exists in CRM",
        lead: duplicate
      });
    }

    const crmLead = await CRMLead.create(payload);

    await writeCrmLeadAudit(req, "CRM push from mission", crmLead, {
      source: "Mission Center",
      verificationScore: crmLead.verificationScore
    });

    await writeCrmLeadAudit(req, "CRM lead created", crmLead, {
      source: "Mission Center",
      createdFrom: "Mission verified lead"
    });

    return res.status(201).json({
      success: true,
      message: "Lead added to CRM",
      lead: crmLead
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "CRM lead push failed",
      error: error.message
    });
  }
  }
);

router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Valid lead id is required"
      });
    }

    const update = safeLeadUpdate(req.body);
    const lead = await CRMLead.findOneAndUpdate(
      tenantLeadFilter(req, req.params.id),
      update,
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "CRM lead not found"
      });
    }

    await writeCrmLeadAudit(req, "Lead updated", lead, {
      updatedFields: Object.keys(update)
    });

    return res.json({
      success: true,
      lead
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "CRM lead update failed",
      error: error.message
    });
  }
});

router.patch("/:id/stage", async (req, res) => {
  try {
    const stage = normalizeText(req.body?.stage);

    if (!stage) {
      return res.status(400).json({
        success: false,
        message: "Lead stage is required"
      });
    }

    const lead = await CRMLead.findOneAndUpdate(
      tenantLeadFilter(req, req.params.id),
      { stage },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "CRM lead not found"
      });
    }

    await writeCrmLeadAudit(req, "Lead stage changed", lead, { stage });

    return res.json({
      success: true,
      lead
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "CRM lead stage update failed",
      error: error.message
    });
  }
});

router.patch("/:id/assign", async (req, res) => {
  try {
    const ownerEmail = normalizeEmail(req.body?.ownerEmail || req.body?.assignedTo);

    if (!ownerEmail) {
      return res.status(400).json({
        success: false,
        message: "Assignee email is required"
      });
    }

    const lead = await CRMLead.findOneAndUpdate(
      tenantLeadFilter(req, req.params.id),
      { assignedToEmail: ownerEmail },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "CRM lead not found"
      });
    }

    await writeCrmLeadAudit(req, "Lead assigned", lead, { assignedTo: ownerEmail });

    return res.json({
      success: true,
      lead
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "CRM lead assignment failed",
      error: error.message
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const lead = await CRMLead.findOneAndDelete(
      tenantLeadFilter(req, req.params.id)
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "CRM lead not found"
      });
    }

    await writeCrmLeadAudit(req, "Lead deleted", lead, {}, "Medium");

    return res.json({
      success: true,
      message: "CRM lead deleted"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "CRM lead delete failed",
      error: error.message
    });
  }
});

module.exports = router;
