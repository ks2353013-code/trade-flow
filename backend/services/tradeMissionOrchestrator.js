const mongoose = require("mongoose");
const TradeMission = require("../models/TradeMission");
const { createMissionGatewayPlan } = require("./governmentTradeGateway");
const { runTradeMission } = require("./tradeflowAgentOrchestrator");
const { saveProfile } = require("./exporterOperatingProfile");

function context(req) {
  const user = req.user || {};
  return {
    ownerEmail: String(user.email || "").toLowerCase(),
    companyId: String(req.companyId || user.companyId || ""),
    workspaceId: String(req.workspaceId || req.headers["x-workspace-id"] || "")
  };
}

function parseGoal(input = {}) {
  const text = String(input.missionText || input.goal || "").trim();
  const direction = String(input.direction || (/\bimport\b/i.test(text) ? "Import" : "Export"));
  let product = String(input.product || "").trim();
  let market = String(input.country || input.market || "").trim();

  if (!product) {
    const match = text.match(/(?:export|import)\s+(.+?)(?:\s+from\s+[A-Za-z][A-Za-z .'-]+)?\s+(?:to|into|from)\s+([A-Za-z][A-Za-z .'-]+)$/i);
    if (match) {
      product = match[1].replace(/\s+from\s+[A-Za-z][A-Za-z .'-]+$/i, "").trim();
      if (!market) market = match[2].trim();
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

function buildActions({ direction, product, market, profile, gateway, intelligence }) {
  const actions = [
    { key: "setup", title: "Complete trade setup", status: "ready", description: "TradeFlow checks your business, product and market setup." },
    { key: "intelligence", title: "Research market requirements", status: "ready", description: "TradeFlow prepares product, market, tariff and requirement intelligence." },
    { key: "buyers", title: direction === "Export" ? "Find qualified buyers" : "Find qualified suppliers", status: "ready", description: "Discovery remains optional until you want to use it." },
    { key: "documents", title: "Prepare trade documents", status: "ready", description: "TradeFlow organizes the documents needed for the mission." },
    { key: "government", title: "Complete official requirements", status: "ready", description: "TradeFlow tracks official actions and pauses only where your authorization is required." },
    { key: "execution", title: "Execute and track the deal", status: "ready", description: "CRM, negotiation, outreach, logistics and payment tools are available when needed." }
  ];

  const blockers = profile?.readiness?.blockers || [];
  const intelligenceActions = Array.isArray(intelligence?.actions) ? intelligence.actions.slice(0, 4) : [];
  intelligenceActions.forEach((item, index) => {
    const title = typeof item === "string" ? item : item?.title || item?.action || item?.description;
    if (title) actions.splice(Math.min(index + 1, actions.length), 0, { key: `intelligence_${index + 1}`, title: String(title), status: "ready", description: "Generated from TradeFlow intelligence for this mission." });
  });
  if (blockers.length) actions[0].status = "in_progress";

  return {
    actions,
    nextAction: blockers[0] || actions.find(a => a.status === "ready")?.title || "Continue mission",
    summary: {
      product,
      market,
      direction,
      readiness: Number(profile?.readiness?.score || 0),
      opportunityScore: Number(intelligence?.opportunityScore || 0),
      revenueEstimate: Number(intelligence?.revenueEstimate || 0),
      governmentSystems: Number(gateway?.summary?.totalSystems || 0)
    }
  };
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
    workspaceId: c.workspaceId
  });
  const plan = buildActions({ ...goal, profile, gateway, intelligence });
  const mission = await TradeMission.create({
    ...c,
    ...goal,
    status: "Running",
    agents: intelligence.agents || ["research", "buyerDiscovery", "supplierDiscovery", "compliance", "crm", "outreach", "revenue"],
    agentReports: intelligence.agentReports || {},
    opportunities: intelligence.opportunities || [],
    risks: intelligence.risks || [],
    documents: intelligence.documents || [],
    revenueEstimate: Number(intelligence.revenueEstimate || 0),
    opportunityScore: Number(intelligence.opportunityScore || 0),
    actions: plan.actions,
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
    timeline: [{ at: new Date(), event: "Mission intelligence generated", detail: plan.nextAction }].concat((intelligence.timeline || []).map(item => ({ at: item.at || new Date(), event: item.title || "TradeFlow agent update", detail: item.output || item.status || "" })))
  });

  return { mission, profile, gateway, plan };
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

module.exports = { createMission, listMissions, getMission, advanceMission, completeMissionAction };
