/**
 * Intelligence tab API — powered by Supabase district risk scores.
 * Replaces the old per-city Open-Meteo scan with pre-computed district data.
 */
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';
import { getSeasonalForecast, forecastSummary } from '@/lib/ecmwf-forecast';

type RiskLevel = 'HIGH' | 'WATCH' | 'LOW';

function formatPop(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export async function GET() {

  // Pull latest risk score per district — exclude L2 sub-districts for the summary view
  const { data: scores, error } = await db
    .from('risk_scores')
    .select(`
      district_id, city_id, city_name, country,
      dengue_level, malaria_level, dengue_score, malaria_score,
      population_at_risk, avg_temp, avg_rainfall, lagged_rainfall, avg_humidity,
      computed_at, lat, lng
    `)
    .not('district_id', 'like', '%_L2%')
    .order('computed_at', { ascending: false })
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Pull population from districts table using raw fetch (Supabase JS .in() silently fails for large batches)
  const districtIds = Array.from(new Set((scores ?? []).map(s => s.district_id).filter(Boolean))) as string[];
  const popMap = new Map<string, number>();
  const SUPABASE_URL = process.env.SUPABASE_URL!;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  for (let i = 0; i < districtIds.length; i += 150) {
    const chunk = districtIds.slice(i, i + 150);
    const quoted = chunk.map(id => `"${id}"`).join(',');
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/districts?select=id,population&id=in.(${encodeURIComponent(quoted)})`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      const rows: { id: string; population: number }[] = await res.json();
      for (const r of rows) { if (r.population) popMap.set(r.id, r.population); }
    } catch { /* skip batch on error */ }
  }

  // Deduplicate — keep latest per district
  const seen = new Set<string>();
  const latest = (scores ?? []).filter(s => {
    const key = s.district_id ?? s.city_id ?? s.city_name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Aggregate stats
  let totalAtHighRisk = 0, totalAtWatchRisk = 0;
  let citiesHigh = 0, citiesWatch = 0;
  const escalatingCities: string[] = [];
  const improvingCities: string[] = [];

  const cities = latest.map(s => {
    const topRisk: RiskLevel = s.dengue_level === 'HIGH' || s.malaria_level === 'HIGH' ? 'HIGH'
      : s.dengue_level === 'WATCH' || s.malaria_level === 'WATCH' ? 'WATCH' : 'LOW';

    // Use district population from districts table — risk_scores.population_at_risk is often NULL
    const popRaw = popMap.get(s.district_id ?? '') ?? s.population_at_risk ?? 0;
    const pop = (popRaw) / 1_000_000; // millions

    if (topRisk === 'HIGH') { citiesHigh++; totalAtHighRisk += pop; }
    else if (topRisk === 'WATCH') { citiesWatch++; totalAtWatchRisk += pop; }

    // Simple trend proxy: HIGH with high score = escalating
    const dengueScore = s.dengue_score ?? 0;
    const trend = {
      dengue: dengueScore > 80 ? 'escalating' : dengueScore > 50 ? 'stable' : 'improving',
      malaria: (s.malaria_score ?? 0) > 80 ? 'escalating' : 'stable',
    };

    if (trend.dengue === 'escalating' || trend.malaria === 'escalating') {
      escalatingCities.push(s.city_name);
    }
    if (trend.dengue === 'improving' && trend.malaria !== 'escalating') {
      improvingCities.push(s.city_name);
    }

    return {
      id:     s.district_id ?? s.city_id ?? s.city_name,
      name:   s.city_name,
      country: s.country,
      dengue:  s.dengue_level as RiskLevel,
      malaria: s.malaria_level as RiskLevel,
      dengueScore:  s.dengue_score ?? 0,
      malariaScore: s.malaria_score ?? 0,
      population:   popRaw,
      populationFormatted: formatPop(popRaw),
      trend,
      climate: {
        avgTemp:        s.avg_temp ?? 0,
        avgRainfall:    s.avg_rainfall ?? 0,
        laggedRainfall: s.lagged_rainfall ?? 0,
        avgHumidity:    s.avg_humidity ?? 0,
      },
      who: null, // WHO data integration in future phase
    };
  });

  // Top 10 by combined risk score (population data not available at district level)
  const topRiskCities = [...cities]
    .filter(c => c.dengue === 'HIGH' || c.malaria === 'HIGH' || c.dengue === 'WATCH' || c.malaria === 'WATCH')
    .sort((a, b) => (b.dengueScore + b.malariaScore) - (a.dengueScore + a.malariaScore))
    .slice(0, 10)
    .map(c => ({
      id:      c.id,
      name:    c.name,
      country: c.country,
      population: c.population > 0 ? formatPop(c.population) : '—',
      dengue:  c.dengue,
      malaria: c.malaria,
    }));

  // Seasonal forecast for highest-burden regions (sample 3 key locations)
  const [saForecast, seaForecast, africaForecast] = await Promise.allSettled([
    getSeasonalForecast(20.59, 78.96),  // India centroid
    getSeasonalForecast(13.76, 100.50), // Bangkok (SE Asia)
    getSeasonalForecast(9.08, 8.68),    // Nigeria centroid
  ]);

  const seasonalSignals = [
    saForecast.status === 'fulfilled' && saForecast.value ? { region: 'South Asia', ...saForecast.value, summary: forecastSummary(saForecast.value) } : null,
    seaForecast.status === 'fulfilled' && seaForecast.value ? { region: 'Southeast Asia', ...seaForecast.value, summary: forecastSummary(seaForecast.value) } : null,
    africaForecast.status === 'fulfilled' && africaForecast.value ? { region: 'Sub-Saharan Africa', ...africaForecast.value, summary: forecastSummary(africaForecast.value) } : null,
  ].filter(Boolean);

  const result = {
    cities,
    seasonalForecasts: seasonalSignals,
    summary: {
      totalAtHighRisk:  Math.round(totalAtHighRisk * 10) / 10,
      totalAtWatchRisk: Math.round(totalAtWatchRisk * 10) / 10,
      citiesHigh,
      citiesWatch,
      escalatingCount: escalatingCities.length,
      improvingCount:  improvingCities.length,
      escalatingCities: escalatingCities.slice(0, 5),
      improvingCities:  improvingCities.slice(0, 5),
      snapshotCount: 2, // always "enough" since data is from DB
    },
    topRiskCities,
    computedAt: new Date().toISOString(),
    districtCount: latest.length,
  };

  return NextResponse.json(result);
}
