'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

export interface CityRisk {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  dengue: 'HIGH' | 'WATCH' | 'LOW';
  malaria: 'HIGH' | 'WATCH' | 'LOW';
  dengueScore: number;
  malariaScore: number;
  scannedAt?: string;
}

type RiskLevel = 'HIGH' | 'WATCH' | 'LOW';

const RISK_COLOR: Record<RiskLevel, string> = {
  HIGH:  '#F87171',
  WATCH: '#FCD34D',
  LOW:   '#34D399',
};

function formatPop(n?: number): string {
  if (!n) return 'unknown';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k`;
  return String(n);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Map({ livePoints }: { livePoints?: CityRisk[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<unknown>(null);
  const layerRef     = useRef<unknown>(null);

  const [country,   setCountry]   = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const [stats,     setStats]     = useState({ high: 0, watch: 0, total: 0 });
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  // One-shot: init map + load data after DOM is ready
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Wait for the container to exist and have dimensions
      if (!containerRef.current) return;

      const L = (await import('leaflet')).default;
      if (cancelled) return;

      // Fix default icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      if (mapRef.current) return; // already initialized

      const map = L.map(containerRef.current, {
        center: [10, 20],
        zoom: 2,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO',
        maxZoom: 18,
      }).addTo(map);

      mapRef.current = map;

      // Fetch and render districts
      await loadDistricts(map, L, '');
    }

    init();

    return () => {
      cancelled = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (mapRef.current) { (mapRef.current as any).remove(); mapRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDistricts(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L: any,
    selectedCountry: string
  ) {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ level: 'HIGH,WATCH', limit: '600' });
      if (selectedCountry) params.set('country', selectedCountry);

      const res  = await fetch(`/api/district-risks?${params}`);
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      // Update country list
      if (data.countries?.length) setCountries(data.countries);

      // Remove old layer
      if (layerRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (layerRef.current as any).removeFrom(map);
        layerRef.current = null;
      }

      if (!data.features?.length) {
        setStats({ high: 0, watch: 0, total: 0 });
        setLoading(false);
        return;
      }

      let highCount = 0, watchCount = 0;

      const layer = L.geoJSON(data.features, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style: (feature: any) => {
          const risk: RiskLevel = feature?.properties?.topRisk ?? 'LOW';
          const opacity = risk === 'HIGH' ? 0.6 : 0.4;
          return {
            fillColor:   RISK_COLOR[risk],
            fillOpacity: opacity,
            color:       RISK_COLOR[risk],
            weight:      0.8,
            opacity:     0.7,
          };
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onEachFeature: (feature: any, lyr: any) => {
          const p = feature.properties;
          if (p.topRisk === 'HIGH') highCount++;
          else if (p.topRisk === 'WATCH') watchCount++;

          lyr.bindPopup(`
            <div style="font-family:sans-serif;padding:8px 10px;min-width:180px">
              <strong style="font-size:14px">${p.name}</strong>
              <div style="color:#888;font-size:12px;margin-bottom:8px">${p.country}</div>
              <div style="display:flex;gap:8px;margin-bottom:4px">
                <span style="font-size:12px;padding:2px 6px;border-radius:3px;
                  background:${RISK_COLOR[p.dengue as RiskLevel] ?? '#888'}22;color:${RISK_COLOR[p.dengue as RiskLevel] ?? '#888'};font-weight:700">
                  Dengue: ${p.dengue}
                </span>
                <span style="font-size:12px;padding:2px 6px;border-radius:3px;
                  background:${RISK_COLOR[p.malaria as RiskLevel] ?? '#888'}22;color:${RISK_COLOR[p.malaria as RiskLevel] ?? '#888'};font-weight:700">
                  Malaria: ${p.malaria}
                </span>
              </div>
              ${p.population ? `<div style="color:#888;font-size:12px">~${formatPop(p.population)} people</div>` : ''}
            </div>
          `);

          const topRisk = (p.topRisk ?? 'LOW') as RiskLevel;
          lyr.on('mouseover', () => lyr.setStyle({ weight: 2, fillOpacity: 0.8 }));
          lyr.on('mouseout',  () => lyr.setStyle({ weight: 0.8, fillOpacity: topRisk === 'HIGH' ? 0.6 : 0.4 }));
        },
      });

      layer.addTo(map);
      layerRef.current = layer;
      setStats({ high: highCount, watch: watchCount, total: data.features.length });
    } catch (err) {
      console.error('[Map] loadDistricts error:', err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  function handleCountryChange(c: string) {
    setCountry(c);
    if (mapRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      import('leaflet').then(({ default: L }) => loadDistricts(mapRef.current as any, L, c));
    }
  }

  return (
    <div className="relative w-full h-full">
      {/* Controls */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 flex-wrap">
        <select
          value={country}
          onChange={e => handleCountryChange(e.target.value)}
          className="text-xs bg-[#1a1a1a] border border-white/10 text-white/70 rounded-lg px-2 py-1.5
                     hover:border-white/20 focus:outline-none cursor-pointer"
        >
          <option value="">All countries</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {stats.total > 0 && (
          <div className="flex items-center gap-2 bg-[#1a1a1a]/90 border border-white/10 rounded-lg px-3 py-1.5 text-xs">
            <span className="text-[#F87171] font-bold">{stats.high} HIGH</span>
            <span className="text-white/30">·</span>
            <span className="text-[#FCD34D] font-bold">{stats.watch} WATCH</span>
            <span className="text-white/30">·</span>
            <span className="text-white/50">{stats.total} districts</span>
          </div>
        )}

        {loading && (
          <div className="bg-[#1a1a1a]/90 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/50 animate-pulse">
            Loading districts…
          </div>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-500/20 rounded-lg px-3 py-1.5 text-xs text-red-400">
            {error.slice(0, 60)}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-3 z-[1000] flex items-center gap-3
                      bg-[#1a1a1a]/90 border border-white/10 rounded-lg px-3 py-2 text-xs">
        {(['HIGH', 'WATCH'] as RiskLevel[]).map(level => (
          <span key={level} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: RISK_COLOR[level], opacity: 0.8 }} />
            <span className="text-white/60">{level}</span>
          </span>
        ))}
        <span className="text-white/30 text-xs ml-1">LOW hidden</span>
      </div>

      {/* Map */}
      <div ref={containerRef} className="w-full h-full rounded-xl" />
    </div>
  );
}
