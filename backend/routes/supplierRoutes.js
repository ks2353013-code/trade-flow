const express = require("express");
const Supplier = require("../models/Supplier");

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
    const suppliers = await Supplier.find(tenantFilter(req)).sort({
      createdAt: -1
    });

    res.json(suppliers);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch suppliers"
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const supplier = await Supplier.create({
      ...req.body,
      ownerEmail: req.tenant?.ownerEmail,
      companyId: req.tenant?.companyId || req.body.companyId,
      workspaceId: req.tenant?.workspaceId || req.body.workspaceId
    });

    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create supplier"
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      {
        _id: req.params.id,
        ...tenantFilter(req)
      },
      req.body,
      { new: true }
    );

    if (!supplier) {
      return res.status(404).json({
        message: "Supplier not found"
      });
    }

    res.json(supplier);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update supplier"
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
        message: "Supplier not found"
      });
    }

    res.json({
      message: "Supplier deleted"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete supplier"
    });
  }
});

module.exports = router;