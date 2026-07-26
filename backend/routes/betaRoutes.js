const express = require("express");
const mongoose = require("mongoose");

const User = require("../models/User");
const Company = require("../models/Company");
const Workspace = require("../models/Workspace");
const TradeMission = require("../models/TradeMission");
const CRMLead = require("../models/CRMLead");
const OutreachApproval = require("../models/OutreachApproval");
const EmailDelivery = require("../models/EmailDelivery");
const AgentMissionPlan = require("../models/AgentMissionPlan");
const AgentMemory = require("../models/AgentMemory");
const BetaFeedback = require("../models/BetaFeedback");
const ClientErrorLog = require("../models/ClientErrorLog");
const AuditLog = require("../models/AuditLog");
const UsageMetric = require("../models/UsageMetric");
const { hasBetaAccess } = require("../middleware/betaAccessMiddleware");

const router = express.Router();

const MASTER_ADMIN_EMAILS = new Set([
  "ks2353013@gmail.com",
  "contact@tradeflowai.in"
]);

const BETA_STATUSES = new Set(["invited", "active", "paused", "revoked"]);
const FEEDBACK_TYPES = new Set(["feedback", "issue", "feature_request", "support"]);
const PRIORITIES = new Set(["Low", "Medium", "High"]);
const FEEDBACK_STATUSES = new Set(["Open", "In Review", "Resolved", "Closed"]);

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

function isMaster(req) {
  return req.tenant?.isMasterAdmin === true || MASTER_ADMIN_EMAILS.has(normalizeEmail(req.user?.email));
}

function requireMaster(req, res) {
  if (isMaster(req)) return true;

  res.status(403).json({
    success: false,
    message: "Master Admin access required"
  });
  return false;
}

function scrubText(value = "", max = 2000) {
  return String(value || "")
    .replace(/(bearer\s+)[a-z0-9._-]+/gi, "$1[redacted]")
    .replace(/(token=)[^&\s]+/gi, "$1[redacted]")
    .replace(/(password=)[^&\s]+/gi, "$1[redacted]")
    .slice(0, max);
}

function normalizeBetaStatus(status) {
  const normalized = String(status || "").toLowerCase().trim();
  return BETA_STATUSES.has(normalized) ? normalized : "invited";
}

function betaPatch(status, notes, entityFlag) {
  const betaStatus = normalizeBetaStatus(status);
  const active = betaStatus === "active";
  const invitedOrPaused = betaStatus === "invited" || betaStatus === "paused";

  return {
    betaStatus,
    betaAccessEnabled: active,
    [entityFlag]: active || invitedOrPaused,
    ...(notes !== undefined ? { betaNotes: scrubText(notes, 1000) } : {})
  };
}

function statusFilter(queryStatus) {
  if (queryStatus && BETA_STATUSES.has(String(queryStatus).toLowerCase())) {
    return { betaStatus: String(queryStatus).toLowerCase() };
  }

  return {
    $or: [
      { betaUser: true },
      { betaCompany: true },
      { betaAccessEnabled: true },
      { betaStatus: { $in: ["active", "paused", "revoked"] } }
    ]
  };
}

function normalizeFeedbackType(type, category) {
  const cleanType = String(type || "").trim();
  if (FEEDBACK_TYPES.has(cleanType)) return cleanType;

  const cleanCategory = String(category || "").toLowerCase();
  if (cleanCategory.includes("issue")) return "issue";
  if (cleanCategory.includes("feature")) return "feature_request";
  if (cleanCategory.includes("support")) return "support";
  return "feedback";
}

function normalizeCategory(category, type) {
  const clean = String(category || "").trim();
  const allowed = new Set([
    "Report Issue",
    "Request Feature",
    "Contact Support",
    "General Feedback"
  ]);

  if (allowed.has(clean)) return clean;
  if (type === "issue") return "Report Issue";
  if (type === "feature_request") return "Request Feature";
  if (type === "support") return "Contact Support";
  return "General Feedback";
}

