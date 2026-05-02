/**
 * Returns districts with their latest risk score + GeoJSON geometry.
 * Used by the choropleth map.
 *
 * Query params:
 *   country=Nigeria    — filter by country name
 *   level=HIGH,WATCH   — filter by risk level (comma-separated)
 *   limit=500          — max rows (default 500)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get('country');
  const levels  = searchParams.get('level')?.split(',') ?? ['HIGH', 'WATCH'];
  const limit   = parseInt(searchParams.get('limit') ?? '500');

  try {
    // Get latest risk score per district (subquery via Supabase RPC is complex —
    // instead fetch recent scores and deduplicate in JS, which is fast enough at 800 districts)
    let scoresQuery = db
      .from('risk_scores')
      .select('district_id, city_name, country, dengue_level, malaria_level, dengue_score, malaria_score, population_at_risk, computed_at, lat, lng')
      .order('computed_at', { ascending: false })
      .limit(limit * 3); // fetch extra to ensure we get latest per district

    if (country) scoresQuery = scoresQuery.eq('country', country);

    const { data: scores, error: scoresErr } = await scoresQuery;
    if (scoresErr) throw scoresErr;

    // Deduplicate: keep only the most recent score per district
    const latestByDistrict = new Map<string, typeof scores[0]>();
    for (const s of (scores ?? [])) {
      if (s.district_id && !latestByDistrict.has(s.district_id)) {
        latestByDistrict.set(s.district_id, s);
      }
    }

    // Filter by requested risk levels
    const filtered = Array.from(latestByDistrict.values()).filter(s => {
      const topRisk = s.dengue_level === 'HIGH' || s.malaria_level === 'HIGH' ? 'HIGH'
        : s.dengue_level === 'WATCH' || s.malaria_level === 'WATCH' ? 'WATCH' : 'LOW';
      return levels.includes(topRisk);
    });

    if (filtered.length === 0) {
      return NextResponse.json({ features: [], countries: [] });
    }

    // Fetch geometries for matched districts
    const districtIds = filtered.map(s => s.district_id).filter(Boolean);
    const { data: districts, error: distErr } = await db
      .from('districts')
      .select('id, state, population, geometry')
      .in('id', districtIds as string[]);

    if (distErr) throw distErr;

    const districtMap = new Map((districts ?? []).map(d => [d.id, d]));

    // Build GeoJSON FeatureCollection
    const features = filtered
      .map(s => {
        const dist = districtMap.get(s.district_id ?? '');
        if (!dist?.geometry) return null;

        const topRisk = s.dengue_level === 'HIGH' || s.malaria_level === 'HIGH' ? 'HIGH'
          : s.dengue_level === 'WATCH' || s.malaria_level === 'WATCH' ? 'WATCH' : 'LOW';

        return {
          type: 'Feature',
          geometry: dist.geometry,
          properties: {
            id:           s.district_id,
            name:         dist.state ?? s.city_name,
            country:      s.country,
            dengue:       s.dengue_level,
            malaria:      s.malaria_level,
            dengueScore:  s.dengue_score,
            malariaScore: s.malaria_score,
            topRisk,
            population:   dist.population ?? s.population_at_risk,
            computedAt:   s.computed_at,
            lat:          s.lat,
            lng:          s.lng,
          },
        };
      })
      .filter(Boolean);

    // Unique country list for filter dropdown
    const countries = Array.from(new Set(filtered.map(s => s.country))).sort();

    return NextResponse.json({ features, countries, total: features.length });
  } catch (err) {
    console.error('[district-risks]', err);
    return NextResponse.json({ features: [], countries: [], error: String(err) });
  }
}
