import { createContext, useContext, useState, useCallback, useEffect, type ReactNode, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL as string;

// ID namespaces so the three separate auto-increment sequences
// (New / Quick / Emergency each start at 1) never collide once merged.
const QUICK_ID_OFFSET = 1_000_000;
const EMERGENCY_ID_OFFSET = 2_000_000;

export interface GlobalPatientRecord {
  id: number;
  uhid: string;
  registrationDate: string;
  registrationTime: string;
  registrationType: 'New' | 'Quick' | 'Emergency';
  status: string;

  // Core demographics
  title?: string;
  patientName?: string;
  gender?: string;
  dateOfBirth?: string;
  age?: number;
  approximateAge?: number;

  // Contact
  mobileNumber?: string;
  alternateMobile?: string;
  email?: string;
  nationalId?: string;

  // Visit info
  visitType?: string;
  department?: string;
  doctor?: string;
  priority?: string;

  // Emergency Contacts
  emergencyContactName?: string;
  emergencyContactPhone?: string;

  // Allow dynamic addition of other fields from the massive intake form
  [key: string]: any;
}

interface PatientContextType {
  patients: GlobalPatientRecord[];
  loading: boolean;
  refreshPatients: () => Promise<void>;
  addPatient: (patient: GlobalPatientRecord) => void;
  updatePatient: (id: number, data: Partial<GlobalPatientRecord>) => void;
  getPatientByUhid: (uhid: string) => GlobalPatientRecord | undefined;
  generateUhid: () => string;
  hasLoaded?: boolean;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

// ── API row → GlobalPatientRecord mappers ────────────────────
// The backend returns PascalCase columns; normalise to the camelCase
// shape the app consumes. Each source is tagged with its registrationType
// and given a collision-free id.
const mapNew = (r: any): GlobalPatientRecord => ({
  id: r.PatientId,
  uhid: r.Uhid,
  registrationType: 'New',
  registrationDate: r.RegistrationDate ?? '',
  registrationTime: r.RegistrationTime ?? '',
  status: r.Status ?? 'Active',
  title: r.Title,
  patientName: r.PatientName,
  gender: r.Gender,
  dateOfBirth: r.DateOfBirth,
  age: r.Age,
  mobileNumber: r.MobileNumber,
  alternateMobile: r.AlternateMobile,
  email: r.Email,
  department: r.Department,
  doctor: r.PrimaryDoctor,
  bloodGroup: r.BloodGroup,
});

const mapQuick = (r: any): GlobalPatientRecord => ({
  id: QUICK_ID_OFFSET + r.QuickRegistrationId,
  uhid: r.Uhid,
  registrationType: 'Quick',
  registrationDate: r.RegistrationDate ?? '',
  registrationTime: r.RegistrationTime ?? '',
  status: r.Status ?? 'Active',
  title: r.Title,
  patientName: r.PatientName,
  gender: r.Gender,
  dateOfBirth: r.DateOfBirth,
  age: r.Age,
  mobileNumber: r.MobileNumber,
  alternateMobile: r.AlternateMobile,
  visitType: r.VisitType,
  department: r.Department,
  doctor: r.Doctor,
  priority: r.Priority,
});

const mapEmergency = (r: any): GlobalPatientRecord => ({
  id: EMERGENCY_ID_OFFSET + r.EmergencyRegistrationId,
  uhid: r.Uhid,
  registrationType: 'Emergency',
  registrationDate: r.RegistrationDate ?? '',
  registrationTime: r.RegistrationTime ?? '',
  status: r.Status ?? 'Active',
  patientName: r.PatientName,
  gender: r.Gender,
  age: r.ApproximateAge,
  approximateAge: r.ApproximateAge,
  department: 'Emergency',
  mobileNumber: r.EmergencyContactPhone,
  emergencyContactName: r.EmergencyContactName,
  emergencyContactPhone: r.EmergencyContactPhone,
});

async function fetchList(path: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/${path}`);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export const PatientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<GlobalPatientRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load the real registered-patient directory (New + Quick + Emergency)
  // from the API. This is the single source of truth shared by the IPD
  // admission picker, appointment search, billing and insurance screens.
  const refreshPatients = useCallback(async () => {
    if (hasLoaded) return;
    setLoading(true);
    const [neu, quick, emergency] = await Promise.allSettled([
      fetchList('patients/'),
      fetchList('quick-registrations/'),
      fetchList('emergency-registrations/'),
    ]);

    const merged: GlobalPatientRecord[] = [];
    if (neu.status === 'fulfilled') merged.push(...neu.value.map(mapNew));
    if (quick.status === 'fulfilled') merged.push(...quick.value.map(mapQuick));
    if (emergency.status === 'fulfilled') merged.push(...emergency.value.map(mapEmergency));

    // Newest first by registration date.
    merged.sort((a, b) => (b.registrationDate || '').localeCompare(a.registrationDate || ''));

    if (neu.status === 'rejected') console.error('[PatientContext] patients load failed:', neu.reason);
    if (quick.status === 'rejected') console.error('[PatientContext] quick-registrations load failed:', quick.reason);
    if (emergency.status === 'rejected') console.error('[PatientContext] emergency-registrations load failed:', emergency.reason);

    setPatients(merged);
    setLoading(false);
    setHasLoaded(true);
  }, [hasLoaded]);

  // Removed automatic useEffect for refreshPatients

  // Optimistic local add — the actual persistence happens in the
  // registration/booking flow that calls this; keeping it local means the
  // just-created patient is immediately searchable without a full refetch.
  const addPatient = (patient: GlobalPatientRecord) => {
    setPatients((prev) => [patient, ...prev]);
  };

  const updatePatient = (id: number, data: Partial<GlobalPatientRecord>) => {
    setPatients((prev) => prev.map(p => (p.id === id ? { ...p, ...data } : p)));
  };

  const getPatientByUhid = (uhid: string) => patients.find(p => p.uhid === uhid);

  // Generate the next UHID in the format UHID-<year>-<roll>, e.g. UHID-2026-0011.
  // Continues from the highest existing UHID for the current year.
  const generateUhid = useCallback((): string => {
    const year = new Date().getFullYear();
    const prefix = `UHID-${year}-`;
    const maxRoll = patients.reduce((max, p) => {
      if (typeof p.uhid === 'string' && p.uhid.startsWith(prefix)) {
        const n = parseInt(p.uhid.slice(prefix.length), 10);
        if (!isNaN(n) && n > max) return n;
      }
      return max;
    }, 0);
    return `${prefix}${String(maxRoll + 1).padStart(4, '0')}`;
  }, [patients]);

  return (
    <PatientContext.Provider value={{ patients, loading, refreshPatients, addPatient, updatePatient, getPatientByUhid, generateUhid, hasLoaded }}>
      {children}
    </PatientContext.Provider>
  );
};

export const usePatients = () => {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatients must be used within a PatientProvider');
  }

  // Depend on the values actually used, not the context object: the provider

  // builds a new object every render, so [context] re-fired this effect on each

  // one. The ref stops a second request while the first is still in flight —

  // hasLoaded only flips once the fetches resolve, so it cannot guard that gap.

  const { hasLoaded, loading, refreshPatients } = context as any;

  const requested = useRef(false);

  useEffect(() => {

    if (hasLoaded || loading || requested.current) return;

    requested.current = true;

    Promise.resolve(refreshPatients?.()).finally(() => { requested.current = false; });

  }, [hasLoaded, loading, refreshPatients]);

  return context;
};
