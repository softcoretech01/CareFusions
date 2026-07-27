import type { AppointmentRecord } from '../contexts/AppointmentContext';

/**
 * Day-of-week availability for each doctor.
 * 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
 */
export interface DoctorSchedule {
  name: string;
  department: string;
  availableDays: number[]; // days of week
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

export const DOCTOR_SCHEDULES: DoctorSchedule[] = [
  // General Medicine
  {
    name: 'Dr. Michael Chen',
    department: 'General Medicine',
    availableDays: [1, 2, 3, 4, 5], // Mon–Fri
    startTime: '09:00',
    endTime: '12:00',
    slotDurationMinutes: 15,
  },
  {
    name: 'Dr. Alice Wong',
    department: 'General Medicine',
    availableDays: [1, 3, 5], // Mon, Wed, Fri
    startTime: '09:00',
    endTime: '12:00',
    slotDurationMinutes: 15,
  },
  // Cardiology
  {
    name: 'Dr. Sarah Jenkins',
    department: 'Cardiology',
    availableDays: [1, 2, 4], // Mon, Tue, Thu
    startTime: '09:00',
    endTime: '12:00',
    slotDurationMinutes: 15,
  },
  {
    name: 'Dr. Ravi Kumar',
    department: 'Cardiology',
    availableDays: [2, 3, 5], // Tue, Wed, Fri
    startTime: '09:00',
    endTime: '12:00',
    slotDurationMinutes: 15,
  },
  {
    name: 'Dr. Robert Blake',
    department: 'Cardiology',
    availableDays: [1, 3, 5], // Mon, Wed, Fri
    startTime: '09:00',
    endTime: '12:00',
    slotDurationMinutes: 15,
  },
  // Orthopedics
  {
    name: 'Dr. Emily Brown',
    department: 'Orthopedics',
    availableDays: [1, 2, 3, 4, 5], // Mon–Fri
    startTime: '09:00',
    endTime: '12:00',
    slotDurationMinutes: 15,
  },
  // Pediatrics
  {
    name: 'Dr. David Wilson',
    department: 'Pediatrics',
    availableDays: [1, 2, 3, 4, 5], // Mon–Fri
    startTime: '09:00',
    endTime: '12:00',
    slotDurationMinutes: 15,
  },
  // Dermatology
  {
    name: 'Dr. Priya Nair',
    department: 'Dermatology',
    availableDays: [2, 4, 6], // Tue, Thu, Sat
    startTime: '09:00',
    endTime: '12:00',
    slotDurationMinutes: 15,
  },
  // Neurology
  {
    name: 'Dr. James Ford',
    department: 'Neurology',
    availableDays: [1, 3, 5], // Mon, Wed, Fri
    startTime: '09:00',
    endTime: '12:00',
    slotDurationMinutes: 15,
  },
];

/**
 * All departments with their doctors list (used for display in booking steps).
 */
export const MOCK_DEPARTMENTS = [
  'General Medicine',
  'Cardiology',
  'Orthopedics',
  'Pediatrics',
  'Dermatology',
  'Neurology',
];

export const MOCK_DOCTORS: Record<string, string[]> = {
  'General Medicine': ['Dr. Michael Chen', 'Dr. Alice Wong'],
  'Cardiology': ['Dr. Sarah Jenkins', 'Dr. Ravi Kumar'],
  'Orthopedics': ['Dr. Emily Brown'],
  'Pediatrics': ['Dr. David Wilson'],
  'Dermatology': ['Dr. Priya Nair'],
  'Neurology': ['Dr. James Ford'],
};

/**
 * All available time slots in a day (09:00 AM – 11:45 AM, 15-min intervals).
 */
export const TIME_SLOTS = [
  '09:00 AM', '09:15 AM', '09:30 AM', '09:45 AM',
  '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM',
  '11:00 AM', '11:15 AM', '11:30 AM', '11:45 AM',
];

/**
 * Returns the list of doctors in a department along with their availability status
 * for a given date string (YYYY-MM-DD).
 */
export function getDoctorsWithAvailability(
  department: string,
  dateString: string
): { name: string; available: boolean }[] {
  const doctors = MOCK_DOCTORS[department] ?? [];
  if (!dateString) return doctors.map(name => ({ name, available: true }));

  const date = new Date(dateString);
  const dayOfWeek = date.getDay(); // 0=Sun…6=Sat

  return doctors.map(name => {
    const schedule = DOCTOR_SCHEDULES.find(
      s => s.name === name && s.department === department
    );
    const available = schedule ? schedule.availableDays.includes(dayOfWeek) : true;
    return { name, available };
  });
}

/**
 * Returns the set of time slots already booked for a specific doctor + date
 * by scanning all existing appointments (both online and walk-in).
 */
export function getBookedSlots(
  doctor: string,
  date: string,
  appointments: AppointmentRecord[]
): Set<string> {
  const booked = new Set<string>();
  appointments.forEach(appt => {
    if (
      appt.doctor === doctor &&
      appt.date === date &&
      appt.status !== 'Cancelled' &&
      appt.status !== 'No-Show'
    ) {
      booked.add(appt.timeSlot);
    }
  });
  return booked;
}
