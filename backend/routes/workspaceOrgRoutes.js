const express = require("express");
const Workspace = require("../models/Workspace");
const Company = require("../models/Company");

const router = express.Router();

function getOwnerEmail(req) {
  return (
    req.user?.email ||
    req.body?.ownerEmail ||
    req.query?.ownerEmail ||
    req.headers["x-user-email"] ||
    "unknown@tradeflow.local"
  )
    .toString()
    .toLowerCase()
    .trim();
}

router.get("/", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const workspaces = await Workspace.find({ ownerEmail })
      .populate("companyId")
      .sort({ createdAt: -1 });

    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch organization workspaces" });
  }
});

router.post("/", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const {
      companyId,
      workspaceName,
      description,
      type,
      visibility
    } = req.body;

    if (!companyId || !workspaceName) {
      return res.status(400).json({
        message: "Company ID and workspace name are required"
      });
    }

    const company = await Company.findOne({
      _id: companyId,
      ownerEmail
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const workspace = await Workspace.create({
      companyId,
      ownerEmail,
      workspaceName,
      description,
      type,
      visibility,
      members: [
        {
          email: ownerEmail,
          role: "Owner"
        }
      ]
    });

    res.status(201).json(workspace);
  } catch (error) {
    res.status(500).json({ message: "Failed to create workspace" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const workspace = await Workspace.findOneAndUpdate(
      {
        _id: req.params.id,
        ownerEmail
      },
      req.body,
      { new: true }
    );

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    res.json(workspace);
  } catch (error) {
    res.status(500).json({ message: "Failed to update workspace" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const workspace = await Workspace.findOneAndDelete({
      _id: req.params.id,
      ownerEmail
    });

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    res.json({ message: "Workspace deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete workspace" });
  }
});

module.exports = router;