import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

import { CITIES } from '@/lib/cities';
import { fetchClimateData } from '@/lib/open-meteo';
import { logRiskComputation } from '@/lib/openmetadata';

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

  const results = (await Promise.all(
    CITIES.map(async (city) => {
      const climate = await withTimeout(fetchClimateData(city.lat, city.lng), 8000, climateDefault);
      if (climate.weeks === 0) return null; // timed out — exclude from results

      const dengue  = scoreDengue(climate.avgTemp, climate.avgRainfall, climate.laggedRainfall, climate.avgHumidity);
      const malaria = scoreMalaria(climate.avgTemp, climate.avgRainfall, climate.laggedRainfall, climate.avgHumidity);

      await logRiskComputation(city.id, city.name,
        { source: 'Open-Meteo API', lat: city.lat, lng: city.lng, avgTemp: climate.avgTemp, avgRainfall: climate.avgRainfall, laggedRainfall: climate.laggedRainfall, avgHumidity: climate.avgHumidity },
        { dengue: dengue.level, malaria: malaria.level, dengueScore: dengue.score, malariaScore: malaria.score },
      );

      return { id: city.id, name: city.name, country: city.country, lat: city.lat, lng: city.lng, dengue: dengue.level, malaria: malaria.level, dengueScore: dengue.score, malariaScore: malaria.score, scannedAt: new Date().toISOString() };
    }),
  )).filter(Boolean) as typeof lastScan;

  lastScan = results;
  lastScanAt = Date.now();
  return NextResponse.json({ cities: results, cached: false });
}
