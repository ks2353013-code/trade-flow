const express = require("express");
const Workspace = require("../models/Workspace");
const { usageTracker } = require("../middleware/usageMiddleware");
const { enforceLimit } = require("../middleware/planLimitMiddleware");
const {
  requirePlan
} = require("../middleware/subscriptionMiddleware");

const router = express.Router();

function tenantFilter(req) {
  const filter = {
    ownerEmail:
      req.tenant?.ownerEmail ||
      "unknown@tradeflow.local"
  };

  if (req.tenant?.companyId) {
    filter.companyId = req.tenant.companyId;
  }

  if (req.tenant?.workspaceId) {
    filter._id = req.tenant.workspaceId;
  }

  return filter;
}

router.post("/", requirePlan("Pro"), enforceLimit("workspace_create"), usageTracker("workspace_create"), async (req, res) => {
  try {
    const workspaces = await Workspace.find(tenantFilter(req)).sort({
      createdAt: -1
    });

    res.json(workspaces);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch workspaces"
    });
  }
});

router.post("/", requirePlan("Pro"), async (req, res) => {
  try {
    const workspace = await Workspace.create({
      ...req.body,
      ownerEmail: req.tenant?.ownerEmail,
      companyId: req.tenant?.companyId || req.body.companyId
    });

    res.status(201).json(workspace);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create workspace"
    });
  }
});

router.put("/:id", requirePlan("Pro"), async (req, res) => {
  try {
    const workspace = await Workspace.findOneAndUpdate(
      {
        _id: req.params.id,
        ownerEmail: req.tenant?.ownerEmail || "unknown@tradeflow.local"
      },
      req.body,
      { new: true }
    );

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found"
      });
    }

    res.json(workspace);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update workspace"
    });
  }
});

router.delete("/:id", requirePlan("Pro"), async (req, res) => {
  try {
    const workspace = await Workspace.findOneAndDelete({
      _id: req.params.id,
      ownerEmail: req.tenant?.ownerEmail || "unknown@tradeflow.local"
    });

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found"
      });
    }

    res.json({
      message: "Workspace deleted"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete workspace"
    });
  }
});

module.exports = router;