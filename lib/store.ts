export interface Enrollment {
  phone: string;
  email: string;
  cityId: string;
  cityName: string;
  country: string;
  lat: number;
  lng: number;
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
  riskLevel: 'HIGH' | 'WATCH' | 'LOW';
}

// Prospective prediction log — every risk computation is stored with a timestamp.
// 4–6 weeks later, actual case reports can be compared to validate predictions.
// This is the start of prospective validation evidence.
export interface ProspectivePrediction {
  id: string;
  cityId: string;
  city: string;
  country: string;
  predictedAt: string;
  validateAfter: string;  // predictedAt + 5 weeks (mid-point of 4–6 week lead time)
  dengueLevel: 'HIGH' | 'WATCH' | 'LOW';
  malariaLevel: 'HIGH' | 'WATCH' | 'LOW';
  probabilityScore: number;
  climate: { avgTemp: number; avgRainfall: number; laggedRainfall: number; avgHumidity: number };
  validated: boolean;
  actualOutbreak: boolean | null;  // filled in when validated
}

const enrollments: Enrollment[] = [];
const alertLogs: AlertLog[] = [];
const predictions: ProspectivePrediction[] = [];

export function saveEnrollment(data: Omit<Enrollment, 'enrolledAt'>): Enrollment {
  const enrollment: Enrollment = { ...data, enrolledAt: new Date().toISOString() };
  enrollments.push(enrollment);
  return enrollment;
}

export function getEnrollmentsByCityId(cityId: string): Enrollment[] {
  return enrollments.filter((e) => e.cityId === cityId);
}

export function getEnrollmentsByLatLng(lat: number, lng: number, radiusDeg = 0.5): Enrollment[] {
  return enrollments.filter(
    (e) => Math.abs(e.lat - lat) < radiusDeg && Math.abs(e.lng - lng) < radiusDeg,
  );
}

export function getAllEnrollments(): Enrollment[] {
  return [...enrollments];
}

export function logAlert(alert: Omit<AlertLog, 'id' | 'sentAt'>): AlertLog {
  const entry: AlertLog = {
    ...alert,
    id: Math.random().toString(36).slice(2, 10),
    sentAt: new Date().toISOString(),
  };
  alertLogs.unshift(entry);
  return entry;
}

export function getAlertLogs(): AlertLog[] {
  return [...alertLogs];
}

export function logPrediction(data: Omit<ProspectivePrediction, 'id' | 'predictedAt' | 'validateAfter' | 'validated' | 'actualOutbreak'>): ProspectivePrediction {
  const now = new Date();
  const validateAfter = new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000); // +5 weeks
  const entry: ProspectivePrediction = {
    ...data,
    id: Math.random().toString(36).slice(2, 10),
    predictedAt: now.toISOString(),
    validateAfter: validateAfter.toISOString(),
    validated: false,
    actualOutbreak: null,
  };
  predictions.unshift(entry);
  if (predictions.length > 500) predictions.pop();
  return entry;
}

export function getPredictions(): ProspectivePrediction[] {
  return [...predictions];
}

export function getPredictionsDueForValidation(): ProspectivePrediction[] {
  const now = new Date();
  return predictions.filter(p => !p.validated && new Date(p.validateAfter) <= now);
}
