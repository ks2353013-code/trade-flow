const express = require("express");

const { enforceLimit } = require("../middleware/planLimitMiddleware");
const { usageTracker } = require("../middleware/usageMiddleware");

const router = express.Router();

router.post(
  "/generate",
  enforceLimit("ai_request"),
  usageTracker("ai_request"),
  async (req, res) => {
    try {
      const {
        supplierName = "Supplier",
        product = "Product",
        country = "India",
        tone = "Professional",
        channel = "Email",
        objective = "Start business discussion"
      } = req.body;

      const subject = `Business Inquiry for ${product}`;

      const emailMessage = `
Dear ${supplierName},

I hope you are doing well.

We are interested in discussing a possible business opportunity regarding ${product}. We are currently exploring reliable suppliers from ${country} and would like to understand your pricing, MOQ, delivery timeline, payment terms, and export capability.

Our objective is to ${objective.toLowerCase()} and evaluate whether we can build a long-term trade relationship.

Please share:
1. Product specifications
2. Best price quotation
3. MOQ
4. Delivery timeline
5. Payment terms
6. Certifications or export documents available

Looking forward to your response.

Best regards,
TradeFlow Team
      `.trim();

      const whatsappMessage = `
Hello ${supplierName}, we are interested in ${product}. Please share your best price, MOQ, delivery timeline, payment terms, and export details. We are looking for a reliable long-term supplier.
      `.trim();

      const followUpSequence = [
        `Follow-up 1: Hi ${supplierName}, just checking if you received our inquiry regarding ${product}. Please share your quotation when possible.`,
        `Follow-up 2: We are shortlisting suppliers for ${product}. Kindly confirm your best pricing, MOQ, and delivery timeline.`,
        `Follow-up 3: We are finalizing our supplier list. Please let us know if you are available for discussion this week.`
      ];

      const negotiationMessage = `
Thank you for sharing your quotation for ${product}. Your offer is interesting, but we are comparing multiple suppliers. If you can improve the pricing, reduce MOQ, or offer better payment terms, we can move forward faster.
      `.trim();

      res.json({
        success: true,
        input: {
          supplierName,
          product,
          country,
          tone,
          channel,
          objective
        },
        subject,
        emailMessage,
        whatsappMessage,
        negotiationMessage,
        followUpSequence,
        aiTips: [
          "Ask for MOQ and payment terms early.",
          "Verify certifications before sending advance payment.",
          "Compare at least 3 suppliers before negotiation.",
          "Keep first message short and business-focused.",
          "Use WhatsApp only after email or supplier confirmation."
        ]
      });
    } catch (error) {
      console.error("AI Outreach Agent Error:", error.message);
      res.status(500).json({
        message: "AI outreach generation failed"
      });
    }
  }
);

module.exports = router;