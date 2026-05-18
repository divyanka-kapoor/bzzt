'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatDistrictName } from '@/lib/format';

type RiskLevel = 'HIGH' | 'WATCH' | 'LOW';
type TrendDir  = 'escalating' | 'improving' | 'stable' | 'new';

interface CityInsight {
  id: string; name: string; country: string;
  dengue: RiskLevel; malaria: RiskLevel;
  dengueScore: number; malariaScore: number;
  population: number; populationFormatted: string;
  trend: { dengue: TrendDir; malaria: TrendDir };
  who: {
    dengueAvg5yr: number; dengueAvgFormatted: string;
    malariaAvg5yr: number; malariaAvgFormatted: string;
    fetched: boolean;
  } | null;
  climate: { avgTemp: number; avgRainfall: number; laggedRainfall: number; avgHumidity: number };
}

interface Summary {
  totalAtHighRisk: number; totalAtWatchRisk: number;
  citiesHigh: number; citiesWatch: number;
  escalatingCount: number; improvingCount: number;
  escalatingCities: string[]; improvingCities: string[];
  snapshotCount: number;
}

interface InsightsData {
  cities: CityInsight[];
  summary: Summary;
  topRiskCities: Array<{ id: string; name: string; country: string; population: string; dengue: RiskLevel; malaria: RiskLevel }>;
  computedAt: string;
}

const RISK_COLOR: Record<RiskLevel, string> = { HIGH: '#F87171', WATCH: '#FCD34D', LOW: '#34D399' };
const RISK_BG:    Record<RiskLevel, string> = { HIGH: 'rgba(248,113,113,0.1)', WATCH: 'rgba(252,211,77,0.1)', LOW: 'rgba(52,211,153,0.08)' };

const TREND_ICON:  Record<TrendDir, string> = { escalating: '↑', improving: '↓', stable: '→', new: '·' };
const TREND_COLOR: Record<TrendDir, string> = { escalating: '#F87171', improving: '#34D399', stable: '#9ca3af', new: '#888888' };
const TREND_LABEL: Record<TrendDir, string> = {
  escalating: 'Escalating — risk rising',
  improving:  'Improving — risk falling',
  stable:     'Stable — risk unchanged',
  new:        'New — first observation',
};

function RiskBadge({ level, size = 'sm' }: { level: RiskLevel; size?: 'sm' | 'xs' }) {
  const cls = size === 'xs' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-0.5';
  return (
    <span className={`${cls} rounded font-bold`} style={{ color: RISK_COLOR[level], background: RISK_BG[level], border: `1px solid ${RISK_COLOR[level]}30` }}>
      {level}
    </span>
  );
}

function TrendBadge({ dir }: { dir: TrendDir }) {
  return (
    <span className="text-xs font-bold" style={{ color: TREND_COLOR[dir] }} title={TREND_LABEL[dir]}>
      {TREND_ICON[dir]}
    </span>
  );
}

function StatCard({ label, value, sub, onClick, active }: { label: string; value: string; sub?: string; onClick?: () => void; active?: boolean }) {
  return (
    <div
      className={`border rounded-xl p-4 transition-colors ${onClick ? 'cursor-pointer' : ''} ${
        active
          ? 'bg-white/[0.06] border-white/25'
          : 'bg-white/[0.03] border-white/[0.06] hover:border-white/15'
      }`}
      onClick={onClick}
    >
      <p className="text-xs text-white/65 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{sub}</p>}
      {onClick && <p className="text-xs text-white/30 mt-1">{active ? 'click to clear filter ×' : 'click to filter grid ↓'}</p>}
    </div>
  );
}

