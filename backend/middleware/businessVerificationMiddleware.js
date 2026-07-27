const BusinessVerification = require("../models/BusinessVerification");

function requireVerifiedBusiness(categories = []) {
  const allowedCategories = new Set(categories);
  return async function verifiedBusinessGate(req, res, next) {
    try {
      if (!req.tenant?.companyId) {
        return res.status(403).json({
          success: false,
          code: "BUSINESS_VERIFICATION_REQUIRED",
          message: "Complete company verification before using this trust feature"
        });
      }
      const filter = {
        companyId: req.tenant.companyId,
        ownerEmail: req.tenant.ownerEmail,
        verificationStatus: "Verified",
        validUntil: { $gt: new Date() }
      };
      if (allowedCategories.size) filter.verificationCategory = { $in: [...allowedCategories] };
      const verification = await BusinessVerification.findOne(filter).select("_id verificationCategory validUntil").lean();
      if (!verification) {
        return res.status(403).json({
          success: false,
          code: "BUSINESS_VERIFICATION_REQUIRED",
          message: "An active TradeFlow business verification is required for this action"
        });
      }
      req.businessVerification = verification;
      return next();
    } catch {
      return res.status(500).json({ success: false, message: "Business verification check failed" });
    }
  };
}

module.exports = { requireVerifiedBusiness };
