/**
 * Multi-channel messaging router.
 *
 * Channel selection by geography:
 *   African cities      → Africa's Talking SMS (5-6x cheaper than Twilio)
 *   WhatsApp enrolled   → WhatsApp Business API (10x cheaper, better UX)
 *   Everything else     → Twilio SMS (existing fallback)
 *
 * Unit economics (1M users, 5 alerts/year, Nigeria):
 *   Twilio only:              $200,000/yr
 *   This router (WhatsApp+AT): ~$24,000/yr  (8x reduction)
 */

// African cities where Africa's Talking is cheaper and more reliable than Twilio
const AFRICAS_TALKING_CITIES = new Set([
  'lagos', 'nairobi', 'dar-es-salaam', 'accra', 'kinshasa', 'kampala',
  'addis-ababa', 'dakar', 'abidjan', 'cairo',
]);

const AT_API_KEY  = process.env.AFRICAS_TALKING_API_KEY || '';
const AT_USERNAME = process.env.AFRICAS_TALKING_USERNAME || 'sandbox';
const WA_TOKEN    = process.env.WHATSAPP_API_TOKEN || '';
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

export type Channel = 'whatsapp' | 'africas-talking' | 'twilio';

export function selectChannel(cityId: string, recipient: { phone: string; whatsapp?: boolean }): Channel {
  if (recipient.whatsapp && WA_TOKEN && WA_PHONE_ID) return 'whatsapp';
  if (AFRICAS_TALKING_CITIES.has(cityId) && AT_API_KEY) return 'africas-talking';
  return 'twilio';
}

// ── WhatsApp Business API (Meta Cloud API) ────────────────────────────────────
export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  if (!WA_TOKEN || !WA_PHONE_ID) return false;
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone.replace(/\D/g, ''),
          type: 'text',
          text: { body: message },
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// ── Africa's Talking SMS ──────────────────────────────────────────────────────
export async function sendAfricasTalking(phone: string, message: string): Promise<boolean> {
  if (!AT_API_KEY) return false;
  try {
    const body = new URLSearchParams({
      username: AT_USERNAME,
      to: phone,
      message,
    });
    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        apiKey: AT_API_KEY,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── USSD risk-check endpoint (Africa's Talking callback) ──────────────────────
// Deploy at /api/ussd — Africa's Talking calls this when user dials the short code.
// User dials *384# → gets current risk level for nearest city, no enrollment needed.
export function buildUssdResponse(text: string, riskSummary: string): string {
  if (!text) {
    // First interaction — show menu
    return `CON Welcome to Bzzt Disease Early Warning
Select your region:
1. West Africa (Lagos, Accra)
2. East Africa (Nairobi, Dar es Salaam)
3. South Asia (Mumbai, Dhaka)
4. Southeast Asia (Jakarta, Manila)`;
  }

  // User selected a region — return current risk
  return `END Bzzt Risk Update:\n${riskSummary}\n\nFor enrollment, SMS "JOIN [city]" to +1-XXX-XXX-XXXX`;
}

// ── Cost estimator (for reporting / UNICEF dashboard) ─────────────────────────
export function estimateCost(channel: Channel, messageCount: number): number {
  const rates: Record<Channel, number> = {
    'whatsapp':        0.004,  // USD per conversation
    'africas-talking': 0.008,  // USD per SMS (Nigeria avg)
    'twilio':          0.040,  // USD per SMS (Nigeria via Twilio)
  };
  return messageCount * rates[channel];
}
