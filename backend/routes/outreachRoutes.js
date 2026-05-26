const express = require("express");
const Outreach = require("../models/Outreach");
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
    const records = await Outreach.find(tenantFilter(req)).sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch outreach records", error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const record = await Outreach.create({
      ...req.body,
      ownerEmail,
      companyId: req.tenant?.companyId || req.body.companyId || null,
      workspaceId: req.tenant?.workspaceId || req.body.workspaceId || null
    });

    await writeAuditLog(req, {
      module: "Outreach",
      action: "Created outreach record",
      entityType: "Outreach",
      entityId: String(record._id),
      severity: "Low",
      metadata: {
        contactName: record.contactName || record.outreachContactName || "",
        phone: record.phone || record.outreachPhone || "",
        status: record.status || ""
      }
    });

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create outreach record", error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const record = await Outreach.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req) },
      req.body,
      { new: true }
    );

    if (!record) {
      return res.status(404).json({ success: false, message: "Outreach record not found" });
    }

    await writeAuditLog(req, {
      module: "Outreach",
      action: "Updated outreach record",
      entityType: "Outreach",
      entityId: String(record._id),
      severity: "Low",
      metadata: {
        updatedFields: Object.keys(req.body || {})
      }
    });

    res.json(record);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update outreach record", error: error.message });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    const record = await Outreach.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req) },
      { status },
      { new: true }
    );

    if (!record) {
      return res.status(404).json({ success: false, message: "Outreach record not found" });
    }

    await writeAuditLog(req, {
      module: "Outreach",
      action: "Updated outreach status",
      entityType: "Outreach",
      entityId: String(record._id),
      severity: "Low",
      metadata: { status }
    });

    res.json(record);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update outreach status", error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const record = await Outreach.findOneAndDelete({
      _id: req.params.id,
      ...tenantFilter(req)
    });

    if (!record) {
      return res.status(404).json({ success: false, message: "Outreach record not found" });
    }

    await writeAuditLog(req, {
      module: "Outreach",
      action: "Deleted outreach record",
      entityType: "Outreach",
      entityId: String(record._id),
      severity: "Medium"
    });

    res.json({ success: true, message: "Outreach record deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete outreach record", error: error.message });
  }
});

module.exports = router;