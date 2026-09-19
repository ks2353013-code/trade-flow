const GovernmentConnection = require("../models/GovernmentConnection");

const SYSTEM_CATALOG = [
  {
    systemKey: "dgft",
    displayName: "DGFT",
    connectionMode: "guided_portal",
    officialUrl: "https://www.dgft.gov.in/",
    capabilityKeys: ["iec", "rcmc", "certificate_of_origin", "advance_authorisation", "epcg", "export_policy", "export_documentation"],
    actions: [
      ["verify_iec", "Verify IEC", "Confirm the company's Importer Exporter Code before export execution."],
      ["review_rcmc", "Review RCMC", "Check applicable Export Promotion Council / RCMC requirements."],
      ["review_coo", "Review Certificate of Origin", "Identify whether a Certificate of Origin workflow is relevant to the mission."],
      ["review_export_policy", "Review Export Policy", "Check product-level export policy requirements before proceeding."]
    ]
  },
  {
    systemKey: "trade_connect",
    displayName: "Trade Connect",
    connectionMode: "guided_portal",
    officialUrl: "https://www.trade.gov.in/",
    capabilityKeys: ["country_guide", "product_guide", "trade_trends", "trade_agreements", "tariff_explorer", "export_events", "ask_an_expert", "source_from_india"],
    actions: [
      ["country_intelligence", "Country Intelligence", "Review official country and product guidance relevant to the target market."],
      ["tariff_fta_review", "Tariff & FTA Review", "Check available official tariff and trade-agreement information."],
      ["trade_events", "Trade Events", "Review relevant official trade events and market-entry opportunities."]
    ]
  },
  {
    systemKey: "icegate",
    displayName: "ICEGATE",
    connectionMode: "guided_portal",
    officialUrl: "https://www.icegate.gov.in/",
    capabilityKeys: ["customs_services", "duty_calculation", "document_upload", "shipping_workflow", "compliance_information"],
    actions: [
      ["customs_readiness", "Customs Readiness", "Prepare the mission for customs-side execution and document readiness."],
      ["duty_review", "Duty Review", "Prepare an official duty-check step before shipment execution."],
      ["shipment_documentation", "Shipment Documentation", "Track customs-facing document preparation and submission status."]
    ]
  },
  {
    systemKey: "ecgc",
    displayName: "ECGC",
    connectionMode: "guided_portal",
    officialUrl: "https://main.ecgc.in/",
    capabilityKeys: ["export_credit_insurance", "buyer_country_risk", "credit_protection"],
    actions: [
      ["credit_risk_review", "Credit Risk Review", "Review whether export credit insurance or risk protection is relevant."]
    ]
  },
  {
    systemKey: "apeda",
    displayName: "APEDA",
    connectionMode: "guided_portal",
    officialUrl: "https://apeda.gov.in/",
    capabilityKeys: ["rcmc", "product_requirements", "market_information", "financial_assistance", "quality_packaging"],
    actions: [
      ["apeda_readiness", "APEDA Readiness", "Check APEDA relevance for agri and processed-food export missions."],
      ["quality_packaging_review", "Quality & Packaging Review", "Track destination and product-specific quality or packaging preparation."]
    ]
  },
  {
    systemKey: "msme",
    displayName: "MSME International Cooperation",
    connectionMode: "guided_portal",
    officialUrl: "https://msme.gov.in/",
    capabilityKeys: ["international_cooperation", "market_development", "first_time_exporter_support"],
    actions: [
      ["msme_support_review", "MSME Support Review", "Identify relevant internationalisation or market-development support."]
    ]
  },
  {
    systemKey: "export_promotion_councils",
    displayName: "Export Promotion Councils",
    connectionMode: "guided_portal",
    officialUrl: "https://www.dgft.gov.in/",
    capabilityKeys: ["rcmc", "sector_guidance", "trade_events", "buyer_seller_meets"],
    actions: [
      ["epc_relevance", "EPC Relevance", "Identify the likely sector council workflow for the mission."]
    ]
  }
];

function normalizeContext(req) {
  return {
    ownerEmail: String(req.tenant?.ownerEmail || req.user?.email || "").toLowerCase().trim(),
    companyId: req.tenant?.companyId || null,
    workspaceId: req.tenant?.workspaceId || null
  };
}

function buildActions(system) {
  return system.actions.map(([actionKey, title, description]) => ({
    actionKey,
    title,
    description,
    mode: system.connectionMode,
    officialUrl: system.officialUrl,
    status: "manual_required"
  }));
}

