const express = require("express");

const User = require("../models/User");
const Company = require("../models/Company");
const { writeAuditLog } = require("../utils/auditLogger");
const { buildExecutiveSummary } = require("../services/executiveInsightEngine");

const router = express.Router();

const COMPATIBLE_BUSINESS_TYPES = new Set([
  "Supplier",
  "Manufacturer",
  "Buyer",
  "Trading Company",
  "Buying House",
  "Exporter",
  "Importer",
  "Both",
  "Agency"
]);

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

async function getBusinessTypeContext(req) {
  const ownerEmail = normalizeEmail(req.tenant?.ownerEmail || req.user?.email);
  const [user, company] = await Promise.all([
    User.findOne({ email: ownerEmail }).select("businessType businessTypeLocked").lean(),
    req.tenant?.companyId
      ? Company.findOne({
          _id: req.tenant.companyId,
          ownerEmail
        }).select("businessType businessTypeLocked").lean()
      : Company.findOne({ ownerEmail })
          .select("businessType businessTypeLocked")
          .sort({ updatedAt: -1 })
          .lean()
  ]);

  return {
    businessType: company?.businessType || user?.businessType || "Trading Company",
    businessTypeLocked: company?.businessTypeLocked === true || user?.businessTypeLocked === true
  };
}

async function requireBusinessTypeCompatibility(req, res) {
  const context = await getBusinessTypeContext(req);

  if (!COMPATIBLE_BUSINESS_TYPES.has(context.businessType)) {
    res.status(403).json({
      success: false,
      message: "Executive Control Tower is not compatible with this business type.",
      businessType: context.businessType
    });
    return null;
  }

  return context;
}

router.get("/summary", async (req, res) => {
  try {
    const businessTypeContext = await requireBusinessTypeCompatibility(req, res);
    if (!businessTypeContext) return;

    const summary = await buildExecutiveSummary({
      ownerEmail: req.tenant?.ownerEmail || req.user?.email,
      companyId: req.tenant?.companyId || null,
      workspaceId: req.tenant?.workspaceId || null,
      subscription: req.subscription || null
    });

    await writeAuditLog(req, {
      module: "Executive Control Tower",
      action: "EXECUTIVE_TOWER_VIEWED",
      message: "Executive Control Tower summary viewed",
      entityType: "Workspace",
      entityId: summary.workspaceHealth.workspaceId || "",
      severity: "Info",
      metadata: {
        businessType: businessTypeContext.businessType,
        businessTypeLocked: businessTypeContext.businessTypeLocked,
        companyScore: summary.companyHealth.score,
        workspaceScore: summary.workspaceHealth.score
      }
    });

    if (summary.aiRecommendations.length) {
      await writeAuditLog(req, {
        module: "Executive Control Tower",
        action: "EXECUTIVE_RECOMMENDATION_GENERATED",
        message: "Executive recommendations generated",
        entityType: "Workspace",
        entityId: summary.workspaceHealth.workspaceId || "",
        severity: "Info",
        metadata: {
          count: summary.aiRecommendations.length,
          titles: summary.aiRecommendations.map((item) => item.title)
        }
      });
    }

    if (summary.riskAlerts.length) {
      await writeAuditLog(req, {
        module: "Executive Control Tower",
        action: "EXECUTIVE_RISK_ALERT_GENERATED",
        message: "Executive risk alerts generated",
        entityType: "Workspace",
        entityId: summary.workspaceHealth.workspaceId || "",
        severity: "Warning",
        metadata: {
          count: summary.riskAlerts.length,
          titles: summary.riskAlerts.map((item) => item.title)
        }
      });
    }

    res.json({
      success: true,
      summary,
      safety: {
        recommendationsOnly: true,
        autonomousExternalActions: false,
        emailAutoSend: false,
        whatsappActions: false,
        callActions: false,
        paymentActions: false,
        humanApprovalRequired: true
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Executive Control Tower summary failed",
      error: error.message
    });
  }
});

router.post("/recommendation-selected", async (req, res) => {
  try {
    const title = String(req.body?.title || "Executive recommendation").slice(0, 200);
    const suggestedAction = String(req.body?.suggestedAction || "").slice(0, 500);

    await writeAuditLog(req, {
      module: "Executive Control Tower",
      action: "EXECUTIVE_RECOMMENDATION_SELECTED",
      message: "Executive recommendation selected for AI Command Center prefill",
      entityType: "Workspace",
      entityId: req.tenant?.workspaceId || "",
      severity: "Info",
      metadata: {
        title,
        suggestedAction,
        executedExternalAction: false
      }
    });

    res.json({
      success: true,
      message: "Recommendation selection audited. No external action was executed."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Executive recommendation selection audit failed",
      error: error.message
    });
  }
});

module.exports = router;
