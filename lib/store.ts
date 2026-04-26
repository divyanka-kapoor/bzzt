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

const enrollments: Enrollment[] = [];
const alertLogs: AlertLog[] = [];

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
