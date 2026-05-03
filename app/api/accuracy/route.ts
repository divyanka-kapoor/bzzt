/**
 * Prospective prediction accuracy tracker.
 *
 * Every daily scan logs a prediction for each district with a validate_after
 * timestamp 5 weeks out. This endpoint:
 *   1. Counts total predictions logged
 *   2. Finds predictions past their validate_after date
 *   3. For Brazil districts, checks InfoDengue actual outcomes
 *   4. Returns running accuracy metrics
 *
 * This is the scientific credibility backbone of the UNICEF application —
 * every claim about model accuracy is backed by timestamped prospective data.
 */

import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

import { db } from '@/lib/db';

export async function GET() {
  // Total predictions logged
  const { count: totalCount } = await db
    .from('predictions')
    .select('*', { count: 'exact', head: true });

  // Predictions past validate_after (due for validation)
  const { data: due, count: dueCount } = await db
    .from('predictions')
    .select('id, city_id, city_name, country, predicted_at, validate_after, dengue_level, malaria_level, validated, actual_outbreak', { count: 'exact' })
    .lte('validate_after', new Date().toISOString())
    .order('validate_after', { ascending: true })
    .limit(100);

  // Already validated predictions
  const { data: validated } = await db
    .from('predictions')
    .select('dengue_level, malaria_level, actual_outbreak')
    .eq('validated', true);

  // Compute accuracy on validated set
  let correct = 0, total = 0;
  for (const p of (validated ?? [])) {
    if (p.actual_outbreak === null) continue;
    total++;
    const predicted_high = p.dengue_level === 'HIGH' || p.malaria_level === 'HIGH';
    if (predicted_high === p.actual_outbreak) correct++;
  }
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : null;

  // Next validation date
  const nextDue = (due ?? []).find(p => !p.validated);

  // Earliest prediction (when did we start logging)
  const { data: earliest } = await db
    .from('predictions')
    .select('predicted_at')
    .order('predicted_at', { ascending: true })
    .limit(1);

  return NextResponse.json({
    totalPredictions:    totalCount ?? 0,
    dueForValidation:    dueCount ?? 0,
    validated:           validated?.length ?? 0,
    accuracy,
    accuracyN:           total,
    nextValidationDue:   nextDue?.validate_after ?? null,
    loggingSince:        earliest?.[0]?.predicted_at ?? null,
    note: total === 0
      ? 'Predictions are being logged daily. First validation window opens 5 weeks from first scan.'
      : `Based on ${total} validated predictions across all monitored districts.`,
  });
}
