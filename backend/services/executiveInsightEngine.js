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
const UsageMetric = require("../models/UsageMetric");

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

function normalizeObjectId(value) {
  if (!value) return null;
  const id = String(value);
  return mongoose.isValidObjectId(id) ? id : null;
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(Number(score || 0))));
}

function statusFromScore(score) {
  if (score >= 80) return "Healthy";
  if (score >= 55) return "Needs Attention";
  return "At Risk";
}

function tenantFilter(context = {}, options = {}) {
  const filter = {
    ownerEmail: normalizeEmail(context.ownerEmail)
  };

  if (options.includeCompany !== false && normalizeObjectId(context.companyId)) {
    filter.companyId = context.companyId;
  }

  if (options.includeWorkspace !== false && normalizeObjectId(context.workspaceId)) {
    filter.workspaceId = context.workspaceId;
  }

  return filter;
}

async function countUsage(context, metricTypes = []) {
  const filter = tenantFilter(context);

  if (metricTypes.length) {
    filter.metricType = {
      $in: metricTypes
    };
  }

  const rows = await UsageMetric.find(filter).select("metricType count").lean();

  return rows.reduce((acc, row) => {
    const key = row.metricType || "unknown";
    acc[key] = (acc[key] || 0) + Number(row.count || 0);
    return acc;
  }, {});
}

async function duplicateLeadCount(context) {
  const rows = await CRMLead.aggregate([
    {
      $match: tenantFilter(context)
    },
    {
      $group: {
        _id: {
          companyName: "$companyName",
          website: "$website",
          email: "$email"
        },
        count: {
          $sum: 1
        }
      }
    },
    {
      $match: {
        count: {
          $gt: 1
        }
      }
    }
  ]);

  return rows.reduce((sum, row) => sum + Number(row.count || 0) - 1, 0);
}

function buildAiRecommendations({
  workspace,
  crmLeadCount,
  outreachDraftCount,
  discoveryRuns,
  emailDryRunCount,
  duplicateLeads,
  aiCommandCount,
  subscription
}) {
  const recommendations = [];

  if (!workspace) {
    recommendations.push({
      title: "Set up an active workspace",
      priority: "High",
      reason: "Executive insights need an active workspace to isolate mission, CRM, outreach, and email data.",
      suggestedAction: "Create or select a workspace",
      requiresApproval: false
    });
  }

  if (crmLeadCount >= 5 && outreachDraftCount < Math.ceil(crmLeadCount / 3)) {
    recommendations.push({
      title: "Create outreach drafts for qualified leads",
      priority: "High",
      reason: "CRM has more leads than outreach activity, so conversion may stall.",
      suggestedAction: "Generate outreach plan",
      requiresApproval: true
    });
  }

  if (discoveryRuns < 1) {
    recommendations.push({
      title: "Run buyer discovery",
      priority: "Medium",
      reason: "Discovery activity is low for this workspace.",
      suggestedAction: "Find rice buyers in UAE",
      requiresApproval: true
    });
  }

  if (emailDryRunCount > 0) {
    recommendations.push({
      title: "Configure SMTP before production outreach",
      priority: "Medium",
      reason: "Email delivery is currently recording dry-run sends.",
      suggestedAction: "Review email delivery settings",
      requiresApproval: false
    });
  }

  if (duplicateLeads > 2) {
    recommendations.push({
      title: "Clean duplicate CRM leads",
      priority: "Medium",
      reason: "Duplicate leads can distort conversion metrics and outreach planning.",
      suggestedAction: "Improve CRM conversion",
      requiresApproval: true
    });
  }

  if (aiCommandCount < 1) {
    recommendations.push({
      title: "Train the team on AI Command Center",
      priority: "Low",
      reason: "AI Command Center mission planning has not been used in this workspace yet.",
      suggestedAction: "Find rice buyers in UAE, verify them, push qualified leads to CRM, and draft outreach.",
      requiresApproval: true
    });
  }

  if ((subscription?.plan || "Starter") === "Starter" && crmLeadCount >= 35) {
    recommendations.push({
      title: "Review subscription capacity",
      priority: "Medium",
      reason: "Starter usage is approaching common CRM and AI limits.",
      suggestedAction: "Review plan limits",
      requiresApproval: false
    });
  }

  return recommendations.slice(0, 6);
}

