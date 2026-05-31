const express = require("express");
const Supplier = require("../models/Supplier");
const { usageTracker } = require("../middleware/usageMiddleware");
const { enforceLimit } = require("../middleware/planLimitMiddleware");
const { writeAuditLog } = require("../utils/auditLogger");

const router = express.Router();

function getOwnerEmail(req) {
  if (!req.tenant?.ownerEmail) {
    throw new Error("Tenant owner email missing");
  }

  return req.tenant.ownerEmail;
}

function safeBody(body = {}) {
  const { ownerEmail, companyId, workspaceId, user, ...safe } = body;
  return safe;
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
    const suppliers = await Supplier.find(
      tenantFilter(req)
    ).sort({
      createdAt: -1
    });

    res.json(suppliers);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch suppliers",
      error: error.message
    });
  }
});

router.post("/list", async (req, res) => {
  try {
    const suppliers = await Supplier.find(
      tenantFilter(req)
    ).sort({
      createdAt: -1
    });

    res.json(suppliers);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch suppliers",
      error: error.message
    });
  }
});

router.post(
  "/",
  enforceLimit("supplier_create"),
  usageTracker("supplier_create"),
  async (req, res) => {
    try {
      const ownerEmail = getOwnerEmail(req);

      const supplier = await Supplier.create({
        ...safeBody(req.body),
        user: req.user?.id || null,
        ownerEmail,
        companyId: req.tenant?.companyId || null,
        workspaceId: req.tenant?.workspaceId || null
      });

      await writeAuditLog(req, {
        module: "Suppliers",
        action: "Created supplier",
        entityType: "Supplier",
        entityId: String(supplier._id),
        severity: "Low",
        metadata: {
          supplierName: supplier.supplierName || supplier.name || "",
          product: supplier.product || "",
          country: supplier.country || ""
        }
      });

      res.status(201).json(supplier);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create supplier",
        error: error.message
      });
    }
  }
);

router.put("/:id", async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      {
        _id: req.params.id,
        ...tenantFilter(req)
      },
      safeBody(req.body),
      {
        new: true
      }
    );

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found"
      });
    }

    await writeAuditLog(req, {
      module: "Suppliers",
      action: "Updated supplier",
      entityType: "Supplier",
      entityId: String(supplier._id),
      severity: "Low",
      metadata: {
        updatedFields: Object.keys(req.body || {})
      }
    });

    res.json(supplier);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update supplier",
      error: error.message
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndDelete({
      _id: req.params.id,
      ...tenantFilter(req)
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found"
      });
    }

    await writeAuditLog(req, {
      module: "Suppliers",
      action: "Deleted supplier",
      entityType: "Supplier",
      entityId: String(supplier._id),
      severity: "Medium",
      metadata: {
        supplierName: supplier.supplierName || supplier.name || ""
      }
    });

    res.json({
      success: true,
      message: "Supplier deleted"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete supplier",
      error: error.message
    });
  }
});

module.exports = router;
