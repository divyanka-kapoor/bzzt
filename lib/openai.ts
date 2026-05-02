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

// Languages spoken in highest-burden cities
const CITY_LANGUAGES: Record<string, { code: string; name: string }> = {
  'lagos':         { code: 'ha', name: 'Hausa' },       // Nigeria — Hausa most widely spoken
  'kinshasa':      { code: 'fr', name: 'French' },      // DRC
  'dhaka':         { code: 'bn', name: 'Bengali' },     // Bangladesh
  'mumbai':        { code: 'hi', name: 'Hindi' },       // India
  'delhi':         { code: 'hi', name: 'Hindi' },
  'kolkata':       { code: 'bn', name: 'Bengali' },
  'karachi':       { code: 'ur', name: 'Urdu' },        // Pakistan
  'jakarta':       { code: 'id', name: 'Bahasa Indonesia' },
  'manila':        { code: 'tl', name: 'Filipino' },    // Philippines
  'dar-es-salaam': { code: 'sw', name: 'Swahili' },    // Tanzania
  'nairobi':       { code: 'sw', name: 'Swahili' },    // Kenya
  'accra':         { code: 'tw', name: 'Twi' },         // Ghana
  'bangkok':       { code: 'th', name: 'Thai' },
  'ho-chi-minh':   { code: 'vi', name: 'Vietnamese' },
  'kuala-lumpur':  { code: 'ms', name: 'Malay' },
};

export async function composeAlertMessage(params: {
  cityId?: string;
  city: string;
  country?: string;
  dengueLevel: string;
  malariaLevel: string;
}): Promise<{ en: string; local: string | null; language: string | null }> {
  const loc = params.country ? `${params.city}, ${params.country}` : params.city;
  const lang = params.cityId ? CITY_LANGUAGES[params.cityId] : null;

  const topRisk = params.dengueLevel === 'HIGH' || params.malariaLevel === 'HIGH' ? 'HIGH'
    : params.dengueLevel === 'WATCH' || params.malariaLevel === 'WATCH' ? 'WATCH' : 'LOW';

  const fallback = `Bzzt: ${topRisk} mosquito-borne disease risk in ${loc}. Eliminate standing water, use repellent, and see a health worker if you have fever or joint pain.`;

  const englishPrompt = `You are Bzzt, a public health early-warning system. Write a concise SMS alert (under 280 characters) for residents of ${loc}. Dengue risk: ${params.dengueLevel}. Malaria risk: ${params.malariaLevel}. Be direct. Include one clear action. Plain English, no jargon.`;

  const en = await claudeComplete(englishPrompt, 120) ?? fallback;

  let local: string | null = null;
  if (lang) {
    const translatePrompt = `Translate this SMS health alert into ${lang.name} (${lang.code}). Keep it under 280 characters. Preserve the urgency and the specific action. Do not add or remove information. Alert: "${en}"`;
    local = await claudeComplete(translatePrompt, 150) ?? null;
  }

  return { en, local, language: lang?.name ?? null };
}

export async function classifySymptoms(body: string): Promise<string> {
  const prompt = `A person in India sent this SMS about health symptoms: "${body}". Reply with brief, caring guidance under 280 characters. If symptoms suggest dengue or malaria (fever, chills, joint pain, rash), urge them to visit a health center today.`;

  const text = await claudeComplete(prompt, 120);
  return text || 'Thank you for reporting. If you have fever, joint pain, or rash, please visit your nearest health center today. Reply STOP to unsubscribe.';
}
