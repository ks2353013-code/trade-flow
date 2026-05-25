const express = require("express");
const Workspace = require("../models/Workspace");
const { usageTracker } = require("../middleware/usageMiddleware");
const { enforceLimit } = require("../middleware/planLimitMiddleware");
const { requirePlan } = require("../middleware/subscriptionMiddleware");

const router = express.Router();

function getOwnerEmail(req) {
  return (
    req.tenant?.ownerEmail ||
    req.user?.email ||
    req.headers["x-user-email"] ||
    "unknown@tradeflow.local"
  );
}

function tenantFilter(req) {
  const filter = {
    ownerEmail: getOwnerEmail(req)
  };

  if (req.tenant?.companyId || req.headers["x-company-id"]) {
    filter.companyId = req.tenant?.companyId || req.headers["x-company-id"];
  }

  return filter;
}

router.get("/", async (req, res) => {
  try {
    const workspaces = await Workspace.find(tenantFilter(req)).sort({
      createdAt: -1
    });

    res.json(workspaces);
  } catch (error) {
    console.error("Workspace fetch error:", error.message);

    res.status(500).json({
      message: "Failed to fetch workspaces"
    });
  }
});

router.post(
  "/",
  requirePlan("Pro"),
  enforceLimit("workspace_create"),
  usageTracker("workspace_create"),
  async (req, res) => {
    try {
      const workspace = await Workspace.create({
        ...req.body,
        ownerEmail: getOwnerEmail(req),
        companyId: req.tenant?.companyId || req.body.companyId
      });

      res.status(201).json(workspace);
    } catch (error) {
      console.error("Workspace create error:", error.message);

      res.status(500).json({
        message: "Failed to create workspace"
      });
    }
  }
);

router.put("/:id", async (req, res) => {
  try {
    const workspace = await Workspace.findOneAndUpdate(
      {
        _id: req.params.id,
        ownerEmail: getOwnerEmail(req)
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
    console.error("Workspace update error:", error.message);

    res.status(500).json({
      message: "Failed to update workspace"
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const workspace = await Workspace.findOneAndDelete({
      _id: req.params.id,
      ownerEmail: getOwnerEmail(req)
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
    console.error("Workspace delete error:", error.message);

    res.status(500).json({
      message: "Failed to delete workspace"
    });
  }
});

module.exports = router;