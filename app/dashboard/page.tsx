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
    <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-bold tracking-tight text-white hover:text-white/70 transition-colors">
            Bzzt
          </Link>
          {/* Top-level tab switcher */}
          <div className="flex items-center border border-white/10 rounded-lg overflow-hidden">
            {([['map', 'Live Map'], ['intelligence', 'Intelligence']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setTopTab(id)}
                className={`px-3 py-1.5 text-xs font-medium transition ${
                  topTab === id ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'
                }`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className={`w-1.5 h-1.5 rounded-full ${scanning ? 'bg-white/60 animate-pulse' : 'bg-white/30'}`} />
            <span className="text-white/30 text-[11px]">{scanning ? 'Scanning…' : `Updated ${lastScan}`}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runScan} disabled={scanning}
            className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-xs text-white/40 hover:text-white/60 transition disabled:opacity-30">
            {scanning ? 'Scanning…' : '↻ Refresh'}
          </button>
        </div>
      </header>

      {/* Stats strip */}
      {cities.length > 0 && (
        <div className="flex items-center gap-6 px-6 py-2 border-b border-white/[0.04] text-[11px]">
          <span className="text-white/60">{highCount} <span className="text-white/30">HIGH</span></span>
          <span className="text-white/40">{watchCount} <span className="text-white/20">WATCH</span></span>
          <span className="text-white/20">{cities.length - highCount - watchCount} LOW</span>
          {highCities.length > 0 && (
            <div className="flex items-center gap-2 ml-2">
              {highCities.map(c => (
                <button key={c.id} onClick={() => triggerAlert(c.id)} disabled={triggering === c.id}
                  className="text-[10px] px-2 py-0.5 rounded border border-white/15 hover:border-white/30 text-white/50 hover:text-white/80 transition disabled:opacity-30">
                  {triggering === c.id ? '…' : `⚡ ${c.name}`}
                </button>
              ))}
            </div>
          )}
          <span className="ml-auto text-white/15">{cities.length} cities · Open-Meteo · OpenMetadata</span>
        </div>
      )}

      {/* Intelligence tab — rendered separately, no overlap with Map tab */}
      {topTab === 'intelligence' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <IntelligenceTab />
        </div>
      )}

      {/* Body — Map tab (untouched) */}
      <div className={`flex-1 flex flex-col md:flex-row overflow-hidden ${topTab !== 'map' ? 'hidden' : ''}`}>
        {/* Map */}
        <div className="flex-1 h-[55vw] md:h-auto p-3">
          <Map livePoints={cities} />
        </div>

        {/* Right panel */}
        <aside className="w-full md:w-[320px] flex-shrink-0 border-t md:border-t-0 md:border-l border-white/[0.06] flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-white/[0.06]">
            {(['alerts', 'lineage'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-[11px] font-medium uppercase tracking-wider transition ${
                  activeTab === tab ? 'text-white border-b border-white/40' : 'text-white/25 hover:text-white/40'
                }`}>
                {tab === 'alerts' ? `Alerts (${alerts.length})` : `Lineage (${lineage.length})`}
              </button>
            ))}
          </div>

          {/* Alerts tab */}
          {activeTab === 'alerts' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {alerts.length === 0 && (
                <p className="text-[11px] text-white/20 italic pt-2">
                  No alerts yet. Click a city name in the header to trigger one.
                </p>
              )}
              {alerts.map((a) => {
                const s = RISK_STYLE[a.riskLevel] || RISK_STYLE.LOW;
                return (
                  <div key={a.id} className={`rounded-lg border p-3 space-y-1.5 ${s.bg} ${s.border}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RiskBadge level={a.riskLevel} />
                        <span className="text-[10px] text-white/40">{a.cityName}, {a.country}</span>
                      </div>
                      <span className="text-[10px] text-white/20">{new Date(a.sentAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[11px] text-white/70 leading-snug line-clamp-3">{a.message}</p>
                    <div className="text-[10px] text-white/20">
                      {a.recipients} recipient{a.recipients !== 1 ? 's' : ''} · {a.type.toUpperCase()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Lineage tab */}
          {activeTab === 'lineage' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {lineage.length === 0 && (
                <p className="text-[11px] text-white/20 italic pt-2">Waiting for scan…</p>
              )}
              {lineage.map((ev) => {
                const allPassed = ev.qualityChecks.every(q => q.passed);
                const outDengue = ev.outputs.dengue as string;
                const outMalaria = ev.outputs.malaria as string;
                return (
                  <div key={ev.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-white/80">{ev.city}</span>
                      <div className="flex items-center gap-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${allPassed ? 'text-white/50 border-white/20 bg-white/5' : 'text-white/30 border-white/10'}`}>
                          QC {allPassed ? '✓' : '✗'}
                        </span>
                        {ev.omSynced && <span className="text-[9px] text-white/30 border border-white/10 px-1.5 py-0.5 rounded">OM</span>}
                      </div>
                    </div>

                    {/* Lineage flow */}
                    <div className="flex items-center gap-1 text-[9px] text-white/30 overflow-hidden">
                      <span className="border border-white/10 rounded px-1.5 py-0.5 text-white/40 truncate shrink">Open-Meteo</span>
                      <span className="shrink-0">→</span>
                      <span className="border border-white/10 rounded px-1.5 py-0.5 text-white/40 shrink-0">risk-scorer</span>
                      <span className="shrink-0">→</span>
                      <span className="border border-white/10 rounded px-1.5 py-0.5 text-white/40 shrink-0">alert</span>
                    </div>

                    {/* Climate inputs */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-white/25">
                      <span>Temp <span className="text-white/50">{ev.inputs.avgTemp.toFixed(1)}°C</span></span>
                      <span>Humidity <span className="text-white/50">{ev.inputs.avgHumidity.toFixed(0)}%</span></span>
                      <span>Rain 28d <span className="text-white/50">{ev.inputs.avgRainfall.toFixed(1)}mm</span></span>
                      <span>Rain 14d <span className="text-white/50">{ev.inputs.laggedRainfall.toFixed(1)}mm</span></span>
                    </div>

                    {/* Outputs */}
                    <div className="flex gap-1.5">
                      <RiskBadge level={outDengue} />
                      <span className="text-[10px] text-white/25 self-center">dengue</span>
                      <RiskBadge level={outMalaria} />
                      <span className="text-[10px] text-white/25 self-center">malaria</span>
                    </div>

                    <div className="text-[9px] text-white/15">{new Date(ev.computedAt).toLocaleTimeString()}</div>
                  </div>
                );
              })}
            </div>
          )}
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