function normalizePriority(priority) {
  const clean = String(priority || "").trim();
  return PRIORITIES.has(clean) ? clean : "Medium";
}

function normalizeFeedbackStatus(status) {
  const clean = String(status || "").trim();
  if (clean === "Reviewed") return "In Review";
  return FEEDBACK_STATUSES.has(clean) ? clean : "Open";
}

async function sumUsageMetrics(metricTypes = []) {
  const match = metricTypes.length ? { metricType: { $in: metricTypes } } : {};
  const rows = await UsageMetric.aggregate([
    { $match: match },
    { $group: { _id: "$metricType", count: { $sum: "$count" } } }
  ]);

  return rows.reduce((acc, row) => {
    acc[row._id || "unknown"] = Number(row.count || 0);
    return acc;
  }, {});
}

async function supportDashboard() {
  const [openIssues, featureRequests, supportRequests] = await Promise.all([
    BetaFeedback.find({ type: "issue", status: "Open" }).sort({ createdAt: -1 }).limit(50),
    BetaFeedback.find({ type: "feature_request", status: "Open" }).sort({ createdAt: -1 }).limit(50),
    BetaFeedback.find({ type: "support", status: "Open" }).sort({ createdAt: -1 }).limit(50)
  ]);

  return {
    openIssues,
    featureRequests,
    supportRequests
  };
}

async function usageIntelligence() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const usageCounts = await sumUsageMetrics([
    "mission_create",
    "buyer_discovery",
    "supplier_discovery",
    "crm_push",
    "outreach_draft_create",
    "email_send",
    "ai_command_plan",
    "agent_memory_create"
  ]);

  const [
    activeCompanies,
    activeWorkspaces,
    activeUsers,
    dailyActiveUsers,
    weeklyActiveUsers,
    missionsCreated,
    crmPushes,
    outreachDrafts,
    approvalsCompleted,
    emailSends,
    emailsDelivered,
    emailsDryRun,
    aiCommandCenterUsage,
    agentMemoryGrowth,
    executiveTowerUsage
  ] = await Promise.all([
    Company.countDocuments({ status: "Active" }),
    Workspace.countDocuments({ status: "Active" }),
    User.countDocuments({ lastLoginAt: { $gte: thirtyDaysAgo } }),
    User.countDocuments({ lastLoginAt: { $gte: oneDayAgo } }),
    User.countDocuments({ lastLoginAt: { $gte: sevenDaysAgo } }),
    TradeMission.countDocuments(),
    CRMLead.countDocuments(),
    OutreachApproval.countDocuments(),
    OutreachApproval.countDocuments({ status: "Approved" }),
    EmailDelivery.countDocuments({ status: { $in: ["Sent", "Dry Run"] } }),
    EmailDelivery.countDocuments({ status: "Sent" }),
    EmailDelivery.countDocuments({ status: "Dry Run" }),
    AgentMissionPlan.countDocuments(),
    AgentMemory.countDocuments(),
    AuditLog.countDocuments({ action: "EXECUTIVE_TOWER_VIEWED" })
  ]);

  return {
    activeCompanies,
    activeWorkspaces,
    activeUsers,
    dailyActiveUsers,
    weeklyActiveUsers,
    missionsCreated,
    discoveryRuns:
      Number(usageCounts.buyer_discovery || 0) +
      Number(usageCounts.supplier_discovery || 0),
    crmPushes,
    outreachDrafts,
    draftsCreated: outreachDrafts,
    approvalsCompleted,
    emailSends,
    emailsDelivered,
    emailsDryRun,
    aiCommandCenterUsage,
    executiveTowerUsage,
    agentMemoryGrowth,
    usageMetrics: usageCounts
  };
}

async function countByOwner(Model, match = {}) {
  const rows = await Model.aggregate([
    { $match: match },
    { $group: { _id: "$ownerEmail", count: { $sum: 1 }, firstAt: { $min: "$createdAt" } } }
  ]);

  return rows.reduce((acc, row) => {
    const ownerEmail = normalizeEmail(row._id);
    if (ownerEmail) {
      acc[ownerEmail] = {
        count: row.count,
        firstAt: row.firstAt
      };
    }
    return acc;
  }, {});
}

