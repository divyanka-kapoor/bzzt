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

// Score-based trend inference — works immediately without historical data.
// A dengue score of 88 at HIGH is clearly escalating toward peak; 76 is stable HIGH.
// Used as fallback when fewer than 2 snapshots are in history.
function inferTrendFromScore(score: number, level: RiskLevel): TrendDir {
  if (level === 'HIGH'  && score >= 85) return 'escalating';
  if (level === 'HIGH'  && score < 80)  return 'stable';
  if (level === 'WATCH' && score >= 62) return 'escalating';
  if (level === 'WATCH' && score <= 48) return 'improving';
  if (level === 'LOW'   && score <= 15) return 'improving';
  return 'stable';
}

export function getTrend(
  cityId: string,
  disease: 'dengue' | 'malaria',
  currentScore?: number,
  currentLevel?: RiskLevel,
): TrendDir {
  // Real historical comparison when we have 2+ snapshots
  if (history.length >= 2) {
    const cur  = history[history.length - 1].cities.get(cityId);
    const prev = history[history.length - 2].cities.get(cityId);
    if (cur && prev) {
      const levelDiff = LEVEL[cur[disease]] - LEVEL[prev[disease]];
      if (levelDiff > 0) return 'escalating';
      if (levelDiff < 0) return 'improving';
      const scoreDelta = cur[`${disease}Score`] - prev[`${disease}Score`];
      if (scoreDelta > 8)  return 'escalating';
      if (scoreDelta < -8) return 'improving';
      return 'stable';
    }
  }

  // Score-based inference for first load or fresh serverless instances
  if (currentScore !== undefined && currentLevel !== undefined) {
    return inferTrendFromScore(currentScore, currentLevel);
  }

  return 'new';
}

export function getCityTrend(
  cityId: string,
  current?: { dengueScore: number; malariaScore: number; dengue: RiskLevel; malaria: RiskLevel },
): { dengue: TrendDir; malaria: TrendDir } {
  return {
    dengue:  getTrend(cityId, 'dengue',  current?.dengueScore,  current?.dengue),
    malaria: getTrend(cityId, 'malaria', current?.malariaScore, current?.malaria),
  };
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
