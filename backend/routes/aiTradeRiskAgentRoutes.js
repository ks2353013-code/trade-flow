const express = require("express");

const { enforceLimit } = require("../middleware/planLimitMiddleware");
const { usageTracker } = require("../middleware/usageMiddleware");

const router = express.Router();

router.post(
  "/analyze",
  enforceLimit("ai_request"),
  usageTracker("ai_request"),

  async (req, res) => {

    try {

      const {
        supplierName = "Supplier",
        country = "India",
        paymentMethod = "Advance",
        shipmentType = "Sea",
        orderValue = 0,
        supplierScore = 70
      } = req.body;

      let riskScore = 40;

      if (paymentMethod === "Advance") {
        riskScore += 20;
      }

      if (shipmentType === "Air") {
        riskScore -= 5;
      }

      if (Number(orderValue) > 100000) {
        riskScore += 15;
      }

      if (Number(supplierScore) >= 85) {
        riskScore -= 15;
      }

      if (Number(supplierScore) < 50) {
        riskScore += 20;
      }

      riskScore = Math.max(
        0,
        Math.min(100, riskScore)
      );

      const riskLevel =
        riskScore >= 75
          ? "High"
          : riskScore >= 45
          ? "Medium"
          : "Low";

      const analysis = {
        supplierName,
        country,
        paymentMethod,
        shipmentType,
        orderValue,
        supplierScore,
        riskScore,
        riskLevel,

        recommendations: [

          "Verify supplier export documents before payment.",

          "Use milestone-based payments instead of full advance.",

          "Request video verification or third-party inspection.",

          "Validate logistics and shipment timelines carefully.",

          "Cross-check certifications and trade references."

        ],

        aiInsights: [

          `Supplier score analyzed: ${supplierScore}`,

          `Payment method risk: ${paymentMethod}`,

          `Shipment mode evaluated: ${shipmentType}`,

          `Trade risk classification: ${riskLevel}`

        ],

        operationalAdvice:
          riskLevel === "High"
            ? "Proceed carefully with staged payments and third-party verification."
            : riskLevel === "Medium"
            ? "Supplier appears moderate-risk. Maintain controlled negotiation and inspection."
            : "Supplier appears operationally stable for business engagement."

      };

      res.json({
        success: true,
        analysis
      });

    } catch (error) {

      console.error(
        "AI Trade Risk Agent Error:",
        error.message
      );

      res.status(500).json({
        message:
          "AI trade risk analysis failed"
      });

    }

  }
);

module.exports = router;