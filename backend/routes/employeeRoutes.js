const express = require("express");
const Employee = require("../models/Employee");
const { writeAuditLog } = require("../utils/auditLogger");
const { enforceCountLimit } = require("../middleware/planLimitMiddleware");

const router = express.Router();

function getOwnerEmail(req) {
  if (!req.user?.email) {
    throw new Error("Authenticated user email missing");
  }

  return String(req.user.email).toLowerCase().trim();
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

async function countEmployees(req) {
  return await Employee.countDocuments(tenantFilter(req));
}

router.get("/", async (req, res) => {
  try {
    const employees = await Employee.find(tenantFilter(req)).sort({
      createdAt: -1
    });

    res.json({
      success: true,
      employees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch employees",
      error: error.message
    });
  }
});

router.post(
  "/",
  enforceCountLimit("employee_create", countEmployees),
  async (req, res) => {
    try {
      const ownerEmail = getOwnerEmail(req);

      const employee = await Employee.create({
        ...req.body,
        ownerEmail,
        companyId: req.tenant?.companyId || req.body.companyId || null,
        workspaceId: req.tenant?.workspaceId || req.body.workspaceId || null
      });

      await writeAuditLog(req, {
        module: "Employees",
        action: "Created employee",
        entityType: "Employee",
        entityId: String(employee._id),
        severity: "Medium",
        metadata: {
          name: employee.name || employee.employeeName || "",
          email: employee.email || "",
          role: employee.role || ""
        }
      });

      res.status(201).json({
        success: true,
        employee
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create employee",
        error: error.message
      });
    }
  }
);

router.put("/:id", async (req, res) => {
  try {
    const employee = await Employee.findOneAndUpdate(
      {
        _id: req.params.id,
        ...tenantFilter(req)
      },
      req.body,
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    await writeAuditLog(req, {
      module: "Employees",
      action: "Updated employee",
      entityType: "Employee",
      entityId: String(employee._id),
      severity: "Medium",
      metadata: {
        updatedFields: Object.keys(req.body || {})
      }
    });

    res.json({
      success: true,
      employee
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update employee",
      error: error.message
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const employee = await Employee.findOneAndDelete({
      _id: req.params.id,
      ...tenantFilter(req)
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    await writeAuditLog(req, {
      module: "Employees",
      action: "Deleted employee",
      entityType: "Employee",
      entityId: String(employee._id),
      severity: "High",
      metadata: {
        email: employee.email || "",
        role: employee.role || ""
      }
    });

    res.json({
      success: true,
      message: "Employee deleted"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete employee",
      error: error.message
    });
  }
});

module.exports = router;