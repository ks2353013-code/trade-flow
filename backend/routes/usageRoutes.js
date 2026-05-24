const express = require("express");
const UsageMetric = require("../models/UsageMetric");

const router = express.Router();

function tenantFilter(req) {
  const filter = {
    ownerEmail:
      req.tenant?.ownerEmail ||
      req.user?.email ||
      req.headers["x-user-email"] ||
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

router.get("/", async (req, res) => {
  try {
    const metrics = await UsageMetric.find(tenantFilter(req)).sort({
      updatedAt: -1
    });

    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch usage metrics"
    });
  }
});

router.post("/track", async (req, res) => {
  try {
    const { metricType, count = 1, metadata = {} } = req.body;

    if (!metricType) {
      return res.status(400).json({
        message: "metricType is required"
      });
    }

    const filter = {
      ...tenantFilter(req),
      metricType,
      period: "monthly"
    };

    const metric = await UsageMetric.findOneAndUpdate(
      filter,
      {
        $inc: { count: Number(count) || 1 },
        $set: { metadata }
      },
      {
        upsert: true,
        new: true
      }
    );

    res.status(201).json(metric);
  } catch (error) {
    res.status(500).json({
      message: "Failed to track usage"
    });
  }
});

module.exports = router;