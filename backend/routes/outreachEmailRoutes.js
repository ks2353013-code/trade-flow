const express = require("express");
const nodemailer = require("nodemailer");

const Outreach = require("../models/Outreach");
const { writeAuditLog } = require("../utils/auditLogger");

const router = express.Router();

function getOwnerEmail(req) {
  return (
    req.tenant?.ownerEmail ||
    req.user?.email ||
    req.headers["x-user-email"] ||
    req.body?.ownerEmail ||
    req.body?.email ||
    req.query?.email ||
    "unknown@tradeflow.local"
  )
    .toLowerCase()
    .trim();
}

function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

router.post("/send", async (req, res) => {
  try {
    const ownerEmail = getOwnerEmail(req);

    const {
      to,
      subject,
      message,
      outreachId
    } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "To, subject, and message are required"
      });
    }

    const transporter = createTransporter();

    if (!transporter) {
      return res.status(400).json({
        success: false,
        message: "Email credentials missing in .env"
      });
    }

    const result = await transporter.sendMail({
      from: `"TradeFlow" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: message,
      html: message.replace(/\n/g, "<br>")
    });

    if (outreachId) {
      await Outreach.findOneAndUpdate(
        {
          _id: outreachId,
          ownerEmail
        },
        {
          status: "Sent",
          sentAt: new Date()
        },
        {
          new: true
        }
      );
    }

    await writeAuditLog(req, {
      module: "Outreach",
      action: "Sent outreach email",
      entityType: "Email",
      entityId: outreachId || result.messageId || "",
      severity: "Medium",
      metadata: {
        to,
        subject,
        messageId: result.messageId
      }
    });

    res.json({
      success: true,
      message: "Email sent successfully",
      messageId: result.messageId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send email",
      error: error.message
    });
  }
});

module.exports = router;