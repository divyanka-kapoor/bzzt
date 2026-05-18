'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import { L2_COUNTRIES } from '@/lib/config';
import { formatDistrictName } from '@/lib/format';

export interface CityRisk {
  id: string; name: string; country: string;
  lat: number; lng: number;
  dengue: 'HIGH' | 'WATCH' | 'LOW';
  malaria: 'HIGH' | 'WATCH' | 'LOW';
  dengueScore: number; malariaScore: number;
  scannedAt?: string;
}

type RiskLevel = 'HIGH' | 'ALERT' | 'WATCH' | 'LOW';

// Two-tier colorblind-safe palette:
// HIGH (≥0.6): vermilion-red — bright, saturated, universally reads as danger
// WATCH (0.35–0.6): amber — lighter luminance, distinguishable from red even for deuteranopes
// ALERT merged into HIGH in the API — three tiers added confusion with no user value
const RISK_COLOR: Record<RiskLevel, string> = {
  HIGH:  '#CC3311', // vermilion red
  ALERT: '#CC3311', // same as HIGH — merged visually
  WATCH: '#FFAA44', // amber — lighter, still urgent
  LOW:   '#2A5A4A', // very dark teal — barely visible outline only
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
  const [stats,        setStats]        = useState({ high: 0, alert: 0, watch: 0, total: 0 });
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [countryBounds, setCountryBounds] = useState<Record<string, [[number,number],[number,number]]>>({});

  // Load country bounds dynamically from DB — scales with any new countries added
  useEffect(() => {
    fetch('/api/country-bounds')
      .then(r => r.json())
      .then(setCountryBounds)
      .catch(() => {});
  }, []);

  const loadDistricts = useCallback(async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map: any, L: any, selectedCountry: string, level: number
  ) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        level: 'HIGH,ALERT,WATCH,LOW',
        limit: level === 2 ? '1500' : '800',
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
        setStats({ high: 0, alert: 0, watch: 0, total: 0 });
        setLoading(false);
        return;
      }

      let high = 0, alert = 0, watch = 0;

      const layer = L.geoJSON(data.features, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style: (feature: any) => {
          const risk: RiskLevel = feature?.properties?.topRisk ?? 'LOW';
          return {
            fillColor: RISK_COLOR[risk],
            fillOpacity: risk === 'HIGH' || risk === 'ALERT' ? 0.70 : risk === 'LOW' ? 0.08 : 0.50,
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
          else if (topRisk === 'ALERT') alert++;
          else if (topRisk === 'WATCH') watch++;

          const dengueColor  = RISK_COLOR[(p.dengue  as RiskLevel) ?? 'LOW'];
          const malariaColor = RISK_COLOR[(p.malaria as RiskLevel) ?? 'LOW'];

          const displayName = formatDistrictName(p.name as string);
          const scannedDate = p.computedAt
            ? new Date(p.computedAt as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : null;

          // Peak window: anchored to the 10-12 week lagged rainfall signal.
          // The lagged_rainfall in our model is rainfall from 10-12 weeks ago —
          // that breeding event is what drives the upcoming case peak.
          // Remaining weeks = lag - time already elapsed since signal date.
          // Dengue (Aedes aegypti): 8–10 wks total lag
          // Malaria (Anopheles):   10–14 wks total lag
          const dengueLevel  = p.dengue  as string;
          const malariaLevel = p.malaria as string;
          let minLag = 10, maxLag = 14;
          if (dengueLevel === 'HIGH' && malariaLevel === 'HIGH') { minLag = 8;  maxLag = 14; }
          else if (dengueLevel === 'HIGH')                        { minLag = 8;  maxLag = 10; }
          else if (malariaLevel === 'HIGH')                       { minLag = 10; maxLag = 14; }
          else                                                    { minLag = 10; maxLag = 16; }

          // Signal date = midpoint of the lagged window (≈ 11 weeks ago from scan)
          const MS_WEEK    = 7 * 24 * 60 * 60 * 1000;
          const scanDate   = p.computedAt ? new Date(p.computedAt as string) : new Date();
          const signalDate = new Date(scanDate.getTime() - 11 * MS_WEEK); // when rainfall actually occurred
          const today      = new Date();
          const peakStart  = new Date(signalDate.getTime() + minLag * MS_WEEK);
          const peakEnd    = new Date(signalDate.getTime() + maxLag * MS_WEEK);
          const wksToStart = Math.round((peakStart.getTime() - today.getTime()) / MS_WEEK);
          const wksToEnd   = Math.round((peakEnd.getTime()   - today.getTime()) / MS_WEEK);
          const fmtD       = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

          let peakLabel: string;
          if (wksToEnd < 0) {
            peakLabel = `<span style="color:#F87171">⚠ Peak may have passed (was ${fmtD(peakEnd)})</span>`;
          } else if (wksToStart <= 0) {
            peakLabel = `<span style="color:#F87171">🔴 Peak window active — through ${fmtD(peakEnd)}</span>`;
          } else {
            peakLabel = `Peak in ~${wksToStart}–${wksToEnd} wks &nbsp;(${fmtD(peakStart)} – ${fmtD(peakEnd)})`;
          }

          const scoreBar = (score: number, color: string) =>
            `<div style="background:#333;border-radius:2px;height:4px;width:100%;margin-top:3px">
               <div style="background:${color};border-radius:2px;height:4px;width:${Math.min(score,100)}%"></div>
             </div>`;

          lyr.bindPopup(`
            <div style="font-family:sans-serif;padding:10px 12px;min-width:210px;max-width:260px">
              <strong style="font-size:14px">${displayName}</strong>
              <div style="color:#888;font-size:11px;margin-bottom:10px">${p.country}</div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
                <div>
                  <div style="font-size:11px;color:#aaa;margin-bottom:2px">Dengue</div>
                  <span style="font-size:12px;padding:2px 7px;border-radius:3px;
                    background:${dengueColor}22;color:${dengueColor};font-weight:700">${p.dengue}</span>
                  ${scoreBar(p.dengueScore as number, dengueColor)}
                  <div style="font-size:10px;color:#666;margin-top:2px">${p.dengueScore ?? '—'}% outbreak probability</div>
                </div>
                <div>
                  <div style="font-size:11px;color:#aaa;margin-bottom:2px">Malaria</div>
                  <span style="font-size:12px;padding:2px 7px;border-radius:3px;
                    background:${malariaColor}22;color:${malariaColor};font-weight:700">${p.malaria}</span>
                  ${scoreBar(p.malariaScore as number, malariaColor)}
                  <div style="font-size:10px;color:#666;margin-top:2px">${p.malariaScore ?? '—'}% outbreak probability</div>
                </div>
              </div>

              <div style="border-top:1px solid #333;padding-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:4px">
                ${p.population ? `<div style="font-size:11px;color:#888">👥 ~${formatPop(p.population as number)}</div>` : ''}
                ${p.avgTemp     != null ? `<div style="font-size:11px;color:#888">🌡 ${(p.avgTemp     as number).toFixed(1)}°C</div>` : ''}
                ${p.avgRainfall != null ? `<div style="font-size:11px;color:#888">🌧 ${(p.avgRainfall as number).toFixed(0)}mm</div>` : ''}
                ${p.avgHumidity != null ? `<div style="font-size:11px;color:#888">💧 ${(p.avgHumidity as number).toFixed(0)}% humidity</div>` : ''}
              </div>
              <div style="font-size:10px;color:#666;margin-top:7px;line-height:1.5">
                ${peakLabel}<br>
                ${scannedDate ? `<span style="color:#444">Signal assessed ${scannedDate}</span>` : ''}
              </div>
            </div>
          `);
          lyr.on('mouseover', () => lyr.setStyle({ weight: 2, fillOpacity: 0.85 }));
          lyr.on('mouseout',  () => lyr.setStyle({ weight: level === 2 ? 0.5 : 0.8, fillOpacity: (topRisk === 'HIGH' || topRisk === 'ALERT') ? 0.70 : topRisk === 'LOW' ? 0.08 : 0.50 }));
        },
      });

      layer.addTo(map);
      layerRef.current = layer;
      setStats({ high, alert, watch, total: data.features.length });
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
        if (z >= 5) {
          // Level switching handled by country filter UX
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

    // Fly to country bounds — sourced dynamically from DB via /api/country-bounds
    if (c && countryBounds[c]) {
      mapRef.current.flyToBounds(countryBounds[c], { padding: [20, 20], duration: 1 });
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
            <span className="font-bold" style={{ color: '#CC3311' }}>{stats.high + stats.alert} HIGH</span>
            <span className="text-white/30">·</span>
            <span className="font-bold" style={{ color: '#FFAA44' }}>{stats.watch} WATCH</span>
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
        {(['HIGH', 'WATCH'] as RiskLevel[]).map(l => (
          <span key={l} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: RISK_COLOR[l], opacity: 0.85 }} />
            <span className="text-white/60">{l}</span>
          </span>
        ))}
        <span className="text-white/30 text-xs ml-1">LOW shown as outline</span>
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
