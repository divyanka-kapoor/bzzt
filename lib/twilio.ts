// Twilio SMS wrapper
// TODO: Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to environment

import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!client || !fromNumber) {
    console.warn("TODO: Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.");
    console.log(`[MOCK SMS to ${to}]: ${body}`);
    return true;
  }

  try {
    await client.messages.create({ body, from: fromNumber, to });
    return true;
  } catch (err) {
    console.error("Twilio send failed:", err);
    return false;
  }
}
