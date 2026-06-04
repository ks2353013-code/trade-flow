const express = require("express");
const mongoose = require("mongoose");
const Workspace = require("../models/Workspace");
const { writeAuditLog } = require("../utils/auditLogger");
const { enforceCountLimit } = require("../middleware/planLimitMiddleware");
const { requireAdminAccess } = require("../middleware/permissionMiddleware");

const router = express.Router();

function getOwnerEmail(req) {
  if (!req.user?.email) {
    throw new Error("Authenticated user email missing");
  }

  return String(req.user.email).toLowerCase().trim();
}

function tenantFilter(req) {
  if (req.tenant?.isMasterAdmin) {
    return req.tenant?.companyId ? { companyId: req.tenant.companyId } : {};
  }

  const accessFilter = workspaceAccessFilter(req);
  const filter = {
    ...accessFilter
  };

  if (req.tenant?.companyId) {
    filter.companyId = req.tenant.companyId;
  }

  return filter;
}

function workspaceAccessFilter(req) {
  if (req.tenant?.isMasterAdmin) {
    return {};
  }

  const ownerEmail = getOwnerEmail(req);
  const access = [
    { ownerEmail },
    { "members.email": ownerEmail }
  ];

  if (req.user?.id && mongoose.isValidObjectId(req.user.id)) {
    access.push({ createdBy: req.user.id });
    access.push({ userId: req.user.id });
  }

  if (req.user?.companyId && mongoose.isValidObjectId(req.user.companyId)) {
    access.push({ companyId: req.user.companyId });
  }

  return { $or: access };
}

function logWorkspaceApiDebug(req, filter, count, source) {
  if (process.env.NODE_ENV === "production") return;

  console.log("[WORKSPACE API DEBUG] user id/email/companyId", {
    id: req.user?.id || null,
    email: req.user?.email || null,
    ownerEmail: req.ownerEmail || req.user?.ownerEmail || null,
    companyId: req.tenant?.companyId || req.user?.companyId || null,
    source
  });
  console.log("[WORKSPACE API DEBUG] query filter", JSON.stringify(filter));
  console.log("[WORKSPACE API DEBUG] count returned", count);
}

function shouldUseLocalSmokeWorkspace(req) {
  return (
    process.env.NODE_ENV !== "production" &&
    String(req.user?.email || "").toLowerCase().trim() === "ks2353013@gmail.com"
  );
}

async function ensureDefaultWorkspace(req) {
  const ownerEmail = getOwnerEmail(req);
  const useLocalSmokeWorkspace = shouldUseLocalSmokeWorkspace(req);
  const workspaceId = useLocalSmokeWorkspace
    ? "6a1c801f6590805df7945c2b"
    : undefined;
  const workspaceName = useLocalSmokeWorkspace
    ? "rice export uae"
    : "TradeFlow Workspace";

  const existing = workspaceId
    ? await Workspace.findById(workspaceId)
    : null;

  if (existing) return existing;

  return await Workspace.create({
    ...(workspaceId ? { _id: workspaceId } : {}),
    ownerEmail,
    companyId: req.tenant?.companyId || null,
    workspaceName,
    type: "Export",
    status: "Active",
    subscriptionPlan: "Pro Exporter",
    members: [
      {
        email: ownerEmail,
        role: "Owner"
      }
    ]
  });
}

function safeBody(body = {}) {
  const { ownerEmail, companyId, workspaceId, ...safe } = body;
  return safe;
}

function normalizeWorkspaceType(value) {
  const normalized = String(value || "").trim();
  const allowed = [
    "Sales",
    "Export",
    "Import",
    "Marketing",
    "Operations",
    "Finance",
    "Management"
  ];

  if (allowed.includes(normalized)) return normalized;

  const lower = normalized.toLowerCase();

  if (lower.includes("export")) return "Export";
  if (lower.includes("import")) return "Import";
  if (lower.includes("market")) return "Marketing";
  if (lower.includes("finance")) return "Finance";
  if (lower.includes("operation")) return "Operations";
  if (lower.includes("sale")) return "Sales";

  return "Management";
}

function normalizeWorkspaceStatus(value) {
  if (value === "Archived" || value === "Active") return value;
  if (value === "Inactive") return "Archived";
  return "Active";
}

function normalizeWorkspaceBody(body = {}) {
  const safe = safeBody(body);
  const workspaceName = safe.workspaceName || safe.companyName || safe.name;
  const type = safe.type || safe.businessType;
  const status = safe.status;

  delete safe.companyName;
  delete safe.businessType;
  delete safe.name;

  if (workspaceName) safe.workspaceName = workspaceName;
  if (type !== undefined) safe.type = normalizeWorkspaceType(type);
  if (status !== undefined) safe.status = normalizeWorkspaceStatus(status);

  return safe;
}

async function countWorkspaces(req) {
  return await Workspace.countDocuments(workspaceAccessFilter(req));
}

router.get("/", async (req, res) => {
  try {
    const primaryFilter = tenantFilter(req);
    let source = "tenant";
    let workspaces = await Workspace.find(primaryFilter).sort({
      createdAt: -1
    });

    logWorkspaceApiDebug(req, primaryFilter, workspaces.length, source);

    if (!workspaces.length && req.tenant?.companyId) {
      const fallbackFilter = workspaceAccessFilter(req);
      source = "owner-or-member-fallback";
      workspaces = await Workspace.find(fallbackFilter).sort({
        createdAt: -1
      });
      logWorkspaceApiDebug(req, fallbackFilter, workspaces.length, source);
    }

    if (!workspaces.length) {
      const workspace = await ensureDefaultWorkspace(req);
      workspaces = [workspace];
      logWorkspaceApiDebug(req, { defaultWorkspaceRepair: true }, workspaces.length, "default-workspace-repair");
    }

    res.json({
      success: true,
      workspaces
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch workspaces",
      error: error.message
    });
  }
});

router.post(
  "/",
  requireAdminAccess,
  enforceCountLimit("workspace_create", countWorkspaces),
  async (req, res) => {
    try {
      const ownerEmail = getOwnerEmail(req);
      const body = normalizeWorkspaceBody(req.body);

      if (!body.workspaceName) {
        return res.status(400).json({
          success: false,
          message: "Workspace name is required"
        });
      }

      body.type = body.type || "Management";
      body.status = body.status || "Active";

      const workspace = await Workspace.create({
        ...body,
        ownerEmail,
        companyId: req.tenant?.companyId || null
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

      res.status(201).json({
        success: true,
        workspace
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create workspace",
        error: error.message
      });
    }
  }
);

router.put("/:id", requireAdminAccess, async (req, res) => {
  try {
    const body = normalizeWorkspaceBody(req.body);

    const workspace = await Workspace.findOneAndUpdate(
      {
        _id: req.params.id,
        ...tenantFilter(req)
      },
      body,
      { new: true }
    );

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found"
      });
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

    res.json({
      success: true,
      workspace
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update workspace",
      error: error.message
    });
  }
});

router.delete("/:id", requireAdminAccess, async (req, res) => {
  try {
    const workspace = await Workspace.findOneAndDelete({
      _id: req.params.id,
      ...tenantFilter(req)
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found"
      });
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

    res.json({
      success: true,
      message: "Workspace deleted"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete workspace",
      error: error.message
    });
  }
});

module.exports = router;
