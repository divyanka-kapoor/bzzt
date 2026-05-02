/**
 * Persistent store — backed by Supabase.
 * All functions mirror the previous in-memory API so no other files need changing.
 */

import { db, DbEnrollment, DbAlertLog, DbPrediction, RiskLevel } from './db';

// ── Types (kept for backwards compat with existing API routes) ────────────────

export interface Enrollment {
  phone: string;
  email: string;
  cityId: string;
  cityName: string;
  country: string;
  lat: number;
  lng: number;
  whatsapp?: boolean;
  enrolledAt: string;
}

export interface AlertLog {
  id: string;
  cityId: string;
  cityName: string;
  country: string;
  message: string;
  recipients: number;
  sentAt: string;
  type: 'sms' | 'email';
  riskLevel: RiskLevel;
}

export interface ProspectivePrediction {
  id: string;
  cityId: string;
  city: string;
  country: string;
  predictedAt: string;
  validateAfter: string;
  dengueLevel: RiskLevel;
  malariaLevel: RiskLevel;
  probabilityScore: number;
  climate: { avgTemp: number; avgRainfall: number; laggedRainfall: number; avgHumidity: number };
  validated: boolean;
  actualOutbreak: boolean | null;
}

// ── Enrollments ───────────────────────────────────────────────────────────────

export async function saveEnrollment(data: Omit<Enrollment, 'enrolledAt'>): Promise<Enrollment> {
  const row: DbEnrollment = {
    phone:     data.phone || undefined,
    email:     data.email || undefined,
    city_id:   data.cityId,
    city_name: data.cityName,
    country:   data.country,
    lat:       data.lat,
    lng:       data.lng,
    whatsapp:  data.whatsapp ?? false,
  };
  const { data: inserted, error } = await db.from('enrollments').insert(row).select().single();
  if (error) throw error;
  return toEnrollment(inserted);
}

export async function getEnrollmentsByCityId(cityId: string): Promise<Enrollment[]> {
  const { data, error } = await db
    .from('enrollments')
    .select()
    .eq('city_id', cityId);
  if (error) throw error;
  return (data ?? []).map(toEnrollment);
}

export async function getEnrollmentsByLatLng(lat: number, lng: number, radiusDeg = 0.5): Promise<Enrollment[]> {
  const { data, error } = await db
    .from('enrollments')
    .select()
    .gte('lat', lat - radiusDeg)
    .lte('lat', lat + radiusDeg)
    .gte('lng', lng - radiusDeg)
    .lte('lng', lng + radiusDeg);
  if (error) throw error;
  return (data ?? []).map(toEnrollment);
}

export async function getAllEnrollments(): Promise<Enrollment[]> {
  const { data, error } = await db.from('enrollments').select();
  if (error) throw error;
  return (data ?? []).map(toEnrollment);
}

function toEnrollment(r: DbEnrollment & { enrolled_at?: string }): Enrollment {
  return {
    phone:      r.phone ?? '',
    email:      r.email ?? '',
    cityId:     r.city_id ?? '',
    cityName:   r.city_name,
    country:    r.country,
    lat:        r.lat,
    lng:        r.lng,
    whatsapp:   r.whatsapp ?? false,
    enrolledAt: r.enrolled_at ?? new Date().toISOString(),
  };
}

// ── Alert logs ────────────────────────────────────────────────────────────────

export async function logAlert(alert: Omit<AlertLog, 'id' | 'sentAt'>): Promise<AlertLog> {
  const id = Math.random().toString(36).slice(2, 10);
  const row: DbAlertLog = {
    id,
    city_id:   alert.cityId,
    city_name: alert.cityName,
    country:   alert.country,
    message:   alert.message,
    recipients: alert.recipients,
    channel:   alert.type,
    risk_level: alert.riskLevel,
  };
  const { error } = await db.from('alert_logs').insert(row);
  if (error) throw error;
  return { ...alert, id, sentAt: new Date().toISOString() };
}

