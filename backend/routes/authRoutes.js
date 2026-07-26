const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const Subscription = require("../models/Subscription");
const { sendPasswordResetEmail } = require("../services/emailSender");
const {
  normalizeEmail,
  validateCorporateSignupEmail,
  isValidEmailSyntax
} = require("../utils/emailValidation");

const {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
} = require("../utils/tokenService");
const {
  MASTER_ADMIN_ROLE,
  applyMasterAdminIdentity,
  isMasterAdminEmail
} = require("../utils/masterAdminIdentity");

const router = express.Router();

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getFrontendBaseUrl(req) {
  return (
    process.env.FRONTEND_URL ||
    process.env.APP_URL ||
    req.get("origin") ||
    `${req.protocol}://${req.get("host")}`
  ).replace(/\/$/, "");
}

function buildResetUrl(req, email, token) {
  const baseUrl = getFrontendBaseUrl(req);
  const params = new URLSearchParams({
    email,
    resetToken: token
  });

  return `${baseUrl}/login?${params.toString()}`;
}

function buildPermissions(role = "Founder") {
  const isAdmin =
    role === "Master Admin" ||
    role === "Founder" ||
    role === "Admin";

  return {
    dashboard: true,
    suppliers: true,
    crm: true,
    tasks: true,
    analytics: true,
    documents: true,
    outreach: true,
    ai: true,
    billing: isAdmin,
    admin: isAdmin
  };
}

function sendAuthResponse(res, user, message = "Authentication successful") {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  const production = process.env.NODE_ENV === "production";

  res.cookie("tradeflow_refresh_token", refreshToken, {
    httpOnly: true,
    secure: production,
    sameSite: production ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000
  });

  res.json({
    success: true,
    message,
    token: accessToken,
    accessToken,
    onboardingCompleted: user.onboardingCompleted === true,
    user: {
      id: user._id,
      name: user.name || "TradeFlow User",
      email: user.email,
      companyName: user.companyName || "TradeFlow Workspace",
      businessType: user.businessType || "Trading Company",
      businessTypeLocked: user.businessTypeLocked === true,
      businessTypeLockedAt: user.businessTypeLockedAt || null,
      role: user.role || "Founder",
      subscriptionPlan: user.subscriptionPlan || "Starter",
      subscriptionStatus: user.subscriptionStatus || "Active",
      onboardingCompleted: user.onboardingCompleted === true,
      features: user.features || {},
      limits: user.limits || {},
      permissions: buildPermissions(user.role || "Founder")
    },
    expiresIn: "15m"
  });
}

async function synchronizeVerifiedIdentity(user) {
  if (applyMasterAdminIdentity(user)) {
    await user.save();
  }
  return user;
}

