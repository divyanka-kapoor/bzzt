import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getAllPincodes } from '@/lib/geocode';
import { fetchClimateData } from '@/lib/open-meteo';
import { logRiskComputation } from '@/lib/openmetadata';

type RiskLevel = 'HIGH' | 'WATCH' | 'LOW';

function scoreDengue(temp: number, rain: number, laggedRain: number, humidity: number): { level: RiskLevel; score: number } {
  const met = [temp > 26, rain >= 8 && rain <= 60, laggedRain >= 8, humidity >= 60].filter(Boolean).length;
  if (met === 4) return { level: 'HIGH', score: Math.round(85 + Math.random() * 15) };
  if (met >= 2) return { level: 'WATCH', score: Math.round(45 + met * 10) };
  return { level: 'LOW', score: Math.round(10 + Math.random() * 15) };
}

function scoreMalaria(temp: number, rain: number, laggedRain: number, humidity: number): { level: RiskLevel; score: number } {
  const met = [temp > 24, rain > 25, laggedRain > 25, humidity > 65].filter(Boolean).length;
  if (met === 4) return { level: 'HIGH', score: Math.round(80 + Math.random() * 20) };
  if (met >= 2) return { level: 'WATCH', score: Math.round(40 + met * 10) };
  return { level: 'LOW', score: Math.round(10 + Math.random() * 15) };
}

let lastScan: Array<{ pincode: string; city: string; lat: number; lng: number; dengue: RiskLevel; malaria: RiskLevel; dengueScore: number; malariaScore: number; scannedAt: string }> = [];
let lastScanAt = 0;

export async function GET() {
  // Cache scan results for 5 minutes
  if (Date.now() - lastScanAt < 5 * 60 * 1000 && lastScan.length > 0) {
    return NextResponse.json({ cities: lastScan, cached: true });
  }

  const pincodes = getAllPincodes();

  const results = await Promise.all(
    pincodes.map(async ({ pincode, lat, lng, city }) => {
      const climate = await fetchClimateData(lat, lng);
      const dengue  = scoreDengue(climate.avgTemp, climate.avgRainfall, climate.laggedRainfall, climate.avgHumidity);
      const malaria = scoreMalaria(climate.avgTemp, climate.avgRainfall, climate.laggedRainfall, climate.avgHumidity);

      await logRiskComputation(pincode, city,
        { source: 'Open-Meteo API', lat, lng, avgTemp: climate.avgTemp, avgRainfall: climate.avgRainfall, laggedRainfall: climate.laggedRainfall, avgHumidity: climate.avgHumidity },
        { dengue: dengue.level, malaria: malaria.level, dengueScore: dengue.score, malariaScore: malaria.score },
      );

      return { pincode, city, lat, lng, dengue: dengue.level, malaria: malaria.level, dengueScore: dengue.score, malariaScore: malaria.score, scannedAt: new Date().toISOString() };
    }),
  );

  lastScan = results;
  lastScanAt = Date.now();

  return NextResponse.json({ cities: results, cached: false });
}
