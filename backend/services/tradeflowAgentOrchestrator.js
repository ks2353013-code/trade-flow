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

function buildAgents({ direction, product, market }) {
  return [
    {
      name: "Research Agent",
      status: "Completed",
      output: `Analyzed ${direction.toLowerCase()} opportunity for ${product} in ${market}.`
    },
    {
      name: "Buyer Discovery Agent",
      status: direction === "Export" ? "Ready" : "Secondary",
      output: `Prepare buyer/importer discovery for ${product} in ${market}.`
    },
    {
      name: "Supplier Discovery Agent",
      status: "Ready",
      output: `Find verified suppliers/manufacturers for ${product}.`
    },
    {
      name: "Outreach Agent",
      status: "Needs Approval",
      output: "Draft outreach emails and WhatsApp messages. Human approval required before sending."
    },
    {
      name: "CRM Agent",
      status: "Ready",
      output: "Create CRM pipeline, deal stage, follow-up tasks and notes."
    },
    {
      name: "Compliance Agent",
      status: "Ready",
      output: "Prepare export/import document checklist and compliance reminders."
    }
  ];
}

function buildDocuments(product) {
  const docs = [
    "Commercial Invoice",
    "Packing List",
    "Certificate of Origin",
    "Shipping Bill",
    "Bill of Lading / Airway Bill",
    "Insurance Certificate"
  ];

  if (product.toLowerCase().includes("rice")) {
    docs.push("FSSAI / Food Safety Documentation");
    docs.push("Phytosanitary Certificate");
  }

  if (product.toLowerCase().includes("medicine")) {
    docs.push("Drug License / Pharma Export Compliance");
    docs.push("COA / Product Certificate of Analysis");
  }

  return docs;
}

function estimateRevenue(product, market) {
  let base = 500000;

  if (product.includes("Rice")) base += 750000;
  if (product.includes("Medicine")) base += 1500000;
  if (market === "UAE") base += 500000;
  if (market === "Europe" || market === "USA") base += 900000;

  return base;
}

function runTradeMission(missionText = "") {
  const detected = detectMission(missionText);
  const revenueEstimate = estimateRevenue(detected.product, detected.market);

  const opportunityScore = Math.min(
    95,
    55 +
      (detected.product !== "General Product" ? 15 : 0) +
      (detected.market !== "Global Market" ? 15 : 0) +
      10
  );

  return {
    ...detected,
    status: "Needs Approval",
    agents: buildAgents(detected),
    opportunities: [
      `${detected.direction} opportunity detected for ${detected.product} in ${detected.market}.`,
      `Estimated revenue potential: ₹${revenueEstimate.toLocaleString("en-IN")}.`,
      "Recommended to begin verified lead discovery and outreach preparation."
    ],
    risks: [
      "Supplier/buyer verification required before outreach.",
      "Pricing, compliance and shipment terms need human approval.",
      "Do not send messages automatically without owner approval."
    ],
    actions: [
      "Create or select matching workspace.",
      "Find verified suppliers and buyers.",
      "Generate outreach drafts.",
      "Create CRM deal pipeline.",
      "Create follow-up task sequence.",
      "Prepare required trade documents."
    ],
    documents: buildDocuments(detected.product),
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
    timeline: [
      {
        title: "Mission created",
        status: "Completed",
        at: new Date().toISOString()
      },
      {
        title: "Human approval required before external communication",
        status: "Pending",
        at: new Date().toISOString()
      }
    ]
  };
}

module.exports = {
  runTradeMission
};