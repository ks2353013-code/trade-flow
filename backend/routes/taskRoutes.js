const express = require("express");
const Task = require("../models/Task");

const router = express.Router();

function tenantFilter(req) {
  const filter = {
    ownerEmail: req.tenant?.ownerEmail || "unknown@tradeflow.local"
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
    const tasks = await Task.find(tenantFilter(req)).sort({
      createdAt: -1
    });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch tasks"
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const task = await Task.create({
      ...req.body,
      ownerEmail: req.tenant?.ownerEmail,
      companyId: req.tenant?.companyId || req.body.companyId,
      workspaceId: req.tenant?.workspaceId || req.body.workspaceId
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create task"
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      {
        _id: req.params.id,
        ...tenantFilter(req)
      },
      req.body,
      { new: true }
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found"
      });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update task"
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      ...tenantFilter(req)
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found"
      });
    }

    res.json({
      message: "Task deleted"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete task"
    });
  }
});

module.exports = router;