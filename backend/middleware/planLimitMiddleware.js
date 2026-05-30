const Subscription = require("../models/Subscription");

const PLAN_LIMITS = {
  Starter: {
    ai_request: 20,
    supplier_create: 200,
    employee_create: 3,
    workspace_create: 1,
    verified_lead_create: 25,
    ai_workflow_create: 5,
    pdf_export: 5,
    analytics_access: false,
    executive_access: false
  },

  "Pro Exporter": {
    ai_request: 1000,
    supplier_create: 2000,
    employee_create: 25,
    workspace_create: 5,
    verified_lead_create: 500,
    ai_workflow_create: 100,
    pdf_export: 500,
    analytics_access: true,
    executive_access: false
  },

  Growth: {
    ai_request: 5000,
    supplier_create: 5000,
    employee_create: 50,
    workspace_create: 15,
    verified_lead_create: 2000,
    ai_workflow_create: 500,
    pdf_export: 1500,
    analytics_access: true,
    executive_access: true
  },

  "Enterprise AI OS": {
    ai_request: 10000,
    supplier_create: 10000,
    employee_create: 200,
    workspace_create: 100,
    verified_lead_create: 10000,
    ai_workflow_create: 10000,
    pdf_export: 5000,
    analytics_access: true,
    executive_access: true
  }
};

function getOwnerEmail(req) {
  const email = req.user?.email;

  if (!email) {
    throw new Error("Authenticated user email missing");
  }

  return String(email).toLowerCase().trim();
}

async function getSubscription(email) {
  let subscription = await Subscription.findOne({
    email
  }).sort({ createdAt: -1 });

  if (!subscription) {
    subscription = await Subscription.create({
      email,
      plan: "Starter",
      status: "Active",
      price: 1999,
      approvalStatus: "Not Required",
      entitlements: {
        aiLimit: 20,
        supplierLimit: 200,
        dealLimit: 50,
        workspaceLimit: 1,
        employeeLimit: 3
      }
    });
  }

  return subscription;
}

async function getPlan(email) {
  const subscription = await getSubscription(email);
  return subscription?.plan || "Starter";
}

function getLimit(plan, metricType) {
  return PLAN_LIMITS[plan]?.[metricType];
}

function requireFeature(metricType) {
  return async function (req, res, next) {
    try {
      const email = getOwnerEmail(req);
      const plan = await getPlan(email);
      const allowed = getLimit(plan, metricType);

      if (allowed === true || typeof allowed === "number") {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: "This feature is not available on your current plan.",
        plan,
        metricType
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: "Plan feature check failed",
        error: error.message
      });
    }
  };
}

function enforceCountLimit(metricType, countFunction) {
  return async function (req, res, next) {
    try {
      const email = getOwnerEmail(req);
      const plan = await getPlan(email);
      const limit = getLimit(plan, metricType);

      if (limit === undefined) {
        return next();
      }

      if (limit === false || limit === 0) {
        return res.status(403).json({
          success: false,
          message: "This feature is not available on your current plan.",
          plan,
          metricType,
          limit
        });
      }

      const used = await countFunction(req);

      if (used >= limit) {
        return res.status(403).json({
          success: false,
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
        success: false,
        message: "Plan limit check failed",
        error: error.message
      });
    }
  };
}

function enforceLimit(metricType) {
  return async function (req, res, next) {
    try {
      const email = getOwnerEmail(req);
      const plan = await getPlan(email);
      const limit = getLimit(plan, metricType);

      if (limit === undefined || limit === true) {
        return next();
      }

      if (limit === false || limit === 0) {
        return res.status(403).json({
          success: false,
          message: "This feature is not available on your current plan.",
          plan,
          metricType,
          limit
        });
      }

      return next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Plan limit check failed",
        error: error.message
      });
    }
  };
}

module.exports = {
  PLAN_LIMITS,
  getOwnerEmail,
  getSubscription,
  getPlan,
  getLimit,
  requireFeature,
  enforceLimit,
  enforceCountLimit
};