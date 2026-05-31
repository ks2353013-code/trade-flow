const nodemailer = require("nodemailer");

function isEmailConfigured() {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM
  );
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function sendApprovedEmail({ to, subject, message }) {
  if (!to || !subject || !message) {
    throw new Error("Email to, subject and message are required");
  }

  if (!isEmailConfigured()) {
    return {
      dryRun: true,
      messageId: "dry-run-" + Date.now(),
      response: "SMTP not configured. Email was not sent."
    };
  }

  const transporter = getTransporter();

  const result = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text: message
  });

  return {
    dryRun: false,
    messageId: result.messageId || "",
    response: result
  };
}

module.exports = {
  sendApprovedEmail,
  isEmailConfigured
};