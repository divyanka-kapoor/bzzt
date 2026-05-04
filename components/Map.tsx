'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';

export interface CityRisk {
  id: string; name: string; country: string;
  lat: number; lng: number;
  dengue: 'HIGH' | 'WATCH' | 'LOW';
  malaria: 'HIGH' | 'WATCH' | 'LOW';
  dengueScore: number; malariaScore: number;
  scannedAt?: string;
}

type RiskLevel = 'HIGH' | 'WATCH' | 'LOW';

const RISK_COLOR: Record<RiskLevel, string> = {
  HIGH: '#F87171', WATCH: '#FCD34D', LOW: '#34D399',
};

// Countries with level-2 district data available
const L2_COUNTRIES = new Set(['India', 'Nigeria', 'Kenya', 'Bangladesh']);

// Bounding boxes for fly-to on country select
const COUNTRY_BOUNDS: Record<string, [[number,number],[number,number]]> = {
  'India':       [[8.07, 68.11],  [37.10, 97.40]],
  'Nigeria':     [[4.27, 2.69],   [13.89, 14.68]],
  'Kenya':       [[-4.68, 33.91], [4.62, 41.91]],
  'Bangladesh':  [[20.74, 88.01], [26.63, 92.67]],
  'Brazil':      [[-33.75, -73.98],[5.27, -28.65]],
  'Indonesia':   [[-11.01, 95.01],[5.91, 141.02]],
  'Philippines': [[4.59, 116.93], [21.12, 126.60]],
  'Thailand':    [[5.61, 97.34],  [20.46, 105.64]],
  'Vietnam':     [[8.56, 102.14], [23.39, 109.47]],
  'Colombia':    [[-4.23, -81.73],[13.39, -66.87]],
};

