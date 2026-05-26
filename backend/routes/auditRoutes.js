const express = require("express");
const AuditLog = require("../models/AuditLog");

const router = express.Router();

const MASTER_ADMIN_EMAIL = "ks2353013@gmail.com";

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

function isMasterAdmin(req) {
  return getOwnerEmail(req) === MASTER_ADMIN_EMAIL;
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
    const filter = tenantFilter(req);

    if (req.query.module) {
      filter.module = req.query.module;
    }

    if (req.query.severity) {
      filter.severity = req.query.severity;
    }

    if (req.query.action) {
      filter.action = {
        $regex: req.query.action,
        $options: "i"
      };
    }

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit) || 100);

    res.json({
      success: true,
      total: logs.length,
      logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit logs",
      error: error.message
    });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const logs = await AuditLog.find(tenantFilter(req));

    const summary = logs.reduce(
      (acc, log) => {
        acc.total += 1;

        acc.byModule[log.module] =
          (acc.byModule[log.module] || 0) + 1;

        acc.bySeverity[log.severity] =
          (acc.bySeverity[log.severity] || 0) + 1;

        acc.byAction[log.action] =
          (acc.byAction[log.action] || 0) + 1;

        return acc;
      },
      {
        total: 0,
        byModule: {},
        bySeverity: {},
        byAction: {}
      }
    );

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit summary",
      error: error.message
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (!isMasterAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: "Master Admin access required"
      });
    }

    const log = await AuditLog.findByIdAndDelete(req.params.id);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found"
      });
    }

    res.json({
      success: true,
      message: "Audit log deleted"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete audit log",
      error: error.message
    });
  }
});

module.exports = router;