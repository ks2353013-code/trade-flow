const express = require("express");

const { enforceLimit } = require("../middleware/planLimitMiddleware");
const { usageTracker } = require("../middleware/usageMiddleware");

const router = express.Router();

router.post(
  "/forecast",
  enforceLimit("ai_request"),
  usageTracker("ai_request"),
  async (req, res) => {
    try {
      const {
        dealName = "Trade Deal",
        dealValue = 0,
        stage = "New Lead",
        lastContactDays = 0,
        supplierScore = 70,
        urgency = "Medium"
      } = req.body;

      let probability = 35;

      if (stage === "Contacted") probability += 15;
      if (stage === "Negotiation") probability += 30;
      if (stage === "Closed") probability = 100;
      if (stage === "Lost") probability = 0;

      if (Number(supplierScore) >= 85) probability += 10;
      if (Number(supplierScore) < 50) probability -= 15;

      if (Number(lastContactDays) > 7) probability -= 10;
      if (Number(lastContactDays) > 15) probability -= 20;

      if (urgency === "High") probability += 8;
      if (urgency === "Low") probability -= 5;

      probability = Math.max(0, Math.min(100, probability));

      const expectedRevenue = Math.round((Number(dealValue) || 0) * (probability / 100));

      const riskLevel =
        probability >= 75
          ? "Low"
          : probability >= 45
          ? "Medium"
          : "High";

      const nextAction =
        probability >= 75
          ? "Push for closure and confirm payment/shipping terms."
          : probability >= 45
          ? "Send follow-up and improve negotiation clarity."
          : "Re-qualify lead or replace with stronger opportunity.";

      const forecast = {
        dealName,
        stage,
        probability,
        expectedRevenue,
        riskLevel,
        nextAction,
        pipelineHealth:
          probability >= 70
            ? "Strong"
            : probability >= 40
            ? "Moderate"
            : "Weak",
        aiInsights: [
          `Current stage is ${stage}.`,
          `Supplier score impact: ${supplierScore}.`,
          `Last contact gap: ${lastContactDays} days.`,
          `Estimated conversion probability: ${probability}%.`
        ]
      };

      res.json({
        success: true,
        forecast
      });
    } catch (error) {
      console.error("AI CRM Forecast Agent Error:", error.message);
      res.status(500).json({
        message: "AI CRM forecast failed"
      });
    }
  }
);

module.exports = router;