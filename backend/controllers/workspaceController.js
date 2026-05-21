const Workspace = require("../models/Workspace");

const getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      owner: req.user._id,
    }).sort({ createdAt: -1 });

    res.json(workspaces);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const addWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.create({
      owner: req.user._id,
      companyName: req.body.companyName,
      businessType: req.body.businessType,
      country: req.body.country,
      gstNumber: req.body.gstNumber,
      iecCode: req.body.iecCode,
      industry: req.body.industry,
      defaultCurrency: req.body.defaultCurrency,
      status: req.body.status || "Active",
    });

    res.status(201).json(workspace);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

const updateWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    workspace.companyName = req.body.companyName || workspace.companyName;
    workspace.businessType = req.body.businessType || workspace.businessType;
    workspace.country = req.body.country || workspace.country;
    workspace.gstNumber = req.body.gstNumber || workspace.gstNumber;
    workspace.iecCode = req.body.iecCode || workspace.iecCode;
    workspace.industry = req.body.industry || workspace.industry;
    workspace.defaultCurrency = req.body.defaultCurrency || workspace.defaultCurrency;
    workspace.status = req.body.status || workspace.status;

    await workspace.save();

    res.json(workspace);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const deleteWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        message: "Not authorized",
      });
    }

    await workspace.deleteOne();

    res.json({
      message: "Workspace deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getWorkspaces,
  addWorkspace,
  updateWorkspace,
  deleteWorkspace,
};