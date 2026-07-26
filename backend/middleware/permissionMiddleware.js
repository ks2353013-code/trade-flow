const { hasMasterAdminRole } = require("../utils/masterAdminIdentity");

function isMasterAdmin(req) {
  return hasMasterAdminRole(req.user);
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
