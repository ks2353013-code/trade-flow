const express = require("express");
const Outreach = require("../models/Outreach");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const items = await Outreach.find().sort({
      createdAt: -1
    });

    res.json(items);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch outreach"
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const item = await Outreach.create(req.body);

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create outreach"
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const item = await Outreach.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!item) {
      return res.status(404).json({
        message: "Outreach not found"
      });
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update outreach"
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const item = await Outreach.findByIdAndDelete(
      req.params.id
    );

    if (!item) {
      return res.status(404).json({
        message: "Outreach not found"
      });
    }

    res.json({
      message: "Outreach deleted"
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete outreach"
    });
  }
});

module.exports = router;