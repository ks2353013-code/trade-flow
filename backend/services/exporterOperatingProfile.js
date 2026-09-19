const ExporterOperatingProfile = require("../models/ExporterOperatingProfile");
const { createMissionGatewayPlan, ensureWorkspaceGateway } = require("./governmentTradeGateway");

function context(req) {
  return {
    ownerEmail: String(req.tenant?.ownerEmail || req.user?.email || "").toLowerCase().trim(),
    companyId: req.tenant?.companyId || null,
    workspaceId: req.tenant?.workspaceId || null
  };
}

function evaluate(profile) {
  const blockers = [];
  const nextActions = [];
  let points = 0;

  const companyFields = ["legalName", "gstin", "pan", "iec"];
  companyFields.forEach((field) => {
    if (profile.company?.[field]) points += 10;
    else blockers.push(`Company setup missing: ${field.toUpperCase()}`);
  });

  if (profile.products?.length) points += 15;
  else { points -= 0; nextActions.push("Add at least one export product and HS code."); }

  if (profile.targetMarkets?.length) points += 10;
  else nextActions.push("Add target countries/markets.");

  const setup = profile.operatingSetup || {};
  ["bankReady", "adCodeReady", "logisticsReady", "documentationReady", "insuranceReady", "complianceReady"].forEach((key) => {
    if (setup[key]) points += 5;
    else nextActions.push(`Complete ${key.replace(/Ready$/, "").replace(/([A-Z])/g, " $1").trim()} setup.`);
  });

  if (profile.products?.some((p) => p.hsCode)) points += 5;
  else nextActions.push("Confirm HS classification before using tariff, customs or market intelligence.");

  const score = Math.max(0, Math.min(100, points));
  let status = "setup_required";
  if (score >= 85) status = "execution_ready";
  else if (score >= 70) status = "ready_for_review";
  else if (score >= 45) status = "partially_ready";

  return {
    score,
    status,
    blockers,
    nextActions: [...new Set(nextActions)],
    evaluatedAt: new Date()
  };
}

async function getOrCreateProfile(req) {
  const ctx = context(req);
  if (!ctx.ownerEmail || !ctx.workspaceId) throw new Error("Authenticated workspace is required");

  await ensureWorkspaceGateway(req);

  let profile = await ExporterOperatingProfile.findOne(ctx);
  if (!profile) {
    profile = await ExporterOperatingProfile.create({
      ...ctx,
      sourceSnapshot: {
        generatedAt: new Date(),
        sourceCount: 0,
        systemsCovered: []
      }
    });
  }

  return profile;
}

async function saveProfile(req, patch) {
  const ctx = context(req);
  const profile = await ExporterOperatingProfile.findOneAndUpdate(
    ctx,
    {
      $set: {
        company: patch.company || {},
        products: Array.isArray(patch.products) ? patch.products : [],
        targetMarkets: Array.isArray(patch.targetMarkets) ? patch.targetMarkets : [],
        operatingSetup: patch.operatingSetup || {}
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  profile.readiness = evaluate(profile);
  await profile.save();
  return profile;
}

async function buildOperatingPlan(req) {
  const profile = await getOrCreateProfile(req);
  const market = profile.targetMarkets?.[0]?.country || "";
  const product = profile.products?.[0]?.name || "";

  const gatewayPlan = await createMissionGatewayPlan(req, {
    product,
    country: market,
    direction: "Export"
  });

  profile.readiness = evaluate(profile);
  profile.sourceSnapshot = {
    generatedAt: new Date(),
    sourceCount: gatewayPlan.checklist.length,
    systemsCovered: gatewayPlan.systems.map((s) => s.systemKey)
  };
  await profile.save();

  return { profile, gatewayPlan };
}

module.exports = { getOrCreateProfile, saveProfile, buildOperatingPlan, evaluate };
