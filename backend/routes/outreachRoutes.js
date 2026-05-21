const express = require("express");

const {
  getOutreach,
  addOutreach,
  updateOutreach,
  deleteOutreach,
} = require("../controllers/outreachController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/")
  .get(protect, getOutreach)
  .post(protect, addOutreach);

router.route("/:id")
  .put(protect, updateOutreach)
  .delete(protect, deleteOutreach);

module.exports = router;