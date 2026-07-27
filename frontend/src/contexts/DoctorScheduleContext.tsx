import { createContext, useContext, useState, type ReactNode } from 'react';

export interface DoctorScheduleRecord {
  name: string;
  dept: string;
  workingDays: string[]; // e.g. ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  session1: { start: string; end: string };
  session2: { start: string; end: string };
  slotDuration: number; // minutes
  maxPatients: number;
  exceptions: { date: string; reason: string }[]; // leave/holiday dates
}

interface DoctorScheduleContextType {
  doctorSchedules: DoctorScheduleRecord[];
  updateDoctorSchedule: (name: string, updates: Partial<DoctorScheduleRecord>) => void;
  getDoctorsForDept: (dept: string) => DoctorScheduleRecord[];
  isDoctorAvailableOn: (name: string, dateString: string) => boolean;
  getDoctorsWithAvailability: (dept: string, dateString: string) => { name: string; dept: string; available: boolean }[];
}

const DoctorScheduleContext = createContext<DoctorScheduleContextType | undefined>(undefined);

/** Map 3-letter day abbreviation to JS getDay() index (0=Sun) */
const DAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

const INITIAL_SCHEDULES: DoctorScheduleRecord[] = [
  {
    name: 'Dr. Sarah Jenkins',
    dept: 'Cardiology',
    workingDays: ['Mon', 'Tue', 'Thu'],
    session1: { start: '09:00', end: '13:00' },
    session2: { start: '14:00', end: '18:00' },
    slotDuration: 15,
    maxPatients: 40,
    exceptions: [],
  },
  {
    name: 'Dr. Ravi Kumar',
    dept: 'Cardiology',
    workingDays: ['Tue', 'Wed', 'Fri'],
    session1: { start: '09:00', end: '13:00' },
    session2: { start: '14:00', end: '17:00' },
    slotDuration: 15,
    maxPatients: 30,
    exceptions: [],
  },
  {
    name: 'Dr. Michael Chen',
    dept: 'General Medicine',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    session1: { start: '09:00', end: '13:00' },
    session2: { start: '14:00', end: '18:00' },
    slotDuration: 15,
    maxPatients: 40,
    exceptions: [],
  },
  {
    name: 'Dr. Alice Wong',
    dept: 'General Medicine',
    workingDays: ['Mon', 'Wed', 'Fri'],
    session1: { start: '09:00', end: '13:00' },
    session2: { start: '14:00', end: '17:00' },
    slotDuration: 15,
    maxPatients: 30,
    exceptions: [],
  },
  {
    name: 'Dr. Emily Brown',
    dept: 'Orthopedics',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    session1: { start: '09:00', end: '13:00' },
    session2: { start: '14:00', end: '18:00' },
    slotDuration: 15,
    maxPatients: 40,
    exceptions: [],
  },
  {
    name: 'Dr. David Wilson',
    dept: 'Pediatrics',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    session1: { start: '09:00', end: '13:00' },
    session2: { start: '14:00', end: '18:00' },
    slotDuration: 15,
    maxPatients: 40,
    exceptions: [],
  },
  {
    name: 'Dr. Priya Nair',
    dept: 'Dermatology',
    workingDays: ['Tue', 'Thu', 'Sat'],
    session1: { start: '09:00', end: '13:00' },
    session2: { start: '14:00', end: '17:00' },
    slotDuration: 15,
    maxPatients: 24,
    exceptions: [],
  },
  {
    name: 'Dr. James Ford',
    dept: 'Neurology',
    workingDays: ['Mon', 'Wed', 'Fri'],
    session1: { start: '09:00', end: '13:00' },
    session2: { start: '14:00', end: '17:00' },
    slotDuration: 15,
    maxPatients: 24,
    exceptions: [],
  },
];

export const DoctorScheduleProvider = ({ children }: { children: ReactNode }) => {
  const [doctorSchedules, setDoctorSchedules] = useState<DoctorScheduleRecord[]>(INITIAL_SCHEDULES);

  const updateDoctorSchedule = (name: string, updates: Partial<DoctorScheduleRecord>) => {
    setDoctorSchedules(prev =>
      prev.map(doc => (doc.name === name ? { ...doc, ...updates } : doc))
    );
  };

  const getDoctorsForDept = (dept: string) =>
    doctorSchedules.filter(d => dept === 'All Departments' || d.dept === dept);

  const isDoctorAvailableOn = (name: string, dateString: string): boolean => {
    const doc = doctorSchedules.find(d => d.name === name);
    if (!doc) return true;
    const date = new Date(dateString + 'T00:00:00');
    const dayOfWeek = date.getDay(); // 0=Sun…6=Sat
    const dayName = Object.entries(DAY_MAP).find(([, v]) => v === dayOfWeek)?.[0];
    if (!dayName) return false;
    // Check exceptions (leave dates)
    if (doc.exceptions.some(e => e.date === dateString)) return false;
    return doc.workingDays.includes(dayName);
  };

  const getDoctorsWithAvailability = (dept: string, dateString: string) => {
    return doctorSchedules
      .filter(d => d.dept === dept)
      .map(d => ({
        name: d.name,
        dept: d.dept,
        available: dateString ? isDoctorAvailableOn(d.name, dateString) : true,
      }));
  };

  return (
    <DoctorScheduleContext.Provider
      value={{
        doctorSchedules,
        updateDoctorSchedule,
        getDoctorsForDept,
        isDoctorAvailableOn,
        getDoctorsWithAvailability,
      }}
    >
      {children}
    </DoctorScheduleContext.Provider>
  );
};

export const useDoctorSchedules = () => {
  const ctx = useContext(DoctorScheduleContext);
  if (!ctx) throw new Error('useDoctorSchedules must be used within DoctorScheduleProvider');
  return ctx;
};
