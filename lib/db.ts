import { createClient } from '@supabase/supabase-js';

const url  = process.env.SUPABASE_URL!;
const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}

// Service role client — server-side only, never expose to browser
export const db = createClient(url, key, {
  auth: { persistSession: false },
});

// Typed table helpers
export type RiskLevel = 'HIGH' | 'WATCH' | 'LOW';

export interface DbRiskScore {
  id?: string;
  district_id?: string;
  city_id?: string;
  city_name: string;
  country: string;
  computed_at?: string;
  dengue_level: RiskLevel;
  malaria_level: RiskLevel;
  dengue_score?: number;
  malaria_score?: number;
  population_at_risk?: number;
  avg_temp?: number;
  avg_rainfall?: number;
  lagged_rainfall?: number;
  avg_humidity?: number;
  lat?: number;
  lng?: number;
}

export interface DbEnrollment {
  id?: string;
  phone?: string;
  email?: string;
  city_id?: string;
  city_name: string;
  country: string;
  lat: number;
  lng: number;
  whatsapp?: boolean;
  language?: string;
  enrolled_at?: string;
}

export interface DbAlertLog {
  id: string;
  city_id?: string;
  city_name: string;
  country: string;
  message: string;
  local_message?: string;
  language?: string;
  recipients?: number;
  channel?: string;
  risk_level: RiskLevel;
  dengue_level?: string;
  malaria_level?: string;
  sent_at?: string;
}

export interface DbPrediction {
  id: string;
  city_id?: string;
  city_name: string;
  country: string;
  predicted_at: string;
  validate_after: string;
  dengue_level: RiskLevel;
  malaria_level: RiskLevel;
  probability_score?: number;
  avg_temp?: number;
  avg_rainfall?: number;
  lagged_rainfall?: number;
  avg_humidity?: number;
  validated?: boolean;
  actual_outbreak?: boolean | null;
  validated_at?: string;
}
