const MASTER_ADMIN_EMAILS = new Set([
  "ks2353013@gmail.com",
  "contact@tradeflowai.in"
]);

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

function isMasterAdmin(req) {
  return MASTER_ADMIN_EMAILS.has(normalizeEmail(req.user?.email));
}

function hasAdminAccess(req) {
  if (isMasterAdmin(req)) return true;

  const role = String(req.user?.role || "").toLowerCase();
  const permissions = req.user?.permissions || {};

  return (
    role.includes("master") ||
    role.includes("founder") ||
    role.includes("owner") ||
    role.includes("admin") ||
    permissions.admin === true
  );
}

function requireAdminAccess(req, res, next) {
  if (!hasAdminAccess(req)) {
    return res.status(403).json({
      success: false,
      message: "Admin or owner permission required"
    });
  }

  return next();
}

function requireMasterAdmin(req, res, next) {
  if (!isMasterAdmin(req)) {
    return res.status(403).json({
      success: false,
      message: "Master Admin access required"
    });
  }

  return next();
}

module.exports = {
  hasAdminAccess,
  isMasterAdmin,
  requireAdminAccess,
  requireMasterAdmin
};
