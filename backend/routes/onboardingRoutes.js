const express = require("express");

const OnboardingProgress =
require("../models/OnboardingProgress");
const User = require("../models/User");

const router = express.Router();

function getTenant(req) {
  return {
    ownerEmail:
      req.tenant?.ownerEmail ||
      req.user?.email ||
      req.headers["x-user-email"] ||
      "unknown@tradeflow.local",

    workspaceId:
      req.tenant?.workspaceId ||
      req.headers["x-workspace-id"] ||
      undefined
  };
}

const TOTAL_STEPS = 9;

async function markUserOnboardingComplete(req) {
  if (!req.user?.email) return;

  await User.updateOne(
    { email: String(req.user.email).toLowerCase().trim() },
    { $set: { onboardingCompleted: true } }
  );
}

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
      await markUserOnboardingComplete(req);
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

router.post("/complete", async (req, res) => {

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

    progress.completedSteps =
      Array.from(
        { length: TOTAL_STEPS },
        (_, index) => `step-${index + 1}`
      );

    progress.currentStep = TOTAL_STEPS;
    progress.completionPercentage = 100;
    progress.onboardingCompleted = true;

    await progress.save();
    await markUserOnboardingComplete(req);

    res.json({
      success: true,
      onboardingCompleted: true,
      progress
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message:
        "Failed to complete onboarding"
    });

  }

});

module.exports = router;