function milestone(done, firstAt = null) {
  return {
    done: Boolean(done),
    firstAt: firstAt || null
  };
}

function scopedOwnerFilter(ownerEmail, workspaceId = "") {
  const filter = {
    ownerEmail: normalizeEmail(ownerEmail)
  };

  if (mongoose.isValidObjectId(workspaceId)) {
    filter.workspaceId = String(workspaceId);
  }

  return filter;
}

async function onboardingProgressForOwner(ownerEmail, user = null, workspaceId = "") {
  const email = normalizeEmail(ownerEmail);
  const workspaceScopedFilter = scopedOwnerFilter(email, workspaceId);
  const discoveryFilter = {
    ...workspaceScopedFilter,
    $or: [
      { "agentReports.buyerDiscovery": { $ne: null } },
      { "agentReports.supplierDiscovery": { $ne: null } }
    ]
  };

  const [
    loadedUser,
    company,
    workspace,
    mission,
    discovery,
    crmLead,
    outreachDraft,
    approvedDraft,
    emailDelivery
  ] = await Promise.all([
    user
      ? Promise.resolve(user)
      : User.findOne({ email })
          .select("name email companyName businessType businessTypeLocked businessTypeLockedAt firstLoginAt lastLoginAt betaStatus createdAt")
          .lean(),
    Company.findOne({ ownerEmail: email }).sort({ createdAt: 1 }).lean(),
    mongoose.isValidObjectId(workspaceId)
      ? Workspace.findOne({
          _id: workspaceId,
          $or: [{ ownerEmail: email }, { "members.email": email }]
        }).lean()
      : Workspace.findOne({ ownerEmail: email }).sort({ createdAt: 1 }).lean(),
    TradeMission.findOne(workspaceScopedFilter).sort({ createdAt: 1 }).lean(),
    TradeMission.findOne(discoveryFilter).sort({ createdAt: 1 }).lean(),
    CRMLead.findOne(workspaceScopedFilter).sort({ createdAt: 1 }).lean(),
    OutreachApproval.findOne(workspaceScopedFilter).sort({ createdAt: 1 }).lean(),
    OutreachApproval.findOne({
      ...workspaceScopedFilter,
      status: "Approved"
    }).sort({ approvedAt: 1, updatedAt: 1, createdAt: 1 }).lean(),
    EmailDelivery.findOne({
      ...workspaceScopedFilter,
      status: { $in: ["Sent", "Dry Run"] },
      humanApproved: true
    }).sort({ sentAt: 1, createdAt: 1 }).lean()
  ]);

  const businessTypeSelected = Boolean(
    loadedUser?.businessTypeLocked ||
    company?.businessTypeLocked
  );

  const checklist = [
    {
      key: "company",
      label: "Create company",
      done: Boolean(company || loadedUser?.companyName),
      completedAt: company?.createdAt || loadedUser?.createdAt || null
    },
    {
      key: "businessType",
      label: "Select business type",
      done: businessTypeSelected,
      completedAt: company?.businessTypeLockedAt || loadedUser?.businessTypeLockedAt || null
    },
    {
      key: "workspace",
      label: "Create workspace",
      done: Boolean(workspace),
      completedAt: workspace?.createdAt || null
    },
    {
      key: "mission",
      label: "Create first mission",
      done: Boolean(mission),
      completedAt: mission?.createdAt || null
    },
    {
      key: "discovery",
      label: "Run discovery",
      done: Boolean(discovery),
      completedAt: discovery?.createdAt || null
    },
    {
      key: "crm",
      label: "Push lead to CRM",
      done: Boolean(crmLead),
      completedAt: crmLead?.createdAt || null
    },
    {
      key: "outreach",
      label: "Create outreach draft",
      done: Boolean(outreachDraft),
      completedAt: outreachDraft?.createdAt || null
    },
    {
      key: "approval",
      label: "Approve draft",
      done: Boolean(approvedDraft),
      completedAt: approvedDraft?.approvedAt || approvedDraft?.updatedAt || approvedDraft?.createdAt || null
    }
  ];

  const completed = checklist.filter((item) => item.done).length;

  return {
    accountVerified: Boolean(loadedUser),
    ownerEmail: email,
    workspaceId: workspace?._id ? String(workspace._id) : "",
    workspaceName: workspace?.workspaceName || workspace?.name || "",
    companyId: company?._id ? String(company._id) : "",
    companyName: company?.companyName || loadedUser?.companyName || "",
    businessType: company?.businessType || loadedUser?.businessType || "",
    checklist,
    completed,
    total: checklist.length,
    onboardingProgressScore: checklist.length
      ? Math.round((completed / checklist.length) * 100)
      : 0,
    signals: {
      firstLogin: milestone(loadedUser?.firstLoginAt, loadedUser?.firstLoginAt),
      firstWorkspace: milestone(workspace, workspace?.createdAt),
      firstMission: milestone(mission, mission?.createdAt),
      firstDiscovery: milestone(discovery, discovery?.createdAt),
      firstCrmPush: milestone(crmLead, crmLead?.createdAt),
      firstOutreachDraft: milestone(outreachDraft, outreachDraft?.createdAt),
      firstApproval: milestone(
        approvedDraft,
        approvedDraft?.approvedAt || approvedDraft?.updatedAt || approvedDraft?.createdAt
      ),
      firstEmail: milestone(emailDelivery, emailDelivery?.sentAt || emailDelivery?.createdAt)
    }
  };
}