export async function getAlertLogs(): Promise<AlertLog[]> {
  const { data, error } = await db
    .from('alert_logs')
    .select()
    .order('sent_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map(r => ({
    id:         r.id,
    cityId:     r.city_id ?? '',
    cityName:   r.city_name,
    country:    r.country,
    message:    r.message,
    recipients: r.recipients ?? 0,
    sentAt:     r.sent_at,
    type:       (r.channel as 'sms' | 'email') ?? 'sms',
    riskLevel:  r.risk_level as RiskLevel,
  }));
}

// ── Prospective predictions ───────────────────────────────────────────────────

export async function logPrediction(
  data: Omit<ProspectivePrediction, 'id' | 'predictedAt' | 'validateAfter' | 'validated' | 'actualOutbreak'>
): Promise<ProspectivePrediction> {
  const now          = new Date();
  const validateAfter = new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000);
  const id           = Math.random().toString(36).slice(2, 10);

  const row: DbPrediction = {
    id,
    city_id:          data.cityId,
    city_name:        data.city,
    country:          data.country,
    predicted_at:     now.toISOString(),
    validate_after:   validateAfter.toISOString(),
    dengue_level:     data.dengueLevel,
    malaria_level:    data.malariaLevel,
    probability_score: data.probabilityScore,
    avg_temp:         data.climate.avgTemp,
    avg_rainfall:     data.climate.avgRainfall,
    lagged_rainfall:  data.climate.laggedRainfall,
    avg_humidity:     data.climate.avgHumidity,
  };

  const { error } = await db.from('predictions').insert(row);
  if (error) console.warn('[store] prediction insert failed:', error.message);

  return {
    ...data,
    id,
    predictedAt:  now.toISOString(),
    validateAfter: validateAfter.toISOString(),
    validated:    false,
    actualOutbreak: null,
  };
}

export async function getPredictions(): Promise<ProspectivePrediction[]> {
  const { data, error } = await db
    .from('predictions')
    .select()
    .order('predicted_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map(r => ({
    id:             r.id,
    cityId:         r.city_id ?? '',
    city:           r.city_name,
    country:        r.country,
    predictedAt:    r.predicted_at,
    validateAfter:  r.validate_after,
    dengueLevel:    r.dengue_level as RiskLevel,
    malariaLevel:   r.malaria_level as RiskLevel,
    probabilityScore: r.probability_score ?? 0,
    climate: {
      avgTemp:        r.avg_temp ?? 0,
      avgRainfall:    r.avg_rainfall ?? 0,
      laggedRainfall: r.lagged_rainfall ?? 0,
      avgHumidity:    r.avg_humidity ?? 0,
    },
    validated:      r.validated ?? false,
    actualOutbreak: r.actual_outbreak ?? null,
  }));
}

export async function getPredictionsDueForValidation(): Promise<ProspectivePrediction[]> {
  const { data, error } = await db
    .from('predictions')
    .select()
    .eq('validated', false)
    .lte('validate_after', new Date().toISOString());
  if (error) throw error;
  return (data ?? []).map(r => ({
    id:             r.id,
    cityId:         r.city_id ?? '',
    city:           r.city_name,
    country:        r.country,
    predictedAt:    r.predicted_at,
    validateAfter:  r.validate_after,
    dengueLevel:    r.dengue_level as RiskLevel,
    malariaLevel:   r.malaria_level as RiskLevel,
    probabilityScore: r.probability_score ?? 0,
    climate: {
      avgTemp:        r.avg_temp ?? 0,
      avgRainfall:    r.avg_rainfall ?? 0,
      laggedRainfall: r.lagged_rainfall ?? 0,
      avgHumidity:    r.avg_humidity ?? 0,
    },
    validated:      r.validated ?? false,
    actualOutbreak: r.actual_outbreak ?? null,
  }));
}
