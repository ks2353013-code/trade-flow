const express = require("express");
const Workspace = require("../models/Workspace");

const router = express.Router();

const MASTER_ADMIN_EMAIL = "ks2353013@gmail.com";

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

function isMasterAdmin(req) {
  return getOwnerEmail(req) === MASTER_ADMIN_EMAIL;
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

router.post("/", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const workspace = await Workspace.create({
      ...req.body,
      ownerEmail,
      companyId:
        req.tenant?.companyId ||
        req.body.companyId ||
        null
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

router.put("/:id", async (req, res) => {
  try {
    const workspace = await Workspace.findOneAndUpdate(
      {
        _id: req.params.id,
        ...tenantFilter(req)
      },
      req.body,
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

router.delete("/:id", async (req, res) => {
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