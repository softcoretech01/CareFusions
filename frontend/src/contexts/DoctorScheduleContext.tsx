import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

const API_BASE = import.meta.env.VITE_API_URL as string;

export interface DoctorScheduleRecord {
  id: number;
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
  isLoading: boolean;
  apiError: string | null;
  clearError: () => void;
  updateDoctorSchedule: (id: number, updates: Partial<DoctorScheduleRecord>) => void;
  saveDoctorSchedule: (id: number) => Promise<boolean>;
  getDoctorsForDept: (dept: string) => DoctorScheduleRecord[];
  isDoctorAvailableOn: (name: string, dateString: string) => boolean;
  getDoctorsWithAvailability: (dept: string, dateString: string) => { name: string; dept: string; available: boolean }[];
  hasLoaded?: boolean;
  loadSchedules?: () => Promise<void>;
}

const DoctorScheduleContext = createContext<DoctorScheduleContextType | undefined>(undefined);

/** Map 3-letter day abbreviation to JS getDay() index (0=Sun) */
const DAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

export const DoctorScheduleProvider = ({ children }: { children: ReactNode }) => {
  const [doctorSchedules, setDoctorSchedules] = useState<DoctorScheduleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const clearError = useCallback(() => setApiError(null), []);

  // Load all doctors + their schedules from the API.
  const loadSchedules = useCallback(async () => {
    if (hasLoaded) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/doctor-schedules/`);
      if (res.ok) {
        const data = await res.json();
        setDoctorSchedules(Array.isArray(data) ? data : []);
      } else {
        setApiError('Failed to load doctor schedules.');
      }
    } catch {
      setApiError('Could not load doctor schedules: the server is unreachable.');
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [hasLoaded]);

  // Removed automatic useEffect for loadSchedules

  // Local (unsaved) edit — kept in state until the user clicks Save.
  const updateDoctorSchedule = (id: number, updates: Partial<DoctorScheduleRecord>) => {
    setDoctorSchedules(prev => prev.map(doc => (doc.id === id ? { ...doc, ...updates } : doc)));
  };

  // Persist one doctor's schedule (timings, capacity, leaves) to the API.
  const saveDoctorSchedule = useCallback(async (id: number): Promise<boolean> => {
    const doc = doctorSchedules.find(d => d.id === id);
    if (!doc) return false;
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/doctor-schedules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workingDays:  doc.workingDays,
          session1:     doc.session1,
          session2:     doc.session2,
          slotDuration: doc.slotDuration,
          maxPatients:  doc.maxPatients,
          exceptions:   doc.exceptions,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const d = (data as { detail?: unknown } | null)?.detail;
        const msg = Array.isArray(d) ? (d[0] as { msg?: string })?.msg
          : typeof d === 'string' ? d : `Save failed (${res.status})`;
        setApiError(`Could not save schedule: ${msg}`);
        return false;
      }
      return true;
    } catch {
      setApiError('Could not save schedule: the server is unreachable.');
      return false;
    }
  }, [doctorSchedules]);

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
        isLoading,
        apiError,
        clearError,
        updateDoctorSchedule,
        saveDoctorSchedule,
        getDoctorsForDept,
        isDoctorAvailableOn,
        getDoctorsWithAvailability,
        hasLoaded,
        loadSchedules,
      }}
    >
      {children}
    </DoctorScheduleContext.Provider>
  );
};

export const useDoctorSchedules = () => {
  const ctx = useContext(DoctorScheduleContext);
  if (!ctx) throw new Error('useDoctorSchedules must be used within DoctorScheduleProvider');
  
  useEffect(() => {
    if (!ctx.hasLoaded && !ctx.isLoading && ctx.loadSchedules) {
      ctx.loadSchedules();
    }
  }, [ctx]);

  return ctx;
};
