'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

interface AlertItem {
  id: string;
  pincode: string;
  city: string;
  message: string;
  recipients: number;
  sentAt: string;
  type: 'sms' | 'email';
  riskLevel: 'HIGH' | 'WATCH' | 'LOW';
}

interface CityRisk {
  pincode: string;
  city: string;
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
  inputs: {
    source: string;
    avgTemp: number;
    avgRainfall: number;
    laggedRainfall: number;
    avgHumidity: number;
  };
  outputs: { dengue: string; malaria: string; dengueScore: number; malariaScore: number };
  qualityChecks: Array<{ name: string; passed: boolean; value: number | string }>;
  omSynced: boolean;
}

const RISK_COLOR: Record<string, string> = { HIGH: '#ef4444', WATCH: '#f59e0b', LOW: '#10b981' };
const RISK_BG: Record<string, string> = { HIGH: '#ef444420', WATCH: '#f59e0b20', LOW: '#10b98120' };

export default function Dashboard() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [cities, setCities] = useState<CityRisk[]>([]);
  const [lineage, setLineage] = useState<LineageEvent[]>([]);
  const [scanning, setScanning] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [lastScan, setLastScan] = useState<string>('—');
  const [activeTab, setActiveTab] = useState<'alerts' | 'lineage'>('alerts');

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

  async function triggerAlert(pincode = '411001') {
    setTriggering(true);
    try {
      await fetch('/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincode }),
      });
      await loadAlerts();
    } finally {
      setTriggering(false);
    }
  }

  const highCount  = cities.filter(c => c.dengue === 'HIGH' || c.malaria === 'HIGH').length;
  const watchCount = cities.filter(c => (c.dengue === 'WATCH' || c.malaria === 'WATCH') && c.dengue !== 'HIGH' && c.malaria !== 'HIGH').length;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-white hover:text-yellow-400 transition-colors">
            Bzzt
          </Link>
          <span className="text-xs text-white/40 uppercase tracking-wider hidden sm:inline">Operator Dashboard</span>
          <div className="flex items-center gap-2 text-xs">
            <span className={`w-1.5 h-1.5 rounded-full ${scanning ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span className="text-white/40">{scanning ? 'Scanning…' : `Updated ${lastScan}`}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runScan} disabled={scanning}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-white/70 transition disabled:opacity-50">
            {scanning ? 'Scanning…' : '↻ Scan Now'}
          </button>
          <button onClick={() => triggerAlert('411001')} disabled={triggering}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium border border-red-500/30 transition disabled:opacity-50">
            {triggering ? 'Sending…' : '⚡ Demo Alert — Pune'}
          </button>
        </div>
      </header>

      {/* Stats strip */}
      <div className="flex items-center gap-6 px-6 py-2.5 border-b border-white/5 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-white/60">{highCount} cities HIGH</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          <span className="text-white/60">{watchCount} cities WATCH</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-white/60">{cities.length - highCount - watchCount} cities LOW</span>
        </div>
        <div className="ml-auto text-white/30">{cities.length} cities monitored · Open-Meteo + OpenMetadata</div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Map */}
        <div className="flex-1 h-[55vw] md:h-auto p-3">
          <Map livePoints={cities} />
        </div>

        {/* Right panel */}
        <aside className="w-full md:w-[340px] flex-shrink-0 border-t md:border-t-0 md:border-l border-white/10 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            {(['alerts', 'lineage'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-xs font-medium uppercase tracking-wider transition ${activeTab === tab ? 'text-white border-b-2 border-yellow-400' : 'text-white/40 hover:text-white/60'}`}>
                {tab === 'alerts' ? `Alerts (${alerts.length})` : `Data Lineage (${lineage.length})`}
              </button>
            ))}
          </div>

          {/* Alerts tab */}
          {activeTab === 'alerts' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {alerts.length === 0 && (
                <p className="text-xs text-white/30 italic">No alerts yet. Trigger one above.</p>
              )}
              {alerts.map((a) => (
                <div key={a.id} className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: RISK_BG[a.riskLevel] || '#ffffff10', color: RISK_COLOR[a.riskLevel] || '#fff' }}>
                      {a.riskLevel}
                    </span>
                    <span className="text-[10px] text-white/30">{new Date(a.sentAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-white leading-snug line-clamp-3">{a.message}</p>
                  <div className="text-[10px] text-white/30">
                    {a.city} · PIN {a.pincode} · {a.recipients} recipient{a.recipients !== 1 ? 's' : ''} · {a.type.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Lineage tab */}
          {activeTab === 'lineage' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {lineage.length === 0 && (
                <p className="text-xs text-white/30 italic">Waiting for first scan…</p>
              )}
              {lineage.map((ev) => {
                const allQcPassed = ev.qualityChecks.every(q => q.passed);
                return (
                  <div key={ev.id} className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{ev.city}</span>
                        <span className="text-[10px] text-white/40">PIN {ev.pincode}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${allQcPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          QC {allQcPassed ? 'PASS' : 'FAIL'}
                        </span>
                        {ev.omSynced && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">OM</span>
                        )}
                      </div>
                    </div>

                    {/* Lineage: source → pipeline → output */}
                    <div className="flex items-center gap-1 text-[10px] text-white/50 overflow-hidden">
                      <span className="bg-white/10 rounded px-1.5 py-0.5 text-white/70 truncate">{ev.inputs.source}</span>
                      <span className="shrink-0">→</span>
                      <span className="bg-white/10 rounded px-1.5 py-0.5 text-white/70">risk-scorer</span>
                      <span className="shrink-0">→</span>
                      <span className="bg-white/10 rounded px-1.5 py-0.5 text-white/70">alert</span>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-white/40">
                      <span>Temp: <span className="text-white/60">{ev.inputs.avgTemp.toFixed(1)}°C</span></span>
                      <span>Humidity: <span className="text-white/60">{ev.inputs.avgHumidity.toFixed(0)}%</span></span>
                      <span>Rain 28d: <span className="text-white/60">{ev.inputs.avgRainfall.toFixed(1)}mm</span></span>
                      <span>Rain 14d: <span className="text-white/60">{ev.inputs.laggedRainfall.toFixed(1)}mm</span></span>
                    </div>

                    {/* Outputs */}
                    <div className="flex gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{ background: RISK_BG[ev.outputs.dengue], color: RISK_COLOR[ev.outputs.dengue] }}>
                        Dengue {ev.outputs.dengue}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{ background: RISK_BG[ev.outputs.malaria], color: RISK_COLOR[ev.outputs.malaria] }}>
                        Malaria {ev.outputs.malaria}
                      </span>
                    </div>

                    <div className="text-[10px] text-white/25">{new Date(ev.computedAt).toLocaleTimeString()}</div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>

      {/* Legend */}
      <div className="px-6 py-2.5 border-t border-white/10 flex items-center gap-6 text-[11px] text-white/30">
        {[['HIGH', '#ef4444'], ['WATCH', '#f59e0b'], ['LOW', '#10b981']].map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
        <span className="ml-auto">Climate data: Open-Meteo · Lineage: OpenMetadata · Alerts: AgentMail + Twilio</span>
      </div>
    </main>
  );
}
