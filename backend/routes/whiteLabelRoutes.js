const express = require("express");

const WhiteLabelSettings = require("../models/WhiteLabelSettings");

const router = express.Router();

function tenant(req) {
  const ownerEmail = req.tenant?.ownerEmail || req.user?.email;

  if (!ownerEmail) {
    throw new Error("Authenticated user email missing");
  }

  return {
    ownerEmail,

    companyId:
      req.tenant?.companyId ||
      undefined,

    workspaceId:
      req.tenant?.workspaceId ||
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
