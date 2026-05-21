const Deal = require("../models/Deal");

const getDeals = async (req, res) => {
  try {
    const deals = await Deal.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    res.json(deals);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const addDeal = async (req, res) => {
  try {
    const deal = await Deal.create({
      user: req.user._id,
      companyName: req.body.companyName,
      contactPerson: req.body.contactPerson,
      email: req.body.email,
      phone: req.body.phone,
      product: req.body.product,
      country: req.body.country,
      value: req.body.value,
      stage: req.body.stage,
      priority: req.body.priority,
      notes: req.body.notes,
    });

    res.status(201).json(deal);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

const updateDealStage = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);

    if (!deal) {
      return res.status(404).json({
        message: "Deal not found",
      });
    }

    if (deal.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    deal.stage = req.body.stage || deal.stage;
    await deal.save();

    res.json(deal);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const deleteDeal = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);

    if (!deal) {
      return res.status(404).json({
        message: "Deal not found",
      });
    }

    if (deal.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    await deal.deleteOne();

    res.json({
      message: "Deal deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getDeals,
  addDeal,
  updateDealStage,
  deleteDeal,
};