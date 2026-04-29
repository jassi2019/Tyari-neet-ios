const env = require("../config/env");

/**
 * Send an SMS using Twilio.
 * Falls back gracefully if Twilio credentials are not configured.
 */
const sendSms = async ({ to, body }) => {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new Error("SMS service not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env");
  }

  const twilio = require("twilio")(accountSid, authToken);

  const message = await twilio.messages.create({
    body,
    from,
    to,
  });

  return message;
};

module.exports = sendSms;
