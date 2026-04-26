import { NextRequest, NextResponse } from 'next/server';
import { getLatLngForPincode } from '@/lib/geocode';
import { fetchClimateData } from '@/lib/open-meteo';
import { logRiskComputation } from '@/lib/openmetadata';

type RiskLevel = 'HIGH' | 'WATCH' | 'LOW';

interface RiskResult {
  level: RiskLevel;
  score: number;
  factors: string[];
}

function scoreDengue(temp: number, rainfall: number, laggedRainfall: number, humidity: number): RiskResult {
  const factors: string[] = [];

  // WHO/ECDC thresholds: dengue vector Aedes aegypti thrives 26–34°C
  const hotEnough = temp > 26;
  // Breeding: moderate rain creates pools, excess washes them away
  const breedingRain = rainfall >= 8 && rainfall <= 60;
  // Lagged: eggs laid 10–14 days ago are hatching now
  const laggedBreeding = laggedRainfall >= 8;
  // Humidity sustains adult survival
  const humid = humidity >= 60;

  if (hotEnough) factors.push(`Temp ${temp.toFixed(1)}°C (>26°C)`);
  if (breedingRain) factors.push(`Rainfall ${rainfall.toFixed(1)}mm (breeding range)`);
  if (laggedBreeding) factors.push(`14-day rain ${laggedRainfall.toFixed(1)}mm (hatching now)`);
  if (humid) factors.push(`Humidity ${humidity.toFixed(0)}% (vector survival)`);

  const met = [hotEnough, breedingRain, laggedBreeding, humid].filter(Boolean).length;
  if (met === 4) return { level: 'HIGH', score: Math.round(85 + Math.random() * 15), factors };
  if (met >= 2) return { level: 'WATCH', score: Math.round(45 + met * 10 + Math.random() * 10), factors };
  return { level: 'LOW', score: Math.round(10 + Math.random() * 15), factors: [] };
}

function scoreMalaria(temp: number, rainfall: number, laggedRainfall: number, humidity: number): RiskResult {
  const factors: string[] = [];

  // Anopheles mosquito: slower maturation, needs 24°C+
  const hotEnough = temp > 24;
  // Heavy rain creates breeding sites: pools, puddles
  const heavyRain = rainfall > 25;
  // Lagged: Plasmodium incubation 10–12 days
  const laggedRisk = laggedRainfall > 25;
  const humid = humidity > 65;

  if (hotEnough) factors.push(`Temp ${temp.toFixed(1)}°C (>24°C)`);
  if (heavyRain) factors.push(`Rainfall ${rainfall.toFixed(1)}mm (pool formation)`);
  if (laggedRisk) factors.push(`14-day rain ${laggedRainfall.toFixed(1)}mm (Plasmodium incubation)`);
  if (humid) factors.push(`Humidity ${humidity.toFixed(0)}% (vector active)`);

  const met = [hotEnough, heavyRain, laggedRisk, humid].filter(Boolean).length;
  if (met === 4) return { level: 'HIGH', score: Math.round(80 + Math.random() * 20), factors };
  if (met >= 2) return { level: 'WATCH', score: Math.round(40 + met * 10 + Math.random() * 10), factors };
  return { level: 'LOW', score: Math.round(10 + Math.random() * 15), factors: [] };
}

export async function POST(req: NextRequest) {
  try {
    const { pincode } = await req.json();
    if (!pincode) return NextResponse.json({ error: 'Missing pincode' }, { status: 400 });

    const coord = getLatLngForPincode(pincode);
    if (!coord) return NextResponse.json({ error: 'Unknown pincode' }, { status: 404 });

    const climate = await fetchClimateData(coord.lat, coord.lng);

    const dengue  = scoreDengue(climate.avgTemp, climate.avgRainfall, climate.laggedRainfall, climate.avgHumidity);
    const malaria = scoreMalaria(climate.avgTemp, climate.avgRainfall, climate.laggedRainfall, climate.avgHumidity);

    // Log to OpenMetadata (async, non-blocking for response)
    const lineageEvent = await logRiskComputation(
      pincode,
      coord.city,
      {
        source: 'Open-Meteo API',
        lat: coord.lat,
        lng: coord.lng,
        avgTemp: climate.avgTemp,
        avgRainfall: climate.avgRainfall,
        laggedRainfall: climate.laggedRainfall,
        avgHumidity: climate.avgHumidity,
      },
      {
        dengue: dengue.level,
        malaria: malaria.level,
        dengueScore: dengue.score,
        malariaScore: malaria.score,
      },
    );

    return NextResponse.json({
      pincode,
      city: coord.city,
      dengue,
      malaria,
      climate,
      lineageId: lineageEvent.id,
      qualityChecks: lineageEvent.qualityChecks,
    });
  } catch (err) {
    console.error('Risk score error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
