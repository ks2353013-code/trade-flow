const express = require("express");
const mongoose = require("mongoose");
const OutreachApproval = require("../models/OutreachApproval");
const ApprovalAuditLog = require("../models/ApprovalAuditLog");
const CRMLead = require("../models/CRMLead");
const TradeMission = require("../models/TradeMission");
const { enforceLimit } = require("../middleware/planLimitMiddleware");
const { usageTracker } = require("../middleware/usageMiddleware");

const router = express.Router();

const CHANNELS = new Set(["Email Draft", "WhatsApp Draft", "Call Script"]);
const EDIT_STATUSES = new Set(["Needs Edit", "Pending Approval"]);
const PRIORITIES = new Set(["Low", "Medium", "High"]);

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeEmail(value = "") {
  return normalizeText(value).toLowerCase();
}

function getOwnerEmail(req) {
  const ownerEmail = req.tenant?.ownerEmail || req.user?.email;

  if (!ownerEmail) {
    throw new Error("Tenant owner email missing");
  }

  return normalizeEmail(ownerEmail);
}

function getUserEmail(req) {
  return normalizeEmail(req.user?.email || getOwnerEmail(req));
}

function requireWorkspace(req) {
  const workspaceId = req.tenant?.workspaceId;

  if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
    return null;
  }

  return workspaceId;
}

function tenantFilter(req) {
  const workspaceId = requireWorkspace(req);
  const filter = {
    ownerEmail: getOwnerEmail(req)
  };

  if (req.tenant?.companyId) {
    filter.companyId = req.tenant.companyId;
  }

  if (workspaceId) {
    filter.workspaceId = workspaceId;
  }

  return filter;
}