function buildRiskAlerts({
  workspace,
  emailDryRunCount,
  failedMissionCount,
  failedEmailCount,
  duplicateLeads,
  subscription
}) {
  const alerts = [];

  if (!workspace) {
    alerts.push({
      title: "Workspace not selected",
      severity: "High",
      reason: "Protected workflows require a valid Mongo workspace ID.",
      recommendedFix: "Select or create a workspace before running missions."
    });
  }

  if (failedMissionCount > 0) {
    alerts.push({
      title: "Mission failures detected",
      severity: "Medium",
      reason: `${failedMissionCount} mission record(s) are marked failed.`,
      recommendedFix: "Review mission errors before scaling beta usage."
    });
  }

  if (failedEmailCount > 0) {
    alerts.push({
      title: "Email delivery failures detected",
      severity: "Medium",
      reason: `${failedEmailCount} email delivery record(s) failed.`,
      recommendedFix: "Review SMTP configuration and approved draft content."
    });
  }

  if (emailDryRunCount > 0) {
    alerts.push({
      title: "Email dry-run mode active",
      severity: "Low",
      reason: "Approved emails are safe but not actually sent when SMTP is not configured.",
      recommendedFix: "Configure SMTP when moving beyond controlled beta."
    });
  }

  if (duplicateLeads > 2) {
    alerts.push({
      title: "CRM duplicate pressure",
      severity: "Low",
      reason: `${duplicateLeads} duplicate CRM lead(s) were detected.`,
      recommendedFix: "Tighten lead verification and deduplication before larger campaigns."
    });
  }

  if (subscription && !["Active", "Trial"].includes(subscription.status || "")) {
    alerts.push({
      title: "Subscription inactive",
      severity: "High",
      reason: "Protected modules require an active or trial subscription.",
      recommendedFix: "Reactivate subscription before inviting beta users."
    });
  }

  return alerts.slice(0, 6);
}

function buildGrowthOpportunities({ workspace, missionCount, crmLeadCount }) {
  const workspaceType = String(workspace?.type || "").toLowerCase();
  const product = workspaceType.includes("import") ? "Basmati Rice" : "Rice";

  return [
    {
      market: "UAE",
      product,
      opportunityScore: crmLeadCount > 0 ? 82 : 74,
      reason: "UAE is already aligned with the current beta smoke mission and buyer discovery workflow.",
      suggestedMissionCommand: "Find rice buyers in UAE, verify them, push qualified leads to CRM, and draft outreach."
    },
    {
      market: "Saudi Arabia",
      product,
      opportunityScore: missionCount > 0 ? 76 : 68,
      reason: "A nearby GCC expansion path can reuse buyer discovery, verification, and outreach draft workflows.",
      suggestedMissionCommand: "Find rice buyers in Saudi Arabia and create a verified outreach plan."
    }
  ];
}

