'use client';

import { useState } from 'react';
import Link from 'next/link';

type RiskLevel = 'HIGH' | 'WATCH' | 'LOW';

interface RiskResult {
  name: string;
  country: string;
  dengue: { level: RiskLevel; score: number; factors: string[] };
  malaria: { level: RiskLevel; score: number; factors: string[] };
  climate: { avgTemp: number; avgRainfall: number; laggedRainfall: number; avgHumidity: number };
  lineageId: string;
  qualityChecks: Array<{ name: string; passed: boolean; value: string | number }>;
}

const RISK_COLOR: Record<RiskLevel, string> = {
  HIGH: '#F87171', WATCH: '#FCD34D', LOW: '#34D399',
};
const RISK_BG: Record<RiskLevel, string> = {
  HIGH: 'rgba(248,113,113,0.12)', WATCH: 'rgba(252,211,77,0.12)', LOW: 'rgba(52,211,153,0.12)',
};
const RISK_LABEL: Record<RiskLevel, string> = {
  HIGH: 'High risk — take action now',
  WATCH: 'Elevated risk — stay alert',
  LOW: 'Low risk — routine precautions',
};

const PRECAUTIONS: Record<RiskLevel, string[]> = {
  HIGH: [
    'Use mosquito nets — especially for children and pregnant women',
    'Eliminate all standing water (pots, tyres, flower vases)',
    'Use DEET repellent, especially at dawn and dusk',
    'Seek care immediately if you develop fever, chills, or joint pain',
    'Keep windows and doors screened',
  ],
  WATCH: [
    'Check your surroundings for stagnant water weekly',
    'Use repellent when outdoors at dawn or dusk',
    'Monitor children for fever — act within 24 hours',
    'Sleep under a mosquito net',
  ],
  LOW: [
    'Standard precautions apply',
    'Use repellent if spending time outdoors',
    'Stay aware — conditions can change quickly after rain',
  ],
};

