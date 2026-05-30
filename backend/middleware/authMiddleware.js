const jwt = require("jsonwebtoken");
const Employee = require("../models/Employee");

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.JWT_REFRESH_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET or JWT_REFRESH_SECRET is missing");
  }

  return secret;
}

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
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

    const employee = await Employee.findOne({ email });

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
      req.user = null;
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

    return next();
  } catch {
    req.user = null;
    return next();
  }
}

function masterOnly(req, res, next) {
  const email = String(req.user?.email || "").toLowerCase().trim();

  if (
    email !== "ks2353013@gmail.com" &&
    email !== "contact@tradeflowai.in"
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