function missionTenantFilter(req) {
  const ownerEmail = getOwnerEmail(req);
  const userEmail = getUserEmail(req);
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

function requireActiveWorkspace(req, res) {
  if (requireWorkspace(req)) return true;

  res.status(400).json({
    success: false,
    message: "Active workspace is required for outreach approvals"
  });

  return false;
}

function getLeadType(lead = {}) {
  if (lead.leadType) return normalizeText(lead.leadType);
  if (lead.buyerType) return "Buyer";
  if (lead.supplierType) return "Supplier";
  return "Lead";
}

function getLeadName(lead = {}) {
  return normalizeText(lead.companyName || lead.leadName || lead.name);
}

function defaultSubject(lead = {}, channel = "Email Draft") {
  const leadName = getLeadName(lead) || "your team";

  if (channel === "Call Script") {
    return `Call script for ${leadName}`;
  }

  if (channel === "WhatsApp Draft") {
    return `WhatsApp draft for ${leadName}`;
  }

  return `TradeFlow introduction for ${leadName}`;
}

function defaultMessage(lead = {}, channel = "Email Draft") {
  const leadName = getLeadName(lead) || "there";
  const country = normalizeText(lead.country);
  const leadType = getLeadType(lead).toLowerCase();
  const countryPhrase = country ? ` in ${country}` : "";

  if (channel === "Call Script") {
    return `Draft call script: Introduce TradeFlow, confirm whether ${leadName} is the right ${leadType}${countryPhrase}, and ask for approval before any follow-up is sent.`;
  }

  if (channel === "WhatsApp Draft") {
    return `Draft WhatsApp message: Hello ${leadName}, we are reviewing a verified trade opportunity${countryPhrase}. Please confirm the right contact person before any commercial discussion continues.`;
  }

  return `Draft email: Hello ${leadName}, we are reviewing a verified trade opportunity${countryPhrase}. Please confirm the right contact person and product interest before any commercial discussion continues.`;
}

function buildApprovalPayload(req, input = {}, lead = {}, crmLeadId = null) {
  const channel = CHANNELS.has(input.channel) ? input.channel : "Email Draft";
  const priority = PRIORITIES.has(input.priority) ? input.priority : "Medium";
  const status = input.status === "Draft" ? "Draft" : "Pending Approval";

  return {
    ownerEmail: getOwnerEmail(req),
    companyId: req.tenant?.companyId || null,
    workspaceId: requireWorkspace(req),
    missionId: input.missionId || lead.missionId || null,
    crmLeadId,
    leadName: getLeadName(lead),
    leadType: getLeadType(lead),
    email: normalizeEmail(lead.email),
    phone: normalizeText(lead.phone),
    country: normalizeText(lead.country),
    channel,
    subject: normalizeText(input.subject) || defaultSubject(lead, channel),
    message: normalizeText(input.message) || defaultMessage(lead, channel),
    status,
    priority,
    sourceAgent: normalizeText(input.sourceAgent || lead.sourceAgent || "Outreach Agent"),
    approvalRequired: true
  };
}

async function findTenantMission(req, missionId) {
  if (!missionId) return null;

  if (!mongoose.isValidObjectId(missionId)) {
    throw new Error("Valid missionId is required");
  }

  return TradeMission.findOne({
    _id: missionId,
    ...missionTenantFilter(req)
  })
    .select("_id")
    .lean();
}

async function findTenantCRMLead(req, crmLeadId) {
  if (!crmLeadId) return null;

  if (!mongoose.isValidObjectId(crmLeadId)) {
    throw new Error("Valid crmLeadId is required");
  }

  return CRMLead.findOne({
    _id: crmLeadId,
    ...tenantFilter(req)
  }).lean();
}

function validateVerifiedLead(lead = {}) {
  const hasScore =
    lead.verificationScore !== undefined &&
    lead.verificationScore !== null &&
    lead.verificationScore !== "";

  if (hasScore && Number(lead.verificationScore || 0) < 70) {
    return false;
  }

  return true;
}

function snapshotApproval(approval = {}) {
  return {
    status: approval.status || "",
    subject: approval.subject || "",
    message: approval.message || ""
  };
}

async function appendApprovalAudit(req, approval, action, oldSnapshot = {}) {
  const current = snapshotApproval(approval);

  await ApprovalAuditLog.create({
    ownerEmail: getOwnerEmail(req),
    companyId: req.tenant?.companyId || null,
    workspaceId: requireWorkspace(req),
    outreachApprovalId: approval._id,
    action,
    actorEmail: getUserEmail(req),
    oldStatus: oldSnapshot.status || "",
    newStatus: current.status,
    oldSubject: oldSnapshot.subject || "",
    newSubject: current.subject,
    oldMessage: oldSnapshot.message || "",
    newMessage: current.message,
    timestamp: new Date()
  });
}

function ensureValidApprovalId(id) {
  return mongoose.isValidObjectId(id);
}

router.post(
  "/create",
  enforceLimit("outreach_draft_create"),
  usageTracker("outreach_draft_create"),
  async (req, res) => {
  try {
    if (!requireActiveWorkspace(req, res)) return;

    const input = req.body || {};
    const crmLead = await findTenantCRMLead(req, input.crmLeadId);
    const lead = crmLead || input.lead || {};

    if (!lead || typeof lead !== "object" || !getLeadName(lead)) {
      return res.status(400).json({
        success: false,
        message: "Verified lead details are required"
      });
    }

    if (!validateVerifiedLead(lead)) {
      return res.status(422).json({
        success: false,
        message: "Only verified leads with verificationScore >= 70 can create outreach drafts"
      });
    }

    if (input.missionId) {
      const mission = await findTenantMission(req, input.missionId);

      if (!mission) {
        return res.status(404).json({
          success: false,
          message: "Mission not found for active tenant/workspace"
        });
      }
    }

    const approval = await OutreachApproval.create(
      buildApprovalPayload(req, input, lead, crmLead?._id || null)
    );

    await appendApprovalAudit(req, approval, "Create Draft");

    return res.status(201).json({
      success: true,
      message: "Draft created. Human approval required before sending.",
      approval
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Outreach approval draft creation failed",
      error: error.message
    });
  }
  }
);

router.get("/", async (req, res) => {
  try {
    if (!requireActiveWorkspace(req, res)) return;

    const approvals = await OutreachApproval.find(tenantFilter(req)).sort({
      createdAt: -1
    });

    return res.json({
      success: true,
      approvals
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch outreach approvals",
      error: error.message
    });
  }
});

router.get("/:id/audit", async (req, res) => {
  try {
    if (!requireActiveWorkspace(req, res)) return;

    if (!ensureValidApprovalId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Valid outreach approval id is required"
      });
    }

    const approval = await OutreachApproval.findOne({
      _id: req.params.id,
      ...tenantFilter(req)
    }).select("_id");

    if (!approval) {
      return res.status(404).json({
        success: false,
        message: "Outreach approval not found"
      });
    }

    const audit = await ApprovalAuditLog.find({
      outreachApprovalId: approval._id,
      ...tenantFilter(req)
    }).sort({ timestamp: -1 });

    return res.json({
      success: true,
      audit
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch approval audit trail",
      error: error.message
    });
  }
});

