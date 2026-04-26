'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import IntelligenceTab from '@/components/IntelligenceTab';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

interface AlertItem {
  id: string;
  cityId: string;
  cityName: string;
  country: string;
  message: string;
  recipients: number;
  sentAt: string;
  type: 'sms' | 'email';
  riskLevel: 'HIGH' | 'WATCH' | 'LOW';
}

interface CityRisk {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  dengue: 'HIGH' | 'WATCH' | 'LOW';
  malaria: 'HIGH' | 'WATCH' | 'LOW';
  dengueScore: number;
  malariaScore: number;
  scannedAt: string;
}

interface LineageEvent {
  id: string;
  pincode: string;
  city: string;
  computedAt: string;
  inputs: { source: string; avgTemp: number; avgRainfall: number; laggedRainfall: number; avgHumidity: number };
  outputs: { dengue: string; malaria: string; dengueScore: number; malariaScore: number };
  qualityChecks: Array<{ name: string; passed: boolean; value: number | string }>;
  omSynced: boolean;
}

const RISK_STYLE: Record<string, { text: string; bg: string; border: string }> = {
  HIGH:  { text: 'text-white',       bg: 'bg-white/10',    border: 'border-white/30' },
  WATCH: { text: 'text-white/60',    bg: 'bg-white/5',     border: 'border-white/10' },
  LOW:   { text: 'text-white/30',    bg: 'bg-white/[0.02]',border: 'border-white/5'  },
};

