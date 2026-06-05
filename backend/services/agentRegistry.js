const AGENT_REGISTRY = [
  {
    id: "research",
    name: "Research Agent",
    role: "Market context, country/product fit, risk and opportunity framing.",
    capabilities: ["market research", "country analysis", "product context", "risk summary"],
    allowedActions: ["summarize market context", "suggest research tasks", "create internal notes"],
    forbiddenActions: ["scrape private data", "send external messages", "make purchases"],
    requiresHumanApproval: false
  },
  {
    id: "buyer_discovery",
    name: "Buyer Discovery Agent",
    role: "Identify potential buyers and rank buyer candidates.",
    capabilities: ["buyer search planning", "buyer scoring", "buyer shortlist creation"],
    allowedActions: ["suggest buyer candidates", "rank buyers", "prepare CRM recommendations"],
    forbiddenActions: ["contact buyers", "send emails", "send WhatsApp messages", "make calls"],
    requiresHumanApproval: true
  },
  {
    id: "supplier_discovery",
    name: "Supplier Discovery Agent",
    role: "Identify potential suppliers and rank supplier candidates.",
    capabilities: ["supplier search planning", "supplier scoring", "supplier shortlist creation"],
    allowedActions: ["suggest supplier candidates", "rank suppliers", "prepare network recommendations"],
    forbiddenActions: ["contact suppliers", "send emails", "send WhatsApp messages", "make calls"],
    requiresHumanApproval: true
  },
  {
    id: "verification",
    name: "Verification Agent",
    role: "Score and verify buyer and supplier candidates before action.",
    capabilities: ["lead verification", "confidence scoring", "rejection reasons"],
    allowedActions: ["score leads", "reject weak leads", "prepare verification summaries"],
    forbiddenActions: ["override human approval", "contact leads", "change CRM records without approval"],
    requiresHumanApproval: false
  },
  {
    id: "crm",
    name: "CRM Agent",
    role: "Prepare CRM recommendations for verified leads.",
    capabilities: ["CRM mapping", "lead stage suggestion", "duplicate risk review"],
    allowedActions: ["recommend CRM push", "draft CRM fields", "flag duplicates"],
    forbiddenActions: ["push CRM records without required approval", "delete CRM records"],
    requiresHumanApproval: true
  },
  {
    id: "outreach",
    name: "Outreach Agent",
    role: "Draft outreach that always requires human approval.",
    capabilities: ["email draft creation", "tone suggestions", "follow-up draft planning"],
    allowedActions: ["draft messages", "suggest timing", "prepare approval queue items"],
    forbiddenActions: ["send emails automatically", "send WhatsApp messages", "make calls"],
    requiresHumanApproval: true
  },
  {
    id: "compliance",
    name: "Compliance Agent",
    role: "Check export/import compliance steps and documentation needs.",
    capabilities: ["document checklist", "country compliance checklist", "risk alerts"],
    allowedActions: ["suggest compliance checks", "create internal checklists"],
    forbiddenActions: ["submit legal filings", "finalize export documents without approval"],
    requiresHumanApproval: true
  },
  {
    id: "revenue",
    name: "Revenue Agent",
    role: "Estimate opportunity size, margin and deal potential.",
    capabilities: ["revenue estimate", "margin prompt", "pricing risk"],
    allowedActions: ["suggest revenue estimates", "flag pricing risks"],
    forbiddenActions: ["commit prices", "share quotations externally"],
    requiresHumanApproval: false
  },
  {
    id: "operations",
    name: "Operations Agent",
    role: "Prepare safe operational tasks and reminders.",
    capabilities: ["task planning", "handoff notes", "timeline suggestions"],
    allowedActions: ["suggest internal tasks", "prepare reminders", "draft timelines"],
    forbiddenActions: ["execute payments", "book shipments", "make external commitments"],
    requiresHumanApproval: true
  }
];

function getAgentRegistry() {
  return AGENT_REGISTRY.map((agent) => ({ ...agent }));
}

function getAgentById(id) {
  return getAgentRegistry().find((agent) => agent.id === id) || null;
}

module.exports = {
  getAgentRegistry,
  getAgentById
};
