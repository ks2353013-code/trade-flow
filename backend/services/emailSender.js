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

async function sendPasswordResetEmail({ to, resetUrl }) {
  if (!to || !resetUrl) {
    throw new Error("Password reset email and reset URL are required");
  }

  const subject = "Reset your TradeFlow password";
  const message = [
    "We received a request to reset your TradeFlow password.",
    "",
    "Open this secure link to set a new password:",
    resetUrl,
    "",
    "This link expires in 1 hour. If you did not request this, you can ignore this email."
  ].join("\n");

  if (!isEmailConfigured()) {
    return {
      dryRun: true,
      messageId: "dry-run-reset-" + Date.now(),
      response: "SMTP not configured. Password reset email was not sent.",
      resetUrl
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
  sendPasswordResetEmail,
  isEmailConfigured
};
