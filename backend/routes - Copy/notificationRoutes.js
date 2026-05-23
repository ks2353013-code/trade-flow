const express = require("express");

const {
  getNotifications,
  addNotification,
  markNotificationRead,
  deleteNotification,
} = require("../controllers/notificationController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/")
  .get(protect, getNotifications)
  .post(protect, addNotification);

router.route("/:id/read")
  .put(protect, markNotificationRead);

router.route("/:id")
  .delete(protect, deleteNotification);

module.exports = router;