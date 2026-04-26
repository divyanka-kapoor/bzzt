type RiskLevel = 'HIGH' | 'WATCH' | 'LOW';
export type TrendDir = 'escalating' | 'improving' | 'stable' | 'new';

interface ScanSnapshot {
  timestamp: number;
  cities: Map<string, { dengue: RiskLevel; malaria: RiskLevel; dengueScore: number; malariaScore: number }>;
}

const history: ScanSnapshot[] = [];

const LEVEL: Record<RiskLevel, number> = { LOW: 0, WATCH: 1, HIGH: 2 };

export function recordScan(cities: Array<{
  id: string; dengue: RiskLevel; malaria: RiskLevel; dengueScore: number; malariaScore: number;
}>) {
  history.push({
    timestamp: Date.now(),
    cities: new Map(cities.map(c => [c.id, { dengue: c.dengue, malaria: c.malaria, dengueScore: c.dengueScore, malariaScore: c.malariaScore }])),
  });
  if (history.length > 12) history.shift();
}

export function getTrend(cityId: string, disease: 'dengue' | 'malaria'): TrendDir {
  if (history.length < 2) return 'new';
  const cur  = history[history.length - 1].cities.get(cityId);
  const prev = history[history.length - 2].cities.get(cityId);
  if (!cur || !prev) return 'new';
  const d = LEVEL[cur[disease]] - LEVEL[prev[disease]];
  if (d > 0) return 'escalating';
  if (d < 0) return 'improving';
  // Score delta as secondary signal when level is same
  const scoreDelta = cur[`${disease}Score`] - prev[`${disease}Score`];
  if (scoreDelta > 8)  return 'escalating';
  if (scoreDelta < -8) return 'improving';
  return 'stable';
}

export function getCityTrend(cityId: string): { dengue: TrendDir; malaria: TrendDir } {
  return { dengue: getTrend(cityId, 'dengue'), malaria: getTrend(cityId, 'malaria') };
}

export function getEscalatingCities(): string[] {
  if (history.length < 2) return [];
  const latest = history[history.length - 1];
  const ids: string[] = [];
  latest.cities.forEach((_, id) => {
    if (getTrend(id, 'dengue') === 'escalating' || getTrend(id, 'malaria') === 'escalating') ids.push(id);
  });
  return ids;
}

export function getImprovingCities(): string[] {
  if (history.length < 2) return [];
  const latest = history[history.length - 1];
  const ids: string[] = [];
  latest.cities.forEach((_, id) => {
    if (getTrend(id, 'dengue') === 'improving' && getTrend(id, 'malaria') === 'improving') ids.push(id);
  });
  return ids;
}

export function getSnapshotCount(): number {
  return history.length;
}
