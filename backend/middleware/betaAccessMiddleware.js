const User = require("../models/User");
const Company = require("../models/Company");

const MASTER_ADMIN_EMAILS = new Set([
  "ks2353013@gmail.com",
  "contact@tradeflowai.in"
]);

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

function isMaster(req) {
  return (
    req.tenant?.isMasterAdmin === true ||
    MASTER_ADMIN_EMAILS.has(normalizeEmail(req.user?.email))
  );
}

async function hasBetaAccess(req) {
  if (isMaster(req)) return true;

  const email = normalizeEmail(req.user?.email);
  const companyId = req.tenant?.companyId;

  const user = email
    ? await User.findOne({ email }).select("betaUser betaAccessEnabled").lean()
    : null;

  if (user?.betaUser === true || user?.betaAccessEnabled === true) {
    return true;
  }

  if (companyId) {
    const company = await Company.findOne({
      _id: companyId,
      ownerEmail: req.tenant?.ownerEmail
    }).select("betaCompany betaAccessEnabled").lean();

    if (company?.betaCompany === true || company?.betaAccessEnabled === true) {
      return true;
    }
  }

  return false;
}

async function requireBetaAccess(req, res, next) {
  try {
    if (await hasBetaAccess(req)) return next();

    return res.status(403).json({
      success: false,
      message: "Beta access is required for the AI Operating System foundation."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Beta access check failed",
      error: error.message
    });
  }
}

module.exports = {
  requireBetaAccess,
  hasBetaAccess
};
