export interface City {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
}

export const CITIES: City[] = [
  // Southeast Asia — highest dengue/malaria burden globally
  { id: 'jakarta',        name: 'Jakarta',         country: 'Indonesia',    lat: -6.2088,   lng: 106.8456 },
  { id: 'bangkok',        name: 'Bangkok',          country: 'Thailand',     lat: 13.7563,   lng: 100.5018 },
  { id: 'manila',         name: 'Manila',           country: 'Philippines',  lat: 14.5995,   lng: 120.9842 },
  { id: 'ho-chi-minh',    name: 'Ho Chi Minh City', country: 'Vietnam',      lat: 10.8231,   lng: 106.6297 },
  { id: 'kuala-lumpur',   name: 'Kuala Lumpur',     country: 'Malaysia',     lat: 3.1390,    lng: 101.6869 },
  // South Asia
  { id: 'dhaka',          name: 'Dhaka',            country: 'Bangladesh',   lat: 23.8103,   lng: 90.4125  },
  { id: 'mumbai',         name: 'Mumbai',           country: 'India',        lat: 18.9388,   lng: 72.8354  },
  { id: 'delhi',          name: 'Delhi',            country: 'India',        lat: 28.6448,   lng: 77.2167  },
  { id: 'kolkata',        name: 'Kolkata',          country: 'India',        lat: 22.5726,   lng: 88.3639  },
  { id: 'karachi',        name: 'Karachi',          country: 'Pakistan',     lat: 24.8607,   lng: 67.0011  },
  // Sub-Saharan Africa — malaria endemic
  { id: 'lagos',          name: 'Lagos',            country: 'Nigeria',      lat: 6.5244,    lng: 3.3792   },
  { id: 'kinshasa',       name: 'Kinshasa',         country: 'DRC',          lat: -4.4419,   lng: 15.2663  },
  { id: 'dar-es-salaam',  name: 'Dar es Salaam',    country: 'Tanzania',     lat: -6.7924,   lng: 39.2083  },
  { id: 'nairobi',        name: 'Nairobi',          country: 'Kenya',        lat: -1.2921,   lng: 36.8219  },
  { id: 'accra',          name: 'Accra',            country: 'Ghana',        lat: 5.6037,    lng: -0.1870  },
  // Latin America
  { id: 'sao-paulo',      name: 'São Paulo',        country: 'Brazil',       lat: -23.5505,  lng: -46.6333 },
  { id: 'rio-de-janeiro', name: 'Rio de Janeiro',   country: 'Brazil',       lat: -22.9068,  lng: -43.1729 },
  { id: 'bogota',         name: 'Bogotá',           country: 'Colombia',     lat: 4.7110,    lng: -74.0721 },
  { id: 'lima',           name: 'Lima',             country: 'Peru',         lat: -12.0464,  lng: -77.0428 },
  // Low-risk baselines
  { id: 'cairo',          name: 'Cairo',            country: 'Egypt',        lat: 30.0444,   lng: 31.2357  },
  { id: 'london',         name: 'London',           country: 'UK',           lat: 51.5074,   lng: -0.1278  },
  { id: 'new-york',       name: 'New York',         country: 'USA',          lat: 40.7128,   lng: -74.0060 },
];

export function getCityById(id: string): City | null {
  return CITIES.find(c => c.id === id) || null;
}

export async function geocodeCity(query: string): Promise<{ name: string; country: string; lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Bzzt-HealthAlert/1.0 (public health monitoring)' } });
    if (!res.ok) return null;
    const results = await res.json();
    if (!results.length) return null;
    const r = results[0];
    const country = r.address?.country || '';
    const city = r.address?.city || r.address?.town || r.address?.village || r.display_name.split(',')[0];
    return { name: city, country, lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
  } catch {
    return null;
  }
}
