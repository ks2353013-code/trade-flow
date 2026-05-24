const express = require("express");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    res.json({
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
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch analytics"
    });
  }
});

module.exports = router;