async function customerSuccessSignals() {
  const users = await User.find({})
    .select("name email companyName businessType businessTypeLocked firstLoginAt lastLoginAt loginCount betaStatus betaAccessEnabled betaUser createdAt updatedAt")
    .sort({ lastLoginAt: -1, createdAt: -1 })
    .limit(200)
    .lean();

  const [
    companyByOwner,
    workspaceByOwner,
    missionByOwner,
    discoveryByOwner,
    crmByOwner,
    draftByOwner,
    approvalByOwner,
    emailByOwner
  ] = await Promise.all([
    countByOwner(Company),
    countByOwner(Workspace),
    countByOwner(TradeMission),
    countByOwner(TradeMission, {
      $or: [
        { "agentReports.buyerDiscovery": { $ne: null } },
        { "agentReports.supplierDiscovery": { $ne: null } }
      ]
    }),
    countByOwner(CRMLead),
    countByOwner(OutreachApproval),
    countByOwner(OutreachApproval, { status: "Approved" }),
    countByOwner(EmailDelivery, { status: { $in: ["Sent", "Dry Run"] }, humanApproved: true })
  ]);

  const usersWithProgress = users.map((user) => {
    const email = normalizeEmail(user.email);
    const milestones = {
      firstLogin: milestone(user.firstLoginAt, user.firstLoginAt),
      firstCompany: milestone(companyByOwner[email]?.count, companyByOwner[email]?.firstAt),
      businessTypeSelected: milestone(user.businessTypeLocked, user.updatedAt || user.createdAt),
      firstWorkspaceCreation: milestone(workspaceByOwner[email]?.count, workspaceByOwner[email]?.firstAt),
      firstMission: milestone(missionByOwner[email]?.count, missionByOwner[email]?.firstAt),
      firstDiscovery: milestone(discoveryByOwner[email]?.count, discoveryByOwner[email]?.firstAt),
      firstCrmPush: milestone(crmByOwner[email]?.count, crmByOwner[email]?.firstAt),
      firstOutreachDraft: milestone(draftByOwner[email]?.count, draftByOwner[email]?.firstAt),
      firstApproval: milestone(approvalByOwner[email]?.count, approvalByOwner[email]?.firstAt),
      firstApprovedEmail: milestone(emailByOwner[email]?.count, emailByOwner[email]?.firstAt)
    };

    const completed = Object.values(milestones).filter((item) => item.done).length;
    const onboardingProgressScore = Math.round((completed / Object.keys(milestones).length) * 100);

    return {
      userId: user._id,
      name: user.name,
      email: user.email,
      companyName: user.companyName,
      betaStatus: user.betaStatus || "invited",
      betaAccessEnabled: user.betaAccessEnabled === true,
      firstLoginAt: user.firstLoginAt || null,
      lastLoginAt: user.lastLoginAt || null,
      loginCount: Number(user.loginCount || 0),
      milestones,
      onboardingProgressScore
    };
  });

  const averageScore = usersWithProgress.length
    ? Math.round(
        usersWithProgress.reduce((sum, user) => sum + user.onboardingProgressScore, 0) /
          usersWithProgress.length
      )
    : 0;

  return {
    averageScore,
    users: usersWithProgress
  };
}

