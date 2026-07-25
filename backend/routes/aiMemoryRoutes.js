const express = require("express");
const AIMemory = require("../models/AIMemory");

const {
  requirePlan
} = require("../middleware/subscriptionMiddleware");

const router = express.Router();

function getOwnerEmail(req) {
  const email = req.tenant?.ownerEmail || req.user?.email;

  if (!email) {
    throw new Error("Authenticated user email missing");
  }

  return email.toString().toLowerCase().trim();
}

function tenantFilter(req) {
  return {
    ownerEmail: getOwnerEmail(req),
    ...(req.tenant?.companyId ? { companyId: req.tenant.companyId } : {}),
    ...(req.tenant?.workspaceId ? { workspaceId: req.tenant.workspaceId } : {})
  };
}

router.get("/", requirePlan("Pro"), async (req, res) => {
  try {
    const filter = tenantFilter(req);

    const memories = await AIMemory.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(memories);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch AI memory"
    });
  }
});

router.post("/", requirePlan("Pro"), async (req, res) => {
  try {
    const memory = await AIMemory.create({
      ownerEmail: getOwnerEmail(req),
      companyId: req.tenant?.companyId || undefined,
      workspaceId: req.tenant?.workspaceId || undefined,
      type: req.body.type || "General",
      prompt: req.body.prompt || "",
      response: req.body.response || "",
      source: req.body.source || "TradeFlow AI",
      metadata: req.body.metadata || {}
    });

    res.status(201).json(memory);
  } catch (error) {
    res.status(500).json({
      message: "Failed to save AI memory"
    });
  }
});

router.delete("/:id", requirePlan("Pro"), async (req, res) => {
  try {
    const memory = await AIMemory.findOneAndDelete({
      _id: req.params.id,
      ...tenantFilter(req)
    });

    if (!memory) {
      return res.status(404).json({
        message: "AI memory not found"
      });
    }

    res.json({
      message: "AI memory deleted"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete AI memory"
    });
  }
});

router.delete("/", requirePlan("Pro"), async (req, res) => {
  try {
    await AIMemory.deleteMany(tenantFilter(req));

    res.json({
      message: "AI memory cleared"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to clear AI memory"
    });
  }
});

module.exports = router;
