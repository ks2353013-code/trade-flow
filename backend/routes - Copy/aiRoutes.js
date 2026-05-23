const express = require("express");

const {
  findSuppliers,
  saveAISupplier,
} = require("../controllers/aiController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/find-suppliers", protect, findSuppliers);
router.post("/save-supplier", protect, saveAISupplier);

module.exports = router;