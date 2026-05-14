/**
 * Returns bounding boxes for all countries computed from district centroids.
 * Used by the map for fly-to on country selection — scales automatically
 * as new countries are added, no manual hardcoding needed.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 86400; // recompute daily — bounds don't change

export async function GET() {
  const { data, error } = await db
    .from('districts')
    .select('country, lat, lng')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .not('district_id', 'like', '%_L2%' as string); // level-1 only — one entry per state

  if (error) return NextResponse.json({}, { status: 500 });

  // Group by country, compute min/max lat/lng with padding
  const bounds: Record<string, [[number, number], [number, number]]> = {};
  const byCountry: Record<string, { lats: number[]; lngs: number[] }> = {};

  for (const d of data ?? []) {
    if (!d.country || d.lat == null || d.lng == null) continue;
    if (!byCountry[d.country]) byCountry[d.country] = { lats: [], lngs: [] };
    byCountry[d.country].lats.push(d.lat);
    byCountry[d.country].lngs.push(d.lng);
  }

  for (const [country, { lats, lngs }] of Object.entries(byCountry)) {
    const pad = 1.5; // degrees padding so borders aren't clipped
    bounds[country] = [
      [Math.min(...lats) - pad, Math.min(...lngs) - pad],
      [Math.max(...lats) + pad, Math.max(...lngs) + pad],
    ];
  }

  return NextResponse.json(bounds);
}
