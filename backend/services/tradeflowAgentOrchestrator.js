const researchAgent = require("./agents/researchAgent");
const buyerDiscoveryAgent = require("./agents/buyerDiscoveryAgent");
const supplierDiscoveryAgent = require("./agents/supplierDiscoveryAgent");
const crmAgent = require("./agents/crmAgent");
const complianceAgent = require("./agents/complianceAgent");
const revenueAgent = require("./agents/revenueAgent");
const outreachAgent = require("./agents/outreachAgent");

function detectMission(text = "") {
  const t = String(text).toLowerCase();

  let direction = t.includes("import") ? "Import" : "Export";
  let product = "General Product";
  let market = "Global Market";

  if (t.includes("basmati")) product = "Basmati Rice";
  else if (t.includes("rice")) product = "Rice";
  else if (t.includes("medicine") || t.includes("pharma")) product = "Medicine";
  else if (t.includes("jaggery")) product = "Jaggery";
  else if (t.includes("textile")) product = "Textile";

  if (t.includes("uae") || t.includes("dubai")) market = "UAE";
  else if (t.includes("africa")) market = "Africa";
  else if (t.includes("europe")) market = "Europe";
  else if (t.includes("usa") || t.includes("america")) market = "USA";

  return { direction, product, market };
}

function buildTimeline() {
  const now = new Date().toISOString();

  return [
    { title: "Mission created", status: "Completed", at: now },
    { title: "Research Agent Completed", status: "Completed", at: now },
    { title: "Buyer Discovery Agent Completed", status: "Completed", at: now },
    { title: "Supplier Discovery Agent Completed", status: "Completed", at: now },
    { title: "CRM Agent Completed", status: "Completed", at: now },
    { title: "Compliance Agent Completed", status: "Completed", at: now },
    { title: "Revenue Agent Completed", status: "Completed", at: now },
    { title: "Outreach Agent Drafted Messages", status: "Needs Approval", at: now },
    { title: "Human approval required before external communication", status: "Pending", at: now }
  ];
}

function runTradeMission(missionText = "", context = {}) {
  const detected = detectMission(missionText);

  const input = {
    ...detected,
    ownerEmail: context.ownerEmail || "",
    workspaceId: context.workspaceId || null,
    companyId: context.companyId || null
  };

  const research = researchAgent.run(input);
  const buyerDiscovery = buyerDiscoveryAgent.run(input);
  const supplierDiscovery = supplierDiscoveryAgent.run(input);
  const crm = crmAgent.run(input);
  const compliance = complianceAgent.run(input);
  const revenue = revenueAgent.run(input);
  const outreach = outreachAgent.run(input);

  const opportunityScore = Math.max(
    research.opportunityScore || 0,
    revenue.riskAdjustedScore || 0,
    buyerDiscovery.estimatedBuyerFitScore || 0,
    supplierDiscovery.estimatedSupplierFitScore || 0
  );

  const revenueEstimate =
    revenue.revenueScenarioBase ||
    revenue.estimatedDealValue ||
    0;

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
      { name: "Buyer Discovery Agent", status: "Completed", output: buyerDiscovery.buyerProfile },
      { name: "Supplier Discovery Agent", status: "Completed", output: supplierDiscovery.supplierProfile },
      { name: "CRM Agent", status: "Completed", output: crm.dealStrategy },
      { name: "Compliance Agent", status: "Completed", output: "Compliance checklist generated." },
      { name: "Revenue Agent", status: "Completed", output: revenue.executiveSummary },
      { name: "Outreach Agent", status: "Needs Approval", output: "Outreach drafts prepared. Human approval required." }
    ],

    opportunities: [
      research.executiveSummary,
      buyerDiscovery.outreachPriority,
      revenue.executiveSummary
    ],

    risks: [
      ...research.riskAnalysis,
      ...compliance.complianceRisks,
      "External communication requires human approval."
    ],

    actions: [
      ...research.nextActions,
      ...buyerDiscovery.recommendedNextActions,
      ...supplierDiscovery.recommendedNextActions,
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
    timeline: buildTimeline()
  };
}

module.exports = {
  runTradeMission
};