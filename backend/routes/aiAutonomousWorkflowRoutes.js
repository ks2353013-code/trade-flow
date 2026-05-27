const express = require("express");
const { runDealScoring } = require("../services/aiDealScoringEngine");
const Supplier = require("../models/Supplier");
const Deal = require("../models/Deal");
const Task = require("../models/Task");
const Outreach = require("../models/Outreach");
const User = require("../models/User");
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

  if (req.tenant?.companyId) filter.companyId = req.tenant.companyId;
  if (req.tenant?.workspaceId) filter.workspaceId = req.tenant.workspaceId;

  return filter;
}

async function getTaskUserId(ownerEmail) {
  const user = await User.findOne({
    email: ownerEmail
  });

  return user?._id || null;
}

router.post("/run", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);
    const taskUserId = await getTaskUserId(ownerEmail);
    const filter = tenantFilter(req);

    if (!taskUserId) {
      return res.status(400).json({
        success: false,
        message: "User account not found for autonomous task creation",
        ownerEmail
      });
    }

    const suppliers = await Supplier.find(filter).sort({ createdAt: -1 }).limit(50);
    const deals = await Deal.find(filter).sort({ createdAt: -1 }).limit(50);
    const tasks = await Task.find(filter).sort({ createdAt: -1 }).limit(50);

    const createdTasks = [];
    const createdOutreach = [];
    const crmSuggestions = [];
    const dealScoringResult = await runDealScoring(ownerEmail);
   
    const weakSuppliers = suppliers.filter((s) => {
      const score = Number(s.score || s.verificationScore || 75);
      return score < 70;
    });

    for (const supplier of weakSuppliers.slice(0, 5)) {
      const task = await Task.create({
        user: taskUserId,
        ownerEmail,
        companyId: req.tenant?.companyId || supplier.companyId || null,
        workspaceId: req.tenant?.workspaceId || supplier.workspaceId || null,
        title: `Verify supplier: ${supplier.supplierName || supplier.name || "Supplier"}`,
        taskTitle: `Verify supplier: ${supplier.supplierName || supplier.name || "Supplier"}`,
        relatedTo: supplier.supplierName || supplier.name || "Supplier",
        priority: "High",
        status: "Pending",
        notes: "AI detected this supplier needs verification before outreach."
      });

      createdTasks.push(task);
    }

    const freshDeals = deals.filter((deal) => {
      return deal.stage === "New Lead" || deal.stage === "Contacted";
    });

    for (const deal of freshDeals.slice(0, 5)) {
      const outreach = await Outreach.create({
        ownerEmail,
        companyId: req.tenant?.companyId || deal.companyId || null,
        workspaceId: req.tenant?.workspaceId || deal.workspaceId || null,
        contactName: deal.contactPerson || deal.dealContactPerson || deal.companyName || deal.dealCompanyName || "Lead",
        outreachContactName: deal.contactPerson || deal.dealContactPerson || deal.companyName || deal.dealCompanyName || "Lead",
        phone: deal.phone || deal.dealPhone || "",
        outreachPhone: deal.phone || deal.dealPhone || "",
        email: deal.email || deal.dealEmail || "",
        product: deal.product || deal.dealProduct || "",
        outreachProduct: deal.product || deal.dealProduct || "",
        message: `Hello, we are interested in discussing export/import opportunities for ${deal.product || deal.dealProduct || "your products"}. Please share pricing, MOQ, certifications, and delivery timeline.`,
        outreachMessage: `Hello, we are interested in discussing export/import opportunities for ${deal.product || deal.dealProduct || "your products"}. Please share pricing, MOQ, certifications, and delivery timeline.`,
        status: "Draft",
        notes: "Generated automatically by TradeFlow AI Autonomous Workflow."
      });

      createdOutreach.push(outreach);

      crmSuggestions.push({
        dealId: deal._id,
        companyName: deal.companyName || deal.dealCompanyName || "",
        suggestedAction: "Send AI-generated outreach and follow up within 48 hours.",
        suggestedStage: deal.stage === "New Lead" ? "Contacted" : "Negotiation"
      });
    }

    if (tasks.length < 3) {
      const task = await Task.create({
        user: taskUserId,
        ownerEmail,
        companyId: req.tenant?.companyId || null,
        workspaceId: req.tenant?.workspaceId || null,
        title: "Build weekly export execution plan",
        taskTitle: "Build weekly export execution plan",
        relatedTo: "AI Operations",
        priority: "Medium",
        status: "Pending",
        notes: "AI recommends creating a weekly plan for suppliers, CRM, outreach, and documents."
      });

      createdTasks.push(task);
    }

    await writeAuditLog(req, {
      module: "AI",
      action: "Ran autonomous workflow",
      entityType: "AIWorkflow",
      entityId: "autonomous-run",
      severity: "Medium",
      metadata: {
        createdTasks: createdTasks.length,
        createdOutreach: createdOutreach.length,
        crmSuggestions: crmSuggestions.length
      }
    });

    res.json({
      success: true,
      message: "Autonomous AI workflow completed.",
     summary: {
  suppliersAnalyzed: suppliers.length,
  dealsAnalyzed: deals.length,
  tasksCreated: createdTasks.length,
  outreachCreated: createdOutreach.length,
  crmSuggestions: crmSuggestions.length,
  dealsScored: dealScoringResult.updatedDeals?.length || 0
},
      createdTasks,
      createdOutreach,
      crmSuggestions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Autonomous AI workflow failed",
      error: error.message
    });
  }
});

module.exports = router;