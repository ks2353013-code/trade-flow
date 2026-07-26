const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();
const OWNER_EMAIL = "ks2353013@gmail.com";
const TOKEN_HASH = "0b618cfd0a828c2c91640628fbb9ed1f9509d1ae656ac0b488c29b3b1cb7b066";
const EXPIRES_AT = 1785107010380;

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function authorized(req) {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Recovery ") || Date.now() >= EXPIRES_AT) return false;
  const supplied = Buffer.from(hashToken(header.slice(9)), "hex");
  const expected = Buffer.from(TOKEN_HASH, "hex");
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

router.post("/", async (req, res) => {
  if (!authorized(req)) {
    return res.status(403).json({ success: false, message: "Recovery authorization denied" });
  }

  if (String(req.body?.email || "").trim().toLowerCase() !== OWNER_EMAIL) {
    return res.status(403).json({ success: false, message: "Recovery identity denied" });
  }

  const password = String(req.body?.password || "");
  if (password.length < 12) {
    return res.status(400).json({ success: false, message: "Password requirements not met" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.findOneAndUpdate(
    {
      email: OWNER_EMAIL,
      role: "Master Admin",
      passwordResetTokenHash: { $ne: TOKEN_HASH }
    },
    {
      $set: {
        password: passwordHash,
        passwordResetTokenHash: TOKEN_HASH,
        passwordResetExpiresAt: null,
        passwordResetRequestedAt: new Date()
      },
      $inc: { tokenVersion: 1 }
    },
    { new: true }
  ).select("_id role");

  if (!user) {
    return res.status(410).json({ success: false, message: "Recovery already used or unavailable" });
  }

  return res.json({ success: true, message: "Owner recovery complete" });
});

module.exports = router;