router.get("/status", async (req, res) => {
  const email = normalizeEmail(req.user?.email);
  const user = email
    ? await User.findOne({ email }).select("betaUser betaAccessEnabled betaStatus").lean()
    : null;
  const company = mongoose.isValidObjectId(req.tenant?.companyId)
    ? await Company.findOne({
        _id: req.tenant.companyId,
        ownerEmail: req.tenant?.ownerEmail
      }).select("betaCompany betaAccessEnabled betaStatus").lean()
    : null;
  const betaAccess = await hasBetaAccess(req);

  res.json({
    success: true,
    betaAccess,
    betaUser: user?.betaUser === true || user?.betaAccessEnabled === true,
    betaCompany: company?.betaCompany === true || company?.betaAccessEnabled === true,
    betaStatus: user?.betaStatus || company?.betaStatus || "invited",
    isMasterAdmin: isMaster(req)
  });
});

router.get("/my-onboarding", async (req, res) => {
  try {
    const ownerEmail = normalizeEmail(req.tenant?.ownerEmail || req.user?.email);
    const progress = await onboardingProgressForOwner(
      ownerEmail,
      null,
      req.tenant?.workspaceId || ""
    );

    res.json({
      success: true,
      progress,
      guidance: {
        missionCenter: "Start by creating your first mission.",
        aiCommandCenter: "Describe what you want TradeFlow AI to accomplish.",
        executiveTower: "Review recommendations and growth opportunities.",
        crm: "Push qualified leads from Discovery."
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch onboarding progress",
      error: error.message
    });
  }
});

router.post("/feedback", async (req, res) => {
  try {
    const message = scrubText(req.body?.message || "", 2000).trim();

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Feedback message is required."
      });
    }

    const type = normalizeFeedbackType(req.body?.type, req.body?.category);
    const category = normalizeCategory(req.body?.category, type);

    const feedback = await BetaFeedback.create({
      ownerEmail: normalizeEmail(req.tenant?.ownerEmail || req.user?.email),
      companyId: mongoose.isValidObjectId(req.tenant?.companyId) ? req.tenant.companyId : null,
      workspaceId: mongoose.isValidObjectId(req.tenant?.workspaceId) ? req.tenant.workspaceId : null,
      userId: mongoose.isValidObjectId(req.user?.id) ? req.user.id : null,
      type,
      category,
      title: scrubText(req.body?.title || "", 200),
      message,
      page: scrubText(req.body?.page || "", 300),
      priority: normalizePriority(req.body?.priority),
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      feedback,
      message: "Feedback submitted."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to submit beta feedback",
      error: error.message
    });
  }
});

router.get("/users", async (req, res) => {
  try {
    if (!requireMaster(req, res)) return;

    const users = await User.find(statusFilter(req.query.status))
      .select("name email role companyName betaUser betaAccessEnabled betaStatus betaNotes firstLoginAt lastLoginAt loginCount createdAt")
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit) || 200);

    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch beta users",
      error: error.message
    });
  }
});

