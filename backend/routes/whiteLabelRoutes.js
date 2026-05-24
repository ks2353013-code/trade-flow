const express = require("express");

const WhiteLabelSettings = require("../models/WhiteLabelSettings");

const router = express.Router();

function tenant(req) {
  return {
    ownerEmail:
      req.headers["x-user-email"] ||
      "unknown@tradeflow.local",

    companyId:
      req.headers["x-company-id"] ||
      undefined,

    workspaceId:
      req.headers["x-workspace-id"] ||
      undefined
  };
}

router.get("/", async (req, res) => {
  try {

    let settings =
      await WhiteLabelSettings.findOne(
        tenant(req)
      );

    if (!settings) {

      settings =
        await WhiteLabelSettings.create({
          ...tenant(req)
        });

    }

    res.json(settings);

  } catch (error) {

    res.status(500).json({
      message:
        "Failed to load white-label settings"
    });

  }
});

router.put("/", async (req, res) => {
  try {

    const settings =
      await WhiteLabelSettings.findOneAndUpdate(
        tenant(req),
        req.body,
        {
          new: true,
          upsert: true
        }
      );

    res.json(settings);

  } catch (error) {

    res.status(500).json({
      message:
        "Failed to update white-label settings"
    });

  }
});

module.exports = router;