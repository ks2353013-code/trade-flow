const express = require("express");
const Outreach = require("../models/Outreach");

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
    filter.workspaceId = req.tenant.workspaceId;
  }

  return filter;
}

router.get("/", requirePlan("Pro"), async (req, res) => {
  try {
    const items = await Outreach.find(tenantFilter(req)).sort({
      createdAt: -1
    });

    res.json(items);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch outreach"
    });
  }
});

router.post("/", requirePlan("Pro"), async (req, res) => {
  try {
    const item = await Outreach.create({
      ...req.body,
      ownerEmail: req.tenant?.ownerEmail,
      companyId: req.tenant?.companyId || req.body.companyId,
      workspaceId: req.tenant?.workspaceId || req.body.workspaceId
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create outreach"
    });
  }
});

router.put("/:id", requirePlan("Pro"), async (req, res) => {
  try {
    const item = await Outreach.findOneAndUpdate(
      {
        _id: req.params.id,
        ...tenantFilter(req)
      },
      req.body,
      { new: true }
    );

    if (!item) {
      return res.status(404).json({
        message: "Outreach not found"
      });
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update outreach"
    });
  }
});

router.delete("/:id", requirePlan("Pro"), async (req, res) => {
  try {
    const item = await Outreach.findOneAndDelete({
      _id: req.params.id,
      ...tenantFilter(req)
    });

    if (!item) {
      return res.status(404).json({
        message: "Outreach not found"
      });
    }

    res.json({
      message: "Outreach deleted"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete outreach"
    });
  }
});

module.exports = router;