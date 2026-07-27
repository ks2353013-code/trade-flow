const express = require("express");
const BusinessVerification = require("../models/BusinessVerification");

const router = express.Router();
const DISCLAIMER = "TradeFlow verification confirms that specified business information and supporting documents were reviewed at the stated date. It is not a guarantee of product quality, payment, delivery, legal compliance, or future performance.";

router.get("/:reference", async (req, res) => {
  const raw = String(req.params.reference || "").trim().toUpperCase();
  const reference = raw.startsWith("TFV-") ? raw.slice(4) : "";
  if (!/^[A-Z0-9_-]{22}$/.test(reference)) {
    return res.status(404).json({ success: false, message: "Active verification badge not found" });
  }
  const verification = await BusinessVerification.findOne({
    verificationStatus: "Verified",
    validUntil: { $gt: new Date() },
    publicReference: { $regex: `^${reference}$`, $options: "i" }
  }).lean();
  if (!verification) return res.status(404).json({ success: false, message: "Active verification badge not found" });
  return res.json({
    verificationReferenceId: `TFV-${verification.publicReference}`,
    badge: `TradeFlow Verified ${verification.verificationCategory}`,
    legalBusinessName: verification.legalBusinessName,
    tradeName: verification.tradeName,
    category: verification.verificationCategory,
    country: verification.country,
    verificationDate: verification.reviewedAt,
    validUntil: verification.validUntil,
    status: verification.verificationStatus,
    evidenceLevel: verification.evidenceLevel,
    explanation: "TradeFlow reviewed the specified business information and supporting documents.",
    disclaimer: DISCLAIMER
  });
});

module.exports = router;
