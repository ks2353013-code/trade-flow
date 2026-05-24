const express = require("express");
const Employee = require("../models/Employee");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const employees =
      await Employee.find().sort({
        createdAt: -1
      });

    res.json(employees);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch employees"
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const employee =
      await Employee.create(req.body);

    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create employee"
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const employee =
      await Employee.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found"
      });
    }

    res.json(employee);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update employee"
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const employee =
      await Employee.findByIdAndDelete(
        req.params.id
      );

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found"
      });
    }

    res.json({
      message: "Employee deleted"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete employee"
    });
  }
});

module.exports = router;