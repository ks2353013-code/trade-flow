const express = require("express");
const AIMemory = require("../models/AIMemory");

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

    const filter = { ownerEmail };

    if (req.query.companyId) {
      filter.companyId = req.query.companyId;
    }

    if (req.query.workspaceId) {
      filter.workspaceId = req.query.workspaceId;
    }

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

router.post("/", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const memory = await AIMemory.create({
      ownerEmail,
      companyId: req.body.companyId || undefined,
      workspaceId: req.body.workspaceId || undefined,
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

router.delete("/:id", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const memory = await AIMemory.findOneAndDelete({
      _id: req.params.id,
      ownerEmail
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

router.delete("/", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const filter = { ownerEmail };

    if (req.query.companyId) {
      filter.companyId = req.query.companyId;
    }

    if (req.query.workspaceId) {
      filter.workspaceId = req.query.workspaceId;
    }

    await AIMemory.deleteMany(filter);

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