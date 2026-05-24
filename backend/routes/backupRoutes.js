const express = require("express");

const Supplier = require("../models/Supplier");
const Deal = require("../models/Deal");
const Task = require("../models/Task");
const Employee = require("../models/Employee");
const Workspace = require("../models/Workspace");
const Company = require("../models/Company");
const Notification = require("../models/Notification");
const Activity = require("../models/Activity");
const AIMemory = require("../models/AIMemory");

const { requirePlan } = require("../middleware/subscriptionMiddleware");

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

router.get("/export", requirePlan("Pro"), async (req, res) => {
  try {
    const filter = tenantFilter(req);

    const data = {
      exportedAt: new Date().toISOString(),
      ownerEmail: filter.ownerEmail,
      companyId: filter.companyId || "",
      workspaceId: filter.workspaceId || "",

      companies: await Company.find({ ownerEmail: filter.ownerEmail }),
      workspaces: await Workspace.find(filter),
      employees: await Employee.find(filter),
      suppliers: await Supplier.find(filter),
      deals: await Deal.find(filter),
      tasks: await Task.find(filter),
      notifications: await Notification.find(filter),
      activities: await Activity.find({}),
      aiMemory: await AIMemory.find(filter)
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="tradeflow-backup-${Date.now()}.json"`
    );

    res.json(data);
  } catch (error) {
    console.error("Backup export error:", error.message);
    res.status(500).json({
      message: "Failed to export backup"
    });
  }
});

router.post("/restore", requirePlan("Enterprise"), async (req, res) => {
  try {
    const backup = req.body;

    if (!backup || typeof backup !== "object") {
      return res.status(400).json({
        message: "Invalid backup data"
      });
    }

    const ownerEmail =
      req.tenant?.ownerEmail ||
      backup.ownerEmail ||
      "unknown@tradeflow.local";

    const restored = {
      companies: 0,
      workspaces: 0,
      employees: 0,
      suppliers: 0,
      deals: 0,
      tasks: 0,
      notifications: 0,
      aiMemory: 0
    };

    async function insertSafe(Model, records, key) {
      if (!Array.isArray(records)) return;

      const cleaned = records.map((item) => {
        const obj = { ...item };
        delete obj._id;
        delete obj.__v;

        obj.ownerEmail = ownerEmail;

        return obj;
      });

      if (cleaned.length) {
        await Model.insertMany(cleaned, { ordered: false });
        restored[key] = cleaned.length;
      }
    }

    await insertSafe(Company, backup.companies, "companies");
    await insertSafe(Workspace, backup.workspaces, "workspaces");
    await insertSafe(Employee, backup.employees, "employees");
    await insertSafe(Supplier, backup.suppliers, "suppliers");
    await insertSafe(Deal, backup.deals, "deals");
    await insertSafe(Task, backup.tasks, "tasks");
    await insertSafe(Notification, backup.notifications, "notifications");
    await insertSafe(AIMemory, backup.aiMemory, "aiMemory");

    res.json({
      success: true,
      message: "Backup restored successfully",
      restored
    });
  } catch (error) {
    console.error("Backup restore error:", error.message);
    res.status(500).json({
      message: "Failed to restore backup"
    });
  }
});

module.exports = router;