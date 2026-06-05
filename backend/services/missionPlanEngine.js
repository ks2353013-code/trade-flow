const { getAgentRegistry, getAgentById } = require("./agentRegistry");

const KNOWN_COUNTRIES = [
  "UAE",
  "United Arab Emirates",
  "USA",
  "United States",
  "India",
  "Saudi Arabia",
  "Qatar",
  "Oman",
  "Kuwait",
  "UK",
  "United Kingdom",
  "Germany",
  "France",
  "Canada",
  "Australia",
  "Singapore"
];

const PRODUCT_HINTS = [
  "basmati rice",
  "rice",
  "textiles",
  "spices",
  "pharma",
  "tea",
  "coffee",
  "garments",
  "machinery",
  "electronics"
];

function titleCase(value = "") {
  return String(value)
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferCountry(command = "") {
  const lower = command.toLowerCase();
  const match = KNOWN_COUNTRIES.find((country) => lower.includes(country.toLowerCase()));
  if (!match) return "";
  if (match === "United Arab Emirates") return "UAE";
  if (match === "United States") return "USA";
  if (match === "United Kingdom") return "UK";
  return match;
}

function inferProduct(command = "") {
  const lower = command.toLowerCase();
  const known = PRODUCT_HINTS.find((item) => lower.includes(item));
  if (known) return titleCase(known);

  const exportMatch = lower.match(/export\s+(.+?)\s+(to|into|for)\s+/);
  if (exportMatch?.[1]) return titleCase(exportMatch[1]);

  const findMatch = lower.match(/find\s+(.+?)\s+(buyers|suppliers|importers|distributors)/);
  if (findMatch?.[1]) return titleCase(findMatch[1]);

  return "Trade Product";
}

function inferAgentIds(command = "") {
  const lower = command.toLowerCase();
  const ids = new Set(["research"]);

  if (/buyer|importer|distributor|lead/.test(lower)) ids.add("buyer_discovery");
  if (/supplier|manufacturer|vendor|source/.test(lower)) ids.add("supplier_discovery");
  if (/verify|verified|score|qualified|quality/.test(lower)) ids.add("verification");
  if (/crm|pipeline|lead/.test(lower)) ids.add("crm");
  if (/outreach|email|message|draft|follow/.test(lower)) ids.add("outreach");
  if (/compliance|document|export document|legal/.test(lower)) ids.add("compliance");
  if (/revenue|price|margin|forecast|opportunity/.test(lower)) ids.add("revenue");
  if (/task|operation|timeline|reminder/.test(lower)) ids.add("operations");

  if (ids.size === 1) {
    ids.add("buyer_discovery");
    ids.add("verification");
    ids.add("crm");
    ids.add("outreach");
  }

  return Array.from(ids);
}

function buildStep(agentId, index) {
  const agent = getAgentById(agentId);
  const requiresHumanApproval = agent?.requiresHumanApproval === true;

  return {
    stepNumber: index + 1,
    title: agent?.name || titleCase(agentId),
    agentId,
    agentName: agent?.name || titleCase(agentId),
    description: agent?.role || "Prepare internal mission step.",
    status: requiresHumanApproval ? "approval_required" : "pending",
    requiresHumanApproval,
    forbiddenExternalActions: agent?.forbiddenActions || []
  };
}

function getRequiredApprovals(agentIds) {
  const approvals = new Set();
  const lowerIds = new Set(agentIds);

  if (lowerIds.has("crm")) approvals.add("CRM push approval");
  if (lowerIds.has("outreach")) approvals.add("Outreach draft approval");
  if (lowerIds.has("outreach")) approvals.add("Email send approval");
  if (lowerIds.has("compliance")) approvals.add("Export document finalization approval");

  approvals.add("No WhatsApp, call, payment or external send without human approval");

  return Array.from(approvals);
}

function getEstimatedActions(agentIds) {
  const actions = [
    "Create internal mission plan",
    "Generate research context"
  ];

  if (agentIds.includes("buyer_discovery")) actions.push("Prepare buyer discovery shortlist");
  if (agentIds.includes("supplier_discovery")) actions.push("Prepare supplier discovery shortlist");
  if (agentIds.includes("verification")) actions.push("Score candidates through verification");
  if (agentIds.includes("crm")) actions.push("Recommend CRM push for qualified leads");
  if (agentIds.includes("outreach")) actions.push("Draft outreach for approval queue");
  if (agentIds.includes("compliance")) actions.push("Prepare compliance checklist");
  if (agentIds.includes("revenue")) actions.push("Estimate opportunity and margin risk");
  if (agentIds.includes("operations")) actions.push("Prepare internal operational tasks");

  return actions;
}

function getRiskLevel(agentIds) {
  const externalAgents = agentIds.filter((id) => ["crm", "outreach", "compliance", "operations"].includes(id));
  if (externalAgents.length >= 3) return "High";
  if (externalAgents.length >= 1) return "Medium";
  return "Low";
}

function createMissionPlan(commandText = "") {
  const command = String(commandText || "").trim();
  const product = inferProduct(command);
  const targetCountry = inferCountry(command);
  const agentIds = inferAgentIds(command);
  const agents = getAgentRegistry().filter((agent) => agentIds.includes(agent.id));
  const goal = command || `Plan export/import mission for ${product}`;

  const plan = {
    goal,
    product,
    targetCountry,
    agentsRequired: agents.map((agent) => agent.id),
    steps: agentIds.map(buildStep),
    requiredApprovals: getRequiredApprovals(agentIds),
    estimatedActions: getEstimatedActions(agentIds),
    riskLevel: getRiskLevel(agentIds)
  };

  return {
    missionTitle: targetCountry
      ? `${product} Mission for ${targetCountry}`
      : `${product} Trade Mission`,
    objective: goal,
    plan,
    agents
  };
}

module.exports = {
  createMissionPlan
};
