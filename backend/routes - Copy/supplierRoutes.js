const express = require("express");

const {
  getSuppliers,
  addSupplier,
  deleteSupplier,
} = require("../controllers/supplierController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/")
  .get(protect, getSuppliers)
  .post(protect, addSupplier);

router.route("/:id")
  .delete(protect, deleteSupplier);

module.exports = router;