router.get("/companies", async (req, res) => {
  try {
    if (!requireMaster(req, res)) return;

    const companies = await Company.find(statusFilter(req.query.status))
      .select("companyName ownerEmail status betaCompany betaAccessEnabled betaStatus betaNotes businessType businessTypeLocked createdAt")
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit) || 200);

    res.json({
      success: true,
      companies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch beta companies",
      error: error.message
    });
  }
});

router.post("/users/:id/beta-status", async (req, res) => {
  try {
    if (!requireMaster(req, res)) return;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      betaPatch(req.body?.betaStatus || req.body?.status, req.body?.betaNotes, "betaUser"),
      { new: true }
    ).select("name email role betaUser betaAccessEnabled betaStatus betaNotes");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Beta user not found"
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update beta user",
      error: error.message
    });
  }
});

router.post("/companies/:id/beta-status", async (req, res) => {
  try {
    if (!requireMaster(req, res)) return;

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      betaPatch(req.body?.betaStatus || req.body?.status, req.body?.betaNotes, "betaCompany"),
      { new: true }
    ).select("companyName ownerEmail betaCompany betaAccessEnabled betaStatus betaNotes");

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Beta company not found"
      });
    }

    res.json({
      success: true,
      company
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update beta company",
      error: error.message
    });
  }
});

router.get("/feedback", async (req, res) => {
  try {
    if (!requireMaster(req, res)) return;

    const filter = {};
    if (req.query.type) filter.type = normalizeFeedbackType(req.query.type);
    if (req.query.status) filter.status = scrubText(req.query.status, 40);

    const feedback = await BetaFeedback.find(filter).sort({ createdAt: -1 }).limit(Number(req.query.limit) || 100);

    res.json({
      success: true,
      feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch beta feedback",
      error: error.message
    });
  }
});

router.put("/feedback/:id/status", async (req, res) => {
  try {
    if (!requireMaster(req, res)) return;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feedback id"
      });
    }

    const feedback = await BetaFeedback.findByIdAndUpdate(
      req.params.id,
      { status: normalizeFeedbackStatus(req.body?.status) },
      { new: true }
    );

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback item not found"
      });
    }

    res.json({
      success: true,
      feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update beta feedback status",
      error: error.message
    });
  }
});

router.get("/support-dashboard", async (req, res) => {
  try {
    if (!requireMaster(req, res)) return;

    res.json({
      success: true,
      support: await supportDashboard()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch support dashboard",
      error: error.message
    });
  }
});

router.get("/usage-intelligence", async (req, res) => {
  try {
    if (!requireMaster(req, res)) return;

    res.json({
      success: true,
      usage: await usageIntelligence()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch beta usage intelligence",
      error: error.message
    });
  }
});

router.get("/customer-success", async (req, res) => {
  try {
    if (!requireMaster(req, res)) return;

    res.json({
      success: true,
      customerSuccess: await customerSuccessSignals()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch customer success signals",
      error: error.message
    });
  }
});

router.get("/overview", async (req, res) => {
  try {
    if (!requireMaster(req, res)) return;

    const [
      betaUsers,
      betaCompanies,
      feedback,
      errors,
      usage,
      support,
      customerSuccess
    ] = await Promise.all([
      User.find(statusFilter(req.query.status))
        .select("name email role betaUser betaAccessEnabled betaStatus firstLoginAt lastLoginAt loginCount createdAt")
        .sort({ createdAt: -1 })
        .limit(50),
      Company.find(statusFilter(req.query.status))
        .select("companyName ownerEmail betaCompany betaAccessEnabled betaStatus status createdAt")
        .sort({ createdAt: -1 })
        .limit(50),
      BetaFeedback.find().sort({ createdAt: -1 }).limit(50),
      ClientErrorLog.find().sort({ createdAt: -1 }).limit(50),
      usageIntelligence(),
      supportDashboard(),
      customerSuccessSignals()
    ]);

    res.json({
      success: true,
      overview: {
        betaUsers,
        betaCompanies,
        feedback,
        errors,
        usage,
        support,
        customerSuccess
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch beta overview",
      error: error.message
    });
  }
});

module.exports = router;
