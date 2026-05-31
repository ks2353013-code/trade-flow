const express = require("express");
const Workspace = require("../models/Workspace");
const { isMasterAdmin, requireAdminAccess } = require("../middleware/permissionMiddleware");

const router = express.Router();

function getOwnerEmail(req) {
  if (!req.tenant?.ownerEmail) {
    throw new Error("Tenant owner email missing");
  }

  return req.tenant.ownerEmail;
}

function safeBody(body = {}) {
  const { ownerEmail, companyId, workspaceId, ...safe } = body;
  return safe;
}

function tenantFilter(req) {
  if (isMasterAdmin(req)) {
    return {};
  }

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
    const workspaces = await Workspace.find(
      tenantFilter(req)
    ).sort({
      createdAt: -1
    });

    res.json(workspaces);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch organization workspaces",
      error: error.message
    });
  }
});

router.post("/", requireAdminAccess, async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const workspace = await Workspace.create({
      ...safeBody(req.body),
      ownerEmail,
      companyId: req.tenant?.companyId || null
    });

    res.status(201).json(workspace);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create organization workspace",
      error: error.message
    });
  }
});

router.put("/:id", requireAdminAccess, async (req, res) => {
  try {
    const workspace = await Workspace.findOneAndUpdate(
      {
        _id: req.params.id,
        ...tenantFilter(req)
      },
      safeBody(req.body),
      {
        new: true
      }
    );

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Organization workspace not found"
      });
    }

    res.json(workspace);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update organization workspace",
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
        message: "Organization workspace not found"
      });
    }

    res.json({
      success: true,
      message: "Organization workspace deleted"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete organization workspace",
      error: error.message
    });
  }
});

module.exports = router;
