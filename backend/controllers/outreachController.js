const Outreach = require("../models/Outreach");

const getOutreach = async (req, res) => {
  try {
    const records = await Outreach.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    res.json(records);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const addOutreach = async (req, res) => {
  try {
    const record = await Outreach.create({
      user: req.user._id,
      contactName: req.body.contactName,
      phone: req.body.phone,
      product: req.body.product,
      message: req.body.message,
      channel: req.body.channel || "WhatsApp",
      status: req.body.status || "Draft",
      notes: req.body.notes,
    });

    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

const updateOutreach = async (req, res) => {
  try {
    const record = await Outreach.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        message: "Outreach record not found",
      });
    }

    if (record.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    record.status = req.body.status || record.status;
    record.notes = req.body.notes || record.notes;

    await record.save();

    res.json(record);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const deleteOutreach = async (req, res) => {
  try {
    const record = await Outreach.findById(req.params.id);

    if (!record) {
      return res.status(404).json({
        message: "Outreach record not found",
      });
    }

    if (record.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    await record.deleteOne();

    res.json({
      message: "Outreach record deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getOutreach,
  addOutreach,
  updateOutreach,
  deleteOutreach,
};