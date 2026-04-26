'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface RiskPoint {
  pincode: string;
  city: string;
  lat: number;
  lng: number;
  dengue: 'HIGH' | 'WATCH' | 'LOW';
  malaria: 'HIGH' | 'WATCH' | 'LOW';
  dengueScore: number;
  malariaScore: number;
  scannedAt?: string;
}

const STATIC_POINTS: RiskPoint[] = [
  { pincode: '110001', city: 'New Delhi',   lat: 28.6448, lng: 77.2167, dengue: 'WATCH', malaria: 'WATCH', dengueScore: 55, malariaScore: 52 },
  { pincode: '400001', city: 'Mumbai',      lat: 18.9388, lng: 72.8354, dengue: 'HIGH',  malaria: 'HIGH',  dengueScore: 91, malariaScore: 87 },
  { pincode: '411001', city: 'Pune',        lat: 18.5204, lng: 73.8567, dengue: 'HIGH',  malaria: 'WATCH', dengueScore: 88, malariaScore: 58 },
  { pincode: '500001', city: 'Hyderabad',   lat: 17.3850, lng: 78.4867, dengue: 'HIGH',  malaria: 'WATCH', dengueScore: 85, malariaScore: 62 },
  { pincode: '560001', city: 'Bengaluru',   lat: 12.9716, lng: 77.5946, dengue: 'WATCH', malaria: 'LOW',   dengueScore: 61, malariaScore: 22 },
  { pincode: '600001', city: 'Chennai',     lat: 13.0827, lng: 80.2707, dengue: 'WATCH', malaria: 'WATCH', dengueScore: 67, malariaScore: 54 },
  { pincode: '700001', city: 'Kolkata',     lat: 22.5726, lng: 88.3639, dengue: 'HIGH',  malaria: 'HIGH',  dengueScore: 89, malariaScore: 84 },
  { pincode: '302001', city: 'Jaipur',      lat: 26.9124, lng: 75.7873, dengue: 'LOW',   malaria: 'LOW',   dengueScore: 18, malariaScore: 14 },
  { pincode: '380001', city: 'Ahmedabad',   lat: 23.0225, lng: 72.5714, dengue: 'WATCH', malaria: 'LOW',   dengueScore: 49, malariaScore: 28 },
  { pincode: '226001', city: 'Lucknow',     lat: 26.8467, lng: 80.9462, dengue: 'WATCH', malaria: 'WATCH', dengueScore: 58, malariaScore: 55 },
];

const LEVEL_COLOR: Record<string, string> = {
  HIGH: '#ef4444',
  WATCH: '#f59e0b',
  LOW: '#10b981',
};

function topRisk(dengue: string, malaria: string): string {
  if (dengue === 'HIGH' || malaria === 'HIGH') return 'HIGH';
  if (dengue === 'WATCH' || malaria === 'WATCH') return 'WATCH';
  return 'LOW';
}

export default function Map({ livePoints }: { livePoints?: RiskPoint[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const points = livePoints && livePoints.length > 0 ? livePoints : STATIC_POINTS;

  if (!mounted) return <div className="w-full h-full bg-gray-900 rounded-xl animate-pulse" />;

  return (
    <MapContainer center={[20.5937, 78.9629]} zoom={5} scrollWheelZoom={true}
      className="w-full h-full rounded-xl" style={{ background: '#0a0a0a' }}>
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {points.map((p) => {
        const risk = topRisk(p.dengue, p.malaria);
        const color = LEVEL_COLOR[risk];
        return (
          <CircleMarker key={p.pincode} center={[p.lat, p.lng]}
            radius={risk === 'HIGH' ? 16 : risk === 'WATCH' ? 12 : 9}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.3, weight: 2 }}>
            <Popup>
              <div style={{ fontFamily: 'sans-serif', fontSize: 13, padding: '6px 8px', minWidth: 160 }}>
                <strong style={{ fontSize: 14 }}>{p.city}</strong>
                <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 6 }}>PIN {p.pincode}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ background: `${LEVEL_COLOR[p.dengue]}22`, color: LEVEL_COLOR[p.dengue], borderRadius: 4, padding: '2px 8px', fontWeight: 700, fontSize: 11 }}>
                    Dengue {p.dengue}
                  </span>
                  <span style={{ background: `${LEVEL_COLOR[p.malaria]}22`, color: LEVEL_COLOR[p.malaria], borderRadius: 4, padding: '2px 8px', fontWeight: 700, fontSize: 11 }}>
                    Malaria {p.malaria}
                  </span>
                </div>
                {p.scannedAt && (
                  <div style={{ color: '#9ca3af', fontSize: 10, marginTop: 6 }}>
                    Scanned {new Date(p.scannedAt).toLocaleTimeString()}
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