async function buildExecutiveSummary(context = {}) {
  const ownerEmail = normalizeEmail(context.ownerEmail);
  const workspaceId = normalizeObjectId(context.workspaceId);
  const companyId = normalizeObjectId(context.companyId);

  const [
    user,
    company,
    workspace,
    subscription,
    usageCounts
  ] = await Promise.all([
    User.findOne({ email: ownerEmail })
      .select("email firstLoginAt lastLoginAt betaStatus subscriptionPlan subscriptionStatus businessType")
      .lean(),
    companyId
      ? Company.findOne({ _id: companyId, ownerEmail })
          .select("companyName businessType betaStatus status")
          .lean()
      : Company.findOne({ ownerEmail })
          .select("companyName businessType betaStatus status")
          .sort({ updatedAt: -1 })
          .lean(),
    workspaceId
      ? Workspace.findOne({
          _id: workspaceId,
          $or: [{ ownerEmail }, { "members.email": ownerEmail }]
        }).lean()
      : null,
    context.subscription || null,
    countUsage(context, [
      "mission_create",
      "buyer_discovery",
      "supplier_discovery",
      "crm_push",
      "outreach_draft_create",
      "email_send",
      "ai_command_plan"
    ])
  ]);

  const filter = tenantFilter(
    {
      ownerEmail,
      companyId,
      workspaceId
    },
    {
      includeCompany: Boolean(companyId),
      includeWorkspace: Boolean(workspaceId)
    }
  );

  const [
    activeUsers,
    activeWorkspaces,
    missionCount,
    activeMissionCount,
    completedMissionCount,
    failedMissionCount,
    approvalMissionCount,
    crmLeadCount,
    qualifiedLeadCount,
    closedWonCount,
    outreachDraftCount,
    emailDeliveryCount,
    emailDryRunCount,
    failedEmailCount,
    aiCommandCount,
    memoryCount,
    duplicateLeads,
    lastPlan,
    lastMemory
  ] = await Promise.all([
    User.countDocuments({ lastLoginAt: { $ne: null } }),
    Workspace.countDocuments({
      ownerEmail,
      status: "Active"
    }),
    TradeMission.countDocuments(filter),
    TradeMission.countDocuments({
      ...filter,
      status: { $in: ["Running", "Needs Approval"] }
    }),
    TradeMission.countDocuments({
      ...filter,
      status: "Completed"
    }),
    TradeMission.countDocuments({
      ...filter,
      status: "Failed"
    }),
    TradeMission.countDocuments({
      ...filter,
      status: "Needs Approval"
    }),
    CRMLead.countDocuments(filter),
    CRMLead.countDocuments({
      ...filter,
      verificationScore: { $gte: 70 }
    }),
    CRMLead.countDocuments({
      ...filter,
      $or: [{ stage: "Closed Won" }, { status: "Closed Won" }]
    }),
    OutreachApproval.countDocuments(filter),
    EmailDelivery.countDocuments(filter),
    EmailDelivery.countDocuments({
      ...filter,
      status: "Dry Run"
    }),
    EmailDelivery.countDocuments({
      ...filter,
      status: "Failed"
    }),
    AgentMissionPlan.countDocuments(filter),
    AgentMemory.countDocuments(filter),
    duplicateLeadCount({
      ownerEmail,
      companyId,
      workspaceId
    }),
    AgentMissionPlan.findOne(filter).sort({ createdAt: -1 }).select("updatedAt createdAt missionTitle").lean(),
    AgentMemory.findOne(filter).sort({ createdAt: -1 }).select("updatedAt createdAt agentId").lean()
  ]);

  const discoveryRuns =
    Number(usageCounts.buyer_discovery || 0) +
    Number(usageCounts.supplier_discovery || 0);

  const companyScore = clampScore(
    45 +
      Math.min(activeWorkspaces, 3) * 8 +
      Math.min(missionCount, 5) * 4 +
      Math.min(crmLeadCount, 10) * 2 +
      (subscription && ["Active", "Trial"].includes(subscription.status || "") ? 10 : -20)
  );

  const workspaceScore = clampScore(
    workspace
      ? 40 +
          Math.min(missionCount, 5) * 7 +
          Math.min(crmLeadCount, 10) * 2 +
          Math.min(outreachDraftCount, 5) * 4 +
          Math.min(emailDeliveryCount, 5) * 3 -
          failedMissionCount * 8 -
          failedEmailCount * 6
      : 0
  );

  const onboardingMilestones = [
    Boolean(user?.firstLoginAt),
    Boolean(workspace),
    missionCount > 0,
    crmLeadCount > 0,
    outreachDraftCount > 0,
    emailDryRunCount > 0 || emailDeliveryCount > 0
  ];
  const onboardingScore = clampScore(
    (onboardingMilestones.filter(Boolean).length / onboardingMilestones.length) * 100
  );

  const recommendations = buildAiRecommendations({
    workspace,
    crmLeadCount,
    outreachDraftCount,
    discoveryRuns,
    emailDryRunCount,
    duplicateLeads,
    aiCommandCount,
    subscription
  });

  const riskAlerts = buildRiskAlerts({
    workspace,
    emailDryRunCount,
    failedMissionCount,
    failedEmailCount,
    duplicateLeads,
    subscription
  });

  return {
    companyHealth: {
      score: companyScore,
      status: statusFromScore(companyScore),
      activeUsers,
      activeWorkspaces,
      subscriptionPlan: subscription?.plan || user?.subscriptionPlan || "Starter",
      subscriptionStatus: subscription?.status || user?.subscriptionStatus || "Unknown"
    },
    workspaceHealth: {
      workspaceId: workspace ? String(workspace._id) : "",
      workspaceName: workspace?.workspaceName || workspace?.name || "",
      score: workspaceScore,
      missionCount,
      crmLeadCount,
      outreachDraftCount,
      emailDeliveryCount
    },
    revenuePipeline: {
      crmLeadCount,
      qualifiedLeadCount,
      estimatedPipelineValue: qualifiedLeadCount * 50000,
      closedWonCount,
      conversionRate: crmLeadCount ? Math.round((closedWonCount / crmLeadCount) * 100) : 0
    },
    missionStatus: {
      total: missionCount,
      active: activeMissionCount,
      completed: completedMissionCount,
      failed: failedMissionCount,
      approvalRequired: approvalMissionCount
    },
    aiRecommendations: recommendations,
    riskAlerts,
    growthOpportunities: buildGrowthOpportunities({
      workspace,
      missionCount,
      crmLeadCount
    }),
    agentActivity: {
      plansGenerated: aiCommandCount,
      memoryItems: memoryCount,
      activeAgents: 9,
      lastAgentAction:
        lastMemory?.updatedAt ||
        lastMemory?.createdAt ||
        lastPlan?.updatedAt ||
        lastPlan?.createdAt ||
        null
    },
    usageSummary: {
      missions: missionCount,
      discoveryRuns,
      crmPushes: crmLeadCount,
      outreachDrafts: outreachDraftCount,
      emails: emailDeliveryCount,
      aiCommands: aiCommandCount
    },
    customerSuccess: {
      onboardingScore,
      firstMissionCompleted: missionCount > 0,
      firstCrmPushCompleted: crmLeadCount > 0,
      firstEmailSentOrDryRun: emailDeliveryCount > 0,
      betaStatus: user?.betaStatus || company?.betaStatus || "invited"
    }
  };
}

module.exports = {
  buildExecutiveSummary
};
