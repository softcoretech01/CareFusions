import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';

const API_BASE = import.meta.env.VITE_API_URL as string;

export interface AppointmentRecord {
  id: number;
  appointmentNumber: string;
  uhid: string;
  patientName: string;
  mobileNumber: string;
  department: string;
  doctor: string;
  date: string;
  timeSlot: string;
  durationMinutes: number;
  type: 'Standard' | 'Follow-up' | 'Walk-In' | 'Emergency' | 'Teleconsultation' | 'Home Visit';
  priority: 'Normal' | 'High' | 'Emergency';
  status: 'Scheduled' | 'Checked-In' | 'Waiting' | 'Consulting' | 'Completed' | 'Cancelled' | 'No-Show';
  queueToken?: string;
  notes?: string;
}

export interface AppointmentQuery {
  search?: string;
  department?: string;
  status?: string;
  type?: string;
  excludeType?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface AppointmentContextType {
  appointments: AppointmentRecord[];
  addAppointment: (appointment: AppointmentRecord) => void;
  updateAppointmentStatus: (id: number, status: AppointmentRecord['status']) => void;
  updateAppointment: (id: number, updates: Partial<AppointmentRecord>) => void;
  setQueueToken: (id: number, token: string) => void;
  generateAppointmentNumber: () => string;
  queryAppointments: (params: AppointmentQuery) => Promise<AppointmentRecord[]>;
  apiError: string | null;
  clearError: () => void;
  hasLoaded?: boolean;
  loadAppointments?: () => Promise<void>;
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

/**
 * Parses the sequential counter from an appointment number like "APT-202601" or "APT-2026100".
 * Returns the numeric counter portion, or 0 if it cannot be parsed.
 */
function parseCounter(apptNumber: string): number {
  // Format: APT-YYYYMMNNN  e.g. APT-202601 → year=2026 month=01 seq=... but we just
  // extract the last digits after the 6-char YYYYMM prefix.
  const match = apptNumber.match(/^APT-(\d{4})(\d{2})(\d+)$/);
  if (!match) return 0;
  const now = new Date();
  const year = parseInt(match[1]);
  const month = parseInt(match[2]);
  if (year === now.getFullYear() && month === now.getMonth() + 1) {
    return parseInt(match[3]);
  }
  return 0; // from a different month, ignore for current counter
}

const DUMMY_APPOINTMENTS: AppointmentRecord[] = [
  {
    id: 1,
    appointmentNumber: 'APT-202601',
    uhid: 'UHID-2026-0001',
    patientName: 'John Doe',
    mobileNumber: '9876543210',
    department: 'Cardiology',
    doctor: 'Dr. Sarah Jenkins',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '09:00 AM',
    durationMinutes: 15,
    type: 'Standard',
    priority: 'Normal',
    status: 'Scheduled',
    queueToken: 'CAR-001',
  },
  {
    id: 2,
    appointmentNumber: 'APT-202602',
    uhid: 'UHID-2026-0002',
    patientName: 'Jane Smith',
    mobileNumber: '9876543211',
    department: 'General Medicine',
    doctor: 'Dr. Michael Chen',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '09:15 AM',
    durationMinutes: 15,
    type: 'Follow-up',
    priority: 'Normal',
    status: 'Checked-In',
    queueToken: 'GEN-001',
  },
  {
    id: 3,
    appointmentNumber: 'APT-202603',
    uhid: 'UHID-2026-0003',
    patientName: 'Robert Johnson',
    mobileNumber: '9876543212',
    department: 'Orthopedics',
    doctor: 'Dr. Emily Brown',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '09:30 AM',
    durationMinutes: 30,
    type: 'Walk-In',
    priority: 'Normal',
    status: 'Waiting',
    queueToken: 'ORT-001',
  },
  {
    id: 4,
    appointmentNumber: 'APT-202604',
    uhid: 'UHID-2026-0004',
    patientName: 'Maria Garcia',
    mobileNumber: '9876543213',
    department: 'Pediatrics',
    doctor: 'Dr. David Wilson',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '10:00 AM',
    durationMinutes: 15,
    type: 'Emergency',
    priority: 'Emergency',
    status: 'Consulting',
    queueToken: 'PED-001',
  },
  {
    id: 5,
    appointmentNumber: 'APT-202605',
    uhid: 'UHID-2026-0005',
    patientName: 'William Taylor',
    mobileNumber: '9876543214',
    department: 'Ophthalmology',
    doctor: 'Dr. Lisa Wong',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '10:30 AM',
    durationMinutes: 15,
    type: 'Standard',
    priority: 'Normal',
    status: 'Scheduled',
    queueToken: 'OPH-001',
  },
];

/** Compute initial counter from dummy data (appointment number) */
const initCounter = () => {
  return DUMMY_APPOINTMENTS.reduce((max, appt) => {
    const n = parseCounter(appt.appointmentNumber);
    return n > max ? n : max;
  }, 0);
};

/** Map department name to 3-letter token prefix */
function deptPrefix(department: string): string {
  const map: Record<string, string> = {
    'Cardiology':       'CAR',
    'General Medicine': 'GEN',
    'Orthopedics':      'ORT',
    'Pediatrics':       'PED',
    'Dermatology':      'DER',
    'Neurology':        'NEU',
    'Emergency':        'EMR',
    'Ophthalmology':    'OPH',
    'ENT':              'ENT',
    'Gynecology':       'GYN',
  };
  // Use first 3 letters uppercased as fallback
  return map[department] ?? department.slice(0, 3).toUpperCase();
}

/** Build next sequential department-based token: e.g. CAR-001, GEN-002 */
function buildToken(department: string, existingTokens: (string | undefined)[]): string {
  const prefix = deptPrefix(department);
  const used = existingTokens
    .filter((t): t is string => !!t && t.startsWith(prefix + '-'))
    .map(t => parseInt(t.split('-')[1]) || 0);
  const next = used.length > 0 ? Math.max(...used) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

/** Map an API appointment object to the frontend AppointmentRecord shape. */
function mapApi(x: Record<string, unknown>): AppointmentRecord {
  return {
    id:                x.id as number,
    appointmentNumber: x.appointmentNumber as string,
    uhid:              x.uhid as string,
    patientName:       x.patientName as string,
    mobileNumber:      (x.mobileNumber as string) ?? '',
    department:        x.department as string,
    doctor:            (x.doctor as string) ?? '',
    date:              x.date ? String(x.date).split('T')[0] : '',
    timeSlot:          (x.timeSlot as string) ?? '',
    durationMinutes:   (x.durationMinutes as number) ?? 15,
    type:              (x.type as AppointmentRecord['type']) ?? 'Standard',
    priority:          (x.priority as AppointmentRecord['priority']) ?? 'Normal',
    status:            (x.status as AppointmentRecord['status']) ?? 'Scheduled',
    queueToken:        (x.queueToken as string) ?? undefined,
    notes:             (x.notes as string) ?? undefined,
  };
}

/** Pull a human-readable message out of a failed API response. */
async function extractError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    const d = (data as { detail?: unknown })?.detail;
    if (Array.isArray(d)) return (d[0] as { msg?: string })?.msg ?? 'Request failed';
    if (typeof d === 'string') return d;
  } catch { /* body not JSON */ }
  return `Request failed (${res.status})`;
}

/** Build the request body the appointments API expects from a record. */
function toBody(a: Partial<AppointmentRecord>) {
  return {
    uhid:            a.uhid,
    patientName:     a.patientName,
    mobileNumber:    a.mobileNumber || null,
    department:      a.department,
    doctor:          a.doctor || null,
    date:            a.date,
    timeSlot:        a.timeSlot || null,
    durationMinutes: a.durationMinutes || 15,
    type:            a.type || 'Standard',
    priority:        a.priority || 'Normal',
    status:          a.status || 'Scheduled',
    notes:           a.notes || null,
  };
}

export const AppointmentProvider = ({ children }: { children: ReactNode }) => {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  // Use a ref so generateAppointmentNumber never has a stale counter value
  const counterRef = useRef<number>(initCounter());

  const clearError = useCallback(() => setApiError(null), []);

  // Re-sync the UI whenever an optimistic update fails.
  const loadAppointments = useCallback(async () => {
    if (hasLoaded) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/appointments/`);
      if (res.ok) {
        const data = await res.json();
        setAppointments((Array.isArray(data) ? data : []).map(mapApi));
      }
    } catch { /* API unreachable — keep current state */ } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [hasLoaded]);

  // Removed automatic useEffect for loading appointments on mount

  // Server-side filtered fetch — returns matching rows WITHOUT touching the
  // shared `appointments` array (which stays complete for the booking wizards).
  const queryAppointments = useCallback(async (params: AppointmentQuery): Promise<AppointmentRecord[]> => {
    const qs = new URLSearchParams();
    if (params.search)      qs.set('search', params.search);
    if (params.department)  qs.set('dept_filter', params.department);
    if (params.status)      qs.set('status_filter', params.status);
    if (params.type)        qs.set('type_filter', params.type);
    if (params.excludeType) qs.set('exclude_type', params.excludeType);
    if (params.dateFrom)    qs.set('date_from', params.dateFrom);
    if (params.dateTo)      qs.set('date_to', params.dateTo);
    try {
      const res = await fetch(`${API_BASE}/appointments/?${qs.toString()}`);
      if (res.ok) {
        const data = await res.json();
        return (Array.isArray(data) ? data : []).map(mapApi);
      }
      setApiError(`Failed to load appointments (${res.status}).`);
      return [];
    } catch {
      setApiError('Could not load appointments: the server is unreachable.');
      return [];
    }
  }, []);

  /**
   * Generates the next appointment number in format APT-YYYYMMNNN.
   * e.g. APT-202601, APT-202602 ... APT-202610 ... APT-2026100
   * Shared across online and walk-in — first-come-first-serve.
   */
  const generateAppointmentNumber = useCallback((): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    counterRef.current += 1;
    return `APT-${year}${month}${String(counterRef.current).padStart(2, '0')}`;
  }, []);

  const addAppointment = (appointment: AppointmentRecord) => {
    // Optimistic insert with a temporary (negative) id + provisional token.
    const tempId = -Date.now();
    const token = buildToken(appointment.department, appointments.map(a => a.queueToken));
    setAppointments(prev => [{ ...appointment, id: tempId, queueToken: token }, ...prev]);
    // Persist — the server owns the real AppointmentNumber + QueueToken.
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/appointments/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toBody(appointment)),
        });
        if (res.ok) {
          const saved = mapApi(await res.json());
          setAppointments(prev => prev.map(a => a.id === tempId ? saved : a));
        } else {
          // Drop the optimistic row so the UI reflects reality, then report.
          const msg = await extractError(res);
          setAppointments(prev => prev.filter(a => a.id !== tempId));
          setApiError(`Could not save appointment: ${msg}`);
        }
      } catch {
        setAppointments(prev => prev.filter(a => a.id !== tempId));
        setApiError('Could not save appointment: the server is unreachable.');
      }
    })();
  };

  const updateAppointmentStatus = (id: number, status: AppointmentRecord['status']) => {
    setAppointments(prev => prev.map(app => app.id === id ? { ...app, status } : app));
    if (id <= 0) return; // temp record not yet persisted
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/appointments/${id}/status`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) {
          setApiError(`Could not update status: ${await extractError(res)}`);
          await loadAppointments();
        }
      } catch {
        setApiError('Could not update status: the server is unreachable.');
        await loadAppointments();
      }
    })();
  };

  const updateAppointment = (id: number, updates: Partial<AppointmentRecord>) => {
    const current = appointments.find(a => a.id === id);
    setAppointments(prev => prev.map(app => app.id === id ? { ...app, ...updates } : app));
    if (id <= 0 || !current) return;
    const merged = { ...current, ...updates };
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/appointments/${id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toBody(merged)),
        });
        if (!res.ok) {
          setApiError(`Could not update appointment: ${await extractError(res)}`);
          await loadAppointments();
        }
      } catch {
        setApiError('Could not update appointment: the server is unreachable.');
        await loadAppointments();
      }
    })();
  };

  const setQueueToken = (id: number, token: string) => {
    setAppointments(prev => prev.map(app => app.id === id ? { ...app, queueToken: token } : app));
    if (id <= 0) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/appointments/${id}/token`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queueToken: token }),
        });
        if (!res.ok) {
          setApiError(`Could not set queue token: ${await extractError(res)}`);
          await loadAppointments();
        }
      } catch {
        setApiError('Could not set queue token: the server is unreachable.');
        await loadAppointments();
      }
    })();
  };

  return (
    <AppointmentContext.Provider
      value={{
        appointments,
        addAppointment,
        updateAppointmentStatus,
        updateAppointment,
        setQueueToken,
        generateAppointmentNumber,
        queryAppointments,
        apiError,
        clearError,
        hasLoaded,
        loadAppointments
      }}
    >
      {children}
    </AppointmentContext.Provider>
  );
};

export const useAppointments = () => {
  const context = useContext(AppointmentContext);
  if (context === undefined) {
    throw new Error('useAppointments must be used within an AppointmentProvider');
  }
  
  // Depend on the values actually used, not the context object: the provider
  
  // builds a new object every render, so [context] re-fired this effect on each
  
  // one. The ref stops a second request while the first is still in flight —
  
  // hasLoaded only flips once the fetches resolve, so it cannot guard that gap.
  
  const { hasLoaded, loading, loadAppointments } = context as any;
  
  const requested = useRef(false);
  
  useEffect(() => {
  
    if (hasLoaded || loading || requested.current) return;
  
    requested.current = true;
  
    Promise.resolve(loadAppointments?.()).finally(() => { requested.current = false; });
  
  }, [hasLoaded, loading, loadAppointments]);

  return context;
};
