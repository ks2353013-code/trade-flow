const express = require("express");
const Deal = require("../models/Deal");

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
    const deals = await Deal.find(tenantFilter(req)).sort({
      createdAt: -1
    });

    res.json(deals);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch deals"
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const deal = await Deal.create({
      ...req.body,
      ownerEmail: req.tenant?.ownerEmail,
      companyId: req.tenant?.companyId || req.body.companyId,
      workspaceId: req.tenant?.workspaceId || req.body.workspaceId
    });

    res.status(201).json(deal);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create deal"
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const deal = await Deal.findOneAndUpdate(
      {
        _id: req.params.id,
        ...tenantFilter(req)
      },
      req.body,
      { new: true }
    );

    if (!deal) {
      return res.status(404).json({
        message: "Deal not found"
      });
    }

    res.json(deal);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update deal"
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deal = await Deal.findOneAndDelete({
      _id: req.params.id,
      ...tenantFilter(req)
    });

    if (!deal) {
      return res.status(404).json({
        message: "Deal not found"
      });
    }

    res.json({
      message: "Deal deleted"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete deal"
    });
  }
});

module.exports = router;