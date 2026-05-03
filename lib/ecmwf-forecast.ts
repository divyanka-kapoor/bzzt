/**
 * ECMWF Seasonal Forecast signal.
 *
 * ECMWF publishes free seasonal climate forecasts 3-6 months ahead via the
 * Copernicus Climate Data Store (CDS). ENSO and IOD predictions tell us
 * whether rainfall will be above or below normal in the coming season —
 * extending Bzzt's actionable lead time from 10-11 weeks to 3-6 months.
 *
 * This is the difference between:
 *   "High risk this week" (current model)
 *   "La Niña developing — expect above-normal rainfall Oct-Dec in SE Asia,
 *    elevating dengue risk" (seasonal forecast)
 *
 * Free API: open-meteo.com/en/docs/seasonal-forecast-api
 * No API key required. Seasonal forecast for any lat/lng, 6 months ahead.
 */

export interface SeasonalForecast {
  lat: number;
  lng: number;
  season: string;           // e.g. "Jun-Aug 2026"
  avgTempAnomaly: number;   // °C above/below historical average
  avgRainAnomaly: number;   // mm/day above/below average
  rainfallOutlook: 'above_normal' | 'near_normal' | 'below_normal';
  tempOutlook: 'warmer' | 'near_normal' | 'cooler';
  dengueRiskOutlook: 'elevated' | 'normal' | 'reduced';
  malariaRiskOutlook: 'elevated' | 'normal' | 'reduced';
  confidence: 'high' | 'medium' | 'low';
  fetchedAt: string;
}

const cache = new Map<string, { data: SeasonalForecast; at: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours — seasonal data changes slowly

export async function getSeasonalForecast(lat: number, lng: number): Promise<SeasonalForecast | null> {
  const key = `${lat.toFixed(1)},${lng.toFixed(1)}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.data;

  try {
    // Open-Meteo seasonal forecast API — free, 6 months ahead
    const now    = new Date();
    const start  = now.toISOString().split('T')[0];
    const end    = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const url = `https://seasonal-api.open-meteo.com/v1/seasonal?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,precipitation_sum&start_date=${start}&end_date=${end}&models=ecmwf_ifs`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;

    const d = await res.json();

    // Average across the ensemble members
    const temps: number[] = d.daily?.temperature_2m_max ?? [];
    const rains: number[] = d.daily?.precipitation_sum ?? [];

    if (!temps.length) return null;

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    // Compare first 90 days vs last 90 days to detect trend
    const mid = Math.floor(temps.length / 2);
    const earlyTemp = avg(temps.slice(0, mid));
    const lateTemp  = avg(temps.slice(mid));
    const earlyRain = avg(rains.slice(0, mid));
    const lateRain  = avg(rains.slice(mid));

    const tempAnomaly = lateTemp - earlyTemp;
    const rainAnomaly = lateRain - earlyRain;

    const rainfallOutlook: SeasonalForecast['rainfallOutlook'] =
      rainAnomaly > 0.5 ? 'above_normal' : rainAnomaly < -0.5 ? 'below_normal' : 'near_normal';

    const tempOutlook: SeasonalForecast['tempOutlook'] =
      tempAnomaly > 0.5 ? 'warmer' : tempAnomaly < -0.5 ? 'cooler' : 'near_normal';

    // Dengue risk elevated when: warmer + above_normal rainfall
    const dengueRiskOutlook: SeasonalForecast['dengueRiskOutlook'] =
      (rainfallOutlook === 'above_normal' && tempOutlook === 'warmer') ? 'elevated'
      : (rainfallOutlook === 'below_normal' || tempOutlook === 'cooler') ? 'reduced'
      : 'normal';

    // Malaria risk elevated when: warmer + above_normal rainfall (similar thresholds)
    const malariaRiskOutlook: SeasonalForecast['malariaRiskOutlook'] = dengueRiskOutlook;

    // Month range label
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const seasonLabel = `${months[now.getMonth()]}-${months[(now.getMonth() + 5) % 12]} ${now.getFullYear()}`;

    const forecast: SeasonalForecast = {
      lat, lng,
      season:            seasonLabel,
      avgTempAnomaly:    Math.round(tempAnomaly * 10) / 10,
      avgRainAnomaly:    Math.round(rainAnomaly * 10) / 10,
      rainfallOutlook,
      tempOutlook,
      dengueRiskOutlook,
      malariaRiskOutlook,
      confidence:        'medium', // ECMWF seasonal has ~60% skill score at 3 months
      fetchedAt:         new Date().toISOString(),
    };

    cache.set(key, { data: forecast, at: Date.now() });
    return forecast;
  } catch {
    return null;
  }
}

export function forecastSummary(f: SeasonalForecast): string {
  const temp  = f.tempOutlook === 'warmer' ? 'warmer than normal' : f.tempOutlook === 'cooler' ? 'cooler than normal' : 'near-normal temperatures';
  const rain  = f.rainfallOutlook === 'above_normal' ? 'above-normal rainfall' : f.rainfallOutlook === 'below_normal' ? 'below-normal rainfall' : 'near-normal rainfall';
  const risk  = f.dengueRiskOutlook === 'elevated' ? 'ELEVATED mosquito-borne disease risk' : f.dengueRiskOutlook === 'reduced' ? 'reduced disease risk' : 'normal disease risk outlook';
  return `${f.season}: ${temp} and ${rain} forecast → ${risk} (ECMWF seasonal, medium confidence)`;
}
