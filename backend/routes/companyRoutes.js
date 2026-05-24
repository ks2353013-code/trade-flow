const express = require("express");
const Company = require("../models/Company");
const Workspace = require("../models/Workspace");
const Employee = require("../models/Employee");

const router = express.Router();

function getOwnerEmail(req) {
  return (
    req.user?.email ||
    req.body?.ownerEmail ||
    req.query?.ownerEmail ||
    req.headers["x-user-email"] ||
    "unknown@tradeflow.local"
  )
    .toString()
    .toLowerCase()
    .trim();
}

router.get("/", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const companies = await Company.find({ ownerEmail }).sort({
      createdAt: -1
    });

    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch companies" });
  }
});

router.post("/", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const {
      companyName,
      businessType,
      country,
      gstNumber,
      iecCode,
      industry,
      defaultCurrency
    } = req.body;

    if (!companyName) {
      return res.status(400).json({ message: "Company name is required" });
    }

    const company = await Company.create({
      ownerEmail,
      companyName,
      businessType,
      country,
      gstNumber,
      iecCode,
      industry,
      defaultCurrency,
      plan: "Free"
    });

    const workspace = await Workspace.create({
      companyId: company._id,
      ownerEmail,
      workspaceName: `${companyName} Main Workspace`,
      type: "Management",
      members: [
        {
          email: ownerEmail,
          role: "Owner"
        }
      ]
    });

    await Employee.create({
      companyId: company._id,
      workspaceId: workspace._id,
      ownerEmail,
      name: "Owner",
      email: ownerEmail,
      role: "Owner",
      status: "Active",
      permissions: {
        dashboard: true,
        suppliers: true,
        crm: true,
        tasks: true,
        analytics: true,
        documents: true,
        outreach: true,
        ai: true,
        billing: true,
        admin: true
      }
    });

    res.status(201).json({
      company,
      workspace
    });
  } catch (error) {
    console.error("Create company error:", error.message);
    res.status(500).json({ message: "Failed to create company" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const company = await Company.findOneAndUpdate(
      {
        _id: req.params.id,
        ownerEmail
      },
      req.body,
      { new: true }
    );

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json(company);
  } catch (error) {
    res.status(500).json({ message: "Failed to update company" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const company = await Company.findOneAndDelete({
      _id: req.params.id,
      ownerEmail
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    await Workspace.deleteMany({ companyId: company._id });
    await Employee.deleteMany({ companyId: company._id });

    res.json({ message: "Company deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete company" });
  }
});

module.exports = router;