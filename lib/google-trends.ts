/**
 * Google Trends symptom signal.
 *
 * Dengue/malaria/fever searches in local languages lead reported case counts
 * by 2-3 weeks — documented in peer-reviewed literature for Philippines,
 * Thailand, Brazil, and India.
 *
 * Uses the unofficial Google Trends JSON API (no key required).
 * Returns a 0-100 interest score (relative to peak over the period).
 *
 * Terms by country (local language + English):
 *   Nigeria:     "malaria symptoms", "fever treatment"
 *   India:       "dengue bukhar", "malaria lakshan", "dengue fever"
 *   Bangladesh:  "dengue jor", "malaria", "dengue"
 *   Philippines: "dengue sintomas", "malaria sintomas", "dengue"
 *   Brazil:      "dengue sintomas", "febre dengue", "malaria"
 *   Thailand:    "ไข้เลือดออก" (dengue), "มาลาเรีย" (malaria)
 */

const COUNTRY_TERMS: Record<string, { geo: string; terms: string[] }> = {
  NGA: { geo: 'NG', terms: ['malaria symptoms', 'fever treatment', 'mosquito bite'] },
  IND: { geo: 'IN', terms: ['dengue bukhar', 'malaria lakshan', 'dengue fever'] },
  BGD: { geo: 'BD', terms: ['dengue jor', 'malaria', 'dengue'] },
  PHL: { geo: 'PH', terms: ['dengue sintomas', 'dengue fever', 'malaria'] },
  BRA: { geo: 'BR', terms: ['dengue sintomas', 'febre dengue', 'malaria'] },
  THA: { geo: 'TH', terms: ['ไข้เลือดออก', 'dengue', 'malaria'] },
  IDN: { geo: 'ID', terms: ['gejala demam berdarah', 'dengue', 'malaria'] },
  VNM: { geo: 'VN', terms: ['sốt xuất huyết', 'dengue', 'malaria'] },
  KEN: { geo: 'KE', terms: ['malaria symptoms', 'dengue fever', 'mosquito'] },
  COL: { geo: 'CO', terms: ['síntomas dengue', 'dengue', 'malaria'] },
};

export interface TrendsSignal {
  countryCode: string;
  geo: string;
  averageInterest: number;  // 0-100
  trend: 'rising' | 'stable' | 'falling';
  fetchedAt: string;
}

const cache = new Map<string, { data: TrendsSignal; at: number }>();
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

export async function getTrendsSignal(iso3: string): Promise<TrendsSignal | null> {
  const cached = cache.get(iso3);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.data;

  const config = COUNTRY_TERMS[iso3];
  if (!config) return null;

  try {
    // Google Trends comparison API — returns relative interest 0-100
    const keyword = encodeURIComponent(config.terms[0]);
    const url = `https://trends.google.com/trends/api/explore?hl=en&tz=-330&req={"comparisonItem":[{"keyword":"${keyword}","geo":"${config.geo}","time":"today 3-m"}],"category":0,"property":""}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BzztHealthBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const text = await res.text();
    // Google Trends prepends ")]}',\n" — strip it
    const json = JSON.parse(text.replace(/^\)\]\}',\n/, ''));
    const widget = json?.widgets?.find((w: { id: string }) => w.id === 'TIMESERIES');
    if (!widget) return null;

    // Fetch the actual timeseries data
    const token   = widget.token;
    const reqStr  = encodeURIComponent(JSON.stringify(widget.request));
    const tsUrl   = `https://trends.google.com/trends/api/widgetdata/multiline?hl=en&tz=-330&req=${reqStr}&token=${token}&geo=${config.geo}`;

    const tsRes = await fetch(tsUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BzztHealthBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    });

    if (!tsRes.ok) return null;

    const tsText = await tsRes.text();
    const tsJson = JSON.parse(tsText.replace(/^\)\]\}',\n/, ''));
    const values: number[] = tsJson?.default?.timelineData?.map((d: { value: number[] }) => d.value[0]) ?? [];

    if (!values.length) return null;

    const avg   = values.reduce((a, b) => a + b, 0) / values.length;
    const last4 = values.slice(-4);
    const prev4 = values.slice(-8, -4);
    const lastAvg = last4.reduce((a, b) => a + b, 0) / Math.max(last4.length, 1);
    const prevAvg = prev4.reduce((a, b) => a + b, 0) / Math.max(prev4.length, 1);

    const trend: TrendsSignal['trend'] = lastAvg > prevAvg * 1.15 ? 'rising'
      : lastAvg < prevAvg * 0.85 ? 'falling' : 'stable';

    const signal: TrendsSignal = {
      countryCode:     iso3,
      geo:             config.geo,
      averageInterest: Math.round(avg),
      trend,
      fetchedAt:       new Date().toISOString(),
    };

    cache.set(iso3, { data: signal, at: Date.now() });
    return signal;
  } catch {
    return null;
  }
}

export function getTrendsRiskBoost(signal: TrendsSignal | null): number {
  if (!signal) return 0;
  if (signal.trend === 'rising' && signal.averageInterest > 50) return 1;
  if (signal.trend === 'rising') return 0.5;
  return 0;
}
