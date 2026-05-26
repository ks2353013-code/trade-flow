const express = require("express");
const Task = require("../models/Task");
const { writeAuditLog } = require("../utils/auditLogger");

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
    const tasks = await Task.find(tenantFilter(req)).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch tasks", error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const task = await Task.create({
      ...req.body,
      ownerEmail,
      companyId: req.tenant?.companyId || req.body.companyId || null,
      workspaceId: req.tenant?.workspaceId || req.body.workspaceId || null
    });

    await writeAuditLog(req, {
      module: "Tasks",
      action: "Created task",
      entityType: "Task",
      entityId: String(task._id),
      severity: "Low",
      metadata: {
        title: task.title || task.taskTitle || "",
        status: task.status || "",
        priority: task.priority || ""
      }
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create task", error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req) },
      req.body,
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    await writeAuditLog(req, {
      module: "Tasks",
      action: "Updated task",
      entityType: "Task",
      entityId: String(task._id),
      severity: "Low",
      metadata: {
        updatedFields: Object.keys(req.body || {})
      }
    });

    res.json(task);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update task", error: error.message });
  }
});

router.patch("/:id/complete", async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req) },
      { status: "Completed" },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    await writeAuditLog(req, {
      module: "Tasks",
      action: "Completed task",
      entityType: "Task",
      entityId: String(task._id),
      severity: "Low"
    });

    res.json(task);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to complete task", error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      ...tenantFilter(req)
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    await writeAuditLog(req, {
      module: "Tasks",
      action: "Deleted task",
      entityType: "Task",
      entityId: String(task._id),
      severity: "Medium",
      metadata: {
        title: task.title || task.taskTitle || ""
      }
    });

    res.json({ success: true, message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete task", error: error.message });
  }
});

module.exports = router;