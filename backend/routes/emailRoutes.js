const express = require("express");
const nodemailer = require("nodemailer");

const router = express.Router();

router.post("/send", async (req, res) => {
  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({
        message: "To, subject, and message are required"
      });
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(200).json({
        success: false,
        message: "Email env not configured. Draft prepared but not sent."
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text: message
    });

    res.json({
      success: true,
      message: "Email sent successfully"
    });
  } catch (error) {
    console.error("Email route error:", error.message);
    res.status(500).json({
      message: "Email sending failed"
    });
  }
});

module.exports = router;