function formatPop(n?: number): string {
  if (!n) return 'unknown';
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${Math.round(n/1_000)}k`;
  return String(n);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Map({ livePoints }: { livePoints?: CityRisk[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef       = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layerRef     = useRef<any>(null);

  const [country,    setCountry]    = useState('');
  const [countries,  setCountries]  = useState<string[]>([]);
  const [adminLevel, setAdminLevel] = useState(1);
  const [stats,      setStats]      = useState({ high: 0, watch: 0, total: 0 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const loadDistricts = useCallback(async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map: any, L: any, selectedCountry: string, level: number
  ) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        level: 'HIGH,WATCH',
        limit: level === 2 ? '1000' : '600',
        admin_level: String(level),
      });
      if (selectedCountry) params.set('country', selectedCountry);

      const res  = await fetch(`/api/district-risks?${params}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (data.countries?.length && !selectedCountry) setCountries(data.countries);

      // Remove old layer
      if (layerRef.current) { layerRef.current.removeFrom(map); layerRef.current = null; }

      if (!data.features?.length) {
        setStats({ high: 0, watch: 0, total: 0 });
        setLoading(false);
        return;
      }

      let high = 0, watch = 0;

      const layer = L.geoJSON(data.features, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style: (feature: any) => {
          const risk: RiskLevel = feature?.properties?.topRisk ?? 'LOW';
          return {
            fillColor: RISK_COLOR[risk],
            fillOpacity: risk === 'HIGH' ? 0.65 : 0.45,
            color: RISK_COLOR[risk],
            weight: level === 2 ? 0.5 : 0.8,
            opacity: 0.7,
          };
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onEachFeature: (feature: any, lyr: any) => {
          const p = feature.properties;
          const topRisk = (p.topRisk ?? 'LOW') as RiskLevel;
          if (topRisk === 'HIGH') high++;
          else if (topRisk === 'WATCH') watch++;

          const dengueColor  = RISK_COLOR[(p.dengue  as RiskLevel) ?? 'LOW'];
          const malariaColor = RISK_COLOR[(p.malaria as RiskLevel) ?? 'LOW'];

          lyr.bindPopup(`
            <div style="font-family:sans-serif;padding:8px 10px;min-width:180px">
              <strong style="font-size:14px">${p.name}</strong>
              <div style="color:#888;font-size:12px;margin-bottom:8px">${p.country}</div>
              <div style="display:flex;gap:8px;margin-bottom:4px">
                <span style="font-size:12px;padding:2px 6px;border-radius:3px;
                  background:${dengueColor}22;color:${dengueColor};font-weight:700">
                  Dengue: ${p.dengue}
                </span>
                <span style="font-size:12px;padding:2px 6px;border-radius:3px;
                  background:${malariaColor}22;color:${malariaColor};font-weight:700">
                  Malaria: ${p.malaria}
                </span>
              </div>
              ${p.population ? `<div style="color:#888;font-size:12px">~${formatPop(p.population)} people</div>` : ''}
            </div>
          `);
          lyr.on('mouseover', () => lyr.setStyle({ weight: 2, fillOpacity: 0.85 }));
          lyr.on('mouseout',  () => lyr.setStyle({ weight: level === 2 ? 0.5 : 0.8, fillOpacity: topRisk === 'HIGH' ? 0.65 : 0.45 }));
        },
      });

      layer.addTo(map);
      layerRef.current = layer;
      setStats({ high, watch, total: data.features.length });
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Init map
  useEffect(() => {
    if (!containerRef.current) return;

    import('leaflet').then(({ default: L }) => {
      if (mapRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current!, { center: [10, 20], zoom: 2, scrollWheelZoom: true });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO', maxZoom: 18,
      }).addTo(map);

      mapRef.current = map;
      loadDistricts(map, L, '', 1);

      // Auto-switch to level-2 when zoomed into a country with L2 data
      map.on('zoomend', () => {
        const z = map.getZoom();
        const center = map.getCenter();
        // Detect which country we're zoomed into
        if (z >= 5) {
          // Try to find country from center point — simplified approach
          // Will be handled by country filter UX instead
        }
      });
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCountryChange = async (c: string) => {
    setCountry(c);
    if (!mapRef.current) return;

    const L = (await import('leaflet')).default;

    // Determine best admin level for this country
    const level = (c && L2_COUNTRIES.has(c)) ? 2 : 1;
    setAdminLevel(level);

    // Fly to country bounds if available
    if (c && COUNTRY_BOUNDS[c]) {
      mapRef.current.flyToBounds(COUNTRY_BOUNDS[c], { padding: [20, 20], duration: 1 });
    } else if (!c) {
      // Reset to world view
      mapRef.current.flyTo([10, 20], 2, { duration: 1 });
      setAdminLevel(1);
    }

    loadDistricts(mapRef.current, L, c, level);
  };

  const handleReset = async () => {
    setCountry('');
    setAdminLevel(1);
    if (mapRef.current) {
      mapRef.current.flyTo([10, 20], 2, { duration: 1 });
      const L = (await import('leaflet')).default;
      loadDistricts(mapRef.current, L, '', 1);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Controls */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 flex-wrap">

        {/* Back to world */}
        {country && (
          <button
            onClick={handleReset}
            className="text-xs bg-[#1a1a1a] border border-white/20 text-white/70 rounded-lg px-2 py-1.5
                       hover:border-white/40 hover:text-white transition-colors"
          >
            ← World
          </button>
        )}

        {/* Country filter */}
        <select
          value={country}
          onChange={e => handleCountryChange(e.target.value)}
          className="text-xs bg-[#1a1a1a] border border-white/10 text-white/70 rounded-lg px-2 py-1.5
                     hover:border-white/20 focus:outline-none cursor-pointer"
        >
          <option value="">All countries — state level</option>
          {countries.map(c => (
            <option key={c} value={c}>
              {c}{L2_COUNTRIES.has(c) ? ' (district level)' : ''}
            </option>
          ))}
        </select>

        {/* Admin level indicator */}
        {country && (
          <div className="bg-[#1a1a1a]/90 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/50">
            {adminLevel === 2 ? '📍 District level' : '📍 State level'}
          </div>
        )}

        {/* Stats */}
        {stats.total > 0 && (
          <div className="flex items-center gap-2 bg-[#1a1a1a]/90 border border-white/10 rounded-lg px-3 py-1.5 text-xs">
            <span className="text-[#F87171] font-bold">{stats.high} HIGH</span>
            <span className="text-white/30">·</span>
            <span className="text-[#FCD34D] font-bold">{stats.watch} WATCH</span>
            <span className="text-white/30">·</span>
            <span className="text-white/50">{stats.total} {adminLevel === 2 ? 'districts' : 'states'}</span>
          </div>
        )}

        {loading && (
          <div className="bg-[#1a1a1a]/90 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/50 animate-pulse">
            Loading…
          </div>
        )}
        {error && (
          <div className="bg-red-900/40 border border-red-500/20 rounded-lg px-3 py-1.5 text-xs text-red-400">
            {error.slice(0, 80)}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-3 z-[1000] flex items-center gap-3
                      bg-[#1a1a1a]/90 border border-white/10 rounded-lg px-3 py-2 text-xs">
        {(['HIGH', 'WATCH'] as RiskLevel[]).map(level => (
          <span key={level} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block"
              style={{ background: RISK_COLOR[level], opacity: 0.8 }} />
            <span className="text-white/60">{level}</span>
          </span>
        ))}
        <span className="text-white/30 text-xs ml-1">LOW hidden</span>
      </div>

      {/* Hint when no country selected */}
      {!country && !loading && stats.total > 0 && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[1000]
                        bg-[#1a1a1a]/80 border border-white/10 rounded-lg px-4 py-2 text-xs text-white/50">
          Select a country for district-level detail
        </div>
      )}

      <div ref={containerRef} className="w-full h-full rounded-xl" />
    </div>
  );
}
