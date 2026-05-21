const Supplier = require("../models/Supplier");
const Deal = require("../models/Deal");
const Task = require("../models/Task");

const getAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    const suppliers = await Supplier.find({ user: userId });
    const deals = await Deal.find({ user: userId });
    const tasks = await Task.find({ user: userId });

    const totalSuppliers = suppliers.length;
    const totalDeals = deals.length;
    const totalTasks = tasks.length;

    const closedDeals = deals.filter((deal) => deal.stage === "Closed").length;
    const negotiationDeals = deals.filter((deal) => deal.stage === "Negotiation").length;
    const pendingTasks = tasks.filter((task) => task.status !== "Completed").length;
    const completedTasks = tasks.filter((task) => task.status === "Completed").length;

    const pipelineValue = deals.reduce((sum, deal) => {
      return sum + Number(deal.value || 0);
    }, 0);

    const closedValue = deals
      .filter((deal) => deal.stage === "Closed")
      .reduce((sum, deal) => {
        return sum + Number(deal.value || 0);
      }, 0);

    const conversionRate =
      totalDeals > 0 ? Math.round((closedDeals / totalDeals) * 100) : 0;

    const taskCompletionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const averageSupplierScore =
      totalSuppliers > 0
        ? Math.round(
            suppliers.reduce((sum, supplier) => {
              return sum + Number(supplier.score || 0);
            }, 0) / totalSuppliers
          )
        : 0;

    const dealStages = {
      newLead: deals.filter((deal) => deal.stage === "New Lead").length,
      contacted: deals.filter((deal) => deal.stage === "Contacted").length,
      negotiation: negotiationDeals,
      closed: closedDeals,
      lost: deals.filter((deal) => deal.stage === "Lost").length,
    };

    res.json({
      totalSuppliers,
      totalDeals,
      totalTasks,
      closedDeals,
      negotiationDeals,
      pendingTasks,
      completedTasks,
      pipelineValue,
      closedValue,
      conversionRate,
      taskCompletionRate,
      averageSupplierScore,
      dealStages,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getAnalytics,
};