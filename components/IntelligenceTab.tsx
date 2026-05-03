'use client';

import { useEffect, useState, useCallback } from 'react';

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

const TREND_ICON: Record<TrendDir, string> = { escalating: '↑', improving: '↓', stable: '→', new: '·' };
const TREND_COLOR: Record<TrendDir, string> = { escalating: '#F87171', improving: '#34D399', stable: '#9ca3af', new: '#888888' };

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
    <span className="text-xs font-bold" style={{ color: TREND_COLOR[dir] }} title={dir}>
      {TREND_ICON[dir]}
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
      <p className="text-xs text-white/65 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-white/65 mt-0.5">{sub}</p>}
    </div>
  );
}

function CityCard({ city }: { city: CityInsight }) {
  const topRisk: RiskLevel = city.dengue === 'HIGH' || city.malaria === 'HIGH' ? 'HIGH'
    : city.dengue === 'WATCH' || city.malaria === 'WATCH' ? 'WATCH' : 'LOW';

  return (
    <div className="bg-white/[0.02] border rounded-xl p-4 space-y-3 hover:border-white/15 transition-colors"
      style={{ borderColor: `${RISK_COLOR[topRisk]}25` }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white leading-tight truncate">{city.name}</p>
          <p className="text-xs text-white/65">{city.country}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-bold text-white">{city.populationFormatted}</p>
          <p className="text-xs text-white/60">population</p>
        </div>
      </div>

      {/* Disease rows */}
      {(['dengue', 'malaria'] as const).map(d => (
        <div key={d} className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-white/65">{d === 'dengue' ? '◉' : '◆'}</span>
            <span className="text-white/50 capitalize">{d}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendBadge dir={city.trend[d]} />
            <RiskBadge level={city[d]} size="xs" />
            <span className="text-xs text-white/60 w-8 text-right">{d === 'dengue' ? city.dengueScore : city.malariaScore}</span>
          </div>
        </div>
      ))}

      {/* WHO baseline */}
      {city.who && (
        <div className="border-t border-white/[0.05] pt-2 grid grid-cols-2 gap-2">
          <div>
            <p className="text-xs text-white/60 mb-0.5">WHO dengue avg/yr</p>
            <p className="text-xs text-white/70">{city.who.dengueAvgFormatted}</p>
          </div>
          <div>
            <p className="text-xs text-white/60 mb-0.5">Malaria incidence</p>
            <p className="text-xs text-white/70">{city.who.malariaAvgFormatted}</p>
          </div>
          {!city.who.fetched && <p className="text-xs text-white/60 col-span-2">fallback data</p>}
        </div>
      )}

      {/* Climate snapshot */}
      <div className="grid grid-cols-4 gap-1 text-xs text-white/60">
        <div><span className="text-white/65">{city.climate.avgTemp.toFixed(0)}°C</span></div>
        <div><span className="text-white/65">{city.climate.avgRainfall.toFixed(0)}mm</span></div>
        <div><span className="text-white/65">{city.climate.laggedRainfall.toFixed(0)}mm↩</span></div>
        <div><span className="text-white/65">{city.climate.avgHumidity.toFixed(0)}%</span></div>
      </div>
    </div>
  );
}

// ── Multi-source lineage diagram ─────────────────────────────────────────────
function LineageDiagram() {
  const sources = [
    { label: 'Open-Meteo API', sub: 'climate · free · no key', color: '#60A5FA' },
    { label: 'WHO GHO',        sub: 'disease surveillance',    color: '#A78BFA' },
    { label: 'UN Population',  sub: 'city estimates · 2024',   color: '#34D399' },
  ];

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
      <p className="text-xs text-white/65 uppercase tracking-wider mb-4">Data provenance — OpenMetadata catalog</p>
      <div className="flex items-center gap-3 flex-wrap">
        {/* Sources */}
        <div className="flex flex-col gap-2">
          {sources.map(s => (
            <div key={s.label} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: `${s.color}30`, background: `${s.color}08` }}>
              <p className="font-semibold" style={{ color: s.color }}>{s.label}</p>
              <p className="text-white/60">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Arrow */}
        <div className="flex flex-col items-center gap-1 text-white/60">
          <div className="text-lg">→</div>
          <div className="text-xs uppercase tracking-wide">column<br/>lineage</div>
        </div>

        {/* Scorer */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs">
          <p className="font-bold text-white mb-1">bzzt-risk-scorer</p>
          <p className="text-white/65">WHO-aligned thresholds</p>
          <p className="text-white/65">14-day lagged rainfall</p>
          <p className="text-white/65">7 QC checks / run</p>
          <p className="text-xs text-white/60 mt-1">OpenMetadata pipelineStatus per run</p>
        </div>

        {/* Arrow */}
        <div className="text-white/60 text-lg">→</div>

        {/* Output */}
        <div className="flex flex-col gap-2">
          {[
            { label: 'disease_risk_scores', sub: 'table · Bzzt output', color: '#F87171' },
            { label: 'AgentMail alerts',    sub: 'bzzt@agentmail.to',   color: '#FCD34D' },
          ].map(s => (
            <div key={s.label} className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: `${s.color}30`, background: `${s.color}08` }}>
              <p className="font-semibold" style={{ color: s.color }}>{s.label}</p>
              <p className="text-white/60">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
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

  const sorted = data ? [...data.cities].sort((a, b) => {
    if (sortBy === 'population') return b.population - a.population;
    if (sortBy === 'trend') {
      const tScore = (c: CityInsight) =>
        (c.trend.dengue === 'escalating' ? 2 : c.trend.dengue === 'improving' ? -1 : 0) +
        (c.trend.malaria === 'escalating' ? 2 : c.trend.malaria === 'improving' ? -1 : 0);
      return tScore(b) - tScore(a);
    }
    // default: risk × population
    return ((b.dengueScore + b.malariaScore) / 2 * b.population) - ((a.dengueScore + a.malariaScore) / 2 * a.population);
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
              label="People at HIGH risk"
              value={`${data.summary.totalAtHighRisk.toFixed(0)}M`}
              sub={`across ${data.summary.citiesHigh} districts`}
            />
            <StatCard
              label="People at WATCH"
              value={`${data.summary.totalAtWatchRisk.toFixed(0)}M`}
              sub={`across ${data.summary.citiesWatch} cities`}
            />
            <StatCard
              label="Escalating now"
              value={String(data.summary.escalatingCount)}
              sub={data.summary.snapshotCount < 2 ? 'need 2 scans for trend' : data.summary.escalatingCities.slice(0,2).join(', ') || 'none'}
            />
            <StatCard
              label="Improving"
              value={String(data.summary.improvingCount)}
              sub={data.summary.improvingCities.slice(0,2).join(', ') || 'none'}
            />
          </div>

          {/* Top risk cities */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <p className="text-xs text-white/65 uppercase tracking-wider mb-3">Highest burden — risk score × population</p>
            <div className="space-y-2">
              {data.topRiskCities.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/60 w-4">{i + 1}</span>
                    <span className="text-white/70">{c.name}</span>
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
            {(['risk', 'population', 'trend'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                className={`text-xs px-2.5 py-1 rounded border transition capitalize ${
                  sortBy === s ? 'border-white/25 text-white/70 bg-white/5' : 'border-white/[0.06] text-white/60 hover:text-white/70'
                }`}>
                {s}
              </button>
            ))}
            <span className="ml-auto text-xs text-white/60">
              {loading ? 'updating…' : `updated ${lastUpdated}`}
              {data.summary.snapshotCount < 2 && ' · refresh for trend data'}
            </span>
          </div>

          {/* City grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sorted.map(city => <CityCard key={city.id} city={city} />)}
          </div>

          {/* OM lineage diagram */}
          <LineageDiagram />

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
