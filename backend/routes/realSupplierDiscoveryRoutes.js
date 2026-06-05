const express = require("express");
const {
  searchSuppliers
} = require("../services/supplierSearchService");
const { enforceLimit } = require("../middleware/planLimitMiddleware");
const { usageTracker } = require("../middleware/usageMiddleware");

const router = express.Router();

router.post(
  "/search",
  enforceLimit("supplier_discovery"),
  usageTracker("supplier_discovery"),
  async (req, res) => {
  try {
    const { product, country } = req.body;

    const suppliers = await searchSuppliers({
      product,
      country
    });

    res.json({
      success: true,
      total: suppliers.length,
      suppliers
    });
  } catch (error) {
    console.error("Supplier discovery error:", error);

    res.status(500).json({
      success: false,
      message: "Supplier discovery failed"
    });
  }
  }
);

module.exports = router;
