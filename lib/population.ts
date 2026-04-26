// Metro area populations (2024 estimates, millions)
export const CITY_POPULATION: Record<string, { population: number; unit: string }> = {
  'jakarta':        { population: 34.5,  unit: 'M' },
  'bangkok':        { population: 17.1,  unit: 'M' },
  'manila':         { population: 24.0,  unit: 'M' },
  'ho-chi-minh':    { population: 9.3,   unit: 'M' },
  'kuala-lumpur':   { population: 8.4,   unit: 'M' },
  'dhaka':          { population: 22.4,  unit: 'M' },
  'mumbai':         { population: 20.7,  unit: 'M' },
  'delhi':          { population: 32.9,  unit: 'M' },
  'kolkata':        { population: 14.9,  unit: 'M' },
  'karachi':        { population: 17.2,  unit: 'M' },
  'lagos':          { population: 15.9,  unit: 'M' },
  'kinshasa':       { population: 17.1,  unit: 'M' },
  'dar-es-salaam':  { population: 7.4,   unit: 'M' },
  'nairobi':        { population: 5.1,   unit: 'M' },
  'accra':          { population: 3.7,   unit: 'M' },
  'sao-paulo':      { population: 22.4,  unit: 'M' },
  'rio-de-janeiro': { population: 13.7,  unit: 'M' },
  'bogota':         { population: 11.3,  unit: 'M' },
  'lima':           { population: 11.2,  unit: 'M' },
  'cairo':          { population: 21.3,  unit: 'M' },
  'london':         { population: 9.7,   unit: 'M' },
  'new-york':       { population: 18.9,  unit: 'M' },
};

export function getPopulation(cityId: string): number {
  return CITY_POPULATION[cityId]?.population ?? 0;
}

export function formatPopulation(cityId: string): string {
  const p = CITY_POPULATION[cityId];
  if (!p) return '—';
  return `${p.population}M`;
}

export interface PopulationRiskSummary {
  totalAtHighRisk: number;   // millions
  totalAtWatchRisk: number;
  citiesHigh: number;
  citiesWatch: number;
}

export function computePopulationRisk(
  cities: Array<{ id: string; dengue: string; malaria: string }>,
): PopulationRiskSummary {
  let high = 0, watch = 0, cHigh = 0, cWatch = 0;
  for (const c of cities) {
    const pop = getPopulation(c.id);
    const isHigh  = c.dengue === 'HIGH' || c.malaria === 'HIGH';
    const isWatch = !isHigh && (c.dengue === 'WATCH' || c.malaria === 'WATCH');
    if (isHigh)  { high  += pop; cHigh++;  }
    if (isWatch) { watch += pop; cWatch++; }
  }
  return { totalAtHighRisk: high, totalAtWatchRisk: watch, citiesHigh: cHigh, citiesWatch: cWatch };
}
