'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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
  scannedAt?: string;
}

function topRisk(dengue: string, malaria: string): 'HIGH' | 'WATCH' | 'LOW' {
  if (dengue === 'HIGH' || malaria === 'HIGH') return 'HIGH';
  if (dengue === 'WATCH' || malaria === 'WATCH') return 'WATCH';
  return 'LOW';
}

const LEVEL_STYLE: Record<string, { color: string; opacity: number; radius: number }> = {
  HIGH:  { color: '#ffffff', opacity: 0.9,  radius: 14 },
  WATCH: { color: '#9ca3af', opacity: 0.65, radius: 10 },
  LOW:   { color: '#374151', opacity: 0.5,  radius: 7  },
};

export default function Map({ livePoints }: { livePoints?: CityRisk[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-full h-full bg-[#0a0a0a] rounded-xl animate-pulse" />;

  if (!livePoints || livePoints.length === 0) {
    return (
      <div className="w-full h-full bg-[#0a0a0a] rounded-xl flex items-center justify-center">
        <p className="text-white/30 text-sm">Scanning cities…</p>
      </div>
    );
  }

  return (
    <MapContainer center={[15, 30]} zoom={2} scrollWheelZoom={true}
      className="w-full h-full rounded-xl" style={{ background: '#0a0a0a' }}>
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {livePoints.map((p) => {
        const risk = topRisk(p.dengue, p.malaria);
        const s = LEVEL_STYLE[risk];
        return (
          <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={s.radius}
            pathOptions={{ color: s.color, fillColor: s.color, fillOpacity: s.opacity * 0.25, weight: 1.5, opacity: s.opacity }}>
            <Popup>
              <div style={{ fontFamily: 'sans-serif', fontSize: 13, padding: '6px 10px', minWidth: 170 }}>
                <strong style={{ fontSize: 14 }}>{p.name}</strong>
                <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 8 }}>{p.country}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(['dengue', 'malaria'] as const).map(d => (
                    <span key={d} style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                      background: p[d] === 'HIGH' ? '#fff' : p[d] === 'WATCH' ? '#9ca3af30' : '#37415130',
                      color: p[d] === 'HIGH' ? '#000' : p[d] === 'WATCH' ? '#9ca3af' : '#4b5563',
                    }}>
                      {d.charAt(0).toUpperCase() + d.slice(1)} {p[d]}
                    </span>
                  ))}
                </div>
                {p.scannedAt && (
                  <div style={{ color: '#9ca3af', fontSize: 10, marginTop: 6 }}>
                    {new Date(p.scannedAt).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
