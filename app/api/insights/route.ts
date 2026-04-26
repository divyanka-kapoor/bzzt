import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

import { CITIES } from '@/lib/cities';
import { fetchClimateData } from '@/lib/open-meteo';
import { getPopulation, formatPopulation, computePopulationRisk } from '@/lib/population';
import { getWhoData, CITY_ISO3, formatCases } from '@/lib/who';
import { getCityTrend, getEscalatingCities, getImprovingCities, getSnapshotCount } from '@/lib/trend';

type RiskLevel = 'HIGH' | 'WATCH' | 'LOW';

function scoreDengue(temp: number, rain: number, laggedRain: number, humidity: number): { level: RiskLevel; score: number } {
  const met = [temp > 26, rain >= 8 && rain <= 60, laggedRain >= 8, humidity >= 60].filter(Boolean).length;
  if (met >= 3) return { level: 'HIGH', score: Math.round(75 + met * 5) };
  if (met >= 2) return { level: 'WATCH', score: Math.round(40 + met * 10) };
  return { level: 'LOW', score: Math.round(5 + Math.random() * 15) };
}
function scoreMalaria(temp: number, rain: number, laggedRain: number, humidity: number): { level: RiskLevel; score: number } {
  const met = [temp > 24, rain > 25, laggedRain > 25, humidity > 65].filter(Boolean).length;
  if (met >= 3) return { level: 'HIGH', score: Math.round(75 + met * 5) };
  if (met >= 2) return { level: 'WATCH', score: Math.round(40 + met * 10) };
  return { level: 'LOW', score: Math.round(5 + Math.random() * 15) };
}

const withTimeout = <T>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([p, new Promise<T>(res => setTimeout(() => res(fallback), ms))]);

let cache: object | null = null;
let cacheAt = 0;

export async function GET() {
  if (Date.now() - cacheAt < 5 * 60 * 1000 && cache) {
    return NextResponse.json(cache);
  }

  const climateDefault = { avgTemp: 0, avgRainfall: 0, laggedRainfall: 0, avgHumidity: 0, weeks: 0 };

  // Score all cities + fetch WHO data in parallel
  const cityResults = await Promise.all(
    CITIES.map(async (city) => {
      const iso3 = CITY_ISO3[city.id];
      const [climate, whoData] = await Promise.all([
        withTimeout(fetchClimateData(city.lat, city.lng), 8000, climateDefault),
        iso3 ? withTimeout(getWhoData(iso3), 6000, { countryIso3: iso3, dengueCases: [], malariaIncidence: [], dengueAvg5yr: 0, malariaAvg5yr: 0, fetched: false }) : Promise.resolve(null),
      ]);

      if (climate.weeks === 0) return null;

      const dengue  = scoreDengue(climate.avgTemp, climate.avgRainfall, climate.laggedRainfall, climate.avgHumidity);
      const malaria = scoreMalaria(climate.avgTemp, climate.avgRainfall, climate.laggedRainfall, climate.avgHumidity);
      const trend = getCityTrend(city.id);
      const population = getPopulation(city.id);

      // Early-warning ratio: how does current signal compare to historical baseline?
      const dengueSignalRatio = whoData && whoData.dengueAvg5yr > 0
        ? (dengue.score / 100) / Math.min(1, whoData.dengueAvg5yr / 500000)
        : null;

      return {
        id: city.id,
        name: city.name,
        country: city.country,
        lat: city.lat,
        lng: city.lng,
        dengue: dengue.level,
        malaria: malaria.level,
        dengueScore: dengue.score,
        malariaScore: malaria.score,
        population,
        populationFormatted: formatPopulation(city.id),
        trend,
        who: whoData ? {
          dengueAvg5yr: whoData.dengueAvg5yr,
          malariaAvg5yr: whoData.malariaAvg5yr,
          dengueAvgFormatted: formatCases(whoData.dengueAvg5yr),
          malariaAvgFormatted: whoData.malariaAvg5yr > 0 ? `${whoData.malariaAvg5yr.toFixed(1)}/1k` : '—',
          fetched: whoData.fetched,
          recentDengue: whoData.dengueCases.slice(0, 3),
        } : null,
        signalRatio: dengueSignalRatio,
        climate: {
          avgTemp: climate.avgTemp,
          avgRainfall: climate.avgRainfall,
          laggedRainfall: climate.laggedRainfall,
          avgHumidity: climate.avgHumidity,
        },
      };
    }),
  );

  const cities = cityResults.filter(Boolean) as NonNullable<typeof cityResults[0]>[];
  const popRisk = computePopulationRisk(cities);
  const escalating = getEscalatingCities();
  const improving  = getImprovingCities();
  const snapshots  = getSnapshotCount();

  // Top cities by risk significance (population × score)
  const topRiskCities = [...cities]
    .sort((a, b) => {
      const aScore = ((a.dengueScore + a.malariaScore) / 2) * a.population;
      const bScore = ((b.dengueScore + b.malariaScore) / 2) * b.population;
      return bScore - aScore;
    })
    .slice(0, 5)
    .map(c => ({ id: c.id, name: c.name, country: c.country, population: c.populationFormatted, dengue: c.dengue, malaria: c.malaria }));

  const result = {
    cities,
    summary: {
      totalAtHighRisk: popRisk.totalAtHighRisk,
      totalAtWatchRisk: popRisk.totalAtWatchRisk,
      citiesHigh: popRisk.citiesHigh,
      citiesWatch: popRisk.citiesWatch,
      escalatingCount: escalating.length,
      improvingCount: improving.length,
      escalatingCities: escalating,
      improvingCities: improving,
      snapshotCount: snapshots,
    },
    topRiskCities,
    computedAt: new Date().toISOString(),
  };

  cache = result;
  cacheAt = Date.now();
  return NextResponse.json(result);
}