router.post("/:id/approve", async (req, res) => {
  try {
    if (!requireActiveWorkspace(req, res)) return;

    if (!ensureValidApprovalId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Valid outreach approval id is required"
      });
    }

    const approval = await OutreachApproval.findOne(
      {
        _id: req.params.id,
        ...tenantFilter(req)
      }
    );

    if (!approval) {
      return res.status(404).json({
        success: false,
        message: "Outreach approval not found"
      });
    }

    const oldSnapshot = snapshotApproval(approval);

    approval.status = "Approved";
    approval.approvedBy = getUserEmail(req);
    approval.approvedAt = new Date();

    await approval.save();
    await appendApprovalAudit(req, approval, "Approve", oldSnapshot);

    return res.json({
      success: true,
      message: "Draft approved. No message was sent.",
      approval
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Outreach approval failed",
      error: error.message
    });
  }
});

router.post("/:id/reject", async (req, res) => {
  try {
    if (!requireActiveWorkspace(req, res)) return;

    if (!ensureValidApprovalId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Valid outreach approval id is required"
      });
    }

    const approval = await OutreachApproval.findOne(
      {
        _id: req.params.id,
        ...tenantFilter(req)
      }
    );

    if (!approval) {
      return res.status(404).json({
        success: false,
        message: "Outreach approval not found"
      });
    }

    const oldSnapshot = snapshotApproval(approval);

    approval.status = "Rejected";
    approval.rejectedBy = getUserEmail(req);
    approval.rejectedAt = new Date();

    await approval.save();
    await appendApprovalAudit(req, approval, "Reject", oldSnapshot);

    return res.json({
      success: true,
      message: "Draft rejected. No message was sent.",
      approval
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Outreach rejection failed",
      error: error.message
    });
  }
});

router.put("/:id/edit", async (req, res) => {
  try {
    if (!requireActiveWorkspace(req, res)) return;

    if (!ensureValidApprovalId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Valid outreach approval id is required"
      });
    }

    const subject = normalizeText(req.body?.subject);
    const message = normalizeText(req.body?.message);
    const requestedStatus = normalizeText(req.body?.status);
    const status = EDIT_STATUSES.has(requestedStatus)
      ? requestedStatus
      : "Needs Edit";

    if (!subject && !message) {
      return res.status(400).json({
        success: false,
        message: "subject or message is required"
      });
    }

    const approval = await OutreachApproval.findOne(
      {
        _id: req.params.id,
        ...tenantFilter(req)
      }
    );

    if (!approval) {
      return res.status(404).json({
        success: false,
        message: "Outreach approval not found"
      });
    }

    const oldSnapshot = snapshotApproval(approval);

    approval.status = status;
    if (subject) approval.subject = subject;
    if (message) approval.message = message;

    await approval.save();
    await appendApprovalAudit(req, approval, "Edit", oldSnapshot);

    return res.json({
      success: true,
      message: "Draft updated. Human approval still required before sending.",
      approval
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Outreach draft edit failed",
      error: error.message
    });
  }
});

module.exports = router;
