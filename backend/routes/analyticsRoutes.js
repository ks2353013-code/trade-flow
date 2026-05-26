const express = require("express");

const Supplier = require("../models/Supplier");
const Deal = require("../models/Deal");
const Task = require("../models/Task");
const Outreach = require("../models/Outreach");
const Notification = require("../models/Notification");

const router = express.Router();

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

function tenantFilter(req) {
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

    const suppliers = await Supplier.find(filter);
    const deals = await Deal.find(filter);
    const tasks = await Task.find(filter);
    const outreach = await Outreach.find(filter);
    const notifications = await Notification.find(filter);

    const totalSuppliers = suppliers.length;
    const totalDeals = deals.length;
    const totalTasks = tasks.length;
    const totalOutreach = outreach.length;
    const totalNotifications = notifications.length;

    const closedDeals = deals.filter(
      deal => deal.stage === "Closed"
    );

    const pendingTasks = tasks.filter(
      task => task.status !== "Completed"
    );

    const completedTasks = tasks.filter(
      task => task.status === "Completed"
    );

    const unreadNotifications = notifications.filter(
      item => item.read === false || item.isRead === false
    );

    const pipelineValue = deals.reduce(
      (sum, deal) => sum + Number(deal.value || deal.dealValue || 0),
      0
    );

    const closedValue = closedDeals.reduce(
      (sum, deal) => sum + Number(deal.value || deal.dealValue || 0),
      0
    );

    const conversionRate =
      totalDeals > 0
        ? Math.round((closedDeals.length / totalDeals) * 100)
        : 0;

    const taskCompletionRate =
      totalTasks > 0
        ? Math.round((completedTasks.length / totalTasks) * 100)
        : 0;

    const averageSupplierScore =
      totalSuppliers > 0
        ? Math.round(
            suppliers.reduce(
              (sum, supplier) => sum + Number(supplier.score || supplier.verificationScore || 75),
              0
            ) / totalSuppliers
          )
        : 0;

    res.json({
      success: true,

      totalSuppliers,
      totalDeals,
      totalTasks,
      totalOutreach,
      totalNotifications,

      closedDeals: closedDeals.length,
      pendingTasks: pendingTasks.length,
      completedTasks: completedTasks.length,
      unreadNotifications: unreadNotifications.length,

      pipelineValue,
      closedValue,
      conversionRate,
      taskCompletionRate,
      averageSupplierScore,

      stages: {
        newLead: deals.filter(deal => deal.stage === "New Lead").length,
        contacted: deals.filter(deal => deal.stage === "Contacted").length,
        negotiation: deals.filter(deal => deal.stage === "Negotiation").length,
        closed: closedDeals.length,
        lost: deals.filter(deal => deal.stage === "Lost").length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
      error: error.message
    });
  }
});

module.exports = router;