function RiskCard({ disease, result }: { disease: 'dengue' | 'malaria'; result: RiskResult }) {
  const data = result[disease];
  const color = RISK_COLOR[data.level];
  const bg = RISK_BG[data.level];
  const icon = disease === 'dengue' ? '◉' : '◆';

  return (
    <div className="rounded-xl border p-5" style={{ borderColor: `${color}40`, background: bg }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{ color, fontSize: 16 }}>{icon}</span>
          <span className="text-sm font-semibold text-white capitalize">{disease}</span>
          <span className="text-[10px] text-white/30">({disease === 'dengue' ? 'Aedes aegypti' : 'Anopheles'})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ color, background: bg, border: `1px solid ${color}50` }}>
            {data.level}
          </span>
          <span className="text-xs text-white/30">{data.score}/100</span>
        </div>
      </div>

      <p className="text-xs text-white/50 mb-3" style={{ color: `${color}cc` }}>
        {RISK_LABEL[data.level]}
      </p>

      {data.factors.length > 0 && (
        <div className="space-y-1 mb-3">
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Contributing factors</p>
          {data.factors.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-white/50">
              <span style={{ color }}>›</span> {f}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LookupPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [error, setError] = useState('');
  const [enrollCity, setEnrollCity] = useState('');

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/risk-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: query }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'City not found'); return; }
      setResult(data);
      setEnrollCity(data.name);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  const topRisk: RiskLevel | null = result
    ? (result.dengue.level === 'HIGH' || result.malaria.level === 'HIGH' ? 'HIGH'
      : result.dengue.level === 'WATCH' || result.malaria.level === 'WATCH' ? 'WATCH' : 'LOW')
    : null;

  return (
    <main id="main-content" className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <nav aria-label="Main navigation" className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <Link href="/" className="text-sm font-bold text-white hover:text-white/70 transition-colors" aria-label="Bzzt — home">Bzzt</Link>
        <Link href="/dashboard" className="text-xs text-white/60 hover:text-white/80 transition-colors">Operator Dashboard →</Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-3">
            Check disease risk for any city
          </h1>
          <p className="text-white/60 text-sm max-w-md mx-auto">
            Live climate-based dengue and malaria risk assessment. No account required.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={lookup} aria-label="City risk lookup" className="mb-8">
          <label htmlFor="city-search" className="block text-sm font-medium text-white/70 mb-2">
            City or location
          </label>
          <div className="flex gap-2">
            <input
              id="city-search"
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g. Jakarta, Lagos, São Paulo"
              autoComplete="off"
              aria-describedby={error ? 'lookup-error' : undefined}
              className="flex-1 bg-white/[0.04] border border-white/15 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent text-sm"
            />
            <button type="submit" disabled={loading || !query.trim()}
              className="px-5 py-3 bg-white text-black text-sm font-semibold rounded-xl hover:bg-white/90 transition disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black">
              {loading ? 'Checking…' : 'Check'}
            </button>
          </div>
        </form>

        {error && (
          <p id="lookup-error" role="alert" className="text-center text-sm text-white/70 mb-6">{error}</p>
        )}

        {/* Results — announced to screen readers when they appear */}
        <div aria-live="polite" aria-atomic="false">
        {result && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xl font-bold text-white">{result.name}</h2>
                <p className="text-sm text-white/60">{result.country}</p>
              </div>
              {topRisk && (
                <div className="text-right">
                  <div className="text-xs text-white/50 mb-1">Overall risk</div>
                  <div className="text-lg font-bold" style={{ color: RISK_COLOR[topRisk] }}>{topRisk}</div>
                </div>
              )}
            </div>

            {/* Climate summary */}
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[
                { label: 'Temp', value: `${result.climate.avgTemp.toFixed(1)}°C` },
                { label: 'Rain 28d', value: `${result.climate.avgRainfall.toFixed(1)}mm` },
                { label: 'Rain 14d', value: `${result.climate.laggedRainfall.toFixed(1)}mm` },
                { label: 'Humidity', value: `${result.climate.avgHumidity.toFixed(0)}%` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-center">
                  <div className="text-[10px] text-white/30 mb-1">{label}</div>
                  <div className="text-sm font-medium text-white">{value}</div>
                </div>
              ))}
            </div>

            {/* Disease cards */}
            <RiskCard disease="dengue" result={result} />
            <RiskCard disease="malaria" result={result} />

            {/* Precautions */}
            {topRisk && topRisk !== 'LOW' && (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Recommended actions</p>
                <ul className="space-y-2">
                  {PRECAUTIONS[topRisk].map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                      <span className="text-white/25 shrink-0 mt-0.5">·</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Data quality */}
            <div className="rounded-xl border border-white/[0.06] p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Data quality</p>
                <span className="text-[10px] text-white/30">ID: {result.lineageId}</span>
              </div>
              <div role="list" className="flex flex-wrap gap-1.5">
                {result.qualityChecks.map(q => (
                  <span
                    key={q.name}
                    role="listitem"
                    aria-label={`${q.name}: ${q.passed ? 'passed' : 'failed'}`}
                    className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                      q.passed
                        ? 'border-white/15 text-white/50 bg-white/[0.02]'
                        : 'border-red-500/40 text-red-400/80 bg-red-500/5'
                    }`}
                  >
                    <span aria-hidden="true">{q.passed ? '✓' : '✗'}</span> {q.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Enroll CTA */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-center">
              <p className="text-sm text-white mb-1">Get SMS alerts when risk changes in {enrollCity}</p>
              <p className="text-xs text-white/60 mb-4">We monitor 24/7 and only alert when climate signals shift meaningfully.</p>
              <Link href="/" className="inline-block px-5 py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 transition focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black">
                Enroll for free alerts
              </Link>
            </div>
          </div>
        )}
        </div>{/* end aria-live */}

        {/* Legend */}
        {!result && !loading && (
          <div className="mt-12 text-center space-y-4" aria-label="Map legend">
            <div className="flex items-center justify-center gap-8 text-xs">
              {(['HIGH', 'WATCH', 'LOW'] as RiskLevel[]).map(level => (
                <div key={level} className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2" aria-hidden="true">
                    <span style={{ color: RISK_COLOR[level], fontSize: 14 }}>◉</span>
                    <span style={{ color: RISK_COLOR[level], fontSize: 14 }}>◆</span>
                  </div>
                  <span className="text-white/60">{level}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/40">
              <span aria-hidden="true">◉</span> dengue (circle)
              {' · '}
              <span aria-hidden="true">◆</span> malaria (diamond)
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
