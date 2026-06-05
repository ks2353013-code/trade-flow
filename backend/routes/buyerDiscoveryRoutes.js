const express = require("express");
const {
  searchBuyers
} = require("../services/buyerSearchService");
const { enforceLimit } = require("../middleware/planLimitMiddleware");
const { usageTracker } = require("../middleware/usageMiddleware");

const router = express.Router();

router.post(
  "/search",
  enforceLimit("buyer_discovery"),
  usageTracker("buyer_discovery"),
  async (req, res) => {
  try {
    const { product, country } = req.body;

    const buyers = await searchBuyers({
      product,
      country
    });

    res.json({
      success: true,
      total: buyers.length,
      buyers
    });
  } catch (error) {
    console.error("Buyer discovery error:", error);

    res.status(500).json({
      success: false,
      message: "Buyer discovery failed"
    });
  }
  }
);

module.exports = router;
