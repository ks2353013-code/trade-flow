const express = require("express");
const Company = require("../models/Company");
const { writeAuditLog } = require("../utils/auditLogger");

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
      ...req.body,
      ownerEmail,
      approvalStatus: req.body.approvalStatus || "Pending",
      status: req.body.status || "Pending"
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

router.put("/:id", async (req, res) => {
  try {
    const company = await Company.findOneAndUpdate(
      { _id: req.params.id, ...tenantFilter(req) },
      req.body,
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

router.patch("/:id/approve", async (req, res) => {
  try {
    if (!isMasterAdmin(req)) {
      return res.status(403).json({ success: false, message: "Master Admin access required" });
    }

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

router.patch("/:id/reject", async (req, res) => {
  try {
    if (!isMasterAdmin(req)) {
      return res.status(403).json({ success: false, message: "Master Admin access required" });
    }

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

router.delete("/:id", async (req, res) => {
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