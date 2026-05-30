const express = require("express");
const Usage = require("../models/Usage");

const router = express.Router();

const MASTER_ADMIN_EMAILS = [
  "ks2353013@gmail.com",
  "contact@tradeflowai.in"
];

function getOwnerEmail(req) {
  if (!req.user?.email) {
    throw new Error("Authenticated user email missing");
  }

  return String(req.user.email).toLowerCase().trim();
}

function isMasterAdmin(req) {
  return MASTER_ADMIN_EMAILS.includes(getOwnerEmail(req));
}

function tenantFilter(req) {
  if (isMasterAdmin(req)) {
    return {};
  }

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
    const usage = await Usage.find(tenantFilter(req)).sort({
      createdAt: -1
    });

    res.json({
      success: true,
      usage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch usage records",
      error: error.message
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const usage = await Usage.create({
      ...req.body,
      ownerEmail,
      companyId: req.tenant?.companyId || req.body.companyId || null,
      workspaceId: req.tenant?.workspaceId || req.body.workspaceId || null
    });

    res.status(201).json({
      success: true,
      usage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create usage record",
      error: error.message
    });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const usage = await Usage.find(tenantFilter(req));

    const summary = usage.reduce(
      (acc, item) => {
        const type = item.type || item.action || item.event || "unknown";

        acc.total += 1;
        acc.byType[type] = (acc.byType[type] || 0) + 1;

        return acc;
      },
      {
        total: 0,
        byType: {}
      }
    );

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch usage summary",
      error: error.message
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const usage = await Usage.findOneAndDelete({
      _id: req.params.id,
      ...tenantFilter(req)
    });

    if (!usage) {
      return res.status(404).json({
        success: false,
        message: "Usage record not found"
      });
    }

    res.json({
      success: true,
      message: "Usage record deleted"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete usage record",
      error: error.message
    });
  }
});

module.exports = router;