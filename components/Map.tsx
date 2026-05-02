'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

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

const RISK_FILL_OPACITY: Record<RiskLevel, number> = {
  HIGH: 0.55, WATCH: 0.40, LOW: 0.25,
};

interface DistrictFeature {
  type: 'Feature';
  geometry: object;
  properties: {
    id: string;
    name: string;
    country: string;
    dengue: RiskLevel;
    malaria: RiskLevel;
    dengueScore: number;
    malariaScore: number;
    topRisk: RiskLevel;
    population?: number;
    computedAt?: string;
    lat?: number;
    lng?: number;
  };
}

function formatPop(n?: number): string {
  if (!n) return 'unknown';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export default function Map({ livePoints }: { livePoints?: CityRisk[] }) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const leafletRef  = useRef<import('leaflet').Map | null>(null);
  const geoLayerRef = useRef<import('leaflet').GeoJSON | null>(null);

  const [mounted,   setMounted]   = useState(false);
  const [countries, setCountries] = useState<string[]>([]);
  const [country,   setCountry]   = useState<string>('');
  const [loading,   setLoading]   = useState(false);
  const [stats,     setStats]     = useState({ high: 0, watch: 0, total: 0 });
  const [hasData,   setHasData]   = useState(false);

  // Load district choropleth data
  const loadDistricts = useCallback(async (selectedCountry?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ level: 'HIGH,WATCH', limit: '600' });
      if (selectedCountry) params.set('country', selectedCountry);

      const res  = await fetch(`/api/district-risks?${params}`);
      const data = await res.json();

      if (!leafletRef.current) return;
      const L = (await import('leaflet')).default;

      // Remove old layer
      if (geoLayerRef.current) {
        geoLayerRef.current.removeFrom(leafletRef.current);
        geoLayerRef.current = null;
      }

      if (!data.features?.length) {
        setHasData(false);
        setLoading(false);
        return;
      }

      setHasData(true);
      if (data.countries?.length) setCountries(data.countries);

      let highCount = 0, watchCount = 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const layer = L.geoJSON(
        { type: 'FeatureCollection' as const, features: data.features } as any,
        {
          style: (feature) => {
            const risk = feature?.properties?.topRisk as RiskLevel ?? 'LOW';
            return {
              fillColor:   RISK_COLOR[risk],
              fillOpacity: RISK_FILL_OPACITY[risk],
              color:       RISK_COLOR[risk],
              weight:      0.8,
              opacity:     0.6,
            };
          },
          onEachFeature: (feature, layer) => {
            const p = feature.properties as DistrictFeature['properties'];
            if (p.topRisk === 'HIGH') highCount++;
            else if (p.topRisk === 'WATCH') watchCount++;

            const popHtml = p.population
              ? `<div style="margin-top:6px;font-size:12px;color:#666">~${formatPop(p.population)} people</div>`
              : '';

            layer.bindPopup(`
              <div style="font-family:sans-serif;padding:8px 10px;min-width:180px">
                <strong style="font-size:14px">${p.name}</strong>
                <div style="color:#888;font-size:12px;margin-bottom:8px">${p.country}</div>
                <div style="display:flex;gap:8px;margin-bottom:4px">
                  <span style="font-size:12px;padding:2px 6px;border-radius:3px;
                    background:${RISK_COLOR[p.dengue]}22;color:${RISK_COLOR[p.dengue]};font-weight:700">
                    Dengue: ${p.dengue}
                  </span>
                  <span style="font-size:12px;padding:2px 6px;border-radius:3px;
                    background:${RISK_COLOR[p.malaria]}22;color:${RISK_COLOR[p.malaria]};font-weight:700">
                    Malaria: ${p.malaria}
                  </span>
                </div>
                ${popHtml}
              </div>
            `);

            const path = layer as import('leaflet').Path;
            path.on('mouseover', () => {
              (layer as import('leaflet').Path).setStyle({ weight: 2, fillOpacity: 0.75 });
            });
            path.on('mouseout', () => {
              (layer as import('leaflet').Path).setStyle({
                weight: 0.8,
                fillOpacity: RISK_FILL_OPACITY[p.topRisk],
              });
            });
          },
        }
      );

      layer.addTo(leafletRef.current);
      geoLayerRef.current = layer;
      setStats({ high: highCount, watch: watchCount, total: data.features.length });

    } catch (err) {
      console.error('District load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Init Leaflet map once
  useEffect(() => {
    setMounted(true);
    if (!mapRef.current || leafletRef.current) return;

    import('leaflet').then(({ default: L }) => {
      // Fix default icon paths for Next.js
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!, {
        center: [10, 20],
        zoom: 2,
        scrollWheelZoom: true,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 18,
      }).addTo(map);

      leafletRef.current = map;
      loadDistricts();
    });

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, [loadDistricts]);

  const handleCountryChange = (c: string) => {
    setCountry(c);
    loadDistricts(c || undefined);
  };

  if (!mounted) return <div className="w-full h-full bg-[#0a0a0a] rounded-xl animate-pulse" />;

  return (
    <div className="relative w-full h-full">
      {/* Controls */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
        {/* Country filter */}
        <select
          value={country}
          onChange={e => handleCountryChange(e.target.value)}
          className="text-xs bg-[#1a1a1a] border border-white/10 text-white/70 rounded-lg px-2 py-1.5
                     hover:border-white/20 focus:outline-none focus:border-white/30 cursor-pointer"
          aria-label="Filter by country"
        >
          <option value="">All countries</option>
          {countries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Stats badge */}
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
          <div className="bg-[#1a1a1a]/90 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/50">
            Loading…
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

      {/* No data state */}
      {!loading && !hasData && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center flex-col gap-3">
          <p className="text-white/40 text-sm">No HIGH or WATCH districts yet.</p>
          <p className="text-white/30 text-xs">Run the daily scan to populate risk data.</p>
        </div>
      )}

      {/* Map container */}
      <div ref={mapRef} className="w-full h-full rounded-xl" style={{ background: '#0a0a0a' }} />
    </div>
  );
}
