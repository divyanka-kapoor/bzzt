import { NextRequest, NextResponse } from 'next/server';
import { saveEnrollment } from '@/lib/store';
import { geocodeCity } from '@/lib/cities';
import { sendSMS } from '@/lib/twilio';

export async function POST(req: NextRequest) {
  try {
    const { phone, email, location } = await req.json();
    if (!location) return NextResponse.json({ success: false, error: 'Location required' }, { status: 400 });
    if (!phone && !email) return NextResponse.json({ success: false, error: 'Phone or email required' }, { status: 400 });

    const geo = await geocodeCity(location);
    if (!geo) return NextResponse.json({ success: false, error: 'Location not found — try a different city name' }, { status: 404 });

    const cityId = geo.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    saveEnrollment({ phone: phone || '', email: email || '', cityId, cityName: geo.name, country: geo.country, lat: geo.lat, lng: geo.lng });

    if (phone) {
      const msg = `Bzzt: You're enrolled for disease risk alerts in ${geo.name}, ${geo.country}. We monitor climate signals and warn you before outbreaks.`;
      await sendSMS(phone, msg);
    }

    return NextResponse.json({ success: true, cityName: geo.name, country: geo.country });
  } catch (err) {
    console.error('Enroll error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
