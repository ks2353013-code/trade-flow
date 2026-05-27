const express = require("express");
const bcrypt = require("bcryptjs");

const User = require("../models/User");

const {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
} = require("../utils/tokenService");

const router = express.Router();

function buildPermissions(role = "Owner") {
  return {
    dashboard: true,
    suppliers: true,
    crm: true,
    tasks: true,
    analytics: true,
    documents: true,
    outreach: true,
    ai: true,
    billing: true,
    admin: role === "Owner" || role === "Founder"
  };
}

function sendAuthResponse(
  res,
  user,
  message = "Authentication successful"
) {

  const accessToken =
    generateAccessToken(user);

  const refreshToken =
    generateRefreshToken(user);

  res.cookie(
    "tradeflow_refresh_token",
    refreshToken,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge:
        30 * 24 * 60 * 60 * 1000
    }
  );

  res.json({
    success: true,
    message,

    token: accessToken,
    accessToken,

    user: {
      id: user._id,
      name: user.name || "TradeFlow User",
      email: user.email,
      companyName:
        user.companyName ||
        "TradeFlow Workspace",
      role: user.role || "Owner",
      permissions:
        buildPermissions(
          user.role || "Owner"
        )
    },

    expiresIn: "15m"
  });

}

async function handleSignup(req, res) {

  try {

    const {
      name,
      email,
      password,
      companyName
    } = req.body;

    if (!email || !password) {

      return res.status(400).json({
        success: false,
        message:
          "Email and password are required"
      });

    }

    const cleanEmail =
      String(email)
        .toLowerCase()
        .trim();

    const existingUser =
      await User.findOne({
        email: cleanEmail
      });

    if (existingUser) {

      return res.status(409).json({
        success: false,
        message:
          "User already exists. Please login."
      });

    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const user =
      await User.create({

        name:
          name || "TradeFlow User",

        email: cleanEmail,

        password: hashedPassword,

        companyName:
          companyName ||
          "TradeFlow Workspace",

        role:
          cleanEmail ===
          "ks2353013@gmail.com"
            ? "Founder"
            : "Owner"

      });

    sendAuthResponse(
      res,
      user,
      "Signup successful"
    );

  } catch (error) {

    console.error(
      "Signup error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Signup failed",
      error: error.message
    });

  }

}

router.post("/signup", handleSignup);
router.post("/register", handleSignup);

router.post("/login", async (req, res) => {

  try {

    const {
      email,
      password
    } = req.body;

    if (!email || !password) {

      return res.status(400).json({
        success: false,
        message:
          "Email and password are required"
      });

    }

    const cleanEmail =
      String(email)
        .toLowerCase()
        .trim();

    const user =
      await User.findOne({
        email: cleanEmail
      });

    if (!user) {

      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password"
      });

    }

    const isMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isMatch) {

      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password"
      });

    }

    sendAuthResponse(
      res,
      user,
      "Login successful"
    );

  } catch (error) {

    console.error(
      "Login error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message
    });

  }

});

router.post("/refresh", async (req, res) => {

  try {

    const refreshToken =
      req.cookies
        ?.tradeflow_refresh_token ||
      req.body?.refreshToken;

    if (!refreshToken) {

      return res.status(401).json({
        success: false,
        message:
          "Refresh token missing"
      });

    }

    const decoded =
      verifyRefreshToken(
        refreshToken
      );

    const user =
      await User.findById(
        decoded.id
      );

    if (!user) {

      return res.status(401).json({
        success: false,
        message:
          "User not found"
      });

    }

    sendAuthResponse(
      res,
      user,
      "Session refreshed"
    );

  } catch (error) {

    res.status(401).json({
      success: false,
      message:
        "Refresh session failed",
      error: error.message
    });

  }

});

router.post("/logout", (req, res) => {

  res.clearCookie(
    "tradeflow_refresh_token",
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production",
      sameSite: "strict"
    }
  );

  res.json({
    success: true,
    message:
      "Logged out successfully"
  });

});

router.get("/session", async (req, res) => {

  try {

    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {

      return res.status(401).json({
        valid: false,
        message: "No token"
      });

    }

    const token =
      authHeader.split(" ")[1];

    const decoded =
      verifyAccessToken(token);

    const user =
      await User.findById(
        decoded.id
      ).select("-password");

    if (!user) {

      return res.status(401).json({
        valid: false,
        message:
          "User not found"
      });

    }

    res.json({
      valid: true,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        companyName:
          user.companyName,
        role:
          user.role || "Owner",

        permissions:
          buildPermissions(
            user.role || "Owner"
          )
      }
    });

  } catch {

    res.status(401).json({
      valid: false,
      message:
        "Session expired"
    });

  }

});

module.exports = router;