const express = require("express");

const {
  getDeals,
  addDeal,
  updateDealStage,
  deleteDeal,
} = require("../controllers/dealController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/")
  .get(protect, getDeals)
  .post(protect, addDeal);

router.route("/:id")
  .put(protect, updateDealStage)
  .delete(protect, deleteDeal);

module.exports = router;