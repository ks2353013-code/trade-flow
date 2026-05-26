const express = require("express");
const Deal = require("../models/Deal");
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
    const deals = await Deal.find(tenantFilter(req)).sort({ createdAt: -1 });
    res.json(deals);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch deals", error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const deal = await Deal.create({
      ...req.body,
      ownerEmail,
      companyId: req.tenant?.companyId || req.body.companyId || null,
      workspaceId: req.tenant?.workspaceId || req.body.workspaceId || null
    });

    await writeAuditLog(req, {
      module: "CRM",
      action: "Created deal",
      entityType: "Deal",
      entityId: String(deal._id),
      severity: "Low",
      metadata: {
        companyName: deal.companyName || deal.dealCompanyName || "",
        product: deal.product || deal.dealProduct || "",
        value: deal.value || deal.dealValue || 0,
        stage: deal.stage || ""
      }
    });

    res.status(201).json(deal);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create deal", error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const deal = await Deal.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req) },
      req.body,
      { new: true }
    );

    if (!deal) {
      return res.status(404).json({ success: false, message: "Deal not found" });
    }

    await writeAuditLog(req, {
      module: "CRM",
      action: "Updated deal",
      entityType: "Deal",
      entityId: String(deal._id),
      severity: "Low",
      metadata: {
        updatedFields: Object.keys(req.body || {})
      }
    });

    res.json(deal);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update deal", error: error.message });
  }
});

router.patch("/:id/stage", async (req, res) => {
  try {
    const { stage } = req.body;

    const deal = await Deal.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req) },
      { stage },
      { new: true }
    );

    if (!deal) {
      return res.status(404).json({ success: false, message: "Deal not found" });
    }

    await writeAuditLog(req, {
      module: "CRM",
      action: "Updated deal stage",
      entityType: "Deal",
      entityId: String(deal._id),
      severity: "Low",
      metadata: {
        stage
      }
    });

    res.json(deal);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update deal stage", error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deal = await Deal.findOneAndDelete({
      _id: req.params.id,
      ...tenantFilter(req)
    });

    if (!deal) {
      return res.status(404).json({ success: false, message: "Deal not found" });
    }

    await writeAuditLog(req, {
      module: "CRM",
      action: "Deleted deal",
      entityType: "Deal",
      entityId: String(deal._id),
      severity: "Medium",
      metadata: {
        companyName: deal.companyName || deal.dealCompanyName || ""
      }
    });

    res.json({ success: true, message: "Deal deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete deal", error: error.message });
  }
});

module.exports = router;