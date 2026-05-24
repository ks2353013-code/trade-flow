const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const { getJwtSecret } = require("../middleware/authMiddleware");

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || "Owner",
      permissions: user.permissions || {}
    },
    getJwtSecret(),
    {
      expiresIn: "7d"
    }
  );
}

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      id: Date.now().toString(),
      name: name || "TradeFlow User",
      email: email.toLowerCase(),
      role: "Owner",
      permissions: {
        dashboard: true,
        suppliers: true,
        crm: true,
        tasks: true,
        analytics: true,
        documents: true,
        outreach: true,
        ai: true,
        billing: true,
        admin: true
      }
    };

    const token = createToken(user);

    res.json({
      success: true,
      token,
      user,
      expiresIn: "7d"
    });
  } catch (error) {
    res.status(500).json({
      message: "Signup failed"
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required"
      });
    }

    const user = {
      id: Date.now().toString(),
      email: email.toLowerCase(),
      role: "Owner",
      permissions: {
        dashboard: true,
        suppliers: true,
        crm: true,
        tasks: true,
        analytics: true,
        documents: true,
        outreach: true,
        ai: true,
        billing: true,
        admin: true
      }
    };

    const token = createToken(user);

    res.json({
      success: true,
      token,
      user,
      expiresIn: "7d"
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed"
    });
  }
});

router.get("/session", (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        valid: false,
        message: "No token"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, getJwtSecret());

    res.json({
      valid: true,
      user: {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || {}
      }
    });
  } catch {
    res.status(401).json({
      valid: false,
      message: "Session expired"
    });
  }
});

module.exports = router;