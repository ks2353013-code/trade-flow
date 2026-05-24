const express = require("express");

const OnboardingProgress =
require("../models/OnboardingProgress");

const router = express.Router();

function getTenant(req) {
  return {
    ownerEmail:
      req.headers["x-user-email"] ||
      "unknown@tradeflow.local",

    workspaceId:
      req.headers["x-workspace-id"] ||
      undefined
  };
}

const TOTAL_STEPS = 9;

router.get("/", async (req, res) => {

  try {

    let progress =
      await OnboardingProgress.findOne(
        getTenant(req)
      );

    if (!progress) {

      progress =
        await OnboardingProgress.create({
          ...getTenant(req)
        });

    }

    res.json(progress);

  } catch (error) {

    res.status(500).json({
      message:
        "Failed to load onboarding"
    });

  }

});

router.post("/complete-step", async (req, res) => {

  try {

    const { step } = req.body;

    let progress =
      await OnboardingProgress.findOne(
        getTenant(req)
      );

    if (!progress) {

      progress =
        await OnboardingProgress.create({
          ...getTenant(req)
        });

    }

    if (
      !progress.completedSteps.includes(step)
    ) {
      progress.completedSteps.push(step);
    }

    progress.currentStep =
      progress.completedSteps.length + 1;

    progress.completionPercentage =
      Math.round(
        (
          progress.completedSteps.length /
          TOTAL_STEPS
        ) * 100
      );

    if (
      progress.completedSteps.length >=
      TOTAL_STEPS
    ) {
      progress.onboardingCompleted = true;
    }

    await progress.save();

    res.json(progress);

  } catch (error) {

    res.status(500).json({
      message:
        "Failed to update onboarding"
    });

  }

});

module.exports = router;