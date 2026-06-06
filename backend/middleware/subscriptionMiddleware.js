const Subscription = require("../models/Subscription");

const PLAN_ORDER = {
  Free: 0,
  Starter: 1,
  "Pro Exporter": 2,
  "Enterprise AI OS": 3
};

const PLAN_ENTITLEMENTS = {
  Free: {
    price: 0,
    aiLimit: 0,
    supplierLimit: 25,
    dealLimit: 10,
    workspaceLimit: 1,
    employeeLimit: 1
  },

  Starter: {
    price: 1999,
    aiLimit: 20,
    supplierLimit: 200,
    dealLimit: 50,
    workspaceLimit: 1,
    employeeLimit: 3
  },

  "Pro Exporter": {
    price: 8999,
    aiLimit: 1000,
    supplierLimit: 2000,
    dealLimit: 1000,
    workspaceLimit: 5,
    employeeLimit: 25
  },

  "Enterprise AI OS": {
    price: 49999,
    aiLimit: 10000,
    supplierLimit: 10000,
    dealLimit: 5000,
    workspaceLimit: 100,
    employeeLimit: 200
  }
};

function normalizePlanName(plan) {
  const value = String(plan || "").trim().toLowerCase();

  if (value === "free") return "Free";
  if (value === "starter") return "Starter";
  if (value === "pro" || value === "pro exporter") return "Pro Exporter";
  if (value === "enterprise" || value === "enterprise ai os") return "Enterprise AI OS";

  // Unknown plan names must fail closed rather than inheriting Starter access.
  return "Free";
}

async function getUserSubscription(req) {
  const email =
    req.tenant?.ownerEmail ||
    req.user?.email ||
    "";

  if (!email) {
    throw new Error("Authenticated user email missing");
  }

  const cleanEmail = email.toLowerCase().trim();

  let subscription = await Subscription.findOne({
    email: cleanEmail
  }).sort({ createdAt: -1 });

  if (!subscription) {
    subscription = await Subscription.create({
      email: cleanEmail,
      plan: "Starter",
      status: "Active",
      price: PLAN_ENTITLEMENTS.Starter.price,
      entitlements: PLAN_ENTITLEMENTS.Starter
    });
  }

  return subscription;
}

function requirePlan(requiredPlan = "Pro Exporter") {
  return async (req, res, next) => {
    try {
      const subscription = await getUserSubscription(req);

      const currentPlan = normalizePlanName(subscription.plan);
      const normalizedRequiredPlan = normalizePlanName(requiredPlan);

      if (subscription.status !== "Active") {
        return res.status(403).json({
          success: false,
          message: "Subscription inactive. Please upgrade your plan.",
          currentPlan
        });
      }

      if (PLAN_ORDER[currentPlan] < PLAN_ORDER[normalizedRequiredPlan]) {
        return res.status(403).json({
          success: false,
          message:
            normalizedRequiredPlan === "Starter"
              ? "Upgrade to Starter to unlock TradeFlow AI"
              : `${normalizedRequiredPlan} plan required`,
          currentPlan,
          requiredPlan: normalizedRequiredPlan
        });
      }

      req.subscription = subscription;
      next();
    } catch (error) {
      console.error("Subscription check failed:", error.message);

      res.status(500).json({
        success: false,
        message: "Subscription check failed"
      });
    }
  };
}

function shouldSkipActiveSubscriptionGuard(req) {
  const path = String(req.originalUrl || req.path || "").toLowerCase();

  return (
    path.startsWith("/api/subscription") ||
    path.startsWith("/api/subscriptions") ||
    path.startsWith("/api/billing") ||
    path.startsWith("/api/payment") ||
    path.startsWith("/api/razorpay-checkout")
  );
}

function requireActiveSubscription() {
  return async (req, res, next) => {
    if (shouldSkipActiveSubscriptionGuard(req)) {
      return next();
    }

    try {
      const subscription = await getUserSubscription(req);

      if (
        subscription.status !== "Active" &&
        subscription.status !== "Trial"
      ) {
        return res.status(403).json({
          success: false,
          message: "Subscription inactive. Please upgrade your plan.",
          currentPlan: subscription.plan || "Starter",
          status: subscription.status || "Inactive"
        });
      }

      req.subscription = subscription;
      return next();
    } catch (error) {
      console.error("Active subscription check failed:", error.message);

      return res.status(500).json({
        success: false,
        message: "Subscription check failed"
      });
    }
  };
}

function requireEnterprise() {
  return requirePlan("Enterprise AI OS");
}

function requirePro() {
  return requirePlan("Pro Exporter");
}

module.exports = {
  requirePlan,
  requirePro,
  requireEnterprise,
  requireActiveSubscription,
  getUserSubscription,
  PLAN_ENTITLEMENTS,
  normalizePlanName
};
