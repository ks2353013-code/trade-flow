const express = require("express");
const Notification = require("../models/Notification");

const router = express.Router();

function tenantFilter(req) {
  const filter = {
    ownerEmail: req.tenant?.ownerEmail || "unknown@tradeflow.local"
  };

  if (req.tenant?.companyId) {
    filter.companyId = req.tenant.companyId;
  }

  if (req.tenant?.workspaceId) {
    filter.workspaceId = req.tenant.workspaceId;
  }

  return filter;
}

router.get("/", async (req, res) => {
  try {
    const notifications = await Notification.find(tenantFilter(req)).sort({
      createdAt: -1
    });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch notifications"
    });
  }
});

router.get("/unread-count", async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      ...tenantFilter(req),
      read: false
    });

    res.json({
      count
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch unread count"
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const notification = await Notification.create({
      ...req.body,
      ownerEmail: req.tenant?.ownerEmail,
      companyId: req.tenant?.companyId || req.body.companyId,
      workspaceId: req.tenant?.workspaceId || req.body.workspaceId
    });

    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create notification"
    });
  }
});

router.put("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        ...tenantFilter(req)
      },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found"
      });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({
      message: "Failed to mark notification as read"
    });
  }
});

router.put("/mark-all-read", async (req, res) => {
  try {
    await Notification.updateMany(tenantFilter(req), {
      read: true
    });

    res.json({
      message: "All notifications marked as read"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to mark all as read"
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      ...tenantFilter(req)
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found"
      });
    }

    res.json({
      message: "Notification deleted"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete notification"
    });
  }
});

module.exports = router;