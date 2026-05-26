const express = require("express");
const Notification = require("../models/Notification");

const router = express.Router();

function getOwnerEmail(req) {
  return (
    req.tenant?.ownerEmail ||
    req.user?.email ||
    req.headers["x-user-email"] ||
    req.body?.ownerEmail ||
    req.body?.email ||
    req.query?.email ||
    "unknown@tradeflow.local"
  )
    .toLowerCase()
    .trim();
}

function tenantFilter(req) {
  const filter = {
    ownerEmail: getOwnerEmail(req)
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
    const notifications = await Notification.find(
      tenantFilter(req)
    ).sort({
      createdAt: -1
    });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const notification = await Notification.create({
      ...req.body,
      ownerEmail,
      companyId:
        req.tenant?.companyId ||
        req.body.companyId ||
        null,
      workspaceId:
        req.tenant?.workspaceId ||
        req.body.workspaceId ||
        null
    });

    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create notification",
      error: error.message
    });
  }
});

router.patch("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        ...tenantFilter(req)
      },
      {
        read: true,
        isRead: true
      },
      {
        new: true
      }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
      error: error.message
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        ...tenantFilter(req)
      },
      req.body,
      {
        new: true
      }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.json(notification);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update notification",
      error: error.message
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
        success: false,
        message: "Notification not found"
      });
    }

    res.json({
      success: true,
      message: "Notification deleted"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
      error: error.message
    });
  }
});

module.exports = router;