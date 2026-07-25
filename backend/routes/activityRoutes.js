const express = require("express");
const Activity = require("../models/Activity");
const { requireMasterAdmin } = require("../middleware/permissionMiddleware");

const router = express.Router();

function getTenantFilter(req) {
  const filter = {};

  if (req.tenant?.ownerEmail) {
    filter.ownerEmail = req.tenant.ownerEmail;
  }

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
    const activities = await Activity.find(getTenantFilter(req))
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch activities" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { type, title, message, source, priority, metadata } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        message: "Title and message are required"
      });
    }

    const activity = await Activity.create({
      ownerEmail: req.tenant?.ownerEmail || req.user?.email,
      companyId: req.tenant?.companyId || null,
      workspaceId: req.tenant?.workspaceId || null,
      type,
      title,
      message,
      source,
      priority,
      metadata
    });

    res.status(201).json(activity);
  } catch (error) {
    res.status(500).json({ message: "Failed to save activity" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const activity = await Activity.findOneAndDelete({
      _id: req.params.id,
      ...getTenantFilter(req)
    });

    if (!activity) {
      return res.status(404).json({ message: "Activity not found" });
    }

    res.json({ message: "Activity deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete activity" });
  }
});

router.delete("/", requireMasterAdmin, async (req, res) => {
  try {
    await Activity.deleteMany(getTenantFilter(req));
    res.json({ message: "All activities cleared" });
  } catch (error) {
    res.status(500).json({ message: "Failed to clear activities" });
  }
});

module.exports = router;
