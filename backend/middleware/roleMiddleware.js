function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    const userRole =
      req.user?.role ||
      req.headers["x-user-role"] ||
      "Viewer";

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: "Access denied. Insufficient role permission."
      });
    }

    next();
  };
}

function requirePermission(permissionName) {
  return (req, res, next) => {
    const permissions = req.user?.permissions || {};

    if (!permissions[permissionName]) {
      return res.status(403).json({
        message: `Access denied. Missing permission: ${permissionName}`
      });
    }

    next();
  };
}

module.exports = {
  requireRole,
  requirePermission
};