const express = require("express");
const Company = require("../models/Company");
const { writeAuditLog } = require("../utils/auditLogger");
const {
  isMasterAdmin,
  requireAdminAccess,
  requireMasterAdmin
} = require("../middleware/permissionMiddleware");

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
  if (isMasterAdmin(req)) return {};
  return { ownerEmail: getOwnerEmail(req) };
}

router.get("/", async (req, res) => {
  try {
    const companies = await Company.find(tenantFilter(req)).sort({ createdAt: -1 });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch companies", error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const company = await Company.create({
      ...safeBody(req.body),
      ownerEmail,
      approvalStatus: isMasterAdmin(req) ? req.body.approvalStatus || "Approved" : "Pending",
      status: isMasterAdmin(req) ? req.body.status || "Active" : "Pending"
    });

    await writeAuditLog(req, {
      module: "Companies",
      action: "Created company",
      entityType: "Company",
      entityId: String(company._id),
      severity: "Medium",
      metadata: {
        companyName: company.companyName || company.name || ""
      }
    });

    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create company", error: error.message });
  }
});

router.put("/:id", requireAdminAccess, async (req, res) => {
  try {
    const company = await Company.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req) },
      safeBody(req.body),
      { new: true }
    );

    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    await writeAuditLog(req, {
      module: "Companies",
      action: "Updated company",
      entityType: "Company",
      entityId: String(company._id),
      severity: "Medium",
      metadata: { updatedFields: Object.keys(req.body || {}) }
    });

    res.json(company);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update company", error: error.message });
  }
});

router.patch("/:id/approve", requireMasterAdmin, async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: "Approved", status: "Active" },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    await writeAuditLog(req, {
      module: "Companies",
      action: "Approved company",
      entityType: "Company",
      entityId: String(company._id),
      severity: "High",
      metadata: { companyName: company.companyName || company.name || "" }
    });

    res.json(company);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to approve company", error: error.message });
  }
});

router.patch("/:id/reject", requireMasterAdmin, async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: "Rejected", status: "Rejected" },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    await writeAuditLog(req, {
      module: "Companies",
      action: "Rejected company",
      entityType: "Company",
      entityId: String(company._id),
      severity: "High",
      metadata: { companyName: company.companyName || company.name || "" }
    });

    res.json(company);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to reject company", error: error.message });
  }
});

router.delete("/:id", requireAdminAccess, async (req, res) => {
  try {
    const company = await Company.findOneAndDelete({
      _id: req.params.id,
      ...tenantFilter(req)
    });

    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    await writeAuditLog(req, {
      module: "Companies",
      action: "Deleted company",
      entityType: "Company",
      entityId: String(company._id),
      severity: "Critical",
      metadata: { companyName: company.companyName || company.name || "" }
    });

    res.json({ success: true, message: "Company deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete company", error: error.message });
  }
});

module.exports = router;
