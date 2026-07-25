const UsageMetric = require("../models/UsageMetric");

function getTenant(req) {
  const ownerEmail = req.tenant?.ownerEmail || req.user?.email;

  if (!ownerEmail) {
    throw new Error("Authenticated user email missing for usage tracking");
  }

  return {
    ownerEmail,

    companyId:
      req.tenant?.companyId ||
      undefined,

    workspaceId:
      req.tenant?.workspaceId ||
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
