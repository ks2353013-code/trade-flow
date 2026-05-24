const jwt = require("jsonwebtoken");
const Employee = require("../models/Employee");

function getJwtSecret() {
  return process.env.JWT_SECRET || "tradeflow_secret_change_this";
}

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, getJwtSecret());

    if (!decoded?.email) {
      return res.status(401).json({
        message: "Invalid session token"
      });
    }

    const employee = await Employee.findOne({
      email: decoded.email.toLowerCase()
    });

    req.user = {
      id: decoded.id,
      email: decoded.email.toLowerCase(),
      role: employee?.role || decoded.role || "Owner",
      permissions: employee?.permissions || decoded.permissions || {},
      employee: employee || null
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Session expired. Please login again."
    });
  }
}

function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, getJwtSecret());

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || "Owner",
      permissions: decoded.permissions || {}
    };

    next();
  } catch {
    next();
  }
}

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuth;
module.exports.getJwtSecret = getJwtSecret;