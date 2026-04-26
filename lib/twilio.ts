import twilio from 'twilio';

const accountSid  = process.env.TWILIO_ACCOUNT_SID;
const authToken   = process.env.TWILIO_AUTH_TOKEN;
const fromNumber  = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export function twilioConfigured(): boolean {
  return !!(client && fromNumber);
}

export async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!client || !fromNumber) {
    // Honest: SMS not sent. Don't inflate recipient counts.
    console.log(`[SMS not configured] Would send to ${to}: ${body.slice(0, 80)}…`);
    return false;
  }
  try {
    await client.messages.create({ body, from: fromNumber, to });
    return true;
  } catch (err) {
    console.error('Twilio send failed:', err);
    return false;
  }
}
