/**
 * USSD endpoint — called by Africa's Talking when a user dials the short code.
 * Works on any phone including basic feature phones. No internet, no app, no enrollment.
 *
 * Flow:
 *   User dials *384# → selects region → gets current risk level for nearest city
 *
 * This addresses the last-mile equity gap: the poorest communities in Africa
 * can check disease risk with a $15 phone and no data plan.
 */

import { NextRequest, NextResponse } from 'next/server';

const REGION_CITIES: Record<string, { city: string; id: string }[]> = {
  '1': [{ city: 'Lagos', id: 'lagos' }, { city: 'Accra', id: 'accra' }],
  '2': [{ city: 'Nairobi', id: 'nairobi' }, { city: 'Dar es Salaam', id: 'dar-es-salaam' }],
  '3': [{ city: 'Mumbai', id: 'mumbai' }, { city: 'Dhaka', id: 'dhaka' }],
  '4': [{ city: 'Jakarta', id: 'jakarta' }, { city: 'Manila', id: 'manila' }],
};

export async function POST(req: NextRequest) {
  const data = await req.formData();
  const text = (data.get('text') as string) || '';

  const steps = text.split('*').filter(Boolean);

  // Step 0 — main menu
  if (steps.length === 0) {
    return ussdResponse(`CON Bzzt Disease Early Warning
Check mosquito-borne disease risk:

1. West Africa (Lagos, Accra)
2. East Africa (Nairobi, Dar es Salaam)
3. South Asia (Mumbai, Dhaka)
4. Southeast Asia (Jakarta, Manila)`);
  }

  // Step 1 — region selected, fetch risk for first city
  const regionChoice = steps[0];
  const cities = REGION_CITIES[regionChoice];
  if (!cities) {
    return ussdResponse('END Invalid selection. Please dial again and choose 1-4.');
  }

  try {
    // Fetch current risk from our own scan endpoint
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const scanRes = await fetch(`${base}/api/scan`, { cache: 'no-store' });
    const scanData = scanRes.ok ? await scanRes.json() : { cities: [] };

    const lines = cities.map(({ city, id }) => {
      const found = scanData.cities?.find((c: { id: string }) => c.id === id);
      if (!found) return `${city}: data unavailable`;
      const topRisk = found.dengue === 'HIGH' || found.malaria === 'HIGH' ? 'HIGH RISK'
        : found.dengue === 'WATCH' || found.malaria === 'WATCH' ? 'WATCH' : 'LOW RISK';
      return `${city}: ${topRisk}`;
    }).join('\n');

    return ussdResponse(`END Bzzt Risk Update:\n${lines}\n\nFor SMS alerts text JOIN to +1-555-BZZT-NOW\nbzzt-sigma.vercel.app`);
  } catch {
    return ussdResponse('END Unable to fetch risk data. Try again later.');
  }
}

function ussdResponse(message: string) {
  return new NextResponse(message, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
