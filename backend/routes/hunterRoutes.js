const express = require("express");
const axios = require("axios");

const { writeAuditLog } = require("../utils/auditLogger");

const router = express.Router();

function getOwnerEmail(req) {
  return (
    req.tenant?.ownerEmail ||
    req.user?.email ||
    req.headers["x-user-email"] ||
    req.body?.email ||
    req.query?.email ||
    "unknown@tradeflow.local"
  )
    .toLowerCase()
    .trim();
}

function getHunterKey() {
  return process.env.HUNTER_API_KEY || "";
}

router.get("/domain-search", async (req, res) => {
  try {
    const { domain } = req.query;

    if (!domain) {
      return res.status(400).json({
        success: false,
        message: "Domain is required"
      });
    }

    if (!getHunterKey()) {
      return res.status(400).json({
        success: false,
        message: "Hunter API key missing"
      });
    }

    const response = await axios.get("https://api.hunter.io/v2/domain-search", {
      params: {
        domain,
        api_key: getHunterKey()
      }
    });

    await writeAuditLog(req, {
      module: "Hunter",
      action: "Domain email search",
      entityType: "Domain",
      entityId: domain,
      severity: "Low",
      metadata: {
        ownerEmail: getOwnerEmail(req),
        domain
      }
    });

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Hunter domain search failed",
      error: error.response?.data || error.message
    });
  }
});

router.get("/email-finder", async (req, res) => {
  try {
    const { domain, first_name, last_name, company } = req.query;

    if (!domain || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: "domain, first_name, and last_name are required"
      });
    }

    if (!getHunterKey()) {
      return res.status(400).json({
        success: false,
        message: "Hunter API key missing"
      });
    }

    const response = await axios.get("https://api.hunter.io/v2/email-finder", {
      params: {
        domain,
        first_name,
        last_name,
        company,
        api_key: getHunterKey()
      }
    });

    await writeAuditLog(req, {
      module: "Hunter",
      action: "Email finder search",
      entityType: "EmailFinder",
      entityId: domain,
      severity: "Low",
      metadata: {
        ownerEmail: getOwnerEmail(req),
        domain,
        first_name,
        last_name,
        company
      }
    });

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Hunter email finder failed",
      error: error.response?.data || error.message
    });
  }
});

router.get("/verify-email", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    if (!getHunterKey()) {
      return res.status(400).json({
        success: false,
        message: "Hunter API key missing"
      });
    }

    const response = await axios.get("https://api.hunter.io/v2/email-verifier", {
      params: {
        email,
        api_key: getHunterKey()
      }
    });

    await writeAuditLog(req, {
      module: "Hunter",
      action: "Email verification",
      entityType: "Email",
      entityId: email,
      severity: "Low",
      metadata: {
        ownerEmail: getOwnerEmail(req),
        email
      }
    });

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Hunter email verification failed",
      error: error.response?.data || error.message
    });
  }
});

module.exports = router;