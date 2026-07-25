const express = require("express");

const OnboardingProgress =
require("../models/OnboardingProgress");
const User = require("../models/User");
const Company = require("../models/Company");
const { writeAuditLog } = require("../utils/auditLogger");

const router = express.Router();

function getTenant(req) {
  const ownerEmail = req.tenant?.ownerEmail || req.user?.email;

  if (!ownerEmail) {
    throw new Error("Authenticated user email missing");
  }

  return {
    ownerEmail,

    workspaceId:
      req.tenant?.workspaceId ||
      undefined
  };
}

const TOTAL_STEPS = 9;
const BUSINESS_TYPES = new Set([
  "Supplier",
  "Manufacturer",
  "Buyer",
  "Trading Company",
  "Buying House"
]);

function normalizeBusinessType(value) {
  const type = String(value || "").trim();
  return BUSINESS_TYPES.has(type) ? type : "";
}

function isMasterAdmin(req) {
  const email = String(req.user?.email || "").toLowerCase().trim();
  const role = String(req.user?.role || "").toLowerCase();

  return (
    req.tenant?.isMasterAdmin === true ||
    role.includes("master") ||
    email === "ks2353013@gmail.com" ||
    email === "contact@tradeflowai.in"
  );
}

async function markUserOnboardingComplete(req) {
  if (!req.user?.email) return;

  await User.updateOne(
    { email: String(req.user.email).toLowerCase().trim() },
    { $set: { onboardingCompleted: true } }
  );
}

async function lockBusinessType(req, type) {
  const businessType = normalizeBusinessType(type);
  if (!businessType || !req.user?.email) return null;

  const email = String(req.user.email).toLowerCase().trim();
  const user = await User.findOne({ email });

  if (!user) return null;

  if (
    user.businessTypeLocked === true &&
    user.businessType &&
    user.businessType !== businessType &&
    !isMasterAdmin(req)
  ) {
    const error = new Error(
      "Business type is locked and cannot be changed after onboarding."
    );
    error.statusCode = 403;
    throw error;
  }

  const previousBusinessType = user.businessType || "";
  const action =
    user.businessTypeLocked === true &&
    previousBusinessType !== businessType
      ? "BUSINESS_TYPE_OVERRIDE"
      : "BUSINESS_TYPE_SELECTED";

  user.businessType = businessType;
  user.businessTypeLocked = true;
  user.businessTypeLockedAt = user.businessTypeLockedAt || new Date();
  await user.save();

  await Company.updateMany(
    { ownerEmail: email },
    {
      $set: {
        businessType,
        businessTypeLocked: true,
        businessTypeLockedAt: new Date()
      }
    }
  );

  await writeAuditLog(req, {
    module: "Onboarding",
    action,
    entityType: "User",
    entityId: String(user._id),
    severity: action === "BUSINESS_TYPE_OVERRIDE" ? "High" : "Medium",
    metadata: {
      previousBusinessType,
      businessType,
      businessTypeLocked: true
    }
  });

  return user;
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

    const lockedUser =
      await lockBusinessType(
        req,
        req.body?.businessType
      );

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
      businessType:
        lockedUser?.businessType ||
        normalizeBusinessType(req.body?.businessType) ||
        "Trading Company",
      businessTypeLocked: true,
      progress
    });

  } catch (error) {

    if (error.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message:
        "Failed to complete onboarding"
    });

  }

});

module.exports = router;
