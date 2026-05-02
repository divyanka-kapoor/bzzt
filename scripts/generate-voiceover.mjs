/**
 * Bzzt voiceover generator — ElevenLabs TTS
 * Voice: Daniel (onwK4e9ZLuTAKqWW03F9) — British broadcaster, natural and authoritative
 * Run: node scripts/generate-voiceover.mjs
 * Output: scripts/audio/ — one MP3 per section
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'audio');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_06e9ab94d656f2b15da669f79b5080b2fb3ec23b89e9ac36';
const VOICE_ID = 'onwK4e9ZLuTAKqWW03F9'; // Daniel — British broadcaster

// Target: ~30s per section, 3 min total. ~65 words per section at broadcast pace.
const SECTIONS = [
  {
    id: '01_problem',
    label: 'The Problem',
    // ~30s
    text: `Dengue and malaria kill over 600,000 people every year — almost all of them in low-income countries where health warnings come too late, or not at all.

The cruel irony? We can see these outbreaks coming. Mosquitoes only breed when temperature, rainfall, and humidity hit specific thresholds — conditions that show up in climate data days before the first person gets sick.

That data exists. It's free. It's updated hourly. But it never reaches the people who need it. Bzzt changes that.`,
  },
  {
    id: '02_solution',
    label: 'The Solution',
    // ~28s
    text: `Bzzt is an autonomous early-warning system. It reads real-time climate data for 24 high-burden cities, scores outbreak risk using WHO-aligned mosquito biology thresholds, and automatically alerts enrolled residents — before the outbreak arrives.

No app. No account. Just an SMS to your phone when conditions turn dangerous in your city.`,
  },
  {
    id: '03_demo_map',
    label: 'Demo — Map and Alert',
    // ~32s
    text: `The dashboard updates every five minutes with live risk scores across all 24 cities. Red is HIGH, yellow is WATCH, green is LOW.

I'll trigger an alert for one of the high-risk cities. The message is composed by Claude AI — under 280 characters, specific to the current risk level — and dispatched immediately to everyone enrolled in that area. You can see it appear in the alert feed in real time.`,
  },
  {
    id: '04_demo_intelligence',
    label: 'Demo — Intelligence Tab',
    // ~35s
    text: `The Intelligence tab shows the global picture. Not just which cities are at risk — but how many people are living inside those risk zones right now, cross-referenced with UN population data.

Each city card shows dengue and malaria scores, whether conditions are escalating or improving, historical case counts from the WHO Global Health Observatory, and the exact climate readings driving the prediction.

Notice the 14-day lagged rainfall figure. Mosquito eggs take two weeks to hatch. We're not just watching today's rain — we're watching what fell a fortnight ago, because that's what's hatching now.`,
  },
  {
    id: '05_openmetadata',
    label: 'OpenMetadata',
    // ~40s
    text: `When you're sending health alerts to real people, the pipeline behind those alerts has to be auditable. Every prediction traceable. Every computation quality-checked. That's where OpenMetadata comes in.

Bzzt registers three data source services in the OpenMetadata catalog, four table entities with full column schemas, and column-level lineage — tracing exactly which climate columns produce which risk score outputs.

Every risk computation logs a pipeline status record in OpenMetadata with per-task state and seven automated data quality checks. If any check fails, the run is marked failed before an alert goes out.

The Lineage panel shows every OM-synced computation in real time. The OM badge confirms it was recorded. The QC checkmark confirms all quality checks passed. Every alert is fully traceable, back to its source signal.`,
  },
  {
    id: '06_close',
    label: 'Stack and Close',
    // ~25s
    text: `The stack: Next.js 14, TypeScript, Tailwind, Leaflet, Twilio, Open-Meteo, WHO GHO, and OpenMetadata.

Building Bzzt taught me that governance isn't a box to tick — it's what makes a system trustworthy enough to act on. OpenMetadata made that possible from day one.

Bzzt. Because the warning should reach you before the outbreak does.`,
  },
];

async function generateSection(section) {
  console.log(`Generating [${section.id}]: ${section.label}...`);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: section.text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.8,
        style: 0.15,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs error for "${section.label}": ${res.status} — ${err}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const outPath = path.join(OUT_DIR, `${section.id}.mp3`);
  fs.writeFileSync(outPath, buffer);
  console.log(`  ✓ ${outPath}`);
  return { path: outPath, id: section.id };
}

async function main() {
  console.log('Voice: Daniel (British broadcaster)\n');
  for (const section of SECTIONS) {
    await generateSection(section);
  }
  console.log('\nDone. Files in scripts/audio/');
}

main().catch(err => { console.error(err); process.exit(1); });
