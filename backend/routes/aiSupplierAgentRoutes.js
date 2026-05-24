const express = require("express");

const {
  enforceLimit
} = require("../middleware/planLimitMiddleware");

const {
  usageTracker
} = require("../middleware/usageMiddleware");

const router = express.Router();

/* =========================
   AI SUPPLIER FINDER
========================= */

router.post(
  "/find",

  enforceLimit("ai_request"),

  usageTracker("ai_request"),

  async (req, res) => {

    try {

      const {
        product,
        country,
        quantity,
        budget
      } = req.body;

      const suppliers = [

        {
          company:
            "Global Agro Exports Pvt Ltd",

          country:
            country || "India",

          product:
            product || "Rice",

          score: 92,

          riskLevel:
            "Low",

          verification:
            "Verified",

          estimatedPrice:
            "$850 / ton",

          contactEmail:
            "sales@globalagroexports.com",

          recommendation:
            "Highly suitable for long-term export contracts.",

          aiInsights:
            [
              "Strong export history",
              "Low trade dispute risk",
              "Fast shipment capability"
            ]
        },

        {
          company:
            "Asian Trade Logistics",

          country:
            country || "India",

          product:
            product || "Rice",

          score: 84,

          riskLevel:
            "Medium",

          verification:
            "Partially Verified",

          estimatedPrice:
            "$790 / ton",

          contactEmail:
            "exports@atl-group.com",

          recommendation:
            "Good pricing but moderate logistics dependency.",

          aiInsights:
            [
              "Competitive pricing",
              "Medium supply consistency",
              "Requires manual negotiation"
            ]
        }

      ];

      const aiSummary = `
TradeFlow AI analyzed supplier opportunities for ${product || "product"}.

Top supplier confidence score:
92%

Recommended strategy:
Focus on verified low-risk exporters with strong logistics capacity and stable export history.

Market Outlook:
Demand trend currently appears stable for ${country || "target market"} imports/exports.
      `;

      res.json({

        success: true,

        query: {
          product,
          country,
          quantity,
          budget
        },

        totalSuppliers:
          suppliers.length,

        suppliers,

        aiSummary

      });

    } catch (error) {

      console.error(
        "AI Supplier Agent Error:",
        error.message
      );

      res.status(500).json({
        message:
          "AI supplier analysis failed"
      });

    }

  }
);

module.exports = router;