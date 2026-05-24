const jwt = require("jsonwebtoken");
const Employee = require("../models/Employee");

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication token missing"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "tradeflow_secret"
    );

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || "Owner"
    };

    const employee = await Employee.findOne({
      email: decoded.email.toLowerCase()
    });

    if (employee) {
      req.user.permissions = employee.permissions;
      req.user.role = employee.role;
      req.user.employee = employee;
    }

    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);

    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}

module.exports = authMiddleware;