const AGENTMAIL_API = 'https://api.agentmail.to';
const AGENTMAIL_KEY = process.env.AGENTMAIL_API_KEY || 'am_us_d1776097b1ae901d349dda3bf36637c2cd7ed6a77566f15b924e76eb5735749d';
const BZZT_INBOX = 'bzzt@agentmail.to';

export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  try {
    const res = await fetch(`${AGENTMAIL_API}/v0/inboxes/${encodeURIComponent(BZZT_INBOX)}/messages/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AGENTMAIL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, text: body }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn(`AgentMail send failed (${res.status}):`, err);
      return false;
    }
    console.log(`[AgentMail] Sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    console.error('AgentMail error:', err);
    return false;
  }
}
