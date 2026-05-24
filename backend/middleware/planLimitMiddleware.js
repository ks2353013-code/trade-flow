const UsageMetric = require("../models/UsageMetric");
const Subscription = require("../models/Subscription");

const PLAN_LIMITS = {
  Free: {
    ai_request: 20,
    supplier_create: 25,
    employee_create: 1,
    workspace_create: 1,
    pdf_export: 0
  },
  Pro: {
    ai_request: 500,
    supplier_create: 500,
    employee_create: 10,
    workspace_create: 5,
    pdf_export: 100
  },
  Enterprise: {
    ai_request: 10000,
    supplier_create: 10000,
    employee_create: 200,
    workspace_create: 100,
    pdf_export: 5000
  }
};

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

async function getPlan(email) {
  const subscription = await Subscription.findOne({
    email: email.toLowerCase().trim()
  }).sort({ createdAt: -1 });

  return subscription?.plan || "Free";
}

function enforceLimit(metricType) {
  return async (req, res, next) => {
    try {
      const tenant = getTenant(req);
      const plan = await getPlan(tenant.ownerEmail);

      const limit = PLAN_LIMITS[plan]?.[metricType];

      if (limit === undefined) {
        return next();
      }

      if (limit === 0) {
        return res.status(403).json({
          message: "This feature is not available on your current plan.",
          plan,
          metricType,
          limit
        });
      }

      const usage = await UsageMetric.findOne({
        ownerEmail: tenant.ownerEmail,
        companyId: tenant.companyId,
        workspaceId: tenant.workspaceId,
        metricType,
        period: "monthly"
      });

      const used = Number(usage?.count || 0);

      if (used >= limit) {
        return res.status(403).json({
          message: "Plan limit reached. Please upgrade your plan.",
          plan,
          metricType,
          used,
          limit
        });
      }

      next();
    } catch (error) {
      console.error("Plan limit error:", error.message);
      res.status(500).json({
        message: "Plan limit check failed"
      });
    }
  };
}

module.exports = {
  enforceLimit,
  PLAN_LIMITS
};