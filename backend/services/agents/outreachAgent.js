a/* TradeFlow Outreach Agent V1
   Drafts only. No email/WhatsApp sending. Human approval required.
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

  const subject = `${ctx.direction} Opportunity for ${ctx.product} - ${ctx.market}`;

  const emailDraft = `Subject: ${subject}

Hello,

I hope you are doing well.

We are exploring a serious ${ctx.direction.toLowerCase()} opportunity related to ${ctx.product} for ${ctx.market}. We would like to understand your requirements, pricing expectations, quantity, packaging preferences, documentation needs, payment terms and delivery timelines.

Please share your latest requirements, catalogue, quotation, company details and any trade documentation support available.

Regards,
TradeFlow Team`;

  const whatsappDraft = `Hello, we are exploring a ${ctx.direction.toLowerCase()} opportunity for ${ctx.product} in ${ctx.market}. Please share your product/requirement details, pricing, MOQ, documents and delivery timeline.`;

  return {
    agent: "Outreach Agent",
    status: "Needs Approval",

    subject,
    emailDraft,
    whatsappDraft,

    followUpSequence: [
      {
        day: 1,
        action: "Send first outreach message after approval"
      },
      {
        day: 2,
        action: "Follow up politely if no response"
      },
      {
        day: 4,
        action: "Ask for catalogue, quotation, MOQ, documents and payment terms"
      },
      {
        day: 7,
        action: "Move responsive lead into CRM negotiation"
      },
      {
        day: 10,
        action: "Mark as cold if no response after final follow-up"
      }
    ],

    approvalRequired: [
      "Send email",
      "Send WhatsApp",
      "Call lead",
      "Share quotation",
      "Commit pricing",
      "Sign contract"
    ],

    recommendedNextActions: [
      "Review outreach draft",
      "Approve or edit message",
      "Send only after human approval",
      "Track response in CRM",
      "Create follow-up task"
    ]
  };
}

module.exports = {
  run
};