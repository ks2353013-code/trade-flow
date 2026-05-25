const express = require("express");
const {
  searchSuppliers
} = require("../services/supplierSearchService");

const router = express.Router();

router.post("/search", async (req, res) => {
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
});

module.exports = router;