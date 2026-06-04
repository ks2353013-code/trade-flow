const express = require("express");
const mongoose = require("mongoose");
const ClientErrorLog = require("../models/ClientErrorLog");

const router = express.Router();

const SECRET_PATTERNS = [
  /(bearer\s+)[a-z0-9._-]+/gi,
  /(token=)[^&\s]+/gi,
  /(resetToken=)[^&\s]+/gi,
  /(password=)[^&\s]+/gi,
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g
];

function scrub(value = "", maxLength = 4000) {
  let output = String(value || "");

  SECRET_PATTERNS.forEach((pattern) => {
    output = output.replace(pattern, (...args) => {
      const match = args[0] || "";
      const prefix = args[1];
      return prefix ? `${prefix}[redacted]` : "[redacted]";
    });
  });

  return output.slice(0, maxLength);
}

function objectIdOrNull(value) {
  if (!value) return null;
  const id = String(value).trim();
  return mongoose.isValidObjectId(id) ? id : null;
}

function cleanBrowserInfo(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return {
    userAgent: scrub(value.userAgent, 500),
    language: scrub(value.language, 80),
    platform: scrub(value.platform, 120),
    viewport: value.viewport || null
  };
}

router.post("/client", async (req, res) => {
  try {
    const body = req.body || {};

    await ClientErrorLog.create({
      message: scrub(body.message || "Client error", 1000),
      stack: scrub(body.stack, 8000),
      route: scrub(body.route, 500),
      page: scrub(body.page, 500),
      userId: objectIdOrNull(req.user?.id || body.userId),
      companyId: objectIdOrNull(body.companyId),
      workspaceId: objectIdOrNull(body.workspaceId),
      browserInfo: cleanBrowserInfo(body.browserInfo),
      userAgent: scrub(req.headers["user-agent"], 500),
      timestamp: body.timestamp ? new Date(body.timestamp) : new Date()
    });

    return res.status(202).json({
      success: true
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Client error logging failed"
    });
  }
});

module.exports = router;