function RiskBadge({ level }: { level: string }) {
  const s = RISK_STYLE[level] || RISK_STYLE.LOW;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${s.text} ${s.bg} ${s.border}`}>
      {level}
    </span>
  );
}

export default function Dashboard() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [cities, setCities] = useState<CityRisk[]>([]);
  const [lineage, setLineage] = useState<LineageEvent[]>([]);
  const [scanning, setScanning] = useState(false);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string>('—');
  const [activeTab, setActiveTab] = useState<'alerts' | 'lineage'>('alerts');
  const [topTab, setTopTab] = useState<'map' | 'intelligence'>('map');

  const loadAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch { /* ignore */ }
  }, []);

  const loadLineage = useCallback(async () => {
    try {
      const res = await fetch('/api/lineage');
      const data = await res.json();
      setLineage(data.lineage || []);
    } catch { /* ignore */ }
  }, []);

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/scan');
      const data = await res.json();
      setCities(data.cities || []);
      setLastScan(new Date().toLocaleTimeString());
      await loadLineage();
    } finally {
      setScanning(false);
    }
  }, [loadLineage]);

  useEffect(() => {
    loadAlerts();
    loadLineage();
    runScan();
    const alertInterval = setInterval(loadAlerts, 5000);
    const scanInterval  = setInterval(runScan, 5 * 60 * 1000);
    return () => { clearInterval(alertInterval); clearInterval(scanInterval); };
  }, [loadAlerts, loadLineage, runScan]);

  async function triggerAlert(cityId: string) {
    setTriggering(cityId);
    try {
      await fetch('/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityId }),
      });
      await loadAlerts();
    } finally {
      setTriggering(null);
    }
  }

  const highCount  = cities.filter(c => c.dengue === 'HIGH' || c.malaria === 'HIGH').length;
  const watchCount = cities.filter(c => (c.dengue === 'WATCH' || c.malaria === 'WATCH') && c.dengue !== 'HIGH' && c.malaria !== 'HIGH').length;
  const highCities = cities.filter(c => c.dengue === 'HIGH' || c.malaria === 'HIGH').slice(0, 3);

  return (
    <main id="main-content" className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-bold tracking-tight text-white hover:text-white/70 transition-colors" aria-label="Bzzt — home">
            Bzzt
          </Link>

          {/* Top-level tab switcher — proper ARIA tablist */}
          <div role="tablist" aria-label="Dashboard view" className="flex items-center border border-white/10 rounded-lg overflow-hidden">
            {([['map', 'Live Map'], ['intelligence', 'Intelligence']] as const).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={topTab === id}
                aria-controls={`tabpanel-${id}`}
                onClick={() => setTopTab(id)}
                className={`px-3 py-1.5 text-xs font-medium transition ${
                  topTab === id ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Scan status — announced to screen readers */}
          <div aria-live="polite" aria-atomic="true" className="flex items-center gap-2 text-xs">
            <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${scanning ? 'bg-white/60 animate-pulse' : 'bg-white/30'}`} />
            <span className="text-white/60 text-[11px]">{scanning ? 'Scanning…' : `Updated ${lastScan}`}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runScan}
            disabled={scanning}
            aria-label="Refresh risk data"
            className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-xs text-white/60 hover:text-white/80 transition disabled:opacity-30"
          >
            <span aria-hidden="true">↻</span> Refresh
          </button>
        </div>
      </header>

      {/* Stats strip */}
      {cities.length > 0 && (
        <div aria-label="Risk summary" className="flex items-center gap-6 px-6 py-2 border-b border-white/[0.04] text-[11px]">
          <span className="text-white/70">
            <strong>{highCount}</strong> <span className="text-white/50">HIGH</span>
          </span>
          <span className="text-white/60">
            <strong>{watchCount}</strong> <span className="text-white/40">WATCH</span>
          </span>
          <span className="text-white/40">
            <strong>{cities.length - highCount - watchCount}</strong> LOW
          </span>
          {highCities.length > 0 && (
            <div className="flex items-center gap-2 ml-2" role="group" aria-label="Trigger alerts for high-risk cities">
              {highCities.map(c => (
                <button
                  key={c.id}
                  onClick={() => triggerAlert(c.id)}
                  disabled={triggering === c.id}
                  aria-label={`Send alert for ${c.name}`}
                  className="text-[10px] px-2 py-0.5 rounded border border-white/20 hover:border-white/40 text-white/60 hover:text-white transition disabled:opacity-30"
                >
                  <span aria-hidden="true">⚡</span> {triggering === c.id ? 'Sending…' : c.name}
                </button>
              ))}
            </div>
          )}
          <span className="ml-auto text-white/30">{cities.length} cities monitored</span>
        </div>
      )}

      {/* Intelligence tab */}
      <div
        id="tabpanel-intelligence"
        role="tabpanel"
        aria-label="Intelligence view"
        hidden={topTab !== 'intelligence'}
        className={`flex-1 flex flex-col overflow-hidden ${topTab !== 'intelligence' ? 'hidden' : ''}`}
      >
        <IntelligenceTab />
      </div>

      {/* Map tab */}
      <div
        id="tabpanel-map"
        role="tabpanel"
        aria-label="Live map view"
        hidden={topTab !== 'map'}
        className={`flex-1 flex flex-col md:flex-row overflow-hidden ${topTab !== 'map' ? 'hidden' : ''}`}
      >
        {/* Map */}
        <div className="flex-1 h-[55vw] md:h-auto p-3">
          <Map livePoints={cities} />
        </div>

        {/* Right panel */}
        <aside aria-label="Alerts and data lineage" className="w-full md:w-[320px] flex-shrink-0 border-t md:border-t-0 md:border-l border-white/[0.06] flex flex-col">
          {/* Tabs */}
          <div role="tablist" aria-label="Panel view" className="flex border-b border-white/[0.06]">
            {(['alerts', 'lineage'] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`panel-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-[11px] font-medium uppercase tracking-wider transition ${
                  activeTab === tab ? 'text-white border-b border-white/40' : 'text-white/50 hover:text-white/70'
                }`}
              >
                {tab === 'alerts' ? `Alerts (${alerts.length})` : `Lineage (${lineage.length})`}
              </button>
            ))}
          </div>

          {/* Alerts panel */}
          <div
            id="panel-alerts"
            role="tabpanel"
            aria-label="Alert history"
            hidden={activeTab !== 'alerts'}
            className={`flex-1 overflow-y-auto p-4 space-y-2.5 ${activeTab !== 'alerts' ? 'hidden' : ''}`}
          >
            {alerts.length === 0 && (
              <p className="text-xs text-white/50 italic pt-2">
                No alerts yet. Click a city name above to trigger one.
              </p>
            )}
            {alerts.map((a) => {
                const s = RISK_STYLE[a.riskLevel] || RISK_STYLE.LOW;
                return (
                  <div key={a.id} className={`rounded-lg border p-3 space-y-1.5 ${s.bg} ${s.border}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RiskBadge level={a.riskLevel} />
                        <span className="text-[10px] text-white/60">{a.cityName}, {a.country}</span>
                      </div>
                      <time className="text-[10px] text-white/40" dateTime={a.sentAt}>{new Date(a.sentAt).toLocaleTimeString()}</time>
                    </div>
                    <p className="text-[11px] text-white/70 leading-snug line-clamp-3">{a.message}</p>
                    <div className="text-[10px] text-white/50">
                      {a.recipients} recipient{a.recipients !== 1 ? 's' : ''} · {a.type.toUpperCase()}
                    </div>
                  </div>
                );
              })}
            </div>

          {/* Lineage panel */}
          <div
            id="panel-lineage"
            role="tabpanel"
            aria-label="Data lineage"
            hidden={activeTab !== 'lineage'}
            className={`flex-1 overflow-y-auto p-4 space-y-2.5 ${activeTab !== 'lineage' ? 'hidden' : ''}`}
          >
            {lineage.length === 0 && (
              <p className="text-xs text-white/50 italic pt-2">Waiting for first scan…</p>
            )}
            {lineage.map((ev) => {
              const allPassed = ev.qualityChecks.every(q => q.passed);
              const outDengue = ev.outputs.dengue as string;
              const outMalaria = ev.outputs.malaria as string;
              return (
                <article key={ev.id} aria-label={`Lineage record for ${ev.city}`} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-white">{ev.city}</span>
                    <div className="flex items-center gap-1">
                      <span
                        aria-label={`Quality checks: ${allPassed ? 'all passed' : 'some failed'}`}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${allPassed ? 'text-white/60 border-white/20 bg-white/5' : 'text-white/50 border-white/10'}`}
                      >
                        QC <span aria-hidden="true">{allPassed ? '✓' : '✗'}</span>
                      </span>
                      {ev.omSynced && <span aria-label="Synced to OpenMetadata" className="text-[9px] text-white/50 border border-white/15 px-1.5 py-0.5 rounded">OM</span>}
                    </div>
                  </div>

                  <div aria-label="Data lineage flow" className="flex items-center gap-1 text-[10px] text-white/50 overflow-hidden">
                    <span className="border border-white/10 rounded px-1.5 py-0.5 truncate shrink">Open-Meteo</span>
                    <span aria-hidden="true" className="shrink-0">→</span>
                    <span className="border border-white/10 rounded px-1.5 py-0.5 shrink-0">risk-scorer</span>
                    <span aria-hidden="true" className="shrink-0">→</span>
                    <span className="border border-white/10 rounded px-1.5 py-0.5 shrink-0">alert</span>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-white/50">
                    <div><dt className="inline">Temp </dt><dd className="inline text-white/70">{ev.inputs.avgTemp.toFixed(1)}°C</dd></div>
                    <div><dt className="inline">Humidity </dt><dd className="inline text-white/70">{ev.inputs.avgHumidity.toFixed(0)}%</dd></div>
                    <div><dt className="inline">Rain 28d </dt><dd className="inline text-white/70">{ev.inputs.avgRainfall.toFixed(1)}mm</dd></div>
                    <div><dt className="inline">Rain 14d </dt><dd className="inline text-white/70">{ev.inputs.laggedRainfall.toFixed(1)}mm</dd></div>
                  </dl>

                  <div className="flex gap-1.5">
                    <RiskBadge level={outDengue} />
                    <span className="text-[10px] text-white/50 self-center">dengue</span>
                    <RiskBadge level={outMalaria} />
                    <span className="text-[10px] text-white/50 self-center">malaria</span>
                  </div>

                  <time className="block text-[10px] text-white/30" dateTime={ev.computedAt}>
                    {new Date(ev.computedAt).toLocaleTimeString()}
                  </time>
                </article>
              );
            })}
          </div>
        </aside>
      </div>

      {/* Footer legend */}
      <div className="px-6 py-2 border-t border-white/[0.04] flex items-center gap-5 text-[10px] text-white/20">
        {([['HIGH', '#F87171'], ['WATCH', '#FCD34D'], ['LOW', '#34D399']] as [string, string][]).map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color }}>◉</span>
            <span>{label}</span>
          </span>
        ))}
        <span className="text-white/15">◉ dengue · ◆ malaria</span>
        <span className="ml-auto">Open-Meteo · WHO GHO · OpenMetadata</span>
      </div>
    </main>
  );
}
