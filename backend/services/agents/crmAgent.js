/* TradeFlow CRM Agent V1
   CRM strategy only. Does not create records directly.
*/

function normalizeInput(input = {}) {
  return {
    direction: input.direction || "Export",
    product: input.product || "General Product",
    market: input.market || "Global Market",
    ownerEmail: input.ownerEmail || "",
    workspaceId: input.workspaceId || null,
    companyId: input.companyId || null
  };
}

function run(input = {}) {
  const ctx = normalizeInput(input);

  return {
    agent: "CRM Agent",
    status: "Completed",

    pipelineName: `${ctx.product} ${ctx.direction} Pipeline - ${ctx.market}`,

    suggestedStages: [
      "New Lead",
      "Contacted",
      "Qualified",
      "Quotation Sent",
      "Negotiation",
      "Documents Review",
      "Closed Won",
      "Closed Lost"
    ],

    dealStrategy: `Create a dedicated CRM pipeline for ${ctx.direction.toLowerCase()} of ${ctx.product} in ${ctx.market}. Prioritize verified buyers/suppliers, track response status, and move only qualified leads into negotiation.`,

    followUpTasks: [
      "Send first outreach message",
      "Follow up after 2 days",
      "Request product/catalogue or buying requirement",
      "Collect pricing/MOQ/payment terms",
      "Schedule negotiation call",
      "Prepare document checklist",
      "Update CRM stage after every response"
    ],

    crmNotes: [
      `Product: ${ctx.product}`,
      `Market: ${ctx.market}`,
      `Direction: ${ctx.direction}`,
      "Human approval required before quotation, contract, or payment commitment."
    ],

    priority:
      ctx.product !== "General Product" && ctx.market !== "Global Market"
        ? "High"
        : "Medium",

    recommendedNextActions: [
      "Create CRM pipeline",
      "Add verified leads",
      "Assign follow-up owner",
      "Track outreach status",
      "Move serious opportunities to negotiation"
    ]
  };
}

module.exports = {
  run
};