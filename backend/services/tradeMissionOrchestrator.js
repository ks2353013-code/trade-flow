const mongoose = require("mongoose");
const TradeMission = require("../models/TradeMission");
const CRMLead = require("../models/CRMLead");
const OutreachApproval = require("../models/OutreachApproval");
const { createMissionGatewayPlan } = require("./governmentTradeGateway");
const { runTradeMission } = require("./tradeflowAgentOrchestrator");
const { saveProfile } = require("./exporterOperatingProfile");
const { getSubscription, getLimit } = require("../middleware/planLimitMiddleware");
const { trackUsage } = require("../middleware/usageMiddleware");
const { createComplianceSnapshot } = require("./tradeIntegrationService");

function context(req) {
  const user = req.user || {};
  return {
    ownerEmail: String(req.tenant?.ownerEmail || user.email || "").toLowerCase(),
    companyId: req.tenant?.companyId || user.companyId || null,
    workspaceId: req.tenant?.workspaceId || req.headers["x-workspace-id"] || ""
  };
}

function parseGoal(input = {}) {
  const text = String(input.missionText || input.goal || "").trim();
  const direction = String(input.direction || (/\bimport\b/i.test(text) ? "Import" : "Export"));
  let product = String(input.product || "").trim();
  let market = String(input.country || input.market || "").trim();

  if (!product) {
    const match = text.match(/(?:export|import)\s+(.+?)\s+(?:from\s+[A-Za-z][A-Za-z .'-]+\s+)?(?:to|into)\s+([A-Za-z][A-Za-z .'-]+)$/i);
    if (match) {
      product = match[1].trim();
      market = market || match[2].trim();
    } else {
      product = (text.match(/(?:export|import)\s+(.+)/i)?.[1] || "General Product").trim();
    }
  }

  if (!market) {
    market = (text.match(/\b(?:to|into)\s+([A-Za-z][A-Za-z .'-]+)$/i)?.[1] || "Global Market").trim();
  }

  return {
    missionText: text || `${direction} ${product} to ${market}`,
    direction: direction === "Import" ? "Import" : "Export",
    product: product || "General Product",
    market: market || "Global Market"
  };
}

function buildActions({ direction, profile, gateway, intelligence, approvalsCreated }) {
  const blockers = profile?.readiness?.blockers || [];
  const discovery = direction === "Export"
    ? intelligence?.agentReports?.buyerDiscovery
    : intelligence?.agentReports?.supplierDiscovery;
  const qualified = direction === "Export"
    ? (discovery?.crmReadyVerifiedBuyers || []).length
    : (discovery?.networkReadyVerifiedSuppliers || []).length;

  const actions = [
    {
      key: "setup",
      title: "Complete trade setup",
      status: blockers.length ? "in_progress" : "completed",
      description: blockers.length
        ? `Resolve ${blockers.length} setup blocker(s).`
        : "Business, product and market setup is ready for the mission."
    },
    {
      key: "intelligence",
      title: "Research market requirements",
      status: "completed",
      description: "TradeFlow generated market, risk, revenue and compliance intelligence."
    },
    {
      key: "buyers",
      title: direction === "Export" ? "Review qualified buyers" : "Review qualified suppliers",
      status: qualified ? "completed" : "ready",
      description: qualified
        ? `${qualified} qualified record(s) are ready for CRM review.`
        : "No live qualified records were found from the configured discovery sources."
    },
    {
      key: "documents",
      title: "Prepare trade documents",
      status: "completed",
      description: `${(intelligence.documents || []).length} document requirement(s) identified.`
    },
    {
      key: "government",
      title: "Complete official requirements",
      status: "ready",
      description: "TradeFlow tracks official steps and sends you to the authoritative government system when needed."
    },
    {
      key: "outreach",
      title: "Review outreach approvals",
      status: approvalsCreated ? "in_progress" : "ready",
      description: approvalsCreated
        ? `${approvalsCreated} outreach draft(s) are waiting for human approval.`
        : "No outreach draft is ready until a verified contact with usable contact details exists."
    },
    {
      key: "execution",
      title: "Execute and track the deal",
      status: "ready",
      description: "Move an interested lead into negotiation, deal, shipment and payment tracking."
    }
  ];

  return {
    actions,
    nextAction:
      blockers[0] ||
      (approvalsCreated ? "Review outreach approvals" : actions.find(a => a.status === "ready")?.title) ||
      "Continue mission",
    summary: {
      product: intelligence.product,
      market: intelligence.market,
      direction: intelligence.direction,
      readiness: Number(profile?.readiness?.score || 0),
      opportunityScore: intelligence?.opportunityScore ?? null,
      revenueEstimate: intelligence?.revenueEstimate ?? null,
      governmentSystems: Number(gateway?.summary?.totalSystems || 0),
      qualifiedRecords: qualified,
      outreachApprovals: approvalsCreated
    }
  };
}

async function getUsageLimit(req, metricType) {
  const subscription = await getSubscription(context(req).ownerEmail);
  return {
    subscription,
    limit: getLimit(subscription?.plan || "Starter", metricType)
  };
}

async function syncQualifiedRecords(req, mission, intelligence) {
  const c = context(req);
  const report = intelligence?.agentReports?.[mission.direction === "Export" ? "buyerDiscovery" : "supplierDiscovery"];
  const records = mission.direction === "Export"
    ? (report?.crmReadyVerifiedBuyers || []).filter(item => Number(item.verificationScore || 0) >= 70)
    : (report?.networkReadyVerifiedSuppliers || []).filter(item => Number(item.verificationScore || 0) >= 70);

  if (!records.length) return { created: 0, skipped: 0 };

  const { limit } = await getUsageLimit(req, "crm_lead_create");
  const existingCount = await CRMLead.countDocuments({
    ownerEmail: c.ownerEmail,
    companyId: c.companyId,
    workspaceId: c.workspaceId
  });
  const remaining = typeof limit === "number" ? Math.max(0, limit - existingCount) : records.length;

  let created = 0;
  let skipped = 0;

  for (const record of records.slice(0, remaining)) {
    const duplicate = await CRMLead.findOne({
      ownerEmail: c.ownerEmail,
      companyId: c.companyId,
      workspaceId: c.workspaceId,
      companyName: record.companyName,
      email: String(record.email || "").toLowerCase()
    });

    if (duplicate) {
      skipped += 1;
      continue;
    }

    await CRMLead.create({
      companyName: record.companyName,
      leadType: mission.direction === "Export" ? "Buyer" : "Supplier",
      sourceType: record.sourceType || record.buyerType || record.supplierType || "",
      country: record.country || "",
      website: record.website || record.sourceUrl || "",
      email: String(record.email || "").toLowerCase(),
      phone: record.phone || "",
      confidenceScore: Number(record.confidenceScore || 0),
      verificationScore: Number(record.verificationScore || 0),
      verificationStatus: record.verificationStatus || "CRM Ready",
      missionId: mission._id,
      sourceAgent: mission.direction === "Export" ? "Buyer Discovery Agent" : "Supplier Discovery Agent",
      status: "Open",
      stage: "New Lead",
      ownerEmail: c.ownerEmail,
      workspaceId: c.workspaceId,
      companyId: c.companyId
    });
    created += 1;
  }

  if (created) {
    await trackUsage(req, "crm_lead_create", created, { missionId: String(mission._id), source: "Mission Orchestrator" });
  }

  return { created, skipped: skipped + Math.max(0, records.length - Math.min(records.length, remaining)) };
}

async function createOutreachApprovals(req, mission, intelligence) {
  const c = context(req);
  const report = intelligence?.agentReports?.[mission.direction === "Export" ? "buyerDiscovery" : "supplierDiscovery"];
  const leads = mission.direction === "Export"
    ? (report?.crmReadyVerifiedBuyers || [])
    : (report?.networkReadyVerifiedSuppliers || []);
  const outreach = intelligence?.agentReports?.outreach || {};
  const candidates = leads.filter(lead => lead.email && Number(lead.verificationScore || 0) >= 70).slice(0, 3);
  if (!candidates.length) return 0;

  const { limit } = await getUsageLimit(req, "outreach_draft_create");
  const existing = await OutreachApproval.countDocuments({
    ownerEmail: c.ownerEmail,
    companyId: c.companyId,
    workspaceId: c.workspaceId,
    missionId: mission._id
  });
  const remaining = typeof limit === "number" ? Math.max(0, limit - existing) : candidates.length;
  let created = 0;

  for (const lead of candidates.slice(0, remaining)) {
    const email = String(lead.email).toLowerCase();
    const duplicate = await OutreachApproval.findOne({
      ownerEmail: c.ownerEmail,
      workspaceId: c.workspaceId,
      missionId: mission._id,
      email
    });
    if (duplicate) continue;

    await OutreachApproval.create({
      ownerEmail: c.ownerEmail,
      companyId: c.companyId,
      workspaceId: c.workspaceId,
      missionId: mission._id,
      leadName: lead.companyName,
      leadType: mission.direction === "Export" ? "Buyer" : "Supplier",
      email,
      phone: lead.phone || "",
      country: lead.country || "",
      channel: "Email Draft",
      subject: outreach.subject || `${mission.direction} Opportunity for ${mission.product} - ${mission.market}`,
      message: String(outreach.emailDraft || "").replace(/^Subject:.*?\n\n/i, "").trim(),
      status: "Pending Approval",
      priority: Number(lead.verificationScore || 0) >= 85 ? "High" : "Medium",
      sourceAgent: "Outreach Agent",
      approvalRequired: true
    });
    created += 1;
  }

  if (created) {
    await trackUsage(req, "outreach_draft_create", created, { missionId: String(mission._id), source: "Mission Orchestrator" });
  }

  return created;
}

async function createMission(req, input = {}) {
  const c = context(req);
  if (!c.ownerEmail) throw new Error("Authenticated user email is required.");
  if (!c.workspaceId) throw new Error("Active workspace is required.");

  const goal = parseGoal(input);
  const profilePatch = {
    company: input.company || {},
    products: [{ ...(input.productDetails || {}), name: goal.product, hsCode: input.hsCode || input.productDetails?.hsCode || "", origin: input.productDetails?.origin || "India" }],
    targetMarkets: [{ country: goal.market, ports: input.ports || [], buyerType: input.buyerType || "" }]
  };

  const profile = await saveProfile(req, profilePatch);
  const gateway = await createMissionGatewayPlan(req, {
    product: goal.product,
    country: goal.market,
    direction: goal.direction
  });

  const intelligence = await runTradeMission(goal.missionText, {
    ownerEmail: c.ownerEmail,
    companyId: c.companyId,
    workspaceId: c.workspaceId,
    direction: goal.direction,
    product: goal.product,
    market: goal.market
  });

  const mission = await TradeMission.create({
    ...c,
    ...goal,
    status: "Running",
    userResponse: intelligence.userResponse || "",
    sourceEvidence: intelligence.sourceEvidence || { market: [], counterparties: [], compliance: [] },
    agents: intelligence.agents || [],
    agentReports: intelligence.agentReports || {},
    opportunities: intelligence.opportunities || [],
    risks: intelligence.risks || [],
    documents: intelligence.documents || [],
    revenueEstimate: intelligence.revenueEstimate ?? null,
    opportunityScore: intelligence.opportunityScore ?? null,
    actions: [],
    readiness: {
      score: Number(profile?.readiness?.score || 0),
      status: profile?.readiness?.status || "setup_required",
      blockers: profile?.readiness?.blockers || [],
      nextActions: profile?.readiness?.nextActions || []
    },
    approvalsRequired: (gateway?.systems || [])
      .flatMap(system => (system.actions || []).filter(action => action.status === "manual_required").map(action => ({
        systemKey: system.systemKey,
        actionKey: action.actionKey,
        title: action.title
      }))),
    timeline: [{ at: new Date(), event: "Mission intelligence generated", detail: "TradeFlow built the initial operating plan." }]
  });

  const compliancePlan = await createComplianceSnapshot(req, {
    missionId: mission._id,
    direction: goal.direction,
    product: goal.product,
    hsCode: input.hsCode || input.productDetails?.hsCode || "",
    origin: input.productDetails?.origin || "India",
    destination: goal.market,
    transactionType: input.transactionType || "commercial",
    sourceEvidence: intelligence.sourceEvidence?.compliance || []
  });
  mission.compliancePlan = compliancePlan;
  mission.timeline.push({ at: new Date(), event: "Compliance operating plan prepared", detail: compliancePlan.requirements.length + " requirement(s) mapped." });
  await mission.save();

  const crmSync = await syncQualifiedRecords(req, mission, intelligence);
  const approvalsCreated = await createOutreachApprovals(req, mission, intelligence);
  const plan = buildActions({ direction: goal.direction, profile, gateway, intelligence, approvalsCreated });

  mission.actions = plan.actions;
  mission.timeline.push({
    at: new Date(),
    event: "Mission execution plan prepared",
    detail: `${crmSync.created} CRM record(s) synced; ${approvalsCreated} outreach draft(s) awaiting approval.`
  });
  if (approvalsCreated) mission.status = "Needs Approval";
  await mission.save();

  return { mission, profile, gateway, plan, execution: { crmSync, approvalsCreated } };
}

async function listMissions(req, limit = 20) {
  const c = context(req);
  return TradeMission.find(c).sort({ updatedAt: -1 }).limit(Math.min(Number(limit) || 20, 50)).lean();
}

async function advanceMission(req, missionId, actionKey) {
  const c = context(req);
  if (!mongoose.isValidObjectId(missionId)) throw new Error("Invalid mission id.");
  const mission = await TradeMission.findOne({ ...c, _id: missionId });
  if (!mission) throw new Error("Mission not found.");
  const action = mission.actions.find(item => item.key === actionKey);
  if (!action) throw new Error("Mission action not found.");

  if (actionKey === "setup" && mission.readiness?.blockers?.length) {
    throw new Error("Trade setup is still blocked. Complete the listed readiness blockers first.");
  }

  const order = ["setup","intelligence","buyers","documents","government","outreach","execution"];
  const currentIndex = order.indexOf(actionKey);
  const unfinishedPrior = mission.actions.filter(item => order.indexOf(item.key) >= 0 && order.indexOf(item.key) < currentIndex && item.status !== "completed");
  if (unfinishedPrior.length) throw new Error(`Complete the previous mission action(s) first: ${unfinishedPrior.map(item => item.title).join(", ")}.`);
  action.status = action.status === "completed" ? "completed" : "in_progress";
  mission.timeline.push({ at: new Date(), event: "Action started", detail: action.title });
  await mission.save();
  return mission.toObject();
}

async function completeMissionAction(req, missionId, actionKey) {
  const c = context(req);
  if (!mongoose.isValidObjectId(missionId)) throw new Error("Invalid mission id.");
  const mission = await TradeMission.findOne({ ...c, _id: missionId });
  if (!mission) throw new Error("Mission not found.");
  const action = mission.actions.find(item => item.key === actionKey);
  if (!action) throw new Error("Mission action not found.");

  if (actionKey === "outreach") {
    const pending = await OutreachApproval.countDocuments({
      ...c,
      missionId,
      status: { $in: ["Pending Approval", "Needs Edit"] }
    });
    if (pending > 0) {
      throw new Error("Outreach still has pending human approvals.");
    }
  }

  if (actionKey === "setup" && mission.readiness?.blockers?.length) {
    throw new Error("Trade setup blockers remain.");
  }

  action.status = "completed";
  const remaining = mission.actions.some(item => item.status !== "completed");
  mission.status = remaining ? "Running" : "Completed";
  mission.timeline.push({ at: new Date(), event: "Action completed", detail: action.title });
  await mission.save();
  return mission.toObject();
}

async function getMission(req, missionId) {
  const c = context(req);
  if (!mongoose.isValidObjectId(missionId)) throw new Error("Invalid mission id.");
  const mission = await TradeMission.findOne({ ...c, _id: missionId }).lean();
  if (!mission) throw new Error("Mission not found.");
  return mission;
}

module.exports = { createMission, listMissions, getMission, advanceMission, completeMissionAction, parseGoal };