async function handleSignup(req, res) {
  try {
    const { name, email, password, companyName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const validation = validateCorporateSignupEmail(email);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message
      });
    }

    const cleanEmail = validation.email;

    const existingUser = await User.findOne({
      email: cleanEmail
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists. Please login."
      });
    }

    const user = await User.create({
      name: name || "TradeFlow User",
      email: cleanEmail,
      password,
      companyName: companyName || "TradeFlow Workspace",
      role: isMasterAdminEmail(cleanEmail) ? MASTER_ADMIN_ROLE : "Founder"
    });

    await Subscription.findOneAndUpdate(
      { email: cleanEmail },
      {
        $setOnInsert: {
          email: cleanEmail,
          plan: "Starter",
          status: "Active",
          price: 1999,
          approvalStatus: "Not Required",
          entitlements: {
            aiLimit: 20,
            supplierLimit: 200,
            dealLimit: 50,
            workspaceLimit: 1,
            employeeLimit: 3
          }
        }
      },
      { upsert: true, new: true }
    );

    sendAuthResponse(res, user, "Signup successful");
  } catch (error) {
    console.error("Signup error:", error.message);

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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const cleanEmail = String(email).toLowerCase().trim();

    const user = await User.findOne({
      email: cleanEmail
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    await synchronizeVerifiedIdentity(user);

    if (!user.firstLoginAt) {
      user.firstLoginAt = new Date();
    }

    user.lastLoginAt = new Date();
    user.loginCount = Number(user.loginCount || 0) + 1;
    await user.save();

    sendAuthResponse(res, user, "Login successful");
  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message
    });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const cleanEmail = normalizeEmail(req.body?.email);

    if (!isValidEmailSyntax(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid email address"
      });
    }

    const user = await User.findOne({ email: cleanEmail });

    const genericResponse = {
      success: true,
      message: "If this email exists, a password reset link has been sent."
    };

    if (!user) {
      return res.json(genericResponse);
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetUrl = buildResetUrl(req, cleanEmail, resetToken);

    user.passwordResetTokenHash = hashResetToken(resetToken);
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    user.passwordResetRequestedAt = new Date();
    await user.save();

    const result = await sendPasswordResetEmail({
      to: user.email,
      resetUrl
    });

    return res.json({
      ...genericResponse,
      dryRun: result.dryRun === true,
      resetUrl:
        process.env.NODE_ENV === "production" || result.dryRun !== true
          ? undefined
          : resetUrl
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);
    res.status(500).json({
      success: false,
      message: "Password reset request failed",
      error: error.message
    });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const cleanEmail = normalizeEmail(req.body?.email);
    const resetToken = String(req.body?.resetToken || "").trim();
    const newPassword = String(req.body?.password || "");

    if (!isValidEmailSyntax(cleanEmail) || !resetToken || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Valid email, reset token and an 8+ character password are required"
      });
    }

    const user = await User.findOne({ email: cleanEmail }).select("+passwordResetTokenHash");

    if (
      !user ||
      !user.passwordResetTokenHash ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt.getTime() < Date.now() ||
      user.passwordResetTokenHash !== hashResetToken(resetToken)
    ) {
      return res.status(400).json({
        success: false,
        message: "Password reset link is invalid or expired"
      });
    }

    user.password = newPassword;
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    user.passwordResetRequestedAt = null;
    await user.save();

    res.json({
      success: true,
      message: "Password reset successful. Please login with your new password."
    });
  } catch (error) {
    console.error("Reset password error:", error.message);
    res.status(500).json({
      success: false,
      message: "Password reset failed",
      error: error.message
    });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const refreshToken =
      req.cookies?.tradeflow_refresh_token ||
      req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token missing"
      });
    }

    const decoded = verifyRefreshToken(refreshToken);

    const user = await User.findById(decoded.id);

    if (
      !user ||
      String(decoded.email || "").trim().toLowerCase() !== user.email ||
      Number(decoded.tokenVersion || 0) !== Number(user.tokenVersion || 0)
    ) {
      return res.status(401).json({
        success: false,
        message: "Refresh session has been revoked"
      });
    }

    await synchronizeVerifiedIdentity(user);
    sendAuthResponse(res, user, "Session refreshed");
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Refresh session failed",
      error: error.message
    });
  }
});

router.post("/logout", authMiddleware, async (req, res) => {
  const production = process.env.NODE_ENV === "production";

  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $inc: { tokenVersion: 1 } },
      { new: true }
    );

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    res.clearCookie("tradeflow_refresh_token", {
      httpOnly: true,
      secure: production,
      sameSite: production ? "none" : "lax"
    });

    return res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message
    });
  }
});

router.get("/session", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        valid: false,
        message: "No token"
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id).select("-password");

    if (
      !user ||
      String(decoded.email || "").trim().toLowerCase() !== user.email ||
      Number(decoded.tokenVersion || 0) !== Number(user.tokenVersion || 0)
    ) {
      return res.status(401).json({
        valid: false,
        message: "User not found"
      });
    }

    await synchronizeVerifiedIdentity(user);

    res.json({
      valid: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        companyName: user.companyName,
        businessType: user.businessType || "Trading Company",
        businessTypeLocked: user.businessTypeLocked === true,
        businessTypeLockedAt: user.businessTypeLockedAt || null,
        role: user.role || "Founder",
        permissions: buildPermissions(user.role || "Founder")
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
