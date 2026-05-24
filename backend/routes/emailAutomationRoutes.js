const express = require("express");

const {
  sendEmail
} = require("../services/emailService");

const {
  enforceLimit
} = require("../middleware/planLimitMiddleware");

const {
  usageTracker
} = require("../middleware/usageMiddleware");

const router = express.Router();

/* =========================
   SEND EMAIL
========================= */

router.post(
  "/send",

  enforceLimit("ai_request"),

  usageTracker("ai_request"),

  async (req, res) => {

    try {

      const {
        to,
        subject,
        message
      } = req.body;

      if (!to || !subject || !message) {

        return res.status(400).json({
          message:
            "Missing required fields"
        });

      }

      const result =
        await sendEmail({

          to,

          subject,

          text: message,

          html: `
            <div style="
              font-family:Arial;
              line-height:1.7;
              color:#0f172a;
            ">
              <h2>
                TradeFlow AI Automation
              </h2>

              <p>
                ${message}
              </p>
            </div>
          `
        });

      if (!result.success) {

        return res.status(500).json({
          message:
            result.error
        });

      }

      res.json({

        success: true,

        message:
          "Email sent successfully",

        result

      });

    } catch (error) {

      console.error(
        "Email automation error:",
        error.message
      );

      res.status(500).json({
        message:
          "Email automation failed"
      });

    }

  }
);

module.exports = router;