const express = require("express");
const mongoose = require("mongoose");

const User = require("../models/User");
const Company = require("../models/Company");
const BetaFeedback = require("../models/BetaFeedback");
const ClientErrorLog = require("../models/ClientErrorLog");
const UsageMetric = require("../models/UsageMetric");
const { hasBetaAccess } = require("../middleware/betaAccessMiddleware");

const router = express.Router();

const MASTER_ADMIN_EMAILS = new Set([
  "ks2353013@gmail.com",
  "contact@tradeflowai.in"
]);

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

function isMaster(req) {
  return req.tenant?.isMasterAdmin === true || MASTER_ADMIN_EMAILS.has(normalizeEmail(req.user?.email));
}

function requireMaster(req, res) {
  if (isMaster(req)) return true;

  res.status(403).json({
    success: false,
    message: "Master Admin access required"
  });
  return false;
}

function scrubText(value = "", max = 2000) {
  return String(value || "")
    .replace(/(bearer\s+)[a-z0-9._-]+/gi, "$1[redacted]")
    .replace(/(token=)[^&\s]+/gi, "$1[redacted]")
    .replace(/(password=)[^&\s]+/gi, "$1[redacted]")
    .slice(0, max);
}

router.get("/status", async (req, res) => {
  const email = normalizeEmail(req.user?.email);
  const user = email
    ? await User.findOne({ email }).select("betaUser betaAccessEnabled").lean()
    : null;
  const company = mongoose.isValidObjectId(req.tenant?.companyId)
    ? await Company.findOne({
        _id: req.tenant.companyId,
        ownerEmail: req.tenant?.ownerEmail
      }).select("betaCompany betaAccessEnabled").lean()
    : null;
  const betaAccess = await hasBetaAccess(req);

  res.json({
    success: true,
    betaAccess,
    betaUser: user?.betaUser === true || user?.betaAccessEnabled === true,
    betaCompany: company?.betaCompany === true || company?.betaAccessEnabled === true,
    isMasterAdmin: isMaster(req)
  });
});

router.post("/feedback", async (req, res) => {
  try {
    const message = scrubText(req.body?.message || "", 2000).trim();

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Feedback message is required."
      });
    }

    const feedback = await BetaFeedback.create({
      ownerEmail: normalizeEmail(req.tenant?.ownerEmail || req.user?.email),
      companyId: mongoose.isValidObjectId(req.tenant?.companyId) ? req.tenant.companyId : null,
      workspaceId: mongoose.isValidObjectId(req.tenant?.workspaceId) ? req.tenant.workspaceId : null,
      userId: mongoose.isValidObjectId(req.user?.id) ? req.user.id : null,
      type: req.body?.type || "feedback",
      title: scrubText(req.body?.title || "", 200),
      message,
      page: scrubText(req.body?.page || "", 300),
      priority: req.body?.priority || "Medium"
    });

    res.status(201).json({
      success: true,
      feedback,
      message: "Feedback submitted."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to submit beta feedback",
      error: error.message
    });
  }
});

router.get("/feedback", async (req, res) => {
  try {
    if (!requireMaster(req, res)) return;

    const feedback = await BetaFeedback.find().sort({ createdAt: -1 }).limit(100);

    res.json({
      success: true,
      feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch beta feedback",
      error: error.message
    });
  }
});

router.get("/overview", async (req, res) => {
  try {
    if (!requireMaster(req, res)) return;

    const [
      betaUsers,
      betaCompanies,
      feedback,
      errors,
      usage
    ] = await Promise.all([
      User.find({ $or: [{ betaUser: true }, { betaAccessEnabled: true }] })
        .select("name email role betaUser betaAccessEnabled createdAt")
        .sort({ createdAt: -1 })
        .limit(50),
      Company.find({ $or: [{ betaCompany: true }, { betaAccessEnabled: true }] })
        .select("companyName ownerEmail betaCompany betaAccessEnabled status createdAt")
        .sort({ createdAt: -1 })
        .limit(50),
      BetaFeedback.find().sort({ createdAt: -1 }).limit(50),
      ClientErrorLog.find().sort({ createdAt: -1 }).limit(50),
      UsageMetric.find().sort({ updatedAt: -1 }).limit(50)
    ]);

    res.json({
      success: true,
      overview: {
        betaUsers,
        betaCompanies,
        feedback,
        errors,
        usage
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch beta overview",
      error: error.message
    });
  }
});

module.exports = router;
