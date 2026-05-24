const express = require("express");
const Deal = require("../models/Deal");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const deals = await Deal.find().sort({ createdAt: -1 });
    res.json(deals);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch deals" });
  }
});

router.post("/", async (req, res) => {
  try {
    const deal = await Deal.create(req.body);
    res.status(201).json(deal);
  } catch (error) {
    res.status(500).json({ message: "Failed to create deal" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const deal = await Deal.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    res.json(deal);
  } catch (error) {
    res.status(500).json({ message: "Failed to update deal" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deal = await Deal.findByIdAndDelete(req.params.id);

    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    res.json({ message: "Deal deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete deal" });
  }
});

module.exports = router;