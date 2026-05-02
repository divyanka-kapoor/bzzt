import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

import { CITIES } from '@/lib/cities';
import { fetchClimateData } from '@/lib/open-meteo';
import { logRiskComputation } from '@/lib/openmetadata';
import { recordScan } from '@/lib/trend';
import { logPrediction, getAllEnrollments } from '@/lib/store';

type RiskLevel = 'HIGH' | 'WATCH' | 'LOW';

function scoreDengue(temp: number, rain: number, laggedRain: number, humidity: number): { level: RiskLevel; score: number } {
  const met = [temp > 26, rain >= 8 && rain <= 60, laggedRain >= 8, humidity >= 60].filter(Boolean).length;
  if (met >= 3) return { level: 'HIGH', score: Math.round(75 + met * 5 + Math.random() * 5) };
  if (met >= 2) return { level: 'WATCH', score: Math.round(40 + met * 10 + Math.random() * 5) };
  return { level: 'LOW', score: Math.round(5 + Math.random() * 15) };
}

function scoreMalaria(temp: number, rain: number, laggedRain: number, humidity: number): { level: RiskLevel; score: number } {
  const met = [temp > 24, rain > 25, laggedRain > 25, humidity > 65].filter(Boolean).length;
  if (met >= 3) return { level: 'HIGH', score: Math.round(75 + met * 5 + Math.random() * 5) };
  if (met >= 2) return { level: 'WATCH', score: Math.round(40 + met * 10 + Math.random() * 5) };
  return { level: 'LOW', score: Math.round(5 + Math.random() * 15) };
}

const withTimeout = <T>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([p, new Promise<T>(res => setTimeout(() => res(fallback), ms))]);

let lastScan: Array<{
  id: string; name: string; country: string; lat: number; lng: number;
  dengue: RiskLevel; malaria: RiskLevel; dengueScore: number; malariaScore: number; scannedAt: string;
}> = [];
let lastScanAt = 0;

export async function GET() {
  if (Date.now() - lastScanAt < 5 * 60 * 1000 && lastScan.length > 0) {
    return NextResponse.json({ cities: lastScan, cached: true });
  }

  const climateDefault = { avgTemp: 0, avgRainfall: 0, laggedRainfall: 0, avgHumidity: 0, weeks: 0 };

  // Include enrolled custom locations (rural villages, health clinics etc.)
  // that are NOT in the hardcoded city list. Deduplicate by proximity (~50km).
  const enrolledLocations = getAllEnrollments()
    .filter(e => e.lat && e.lng)
    .filter(e => !CITIES.some(c => Math.abs(c.lat - e.lat) < 0.5 && Math.abs(c.lng - e.lng) < 0.5))
    .reduce((acc, e) => {
      const duplicate = acc.some(a => Math.abs(a.lat - e.lat) < 0.45 && Math.abs(a.lng - e.lng) < 0.45);
      if (!duplicate) acc.push({ id: e.cityId, name: e.cityName, country: e.country, lat: e.lat, lng: e.lng });
      return acc;
    }, [] as typeof CITIES);

  const allLocations = [...CITIES, ...enrolledLocations];

  const results = (await Promise.all(
    allLocations.map(async (city) => {
      const climate = await withTimeout(fetchClimateData(city.lat, city.lng), 8000, climateDefault);
      if (climate.weeks === 0) return null; // timed out — exclude from results

      const dengue  = scoreDengue(climate.avgTemp, climate.avgRainfall, climate.laggedRainfall, climate.avgHumidity);
      const malaria = scoreMalaria(climate.avgTemp, climate.avgRainfall, climate.laggedRainfall, climate.avgHumidity);

      await logRiskComputation(city.id, city.name,
        { source: 'Open-Meteo API', lat: city.lat, lng: city.lng, avgTemp: climate.avgTemp, avgRainfall: climate.avgRainfall, laggedRainfall: climate.laggedRainfall, avgHumidity: climate.avgHumidity },
        { dengue: dengue.level, malaria: malaria.level, dengueScore: dengue.score, malariaScore: malaria.score },
      );

      // Log prospective prediction — validates against actual cases in 5 weeks
      const conditionsMet = [
        climate.avgTemp > 26, climate.avgRainfall >= 8 && climate.avgRainfall <= 60,
        climate.laggedRainfall >= 8, climate.avgHumidity >= 60,
      ].filter(Boolean).length;
      logPrediction({
        cityId: city.id, city: city.name, country: city.country,
        dengueLevel: dengue.level, malariaLevel: malaria.level,
        probabilityScore: Math.round((conditionsMet / 4) * 100),
        climate: { avgTemp: climate.avgTemp, avgRainfall: climate.avgRainfall, laggedRainfall: climate.laggedRainfall, avgHumidity: climate.avgHumidity },
      });

      return { id: city.id, name: city.name, country: city.country, lat: city.lat, lng: city.lng, dengue: dengue.level, malaria: malaria.level, dengueScore: dengue.score, malariaScore: malaria.score, scannedAt: new Date().toISOString() };
    }),
  )).filter(Boolean) as typeof lastScan;

  lastScan = results;
  lastScanAt = Date.now();
  recordScan(results);
  return NextResponse.json({ cities: results, cached: false });
}
