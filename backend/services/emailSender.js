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
    throw new Error("Password reset recipient and reset URL are required");
  }

  const subject = "Reset your TradeFlow password";
  const text = [
    "We received a request to reset your TradeFlow password.",
    "",
    "Reset your password:",
    resetUrl,
    "",
    "This one-time link expires in 1 hour and becomes invalid after use.",
    "If you did not request this, you can safely ignore this email.",
    "",
    "TradeFlow"
  ].join("\\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:620px;margin:40px auto;padding:32px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;">
      <h1 style="margin:0 0 16px;">Reset your TradeFlow password</h1>
      <p style="line-height:1.6;">We received a request to reset the password for your TradeFlow account.</p>
      <p style="margin:28px 0;">
        <a href="${resetUrl}" style="display:inline-block;padding:14px 22px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;">Reset My Password</a>
      </p>
      <p style="font-size:14px;color:#64748b;line-height:1.6;">This one-time link expires in 1 hour and can only be used once.</p>
      <p style="font-size:14px;color:#64748b;line-height:1.6;">If you did not request this, you can safely ignore this email.</p>
    </div>
  </body>
</html>`;

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
    text,
    html
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
