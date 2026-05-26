const jwt = require("jsonwebtoken");
const Employee = require("../models/Employee");

function getJwtSecret() {
  return process.env.JWT_SECRET || "tradeflow_secret_change_this";
}

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const fallbackEmail =
        req.headers["x-user-email"] ||
        req.body?.ownerEmail ||
        req.body?.email ||
        req.query?.email;

      if (fallbackEmail) {
        req.user = {
          id: null,
          email: String(fallbackEmail).toLowerCase().trim(),
          role: "Owner",
          permissions: {},
          employee: null,
          authMode: "development-fallback"
        };

        return next();
      }

      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, getJwtSecret());

    if (!decoded?.email) {
      return res.status(401).json({
        success: false,
        message: "Invalid session token"
      });
    }

    const email = decoded.email.toLowerCase().trim();

    const employee = await Employee.findOne({
      email
    });

    req.user = {
      id: decoded.id,
      email,
      role: employee?.role || decoded.role || "Owner",
      permissions: employee?.permissions || decoded.permissions || {},
      employee: employee || null,
      authMode: "jwt"
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Session expired. Please login again.",
      error: error.message
    });
  }
}

function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const fallbackEmail =
        req.headers["x-user-email"] ||
        req.body?.ownerEmail ||
        req.body?.email ||
        req.query?.email;

      if (fallbackEmail) {
        req.user = {
          id: null,
          email: String(fallbackEmail).toLowerCase().trim(),
          role: "Owner",
          permissions: {},
          authMode: "development-fallback"
        };
      }

      return next();
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, getJwtSecret());

    req.user = {
      id: decoded.id,
      email: decoded.email?.toLowerCase().trim(),
      role: decoded.role || "Owner",
      permissions: decoded.permissions || {},
      authMode: "jwt"
    };

    next();
  } catch {
    next();
  }
}

function masterOnly(req, res, next) {
  const email =
    req.user?.email ||
    req.headers["x-user-email"] ||
    "";

  if (
    String(email).toLowerCase().trim() !==
    "ks2353013@gmail.com"
  ) {
    return res.status(403).json({
      success: false,
      message: "Master Admin access required"
    });
  }

  next();
}

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuth;
module.exports.masterOnly = masterOnly;
module.exports.getJwtSecret = getJwtSecret;