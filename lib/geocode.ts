const PINCODE_DB: Record<string, { lat: number; lng: number; city: string }> = {
  '110001': { lat: 28.6448,  lng: 77.2167,  city: 'New Delhi' },
  '400001': { lat: 18.9388,  lng: 72.8354,  city: 'Mumbai' },
  '411001': { lat: 18.5204,  lng: 73.8567,  city: 'Pune' },
  '500001': { lat: 17.3850,  lng: 78.4867,  city: 'Hyderabad' },
  '560001': { lat: 12.9716,  lng: 77.5946,  city: 'Bengaluru' },
  '600001': { lat: 13.0827,  lng: 80.2707,  city: 'Chennai' },
  '700001': { lat: 22.5726,  lng: 88.3639,  city: 'Kolkata' },
  '302001': { lat: 26.9124,  lng: 75.7873,  city: 'Jaipur' },
  '380001': { lat: 23.0225,  lng: 72.5714,  city: 'Ahmedabad' },
  '226001': { lat: 26.8467,  lng: 80.9462,  city: 'Lucknow' },
};

export function getLatLngForPincode(pincode: string): { lat: number; lng: number; city: string } | null {
  return PINCODE_DB[pincode] || null;
}

export function getAllPincodes(): Array<{ pincode: string; lat: number; lng: number; city: string }> {
  return Object.entries(PINCODE_DB).map(([pincode, v]) => ({ pincode, ...v }));
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  let closest: string | null = null;
  let minDist = Infinity;
  for (const [pin, coord] of Object.entries(PINCODE_DB)) {
    const d = Math.sqrt((coord.lat - lat) ** 2 + (coord.lng - lng) ** 2);
    if (d < minDist) { minDist = d; closest = pin; }
  }
  return closest;
}
