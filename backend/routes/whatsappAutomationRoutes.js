const express = require("express");

const {
  sendWhatsAppMessage
} = require("../services/whatsappService2");
const {
  enforceLimit
} = require("../middleware/planLimitMiddleware");

const {
  usageTracker
} = require("../middleware/usageMiddleware");

const router = express.Router();

function whatsappAutomationEnabled() {
  return process.env.ENABLE_WHATSAPP_AUTOMATION === "true";
}

router.post(
  "/send",
  enforceLimit("ai_request"),
  usageTracker("ai_request"),
  async (req, res) => {
    try {
      if (!whatsappAutomationEnabled()) {
        return res.status(403).json({
          success: false,
          message: "WhatsApp automation is disabled for beta. Human-approved email workflow remains available."
        });
      }

      const { to, message } = req.body;

      if (!to || !message) {
        return res.status(400).json({
          message: "Recipient number and message are required"
        });
      }

      const result = await sendWhatsAppMessage({
        to,
        message
      });

      if (!result.success) {
        return res.status(500).json({
          message: result.error
        });
      }

      res.json({
        success: true,
        message: "WhatsApp message sent successfully",
        result
      });
    } catch (error) {
      console.error("WhatsApp automation error:", error.message);

      res.status(500).json({
        message: "WhatsApp automation failed"
      });
    }
  }
);

module.exports = router;
