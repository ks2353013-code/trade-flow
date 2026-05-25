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

function buildUser({ name, email, companyName }) {
  return {
    id: Date.now().toString(),
    name: name || "TradeFlow User",
    companyName: companyName || "TradeFlow Workspace",
    email: String(email || "").toLowerCase(),
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
}

async function handleSignup(req, res) {
  try {
    const { name, email, password, companyName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    await bcrypt.hash(password, 10);

    const user = buildUser({
      name,
      email,
      companyName
    });

    const token = createToken(user);

    res.json({
      success: true,
      token,
      ...user,
      user,
      expiresIn: "7d"
    });
  } catch (error) {
    console.error("Signup error:", error.message);

    res.status(500).json({
      message: "Signup failed"
    });
  }
}

router.post("/signup", handleSignup);
router.post("/register", handleSignup);

router.post("/login", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required"
      });
    }

    const user = buildUser({
      email,
      name: "TradeFlow User",
      companyName: "TradeFlow Workspace"
    });

    const token = createToken(user);

    res.json({
      success: true,
      token,
      ...user,
      user,
      expiresIn: "7d"
    });
  } catch (error) {
    console.error("Login error:", error.message);

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