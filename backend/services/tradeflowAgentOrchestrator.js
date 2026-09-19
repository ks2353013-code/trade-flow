const researchAgent = require("./agents/researchAgent");
const buyerDiscoveryAgent = require("./agents/buyerDiscoveryAgent");
const supplierDiscoveryAgent = require("./agents/supplierDiscoveryAgent");
const crmAgent = require("./agents/crmAgent");
const complianceAgent = require("./agents/complianceAgent");
const revenueAgent = require("./agents/revenueAgent");
const outreachAgent = require("./agents/outreachAgent");

function detectMission(text = "", context = {}) {
  const t = String(text).toLowerCase();
  const direction = context.direction === "Import" || context.direction === "Export"
    ? context.direction
    : (t.includes("import") ? "Import" : "Export");

  let product = String(context.product || "").trim() || "General Product";
  let market = String(context.market || "").trim() || "Global Market";

  if (product === "General Product") {
    if (t.includes("basmati")) product = "Basmati Rice";
    else if (t.includes("rice")) product = "Rice";
    else if (t.includes("medicine") || t.includes("pharma")) product = "Medicine";
    else if (t.includes("jaggery")) product = "Jaggery";
    else if (t.includes("textile")) product = "Textile";
  }

  if (market === "Global Market") {
    if (t.includes("uae") || t.includes("dubai")) market = "UAE";
    else if (t.includes("africa")) market = "Africa";
    else if (t.includes("europe")) market = "Europe";
    else if (t.includes("usa") || t.includes("america")) market = "USA";
  }

  return { direction, product, market };
}

function buildTimeline({ direction, buyerDiscovery, supplierDiscovery }) {
  const now = new Date().toISOString();
  const relevantDiscovery = direction === "Export" ? buyerDiscovery : supplierDiscovery;
  const discoveryTitle = direction === "Export"
    ? "Buyer Discovery Agent Completed"
    : "Supplier Discovery Agent Completed";

  return [
    { title: "Mission created", status: "Completed", at: now },
    { title: "Research Agent Completed", status: "Completed", at: now },
    { title: discoveryTitle, status: relevantDiscovery ? "Completed" : "Skipped", at: now },
    { title: "CRM Agent Completed", status: "Completed", at: now },
    { title: "Compliance Agent Completed", status: "Completed", at: now },
    { title: "Revenue Agent Completed", status: "Completed", at: now },
    { title: "Outreach Agent Drafted Messages", status: "Needs Approval", at: now },
    { title: "Human approval required before external communication", status: "Pending", at: now }
  ];
}

async function runTradeMission(missionText = "", context = {}) {
  const detected = detectMission(missionText, context);
  const input = {
    ...detected,
    ownerEmail: context.ownerEmail || "",
    workspaceId: context.workspaceId || null,
    companyId: context.companyId || null
  };

  const research = researchAgent.run(input);
  const buyerDiscovery = detected.direction === "Export"
    ? await buyerDiscoveryAgent.run(input)
    : null;
  const supplierDiscovery = detected.direction === "Import"
    ? await supplierDiscoveryAgent.run(input)
    : null;
  const crm = crmAgent.run(input);
  const compliance = complianceAgent.run(input);
  const revenue = revenueAgent.run(input);
  const outreach = outreachAgent.run(input);

  const discoveryScore = Number(
    detected.direction === "Export"
      ? buyerDiscovery?.estimatedBuyerFitScore
      : supplierDiscovery?.estimatedSupplierFitScore
  ) || 0;

  const opportunityScore = Math.max(
    Number(research.opportunityScore || 0),
    Number(revenue.riskAdjustedScore || 0),
    discoveryScore
  );

  const revenueEstimate =
    Number(revenue.revenueScenarioBase || revenue.estimatedDealValue || 0);

  const discoveryReport = detected.direction === "Export" ? buyerDiscovery : supplierDiscovery;

  return {
    ...detected,
    status: "Needs Approval",
    agentReports: {
      research,
      buyerDiscovery,
      supplierDiscovery,
      crm,
      compliance,
      revenue,
      outreach
    },
    agents: [
      { name: "Research Agent", status: "Completed", output: research.executiveSummary },
      detected.direction === "Export"
        ? { name: "Buyer Discovery Agent", status: "Completed", output: buyerDiscovery?.buyerProfile || "No buyer discovery result." }
        : { name: "Supplier Discovery Agent", status: "Completed", output: supplierDiscovery?.supplierProfile || "No supplier discovery result." },
      { name: "CRM Agent", status: "Completed", output: crm.dealStrategy },
      { name: "Compliance Agent", status: "Completed", output: "Compliance checklist generated." },
      { name: "Revenue Agent", status: "Completed", output: revenue.executiveSummary },
      { name: "Outreach Agent", status: "Needs Approval", output: "Outreach drafts prepared. Human approval required." }
    ],
    opportunities: [
      research.executiveSummary,
      discoveryReport?.outreachPriority || discoveryReport?.supplierProfile || "",
      revenue.executiveSummary
    ].filter(Boolean),
    risks: [
      ...research.riskAnalysis,
      ...compliance.complianceRisks,
      "External communication requires human approval."
    ],
    actions: [
      ...research.nextActions,
      ...(discoveryReport?.recommendedNextActions || []),
      ...crm.recommendedNextActions,
      ...compliance.recommendedNextActions,
      ...revenue.recommendedNextActions,
      ...outreach.recommendedNextActions
    ],
    documents: compliance.requiredDocuments,
    approvalsRequired: [
      "Sending emails",
      "Sending WhatsApp messages",
      "Calling leads",
      "Sharing price quotation",
      "Signing contracts",
      "Making payments"
    ],
    revenueEstimate,
    opportunityScore,
    timeline: buildTimeline({
      direction: detected.direction,
      buyerDiscovery,
      supplierDiscovery
    })
  };
}

module.exports = { runTradeMission, detectMission };
