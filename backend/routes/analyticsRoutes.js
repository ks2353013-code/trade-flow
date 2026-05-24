const express = require("express");

const Supplier = require("../models/Supplier");
const Deal = require("../models/Deal");
const Task = require("../models/Task");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    const deals = await Deal.find();
    const tasks = await Task.find();

    const totalSuppliers = suppliers.length;
    const totalDeals = deals.length;
    const totalTasks = tasks.length;

    const pipelineValue = deals.reduce(
      (sum, deal) => sum + Number(deal.value || 0),
      0
    );

    const closedDeals = deals.filter(
      (deal) => deal.stage === "Closed"
    );

    const closedValue = closedDeals.reduce(
      (sum, deal) => sum + Number(deal.value || 0),
      0
    );

    const completedTasks = tasks.filter(
      (task) => task.status === "Completed"
    ).length;

    const pendingTasks = tasks.filter(
      (task) => task.status !== "Completed"
    ).length;

    const averageSupplierScore =
      totalSuppliers > 0
        ? Math.round(
            suppliers.reduce(
              (sum, supplier) => sum + Number(supplier.score || 0),
              0
            ) / totalSuppliers
          )
        : 0;

    const conversionRate =
      totalDeals > 0
        ? Math.round((closedDeals.length / totalDeals) * 100)
        : 0;

    const taskCompletionRate =
      totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

    res.json({
      totalSuppliers,
      totalDeals,
      totalTasks,
      pipelineValue,
      closedValue,
      closedDeals: closedDeals.length,
      conversionRate,
      taskCompletionRate,
      averageSupplierScore,
      pendingTasks,
      completedTasks,
      dealStages: {
        newLead: deals.filter((d) => d.stage === "New Lead").length,
        contacted: deals.filter((d) => d.stage === "Contacted").length,
        negotiation: deals.filter((d) => d.stage === "Negotiation").length,
        closed: deals.filter((d) => d.stage === "Closed").length,
        lost: deals.filter((d) => d.stage === "Lost").length
      }
    });
  } catch (error) {
    console.error("Analytics route error:", error.message);

    res.status(500).json({
      message: "Failed to fetch analytics",
      totalSuppliers: 0,
      totalDeals: 0,
      totalTasks: 0,
      pipelineValue: 0,
      closedValue: 0,
      closedDeals: 0,
      conversionRate: 0,
      taskCompletionRate: 0,
      averageSupplierScore: 0,
      pendingTasks: 0,
      completedTasks: 0,
      dealStages: {
        newLead: 0,
        contacted: 0,
        negotiation: 0,
        closed: 0,
        lost: 0
      }
    });
  }
});

module.exports = router;