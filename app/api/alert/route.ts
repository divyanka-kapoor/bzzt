import { NextRequest, NextResponse } from 'next/server';
import { getEnrollmentsByCityId, logAlert } from '@/lib/store';
import { getCityById } from '@/lib/cities';
import { fetchClimateData } from '@/lib/open-meteo';
import { composeAlertMessage } from '@/lib/openai';
import { sendSMS } from '@/lib/twilio';
import { sendEmail } from '@/lib/agent-mail';
import { selectChannel, sendWhatsApp, sendAfricasTalking, estimateCost } from '@/lib/messaging';
import { logRiskComputation, markAlertSent } from '@/lib/openmetadata';

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

    const lineageEvent = await logRiskComputation(city.id, city.name,
      { source: 'Open-Meteo API', lat: city.lat, lng: city.lng, avgTemp: climate.avgTemp, avgRainfall: climate.avgRainfall, laggedRainfall: climate.laggedRainfall, avgHumidity: climate.avgHumidity },
      { dengue: dengueLevel, malaria: malariaLevel, dengueScore: dengueLevel === 'HIGH' ? 90 : 55, malariaScore: malariaLevel === 'HIGH' ? 88 : 52 },
    );

    const { en: message, local: localMessage, language } = await composeAlertMessage({
      cityId: city.id, city: city.name, country: city.country, dengueLevel, malariaLevel,
    });

    // Calibrated probability score (0–100) based on conditions met
    const conditionsMet = [
      climate.avgTemp > 26, climate.avgRainfall >= 8 && climate.avgRainfall <= 60,
      climate.laggedRainfall >= 8, climate.avgHumidity >= 60,
    ].filter(Boolean).length;
    const probabilityScore = Math.round((conditionsMet / 4) * 100);

    // Combine local + English into one message when local translation exists.
    // SMS limit is 160 chars per segment; keep combined under 320 (2 segments).
    // Format: "[local text]\n---\n[english text]"
    // If no local language for this city, just send English.
    const combinedMessage = localMessage
      ? `${localMessage}\n---\n${message}`
      : message;

    const recipients = await getEnrollmentsByCityId(city.id);
    let sentCount = 0;
    const channelCounts: Record<string, number> = {};

    for (const r of recipients) {
      const channel = selectChannel(city.id, r);
      let smsOk = false;

      if (channel === 'whatsapp') {
        smsOk = await sendWhatsApp(r.phone, combinedMessage);
      } else if (channel === 'africas-talking') {
        smsOk = await sendAfricasTalking(r.phone, combinedMessage);
      } else {
        smsOk = await sendSMS(r.phone, combinedMessage);
      }

      const emailOk = await sendEmail(r.email, `Bzzt Alert — ${city.name}`, combinedMessage);
      if (smsOk || emailOk) {
        sentCount++;
        channelCounts[channel] = (channelCounts[channel] ?? 0) + 1;
      }
    }

    const estimatedCostUsd = Object.entries(channelCounts).reduce(
      (sum, [ch, count]) => sum + estimateCost(ch as 'whatsapp' | 'africas-talking' | 'twilio', count),
      0
    );

    const topRisk: RiskLevel = dengueLevel === 'HIGH' || malariaLevel === 'HIGH' ? 'HIGH' : dengueLevel === 'WATCH' || malariaLevel === 'WATCH' ? 'WATCH' : 'LOW';
    await logAlert({ cityId: city.id, cityName: city.name, country: city.country, message: combinedMessage, recipients: sentCount, type: 'sms', riskLevel: topRisk });
    await markAlertSent(lineageEvent.id, sentCount);

    return NextResponse.json({
      sent: true, recipients: sentCount,
      message, localMessage, language, probabilityScore,
      dengueLevel, malariaLevel,
      channelBreakdown: channelCounts,
      estimatedCostUsd: +estimatedCostUsd.toFixed(4),
    });
  } catch (err) {
    console.error('Alert error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
