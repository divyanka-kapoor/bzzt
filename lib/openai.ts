// Claude (Anthropic) for LLM calls — falls back to template if key not set

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

async function claudeComplete(prompt: string, maxTokens = 150): Promise<string | null> {
  if (!ANTHROPIC_KEY) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.content?.[0]?.text || null;
  } catch {
    return null;
  }
}

export async function composeAlertMessage(params: {
  cityId?: string;
  city: string;
  country?: string;
  dengueLevel: string;
  malariaLevel: string;
}): Promise<string> {
  const loc = params.country ? `${params.city}, ${params.country}` : params.city;
  const prompt = `You are Bzzt, a global public health early-warning system. Write a concise SMS alert (under 280 characters) for residents of ${loc}. Dengue risk: ${params.dengueLevel}. Malaria risk: ${params.malariaLevel}. Be direct and include one clear action they should take right now. Use plain English — no jargon.`;

  const text = await claudeComplete(prompt, 120);
  if (text) return text;

  const topRisk = params.dengueLevel === 'HIGH' || params.malariaLevel === 'HIGH' ? 'HIGH' : params.dengueLevel === 'WATCH' || params.malariaLevel === 'WATCH' ? 'WATCH' : 'LOW';
  return `Bzzt: ${topRisk} mosquito-borne disease risk in ${loc}. Eliminate standing water, use repellent, and visit a health worker if you have fever or joint pain.`;
}

export async function classifySymptoms(body: string): Promise<string> {
  const prompt = `A person in India sent this SMS about health symptoms: "${body}". Reply with brief, caring guidance under 280 characters. If symptoms suggest dengue or malaria (fever, chills, joint pain, rash), urge them to visit a health center today.`;

  const text = await claudeComplete(prompt, 120);
  return text || 'Thank you for reporting. If you have fever, joint pain, or rash, please visit your nearest health center today. Reply STOP to unsubscribe.';
}
