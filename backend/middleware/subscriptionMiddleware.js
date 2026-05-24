const Subscription = require("../models/Subscription");

const PLAN_ORDER = {
  Free: 1,
  Pro: 2,
  Enterprise: 3
};

async function getUserSubscription(req) {
  const email =
    req.user?.email ||
    req.headers["x-user-email"] ||
    req.body?.email ||
    "unknown@tradeflow.local";

  let subscription = await Subscription.findOne({
    email: email.toLowerCase().trim()
  }).sort({ createdAt: -1 });

  if (!subscription) {
    subscription = await Subscription.create({
      email: email.toLowerCase().trim(),
      plan: "Free",
      status: "Active",
      entitlements: {
        aiLimit: 20,
        supplierLimit: 25,
        dealLimit: 20,
        workspaceLimit: 1,
        employeeLimit: 1
      }
    });
  }

  return subscription;
}

function requirePlan(requiredPlan = "Pro") {
  return async (req, res, next) => {
    try {
      const subscription = await getUserSubscription(req);

      const currentPlan = subscription.plan || "Free";

      if (subscription.status !== "Active") {
        return res.status(403).json({
          message: "Subscription inactive. Please upgrade your plan."
        });
      }

      if ((PLAN_ORDER[currentPlan] || 1) < (PLAN_ORDER[requiredPlan] || 2)) {
        return res.status(403).json({
          message: `${requiredPlan} plan required`,
          currentPlan,
          requiredPlan
        });
      }

      req.subscription = subscription;
      next();
    } catch (error) {
      res.status(500).json({
        message: "Subscription check failed"
      });
    }
  };
}

module.exports = {
  requirePlan,
  getUserSubscription
};