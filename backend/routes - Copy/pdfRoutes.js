const express = require("express");

const {
  generateInvoicePDF,
} = require("../controllers/pdfController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/invoice", protect, generateInvoicePDF);

module.exports = router;