function buildSystemDocuments(context) {
  return SYSTEM_CATALOG.map((system) => ({
    ownerEmail: context.ownerEmail,
    companyId: context.companyId,
    workspaceId: context.workspaceId,
    systemKey: system.systemKey,
    displayName: system.displayName,
    enabled: true,
    connectionMode: system.connectionMode,
    status: "action_required",
    officialUrl: system.officialUrl,
    capabilityKeys: system.capabilityKeys,
    actions: buildActions(system)
  }));
}

async function ensureWorkspaceGateway(req) {
  const context = normalizeContext(req);
  if (!context.ownerEmail) throw new Error("Authenticated user email missing");

  for (const system of buildSystemDocuments(context)) {
    await GovernmentConnection.findOneAndUpdate(
      { ownerEmail: context.ownerEmail, workspaceId: context.workspaceId, systemKey: system.systemKey },
      { $setOnInsert: system },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  return context;
}

async function listConnections(req) {
  const context = await ensureWorkspaceGateway(req);
  const connections = await GovernmentConnection.find(context).sort({ displayName: 1 }).lean();
  return connections.map((connection) => {
    if (connection.connectionMode !== "api") {
      connection.status = "action_required";
      connection.actions = (connection.actions || []).map((action) => {
        if (["submitted", "completed"].includes(action.status)) {
          return {
            ...action,
            status: "manual_required",
            notes: [action.notes, "Legacy completion was not externally verified; TradeFlow will not represent it as completed without a live API confirmation."].filter(Boolean).join(" ")
          };
        }
        return action;
      });
    }
    return connection;
  });
}

function inferRelevantSystems({ product = "", country = "", direction = "Export" }) {
  const text = String(product + " " + country).toLowerCase();
  const systems = new Set(["dgft", "trade_connect", "icegate", "ecgc", "msme", "export_promotion_councils"]);

  if (
    text.includes("rice") || text.includes("food") || text.includes("spice") ||
    text.includes("fruit") || text.includes("vegetable") || text.includes("agri")
  ) systems.add("apeda");

  if (String(direction).toLowerCase() === "import") systems.delete("apeda");
  return Array.from(systems);
}

async function createMissionGatewayPlan(req, input = {}) {
  const context = await ensureWorkspaceGateway(req);
  const relevantKeys = inferRelevantSystems(input);
  const connections = await GovernmentConnection.find({
    ...context,
    systemKey: { $in: relevantKeys }
  }).lean();

  const checklist = connections.flatMap((connection) =>
    (connection.actions || []).map((action) => ({
      systemKey: connection.systemKey,
      system: connection.displayName,
      ...action
    }))
  );

  return {
    context,
    systems: connections,
    checklist,
    summary: {
      totalSystems: connections.length,
      totalActions: checklist.length,
      apiActions: checklist.filter((item) => item.mode === "api").length,
      guidedActions: checklist.filter((item) => item.mode === "guided_portal").length,
      manualActions: checklist.filter((item) => item.mode === "manual").length
    }
  };
}

async function updateAction(req, systemKey, actionKey, patch = {}) {
  const context = await ensureWorkspaceGateway(req);
  const allowed = new Set(["not_started", "ready", "in_progress", "submitted", "completed", "blocked", "manual_required"]);

  if (patch.status && !allowed.has(patch.status)) throw new Error("Invalid government action status");

  const connectionBeforeUpdate = await GovernmentConnection.findOne({ ...context, systemKey }).lean();
  if (!connectionBeforeUpdate) throw new Error("Government connection not found");

  if (patch.status && ["submitted", "completed"].includes(patch.status)) {
    if (connectionBeforeUpdate.connectionMode !== "api") {
      throw new Error("TradeFlow cannot mark this official action submitted or completed without a live authenticated API integration. Use manual_required/in_progress and complete the step in the official portal.");
    }
    if (!patch.externalReference) {
      throw new Error("External confirmation reference is required for an API-confirmed government action.");
    }
  }

  const connection = await GovernmentConnection.findOneAndUpdate(
    { ...context, systemKey },
    {
      $set: {
        "actions.$[action].status": patch.status || "in_progress",
        "actions.$[action].externalReference": patch.externalReference || "",
        "actions.$[action].notes": patch.notes || "",
        "actions.$[action].lastUpdatedAt": new Date()
      }
    },
    { arrayFilters: [{ "action.actionKey": actionKey }], new: true }
  ).lean();

  if (!connection) throw new Error("Government connection not found");
  return connection;
}

module.exports = { SYSTEM_CATALOG, ensureWorkspaceGateway, listConnections, createMissionGatewayPlan, updateAction };
