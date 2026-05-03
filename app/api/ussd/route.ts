/**
 * USSD endpoint — Africa's Talking callback for *384# short code.
 * Works on ANY phone including $15 feature phones. No internet, no app.
 *
 * Menu flow:
 *   1. Check disease risk by region
 *   2. Report symptoms (CHW mode) — fever cases, dengue, malaria, RDT results
 *
 * This is the last-mile layer: a community health worker in rural Nigeria
 * can submit weekly case counts with a basic phone and no data plan.
 * Those reports feed directly into Bzzt's ground truth data.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const data  = await req.formData();
  const text  = (data.get('text')        as string) || '';
  const phone = (data.get('phoneNumber') as string) || '';

  const steps = text.split('*').filter(Boolean);

  // ── Main menu ──────────────────────────────────────────────────────────────
  if (steps.length === 0) {
    return ussd(`CON Bzzt Disease Early Warning
1. Check risk by region
2. Report symptoms (CHW)`);
  }

  // ── Branch 1: Check risk ───────────────────────────────────────────────────
  if (steps[0] === '1') {
    if (steps.length === 1) {
      return ussd(`CON Select region:
1. West Africa
2. East Africa
3. South Asia
4. Southeast Asia
5. Latin America`);
    }

    const REGIONS: Record<string, { country: string; iso3: string }> = {
      '1': { country: 'Nigeria',     iso3: 'NGA' },
      '2': { country: 'Kenya',       iso3: 'KEN' },
      '3': { country: 'India',       iso3: 'IND' },
      '4': { country: 'Philippines', iso3: 'PHL' },
      '5': { country: 'Brazil',      iso3: 'BRA' },
    };

    const region = REGIONS[steps[1]];
    if (!region) return ussd('END Invalid. Dial again.');

    try {
      const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
      const res  = await fetch(`${base}/api/district-risks?country=${encodeURIComponent(region.country)}&level=HIGH,WATCH&limit=3`, { cache: 'no-store' });
      const d    = res.ok ? await res.json() : { features: [] };

      if (!d.features?.length) {
        return ussd(`END ${region.country}: No HIGH or WATCH risk districts right now.`);
      }

      const lines = d.features.slice(0, 3).map((f: { properties: { name: string; topRisk: string } }) =>
        `${f.properties.name}: ${f.properties.topRisk}`
      ).join('\n');

      return ussd(`END ${region.country} risk:\n${lines}\n\nEnroll: bzzt-sigma.vercel.app`);
    } catch {
      return ussd('END Error fetching data. Try again.');
    }
  }

  // ── Branch 2: CHW symptom report ──────────────────────────────────────────
  if (steps[0] === '2') {
    // Step 2.1 — ask fever cases
    if (steps.length === 1) {
      return ussd('CON CHW Report\nEnter fever cases this week (0-999):');
    }
    // Step 2.2 — ask dengue
    if (steps.length === 2) {
      return ussd('CON Suspected dengue cases (0-999):');
    }
    // Step 2.3 — ask malaria
    if (steps.length === 3) {
      return ussd('CON Suspected malaria cases (0-999):');
    }
    // Step 2.4 — ask RDT positives
    if (steps.length === 4) {
      return ussd('CON RDT positive results (0-999):');
    }
    // Step 2.5 — submit
    if (steps.length >= 5) {
      const feverCases      = parseInt(steps[1]) || 0;
      const suspectedDengue = parseInt(steps[2]) || 0;
      const suspectedMalaria= parseInt(steps[3]) || 0;
      const rdtPositive     = parseInt(steps[4]) || 0;

      try {
        const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
        await fetch(`${base}/api/chw-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: 0, lng: 0, // USSD can't get GPS — district matched by phone number region in future
            feverCases, suspectedDengue, suspectedMalaria, rdtPositive,
            reporterPhone: phone,
          }),
        });
      } catch { /* log silently */ }

      return ussd(`END Report submitted. Thank you.
Fever: ${feverCases} | Dengue: ${suspectedDengue}
Malaria: ${suspectedMalaria} | RDT+: ${rdtPositive}
Your data improves outbreak predictions.`);
    }
  }

  return ussd('END Invalid input. Please dial again.');
}

function ussd(message: string) {
  return new NextResponse(message, { headers: { 'Content-Type': 'text/plain' } });
}
