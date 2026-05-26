const express = require("express");
const Workspace = require("../models/Workspace");
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

  return filter;
}

router.get("/", async (req, res) => {
  try {
    const workspaces = await Workspace.find(tenantFilter(req)).sort({ createdAt: -1 });
    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch workspaces", error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const workspace = await Workspace.create({
      ...req.body,
      ownerEmail,
      companyId: req.tenant?.companyId || req.body.companyId || null
    });

    await writeAuditLog(req, {
      module: "Workspaces",
      action: "Created workspace",
      entityType: "Workspace",
      entityId: String(workspace._id),
      severity: "Medium",
      metadata: {
        workspaceName: workspace.workspaceName || workspace.name || "",
        type: workspace.type || ""
      }
    });

    res.status(201).json(workspace);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create workspace", error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const workspace = await Workspace.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req) },
      req.body,
      { new: true }
    );

    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found" });
    }

    await writeAuditLog(req, {
      module: "Workspaces",
      action: "Updated workspace",
      entityType: "Workspace",
      entityId: String(workspace._id),
      severity: "Medium",
      metadata: {
        updatedFields: Object.keys(req.body || {})
      }
    });

    res.json(workspace);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update workspace", error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const workspace = await Workspace.findOneAndDelete({
      _id: req.params.id,
      ...tenantFilter(req)
    });

    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found" });
    }

    await writeAuditLog(req, {
      module: "Workspaces",
      action: "Deleted workspace",
      entityType: "Workspace",
      entityId: String(workspace._id),
      severity: "High",
      metadata: {
        workspaceName: workspace.workspaceName || workspace.name || ""
      }
    });

    res.json({ success: true, message: "Workspace deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete workspace", error: error.message });
  }
});

module.exports = router;