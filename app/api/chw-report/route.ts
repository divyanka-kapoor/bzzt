/**
 * Community Health Worker (CHW) symptom reporting endpoint.
 *
 * Accepts reports via:
 *   POST /api/chw-report  (JSON body from app/WhatsApp webhook)
 *   GET  /api/chw-report  (aggregate stats for dashboard)
 *
 * Each report: fever cases, suspected dengue, suspected malaria, RDT positives.
 * Reports are stored in chw_reports table and aggregate back into the model
 * as near-real-time ground truth — the data flywheel that improves accuracy
 * in communities with no formal surveillance.
 *
 * This is the last-mile layer: a CHW in rural Chhattisgarh with a feature
 * phone can dial the USSD code, enter their weekly case counts, and that
 * data immediately enriches the risk scores for their district.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ── POST — submit a CHW report ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lat, lng, feverCases, suspectedDengue, suspectedMalaria, rdtPositive, reporterPhone } = body;

    if (!lat || !lng) {
      return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
    }

    // Find nearest district
    const { data: districts } = await db
      .from('districts')
      .select('id, district, country')
      .gte('lat', lat - 1).lte('lat', lat + 1)
      .gte('lng', lng - 1).lte('lng', lng + 1)
      .limit(5);

    // Simple nearest by Euclidean distance
    let nearestDistrict: string | null = null;
    if (districts?.length) {
      const { data: allDistricts } = await db
        .from('districts')
        .select('id, lat, lng')
        .gte('lat', lat - 1).lte('lat', lat + 1)
        .gte('lng', lng - 1).lte('lng', lng + 1);

      if (allDistricts?.length) {
        const nearest = allDistricts.reduce((a, b) =>
          Math.hypot(a.lat - lat, a.lng - lng) < Math.hypot(b.lat - lat, b.lng - lng) ? a : b
        );
        nearestDistrict = nearest.id;
      }
    }

    const { error } = await db.from('chw_reports').insert({
      lat,
      lng,
      district_id:       nearestDistrict,
      fever_cases:       feverCases ?? 0,
      suspected_dengue:  suspectedDengue ?? 0,
      suspected_malaria: suspectedMalaria ?? 0,
      rdt_positive:      rdtPositive ?? 0,
      reporter_phone:    reporterPhone ?? null,
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      district: nearestDistrict,
      message: 'Report received. Thank you for contributing to disease surveillance.',
    });
  } catch (err) {
    console.error('[chw-report]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── GET — aggregate stats for dashboard ──────────────────────────────────────
export async function GET() {
  try {
    // Reports in last 30 days
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: reports } = await db
      .from('chw_reports')
      .select('district_id, fever_cases, suspected_dengue, suspected_malaria, rdt_positive, reported_at')
      .gte('reported_at', cutoff)
      .order('reported_at', { ascending: false })
      .limit(500);

    const totalReports    = reports?.length ?? 0;
    const totalFever      = reports?.reduce((s, r) => s + (r.fever_cases ?? 0), 0) ?? 0;
    const totalDengue     = reports?.reduce((s, r) => s + (r.suspected_dengue ?? 0), 0) ?? 0;
    const totalMalaria    = reports?.reduce((s, r) => s + (r.suspected_malaria ?? 0), 0) ?? 0;
    const totalRDTPos     = reports?.reduce((s, r) => s + (r.rdt_positive ?? 0), 0) ?? 0;

    // Districts with reports
    const districtsWithReports = new Set(reports?.map(r => r.district_id).filter(Boolean)).size;

    return NextResponse.json({
      last30Days: {
        reports:            totalReports,
        feverCases:         totalFever,
        suspectedDengue:    totalDengue,
        suspectedMalaria:   totalMalaria,
        rdtPositive:        totalRDTPos,
        districtsReporting: districtsWithReports,
      },
      recentReports: (reports ?? []).slice(0, 10).map(r => ({
        districtId:      r.district_id,
        feverCases:      r.fever_cases,
        suspectedDengue: r.suspected_dengue,
        suspectedMalaria: r.suspected_malaria,
        rdtPositive:     r.rdt_positive,
        reportedAt:      r.reported_at,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
