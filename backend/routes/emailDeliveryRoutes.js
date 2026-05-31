const express = require("express");
const EmailDelivery = require("../models/EmailDelivery");
const OutreachApproval = require("../models/OutreachApproval");
const { sendApprovedEmail } = require("../services/emailSender");

const router = express.Router();

function getOwnerEmail(req) {
  if (!req.user?.email) throw new Error("Authenticated user email missing");
  return String(req.user.email).toLowerCase().trim();
}

function tenantFilter(req) {
  return {
    ownerEmail: getOwnerEmail(req),
    companyId: req.tenant?.companyId || null,
    workspaceId: req.tenant?.workspaceId || null
  };
}

router.get("/", async (req, res) => {
  try {
    const deliveries = await EmailDelivery.find(tenantFilter(req)).sort({ createdAt: -1 });

    res.json({
      success: true,
      deliveries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch email deliveries",
      error: error.message
    });
  }
});

router.post("/send-approved/:approvalId", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    if (!req.tenant?.workspaceId) {
      return res.status(400).json({
        success: false,
        message: "Active workspace required"
      });
    }

    const approval = await OutreachApproval.findOne({
      _id: req.params.approvalId,
      ...tenantFilter(req)
    });

    if (!approval) {
      return res.status(404).json({
        success: false,
        message: "Outreach approval not found"
      });
    }

    if (approval.status !== "Approved") {
      return res.status(403).json({
        success: false,
        message: "Only approved drafts can be sent"
      });
    }

    if (approval.channel !== "Email Draft") {
      return res.status(400).json({
        success: false,
        message: "Only Email Draft channel can be sent by this route"
      });
    }

    if (!approval.email) {
      return res.status(400).json({
        success: false,
        message: "Lead email is missing"
      });
    }

    const result = await sendApprovedEmail({
      to: approval.email,
      subject: approval.subject,
      message: approval.message
    });

    const delivery = await EmailDelivery.create({
      ownerEmail,
      companyId: req.tenant?.companyId || null,
      workspaceId: req.tenant?.workspaceId,

      outreachApprovalId: approval._id,
      missionId: approval.missionId || null,
      crmLeadId: approval.crmLeadId || null,

      to: approval.email,
      subject: approval.subject,
      message: approval.message,

      status: result.dryRun ? "Dry Run" : "Sent",
      provider: "SMTP",
      providerMessageId: result.messageId || "",
      providerResponse: result.response || {},
      sentBy: ownerEmail,
      sentAt: new Date(),
      humanApproved: true
    });

    res.json({
      success: true,
      message: result.dryRun
        ? "Dry run completed. SMTP is not configured, so email was not sent."
        : "Approved email sent successfully.",
      delivery
    });
  } catch (error) {
    const delivery = await EmailDelivery.create({
      ownerEmail: req.user?.email || "unknown",
      companyId: req.tenant?.companyId || null,
      workspaceId: req.tenant?.workspaceId || null,
      outreachApprovalId: req.params.approvalId,
      to: "unknown",
      subject: "Failed delivery",
      message: "",
      status: "Failed",
      errorMessage: error.message,
      sentBy: req.user?.email || ""
    }).catch(() => null);

    res.status(500).json({
      success: false,
      message: "Email delivery failed",
      error: error.message,
      delivery
    });
  }
});

module.exports = router;