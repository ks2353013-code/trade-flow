const express = require("express");

const { enforceLimit } = require("../middleware/planLimitMiddleware");
const { usageTracker } = require("../middleware/usageMiddleware");

const router = express.Router();

router.post(
  "/plan",
  enforceLimit("ai_request"),
  usageTracker("ai_request"),
  async (req, res) => {
    try {
      const {
        leadName = "Lead",
        leadType = "Supplier",
        product = "Product",
        lastContact = "No previous contact",
        stage = "New Lead",
        urgency = "Medium"
      } = req.body;

      const urgencyDays = {
        High: [1, 3, 5],
        Medium: [2, 5, 8],
        Low: [4, 8, 14]
      };

      const days = urgencyDays[urgency] || urgencyDays.Medium;

      const followups = days.map((day, index) => ({
        step: index + 1,
        dayOffset: day,
        title: `Follow-up ${index + 1} with ${leadName}`,
        channel: index === 0 ? "WhatsApp" : "Email",
        priority: urgency,
        message:
          index === 0
            ? `Hi ${leadName}, following up regarding ${product}. Please confirm pricing, MOQ, and availability.`
            : `Dear ${leadName}, just checking in on our discussion about ${product}. We are shortlisting options and would appreciate your updated details.`
      }));

      const crmRecommendation = {
        currentStage: stage,
        suggestedStage:
          stage === "New Lead"
            ? "Contacted"
            : stage === "Contacted"
            ? "Negotiation"
            : stage,
        nextAction: `Schedule follow-up for ${leadName}`,
        riskLevel:
          urgency === "High"
            ? "High conversion opportunity"
            : "Normal follow-up required"
      };

      res.json({
        success: true,
        lead: {
          leadName,
          leadType,
          product,
          lastContact,
          stage,
          urgency
        },
        followups,
        crmRecommendation,
        aiSummary: `TradeFlow AI created a ${urgency.toLowerCase()} urgency follow-up plan for ${leadName}. Recommended next CRM stage: ${crmRecommendation.suggestedStage}.`
      });
    } catch (error) {
      console.error("AI Follow-up Agent Error:", error.message);
      res.status(500).json({
        message: "AI follow-up planning failed"
      });
    }
  }
);

module.exports = router;