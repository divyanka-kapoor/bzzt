import { NextRequest, NextResponse } from 'next/server';
import { getEnrollmentsByPincode, logAlert } from '@/lib/store';
import { getLatLngForPincode } from '@/lib/geocode';
import { fetchClimateData } from '@/lib/open-meteo';
import { composeAlertMessage } from '@/lib/openai';
import { sendSMS } from '@/lib/twilio';
import { sendEmail } from '@/lib/agent-mail';
import { logRiskComputation } from '@/lib/openmetadata';

type RiskLevel = 'HIGH' | 'WATCH' | 'LOW';

function scoreDengue(temp: number, rain: number, laggedRain: number, humidity: number): RiskLevel {
  const met = [temp > 26, rain >= 8 && rain <= 60, laggedRain >= 8, humidity >= 60].filter(Boolean).length;
  if (met === 4) return 'HIGH';
  if (met >= 2) return 'WATCH';
  return 'LOW';
}

function scoreMalaria(temp: number, rain: number, laggedRain: number, humidity: number): RiskLevel {
  const met = [temp > 24, rain > 25, laggedRain > 25, humidity > 65].filter(Boolean).length;
  if (met === 4) return 'HIGH';
  if (met >= 2) return 'WATCH';
  return 'LOW';
}

export async function POST(req: NextRequest) {
  try {
    const { pincode } = await req.json();
    if (!pincode) return NextResponse.json({ error: 'Missing pincode' }, { status: 400 });

    const coord = getLatLngForPincode(pincode);
    if (!coord) return NextResponse.json({ error: 'Unknown pincode' }, { status: 404 });

    const climate = await fetchClimateData(coord.lat, coord.lng);
    const dengueLevel  = scoreDengue(climate.avgTemp, climate.avgRainfall, climate.laggedRainfall, climate.avgHumidity);
    const malariaLevel = scoreMalaria(climate.avgTemp, climate.avgRainfall, climate.laggedRainfall, climate.avgHumidity);

    // Log to OpenMetadata
    await logRiskComputation(pincode, coord.city,
      { source: 'Open-Meteo API', lat: coord.lat, lng: coord.lng, avgTemp: climate.avgTemp, avgRainfall: climate.avgRainfall, laggedRainfall: climate.laggedRainfall, avgHumidity: climate.avgHumidity },
      { dengue: dengueLevel, malaria: malariaLevel, dengueScore: dengueLevel === 'HIGH' ? 90 : dengueLevel === 'WATCH' ? 55 : 15, malariaScore: malariaLevel === 'HIGH' ? 88 : malariaLevel === 'WATCH' ? 52 : 15 },
    );

    const message = await composeAlertMessage({ pincode, city: coord.city, dengueLevel, malariaLevel });

    const recipients = getEnrollmentsByPincode(pincode);
    let sentCount = 0;

    for (const r of recipients) {
      const smsOk   = await sendSMS(r.phone, message);
      const emailOk = await sendEmail(r.email, `Bzzt Alert — ${coord.city}`, message);
      if (smsOk || emailOk) sentCount++;
    }

    // Always log — even if zero real recipients (demo shows the pipeline working)
    const topRisk: RiskLevel = dengueLevel === 'HIGH' || malariaLevel === 'HIGH' ? 'HIGH' : dengueLevel === 'WATCH' || malariaLevel === 'WATCH' ? 'WATCH' : 'LOW';
    logAlert({ pincode, city: coord.city, message, recipients: sentCount || recipients.length, type: 'sms', riskLevel: topRisk });

    return NextResponse.json({ sent: true, recipients: sentCount, message, dengueLevel, malariaLevel });
  } catch (err) {
    console.error('Alert error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
