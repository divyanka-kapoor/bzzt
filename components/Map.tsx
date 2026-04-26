'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
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
  HIGH:  '#F87171', // rose
  WATCH: '#FCD34D', // amber
  LOW:   '#34D399', // mint
};

const RISK_SIZE: Record<RiskLevel, number> = {
  HIGH: 13, WATCH: 10, LOW: 7,
};

function dengueIcon(level: RiskLevel): L.DivIcon {
  const c = RISK_COLOR[level];
  const r = RISK_SIZE[level];
  const d = r * 2;
  return L.divIcon({
    html: `<svg width="${d}" height="${d}" viewBox="0 0 ${d} ${d}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${r}" cy="${r}" r="${r - 1}" fill="${c}" fill-opacity="0.85" stroke="#0a0a0a" stroke-width="1.2"/>
    </svg>`,
    className: '',
    iconSize: [d, d],
    iconAnchor: [r, r],
  });
}

function malariaIcon(level: RiskLevel): L.DivIcon {
  const c = RISK_COLOR[level];
  const s = RISK_SIZE[level] * 2; // total svg size
  const h = s / 2;
  // Diamond: top, right, bottom, left
  return L.divIcon({
    html: `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">
      <path d="M${h} 1 L${s - 1} ${h} L${h} ${s - 1} L1 ${h} Z"
        fill="${c}" fill-opacity="0.85" stroke="#0a0a0a" stroke-width="1.2"/>
    </svg>`,
    className: '',
    iconSize: [s, s],
    iconAnchor: [h, h],
  });
}

// Offset dengue slightly west, malaria slightly east so they sit side-by-side
const LNG_OFFSET = 0.4;

function RiskLabel({ level }: { level: RiskLevel }) {
  const color = RISK_COLOR[level];
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${color}22`, color }}>
      {level}
    </span>
  );
}

export default function Map({ livePoints }: { livePoints?: CityRisk[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-full h-full bg-[#0a0a0a] rounded-xl animate-pulse" />;

  if (!livePoints || livePoints.length === 0) {
    return (
      <div className="w-full h-full bg-[#0a0a0a] rounded-xl flex items-center justify-center flex-col gap-3"
        role="status" aria-label="Loading map data">
        <div className="w-4 h-4 border border-white/20 rounded-full animate-pulse" aria-hidden="true" />
        <p className="text-white/60 text-xs">Scanning cities…</p>
      </div>
    );
  }

  return (
    <MapContainer center={[15, 25]} zoom={2} scrollWheelZoom={true}
      className="w-full h-full rounded-xl" style={{ background: '#0a0a0a' }}
      aria-label={`Global disease risk map showing ${livePoints.length} cities. Circle markers show dengue risk, diamond markers show malaria risk.`}>
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {livePoints.map((city) => (
        <div key={city.id}>
          {/* Dengue — circle, offset west */}
          <Marker
            position={[city.lat, city.lng - LNG_OFFSET]}
            icon={dengueIcon(city.dengue)}
            aria-label={`${city.name} dengue risk: ${city.dengue}`}
          >
            <Popup>
              <div style={{ fontFamily: 'sans-serif', padding: '8px 10px', minWidth: 180 }}>
                <strong style={{ fontSize: 14 }}>{city.name}</strong>
                <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 8 }}>{city.country}</div>
                <div style={{ marginBottom: 4 }}>
                  <span aria-hidden="true" style={{ fontSize: 10, color: '#9ca3af', marginRight: 6 }}>◉</span>
                  <span style={{ fontSize: 10, color: '#9ca3af', marginRight: 6 }}>Dengue</span>
                  <RiskLabel level={city.dengue} />
                </div>
                <div style={{ fontSize: 10, color: '#9ca3af' }}>Score: {city.dengueScore}/100</div>
              </div>
            </Popup>
          </Marker>

          {/* Malaria — diamond, offset east */}
          <Marker
            position={[city.lat, city.lng + LNG_OFFSET]}
            icon={malariaIcon(city.malaria)}
            aria-label={`${city.name} malaria risk: ${city.malaria}`}
          >
            <Popup>
              <div style={{ fontFamily: 'sans-serif', padding: '8px 10px', minWidth: 180 }}>
                <strong style={{ fontSize: 14 }}>{city.name}</strong>
                <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 8 }}>{city.country}</div>
                <div style={{ marginBottom: 4 }}>
                  <span aria-hidden="true" style={{ fontSize: 10, color: '#9ca3af', marginRight: 6 }}>◆</span>
                  <span style={{ fontSize: 10, color: '#9ca3af', marginRight: 6 }}>Malaria</span>
                  <RiskLabel level={city.malaria} />
                </div>
                <div style={{ fontSize: 10, color: '#9ca3af' }}>Score: {city.malariaScore}/100</div>
              </div>
            </Popup>
          </Marker>
        </div>
      ))}
    </MapContainer>
  );
}
