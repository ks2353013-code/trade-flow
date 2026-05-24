const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendWhatsAppMessage({ to, message }) {
  try {
    if (!to || !message) {
      return {
        success: false,
        error: "Recipient and message are required"
      };
    }

    const formattedTo = to.startsWith("whatsapp:")
      ? to
      : `whatsapp:${to}`;

    const result = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: formattedTo,
      body: message
    });

    return {
      success: true,
      sid: result.sid,
      status: result.status
    };
  } catch (error) {
    console.error("WhatsApp send error:", error.message);

    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  sendWhatsAppMessage
};