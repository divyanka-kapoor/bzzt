import { NextRequest, NextResponse } from 'next/server';
import { getCityById, geocodeCity } from '@/lib/cities';
import { fetchClimateData } from '@/lib/open-meteo';
import { logRiskComputation } from '@/lib/openmetadata';

type RiskLevel = 'HIGH' | 'WATCH' | 'LOW';

interface RiskResult {
  level: RiskLevel;
  score: number;
  factors: string[];
}

function scoreDengue(temp: number, rain: number, laggedRain: number, humidity: number): RiskResult {
  const factors: string[] = [];
  const conds = [
    [temp > 26,                    `Temp ${temp.toFixed(1)}°C (>26°C)`],
    [rain >= 8 && rain <= 60,      `Rain ${rain.toFixed(1)}mm (breeding range)`],
    [laggedRain >= 8,              `14-day rain ${laggedRain.toFixed(1)}mm (hatching)`],
    [humidity >= 60,               `Humidity ${humidity.toFixed(0)}% (vector survival)`],
  ] as [boolean, string][];
  const met = conds.filter(([c, label]) => { if (c) factors.push(label); return c; }).length;
  if (met >= 3) return { level: 'HIGH', score: Math.round(75 + met * 5 + Math.random() * 5), factors };
  if (met >= 2) return { level: 'WATCH', score: Math.round(40 + met * 10 + Math.random() * 5), factors };
  return { level: 'LOW', score: Math.round(5 + Math.random() * 15), factors: [] };
}

function scoreMalaria(temp: number, rain: number, laggedRain: number, humidity: number): RiskResult {
  const factors: string[] = [];
  const conds = [
    [temp > 24,        `Temp ${temp.toFixed(1)}°C (>24°C)`],
    [rain > 25,        `Rain ${rain.toFixed(1)}mm (pool formation)`],
    [laggedRain > 25,  `14-day rain ${laggedRain.toFixed(1)}mm (incubation)`],
    [humidity > 65,    `Humidity ${humidity.toFixed(0)}% (vector active)`],
  ] as [boolean, string][];
  const met = conds.filter(([c, label]) => { if (c) factors.push(label); return c; }).length;
  if (met >= 3) return { level: 'HIGH', score: Math.round(75 + met * 5 + Math.random() * 5), factors };
  if (met >= 2) return { level: 'WATCH', score: Math.round(40 + met * 10 + Math.random() * 5), factors };
  return { level: 'LOW', score: Math.round(5 + Math.random() * 15), factors: [] };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Accept cityId (known city) or free-text location (geocoded)
    let name: string, country: string, lat: number, lng: number;

    if (body.cityId) {
      const city = getCityById(body.cityId);
      if (!city) return NextResponse.json({ error: 'Unknown city' }, { status: 404 });
      ({ name, country, lat, lng } = city);
    } else if (body.location) {
      const geo = await geocodeCity(body.location);
      if (!geo) return NextResponse.json({ error: 'Location not found' }, { status: 404 });
      ({ name, country, lat, lng } = geo);
    } else {
      return NextResponse.json({ error: 'Provide cityId or location' }, { status: 400 });
    }

    const climate = await fetchClimateData(lat, lng);
    const dengue  = scoreDengue(climate.avgTemp, climate.avgRainfall, climate.laggedRainfall, climate.avgHumidity);
    const malaria = scoreMalaria(climate.avgTemp, climate.avgRainfall, climate.laggedRainfall, climate.avgHumidity);

    const lineageEvent = await logRiskComputation(
      body.cityId || name.toLowerCase().replace(/\s+/g, '-'),
      name,
      { source: 'Open-Meteo API', lat, lng, avgTemp: climate.avgTemp, avgRainfall: climate.avgRainfall, laggedRainfall: climate.laggedRainfall, avgHumidity: climate.avgHumidity },
      { dengue: dengue.level, malaria: malaria.level, dengueScore: dengue.score, malariaScore: malaria.score },
    );

    return NextResponse.json({ name, country, lat, lng, dengue, malaria, climate, lineageId: lineageEvent.id, qualityChecks: lineageEvent.qualityChecks });
  } catch (err) {
    console.error('Risk score error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
