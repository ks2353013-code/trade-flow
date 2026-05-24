const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD
  }
});

async function sendEmail({
  to,
  subject,
  html,
  text
}) {

  try {

    const info = await transporter.sendMail({

      from: `"TradeFlow AI" <${process.env.SMTP_EMAIL}>`,

      to,

      subject,

      text,

      html

    });

    console.log(
      "✅ Email sent:",
      info.messageId
    );

    return {
      success: true,
      messageId: info.messageId
    };

  } catch (error) {

    console.error(
      "❌ Email send error:",
      error.message
    );

    return {
      success: false,
      error: error.message
    };

  }

}

module.exports = {
  sendEmail
};