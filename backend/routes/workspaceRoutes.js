const express = require("express");
const Workspace = require("../models/Workspace");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const workspaces =
      await Workspace.find().sort({
        createdAt: -1
      });

    res.json(workspaces);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch workspaces"
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const workspace =
      await Workspace.create(req.body);

    res.status(201).json(workspace);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create workspace"
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const workspace =
      await Workspace.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found"
      });
    }

    res.json(workspace);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update workspace"
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const workspace =
      await Workspace.findByIdAndDelete(
        req.params.id
      );

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found"
      });
    }

    res.json({
      message: "Workspace deleted"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete workspace"
    });
  }
});

module.exports = router;