function CityCard({ city }: { city: CityInsight }) {
  const topRisk: RiskLevel = city.dengue === 'HIGH' || city.malaria === 'HIGH' ? 'HIGH'
    : city.dengue === 'WATCH' || city.malaria === 'WATCH' ? 'WATCH' : 'LOW';

  // Determine which diseases are elevated
  const diseases = [
    city.dengue !== 'LOW' && 'Dengue',
    city.malaria !== 'LOW' && 'Malaria',
  ].filter(Boolean).join(' · ') || 'Low risk';

  // Climate as a readable sentence
  const climateStr = [
    `${city.climate.avgTemp.toFixed(0)}°C`,
    city.climate.avgRainfall > 0 ? `${city.climate.avgRainfall.toFixed(0)}mm rain` : 'no rain',
    `${city.climate.avgHumidity.toFixed(0)}% humid`,
  ].join(' · ');

  // Primary score (highest risk disease)
  const primaryScore = city.dengue === topRisk ? city.dengueScore : city.malariaScore;
  const trend = city.dengue === topRisk ? city.trend.dengue : city.trend.malaria;

  return (
    <div className="bg-white/[0.02] border rounded-xl p-4 flex flex-col gap-3 hover:border-white/15 transition-colors"
      style={{ borderColor: `${RISK_COLOR[topRisk]}30` }}>

      {/* Row 1: Name + risk badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white leading-tight truncate">{formatDistrictName(city.name)}</p>
          <p className="text-xs text-white/50">{city.country}{city.population > 0 ? ` · ${city.populationFormatted}` : ''}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <TrendBadge dir={trend} />
          <RiskBadge level={topRisk} size="sm" />
        </div>
      </div>

      {/* Row 2: Disease breakdown — compact */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/50">{diseases}</span>
        <span className="text-white/70 font-medium tabular-nums" title="Outbreak probability score (0–100)">
          {primaryScore}%
        </span>
      </div>

      {/* Row 3: Climate signal — readable sentence */}
      <p className="text-xs text-white/35 border-t border-white/[0.05] pt-2 leading-relaxed">
        {climateStr}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function IntelligenceTab() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [accuracy, setAccuracy] = useState<{ totalPredictions: number; accuracy: number | null; accuracyN: number; nextValidationDue: string | null; loggingSince: string | null; note: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('—');
  const [sortBy, setSortBy] = useState<'risk' | 'population' | 'trend'>('risk');
  const [trendFilter, setTrendFilter] = useState<'escalating' | 'improving' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [insightsRes, accuracyRes] = await Promise.all([
        fetch('/api/insights'),
        fetch('/api/accuracy'),
      ]);
      if (insightsRes.ok) setData(await insightsRes.json());
      if (accuracyRes.ok) setAccuracy(await accuracyRes.json());
      setLastUpdated(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  const filtered = data ? (trendFilter
    ? data.cities.filter(c => c.trend.dengue === trendFilter || c.trend.malaria === trendFilter)
    : data.cities
  ) : [];

  const sorted = data ? [...filtered].sort((a, b) => {
    if (sortBy === 'population') return b.population - a.population || (b.dengueScore + b.malariaScore) - (a.dengueScore + a.malariaScore);
    if (sortBy === 'trend') {
      const tScore = (c: CityInsight) =>
        (c.trend.dengue === 'escalating' ? 2 : c.trend.dengue === 'improving' ? -1 : 0) +
        (c.trend.malaria === 'escalating' ? 2 : c.trend.malaria === 'improving' ? -1 : 0);
      return tScore(b) - tScore(a);
    }
    // sort by combined risk score
    const riskOrder = { HIGH: 3, WATCH: 2, LOW: 1 } as Record<string, number>;
    const topA = Math.max(riskOrder[a.dengue] ?? 0, riskOrder[a.malaria] ?? 0);
    const topB = Math.max(riskOrder[b.dengue] ?? 0, riskOrder[b.malaria] ?? 0);
    return topB - topA || (b.dengueScore + b.malariaScore) - (a.dengueScore + a.malariaScore);
  }) : [];

  if (!data && loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-5 h-5 border border-white/20 rounded-full animate-pulse mx-auto" />
          <p className="text-white/65 text-xs">Loading intelligence layer…</p>
          <p className="text-white/60 text-xs">Loading district risk data across 26 countries…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Summary stats */}
      {data && (
        <>
          {/* Prospective validation accuracy strip */}
          {accuracy && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center gap-6 text-xs flex-wrap">
              <div>
                <span className="text-white/50">Predictions logged </span>
                <span className="text-white/80 font-bold">{accuracy.totalPredictions.toLocaleString()}</span>
              </div>
              {accuracy.accuracy !== null ? (
                <div>
                  <span className="text-white/50">Prospective accuracy </span>
                  <span className="font-bold" style={{ color: accuracy.accuracy >= 70 ? '#34D399' : '#FCD34D' }}>
                    {accuracy.accuracy}%
                  </span>
                  <span className="text-white/40 ml-1">(n={accuracy.accuracyN})</span>
                </div>
              ) : (
                <div className="text-white/50">
                  First validation due{' '}
                  {accuracy.nextValidationDue
                    ? new Date(accuracy.nextValidationDue).toLocaleDateString()
                    : 'in 5 weeks'}
                </div>
              )}
              {accuracy.loggingSince && (
                <div className="text-white/40">
                  Logging since {new Date(accuracy.loggingSince).toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Regions at HIGH"
              value={String(data.summary.citiesHigh)}
              sub="flagged HIGH risk"
            />
            <StatCard
              label="Regions at WATCH"
              value={String(data.summary.citiesWatch)}
              sub="elevated conditions"
            />
            <StatCard
              label="Escalating now"
              active={trendFilter === 'escalating'}
              value={String(data.summary.escalatingCount)}
              sub={(() => {
                const names = data.summary.escalatingCities.map(formatDistrictName);
                const total = data.summary.escalatingCount;
                if (names.length === 0) return 'none';
                if (total <= names.length) return names.join(', ');
                return `${names.join(', ')} +${total - names.length} more`;
              })()}
              onClick={() => {
                setTrendFilter(f => f === 'escalating' ? null : 'escalating');
                document.getElementById('city-grid')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
            <StatCard
              label="Improving"
              active={trendFilter === 'improving'}
              value={String(data.summary.improvingCount)}
              sub={(() => {
                const names = data.summary.improvingCities.map(formatDistrictName);
                const total = data.summary.improvingCount;
                if (names.length === 0) return 'none';
                if (total <= names.length) return names.join(', ');
                return `${names.join(', ')} +${total - names.length} more`;
              })()}
              onClick={() => {
                setTrendFilter(f => f === 'improving' ? null : 'improving');
                document.getElementById('city-grid')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </div>

          {/* Top risk cities */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <p className="text-xs text-white/65 uppercase tracking-wider mb-3">Highest risk regions — by score</p>
            <div className="space-y-2">
              {data.topRiskCities.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/60 w-4">{i + 1}</span>
                    <span className="text-white/70">{formatDistrictName(c.name)}</span>
                    <span className="text-xs text-white/65">{c.country}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60">{c.population}</span>
                    <RiskBadge level={c.dengue} size="xs" />
                    <RiskBadge level={c.malaria} size="xs" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sort controls */}
          <div className="flex items-center gap-2">
            <p className="text-xs text-white/60 mr-1">Sort:</p>
            {([['risk', 'Risk'], ['trend', 'Trend']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setSortBy(val)}
                className={`text-xs px-2.5 py-1 rounded border transition ${
                  sortBy === val ? 'border-white/25 text-white/70 bg-white/5' : 'border-white/[0.06] text-white/60 hover:text-white/70'
                }`}>
                {label}
              </button>
            ))}
            <span className="ml-auto text-xs text-white/60">
              {loading ? 'updating…' : `updated ${lastUpdated}`}
              {data.summary.snapshotCount < 2 && ' · refresh for trend data'}
            </span>
          </div>

          {/* Active filter pill */}
          {trendFilter && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-2 bg-white/[0.06] border border-white/20 rounded-full px-3 py-1 text-xs text-white/70">
                <span style={{ color: TREND_COLOR[trendFilter] }}>{TREND_ICON[trendFilter]}</span>
                Showing {trendFilter} regions only ({sorted.length})
                <button onClick={() => setTrendFilter(null)} className="text-white/40 hover:text-white/70 ml-1">×</button>
              </span>
            </div>
          )}

          {/* Inline trend legend */}
          <div className="flex items-center gap-4 text-xs text-white/50 -mt-3">
            <span className="text-white/35 uppercase tracking-wider text-[10px]">Trend:</span>
            {(['escalating', 'stable', 'improving'] as TrendDir[]).map(t => (
              <span key={t} className="flex items-center gap-1">
                <span style={{ color: TREND_COLOR[t] }} className="font-bold">{TREND_ICON[t]}</span>
                <span>{t}</span>
              </span>
            ))}
          </div>

          {/* City grid */}
          <div id="city-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sorted.map(city => <CityCard key={city.id} city={city} />)}
          </div>

          {/* Data provenance moved to Methodology tab */}
          <div className="text-xs text-white/30 text-center py-2">
            Full data provenance, model details, and validation results →{' '}
            <button className="underline hover:text-white/50 transition-colors"
              onClick={() => (document.querySelector('[aria-label="Dashboard view"] button:last-child') as HTMLButtonElement)?.click()}>
              Methodology tab
            </button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-6 text-xs text-white/60 pt-2 border-t border-white/[0.04]">
            <span>◉ dengue · ◆ malaria</span>
            {(['escalating', 'stable', 'improving'] as TrendDir[]).map(t => (
              <span key={t} style={{ color: TREND_COLOR[t] }}>{TREND_ICON[t]} {t}</span>
            ))}
            <span className="ml-auto">Sources: Open-Meteo · WHO GHO · UN WUP 2024</span>
          </div>
        </>
      )}
    </div>
  );
}
