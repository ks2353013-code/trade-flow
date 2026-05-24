const express = require("express");
const Employee = require("../models/Employee");

const {
  requirePlan
} = require("../middleware/subscriptionMiddleware");

const router = express.Router();

function tenantFilter(req) {

  const filter = {
    ownerEmail:
      req.tenant?.ownerEmail ||
      "unknown@tradeflow.local"
  };

  if (req.tenant?.companyId) {
    filter.companyId =
      req.tenant.companyId;
  }

  if (req.tenant?.workspaceId) {
    filter.workspaceId =
      req.tenant.workspaceId;
  }

  return filter;

}

/* =========================
   GET EMPLOYEES
========================= */

router.get(
  "/",
  requirePlan("Pro"),

  async (req, res) => {

    try {

      const employees =
        await Employee.find(
          tenantFilter(req)
        ).sort({
          createdAt: -1
        });

      res.json(employees);

    } catch (error) {

      res.status(500).json({
        message:
          "Failed to fetch employees"
      });

    }

  }
);

/* =========================
   CREATE EMPLOYEE
========================= */

router.post(
  "/",
  requirePlan("Pro"),

  async (req, res) => {

    try {

      const employee =
        await Employee.create({
          ...req.body,

          ownerEmail:
            req.tenant?.ownerEmail,

          companyId:
            req.tenant?.companyId ||
            req.body.companyId,

          workspaceId:
            req.tenant?.workspaceId ||
            req.body.workspaceId
        });

      res.status(201).json(
        employee
      );

    } catch (error) {

      res.status(500).json({
        message:
          "Failed to create employee"
      });

    }

  }
);

/* =========================
   UPDATE EMPLOYEE
========================= */

router.put(
  "/:id",
  requirePlan("Pro"),

  async (req, res) => {

    try {

      const employee =
        await Employee.findOneAndUpdate(
          {
            _id: req.params.id,
            ...tenantFilter(req)
          },
          req.body,
          {
            new: true
          }
        );

      if (!employee) {

        return res.status(404).json({
          message:
            "Employee not found"
        });

      }

      res.json(employee);

    } catch (error) {

      res.status(500).json({
        message:
          "Failed to update employee"
      });

    }

  }
);

/* =========================
   DELETE EMPLOYEE
========================= */

router.delete(
  "/:id",
  requirePlan("Pro"),

  async (req, res) => {

    try {

      const employee =
        await Employee.findOneAndDelete({
          _id: req.params.id,
          ...tenantFilter(req)
        });

      if (!employee) {

        return res.status(404).json({
          message:
            "Employee not found"
        });

      }

      res.json({
        message:
          "Employee deleted"
      });

    } catch (error) {

      res.status(500).json({
        message:
          "Failed to delete employee"
      });

    }

  }
);

module.exports = router;