const UsageMetric = require("../models/UsageMetric");

function getTenant(req) {
  return {
    ownerEmail:
      req.tenant?.ownerEmail ||
      req.user?.email ||
      req.headers["x-user-email"] ||
      "unknown@tradeflow.local",

    companyId:
      req.tenant?.companyId ||
      req.headers["x-company-id"] ||
      undefined,

    workspaceId:
      req.tenant?.workspaceId ||
      req.headers["x-workspace-id"] ||
      undefined
  };
}

async function trackUsage(req, metricType, count = 1, metadata = {}) {
  try {
    const tenant = getTenant(req);

    await UsageMetric.findOneAndUpdate(
      {
        ownerEmail: tenant.ownerEmail,
        companyId: tenant.companyId,
        workspaceId: tenant.workspaceId,
        metricType,
        period: "monthly"
      },
      {
        $inc: { count },
        $set: { metadata }
      },
      {
        upsert: true,
        new: true
      }
    );
  } catch (error) {
    console.error("Usage tracking error:", error.message);
  }
}

function usageTracker(metricType) {
  return async (req, res, next) => {
    await trackUsage(req, metricType, 1, {
      method: req.method,
      path: req.originalUrl
    });

    next();
  };
}

module.exports = {
  trackUsage,
  usageTracker
};