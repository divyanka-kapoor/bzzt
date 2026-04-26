import { NextRequest, NextResponse } from 'next/server';
import { getEnrollmentsByCityId, logAlert } from '@/lib/store';
import { getCityById } from '@/lib/cities';
import { fetchClimateData } from '@/lib/open-meteo';
import { composeAlertMessage } from '@/lib/openai';
import { sendSMS } from '@/lib/twilio';
import { sendEmail } from '@/lib/agent-mail';
import { logRiskComputation } from '@/lib/openmetadata';

type RiskLevel = 'HIGH' | 'WATCH' | 'LOW';

function scoreDengue(temp: number, rain: number, laggedRain: number, humidity: number): RiskLevel {
  const met = [temp > 26, rain >= 8 && rain <= 60, laggedRain >= 8, humidity >= 60].filter(Boolean).length;
  if (met >= 3) return 'HIGH';
  if (met >= 2) return 'WATCH';
  return 'LOW';
}

function scoreMalaria(temp: number, rain: number, laggedRain: number, humidity: number): RiskLevel {
  const met = [temp > 24, rain > 25, laggedRain > 25, humidity > 65].filter(Boolean).length;
  if (met >= 3) return 'HIGH';
  if (met >= 2) return 'WATCH';
  return 'LOW';
}

export async function POST(req: NextRequest) {
  try {
    const { cityId } = await req.json();
    if (!cityId) return NextResponse.json({ error: 'Missing cityId' }, { status: 400 });

    const city = getCityById(cityId);
    if (!city) return NextResponse.json({ error: 'Unknown city' }, { status: 404 });

    const climate = await fetchClimateData(city.lat, city.lng);
    const dengueLevel  = scoreDengue(climate.avgTemp, climate.avgRainfall, climate.laggedRainfall, climate.avgHumidity);
    const malariaLevel = scoreMalaria(climate.avgTemp, climate.avgRainfall, climate.laggedRainfall, climate.avgHumidity);

    await logRiskComputation(city.id, city.name,
      { source: 'Open-Meteo API', lat: city.lat, lng: city.lng, avgTemp: climate.avgTemp, avgRainfall: climate.avgRainfall, laggedRainfall: climate.laggedRainfall, avgHumidity: climate.avgHumidity },
      { dengue: dengueLevel, malaria: malariaLevel, dengueScore: dengueLevel === 'HIGH' ? 90 : 55, malariaScore: malariaLevel === 'HIGH' ? 88 : 52 },
    );

    const message = await composeAlertMessage({ cityId: city.id, city: city.name, country: city.country, dengueLevel, malariaLevel });

    const recipients = getEnrollmentsByCityId(city.id);
    let sentCount = 0;
    for (const r of recipients) {
      const smsOk   = await sendSMS(r.phone, message);
      const emailOk = await sendEmail(r.email, `Bzzt Alert — ${city.name}`, message);
      if (smsOk || emailOk) sentCount++;
    }

    const topRisk: RiskLevel = dengueLevel === 'HIGH' || malariaLevel === 'HIGH' ? 'HIGH' : dengueLevel === 'WATCH' || malariaLevel === 'WATCH' ? 'WATCH' : 'LOW';
    logAlert({ cityId: city.id, cityName: city.name, country: city.country, message, recipients: sentCount, type: 'sms', riskLevel: topRisk });

    return NextResponse.json({ sent: true, recipients: sentCount, message, dengueLevel, malariaLevel });
  } catch (err) {
    console.error('Alert error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
