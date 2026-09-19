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

function buildTimeline({ direction, research, buyerDiscovery, supplierDiscovery, compliance, revenue }) {
  const now = new Date().toISOString();
  const relevantDiscovery = direction === "Export" ? buyerDiscovery : supplierDiscovery;
  const discoveryTitle = direction === "Export" ? "Buyer Discovery Agent" : "Supplier Discovery Agent";
  return [
    { title: "Mission created", status: "Completed", at: now },
    { title: "Research Agent", status: research?.status || "Source Unavailable", at: now },
    { title: discoveryTitle, status: relevantDiscovery?.status || "Source Unavailable", at: now },
    { title: "CRM Agent", status: "Completed", at: now },
    { title: "Compliance Agent", status: compliance?.status || "Preliminary", at: now },
    { title: "Revenue Agent", status: revenue?.status || "Needs Commercial Inputs", at: now },
    { title: "Outreach Agent", status: "Needs Approval", at: now },
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

  const research = await researchAgent.run(input);
  const buyerDiscovery = detected.direction === "Export"
    ? await buyerDiscoveryAgent.run(input)
    : null;
  const supplierDiscovery = detected.direction === "Import"
    ? await supplierDiscoveryAgent.run(input)
    : null;
  const crm = crmAgent.run(input);
  const compliance = await complianceAgent.run(input);
  const revenue = revenueAgent.run(input);
  const outreach = outreachAgent.run(input);

  const verifiedDiscoveryCount = detected.direction === "Export"
    ? Number(buyerDiscovery?.crmReadyVerifiedBuyers?.length || 0)
    : Number(supplierDiscovery?.networkReadyVerifiedSuppliers?.length || 0);
  const revenueEstimate =
    Number(revenue.revenueScenarioBase || revenue.estimatedDealValue || 0);

  const discoveryReport = detected.direction === "Export" ? buyerDiscovery : supplierDiscovery;
  const discoveryCount = detected.direction === "Export"
    ? Number(buyerDiscovery?.discoveredBuyers?.length || 0)
    : Number(supplierDiscovery?.discoveredSuppliers?.length || 0);
  const researchCount = Number(research?.liveResearchResults?.length || 0);
  const opportunityScore = (researchCount || discoveryCount)
    ? Math.min(95, 40 + Math.min(30, researchCount * 3) + Math.min(20, discoveryCount * 2) + Math.min(10, verifiedDiscoveryCount * 5))
    : null;
  const sourceItems = (research?.liveResearchResults || []).slice(0, 5).map((item) => ({ title: item.title, url: item.url, snippet: item.snippet }));
  const discoveryItems = (detected.direction === "Export" ? buyerDiscovery?.sourceEvidence : supplierDiscovery?.supplierLeaderboard || []).slice(0, 5).map((item) => ({ companyName: item.companyName, url: item.sourceUrl || item.website, country: item.country }));
  const userResponse = researchCount || discoveryCount
    ? `TradeFlow explored live sources for ${detected.direction.toLowerCase()}ing ${detected.product} in ${detected.market}. It found ${researchCount} market result(s) and ${discoveryCount} candidate ${detected.direction === "Export" ? "buyer(s)" : "supplier(s)"}. The findings are organized below for review; external communication remains approval-gated.`
    : `TradeFlow could not retrieve live external results for ${detected.direction.toLowerCase()}ing ${detected.product} in ${detected.market}. It has not invented buyers, suppliers, market findings, prices, or official approvals.`;


  return {
    ...detected,
    userResponse,
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
      { name: "Research Agent", status: research.status, output: research.executiveSummary },
      detected.direction === "Export"
        ? { name: "Buyer Discovery Agent", status: buyerDiscovery?.status || "Source Unavailable", output: buyerDiscovery?.buyerProfile || "No live buyer discovery result." }
        : { name: "Supplier Discovery Agent", status: supplierDiscovery?.status || "Source Unavailable", output: supplierDiscovery?.supplierProfile || "No live supplier discovery result." },
      { name: "CRM Agent", status: "Completed", output: crm.dealStrategy },
      { name: "Compliance Agent", status: compliance.status, output: "Preliminary compliance checklist generated from the mission context and official-source exploration where available." },
      { name: "Revenue Agent", status: revenue.status, output: revenue.executiveSummary },
      { name: "Outreach Agent", status: "Needs Approval", output: "Outreach drafts prepared. Human approval required." }
    ],
    sourceEvidence: { market: sourceItems, counterparties: discoveryItems, compliance: compliance.officialResearch?.results || [] },
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
      research,
      buyerDiscovery,
      supplierDiscovery,
      compliance,
      revenue
    })
  };
}

module.exports = { runTradeMission, detectMission };
