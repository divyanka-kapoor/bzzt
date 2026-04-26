export interface Enrollment {
  phone: string;
  email: string;
  pincode: string;
  lat: number;
  lng: number;
  enrolledAt: string;
}

export interface AlertLog {
  id: string;
  pincode: string;
  city: string;
  message: string;
  recipients: number;
  sentAt: string;
  type: 'sms' | 'email';
  riskLevel: 'HIGH' | 'WATCH' | 'LOW';
}

const enrollments: Enrollment[] = [];

const now = Date.now();
const alertLogs: AlertLog[] = [
  {
    id: 'a1', pincode: '411001', city: 'Pune',
    message: 'Bzzt Alert 🦟 HIGH dengue risk in Pune (411001). Heavy rains last week created breeding pools. Use mosquito nets, eliminate standing water, seek care if feverish.',
    recipients: 214, sentAt: new Date(now - 1000 * 60 * 8).toISOString(), type: 'sms', riskLevel: 'HIGH',
  },
  {
    id: 'a2', pincode: '400001', city: 'Mumbai',
    message: 'Bzzt Alert 🦟 HIGH malaria risk in Mumbai (400001). Post-monsoon conditions active. Stay indoors dusk–dawn, use repellent.',
    recipients: 389, sentAt: new Date(now - 1000 * 60 * 22).toISOString(), type: 'sms', riskLevel: 'HIGH',
  },
  {
    id: 'a3', pincode: '700001', city: 'Kolkata',
    message: 'Bzzt Update: WATCH-level dengue signals in Kolkata (700001). Monitor symptoms — fever, joint pain, rash. Contact ASHA worker if symptomatic.',
    recipients: 167, sentAt: new Date(now - 1000 * 60 * 55).toISOString(), type: 'email', riskLevel: 'WATCH',
  },
  {
    id: 'a4', pincode: '500001', city: 'Hyderabad',
    message: 'Bzzt Alert 🦟 HIGH dengue risk in Hyderabad (500001). Temperature and humidity both at peak vector survival range. Remove all stagnant water containers.',
    recipients: 298, sentAt: new Date(now - 1000 * 60 * 90).toISOString(), type: 'sms', riskLevel: 'HIGH',
  },
  {
    id: 'a5', pincode: '110001', city: 'New Delhi',
    message: 'Bzzt Update: WATCH-level malaria signals in Delhi (110001). Construction sites and waterlogged areas are high-risk. Use bed nets.',
    recipients: 142, sentAt: new Date(now - 1000 * 60 * 140).toISOString(), type: 'sms', riskLevel: 'WATCH',
  },
  {
    id: 'a6', pincode: '560001', city: 'Bengaluru',
    message: 'Bzzt Update: LOW risk in Bengaluru (560001). Conditions currently not conducive for outbreak. Continue standard precautions.',
    recipients: 98, sentAt: new Date(now - 1000 * 60 * 200).toISOString(), type: 'email', riskLevel: 'LOW',
  },
];

export function saveEnrollment(data: Omit<Enrollment, 'enrolledAt'>): Enrollment {
  const enrollment: Enrollment = { ...data, enrolledAt: new Date().toISOString() };
  enrollments.push(enrollment);
  return enrollment;
}

export function getEnrollmentsByPincode(pincode: string): Enrollment[] {
  return enrollments.filter((e) => e.pincode === pincode);
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
