import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';

// ── Status flow ────────────────────────────────────────────────────────────
export type OPDVisitStatus =
  | 'Scheduled'
  | 'Arrived'
  | 'Nursing Assessment'
  | 'Waiting for Doctor'
  | 'Consulting'
  | 'Investigation Pending'
  | 'Billing Pending'
  | 'Pharmacy Pending'
  | 'Completed'
  | 'No Show';

// ── Sub-types ──────────────────────────────────────────────────────────────
export interface Vitals {
  bp_systolic: number;
  bp_diastolic: number;
  pulse: number;
  respRate: number;
  temp: number;
  tempUnit: 'C' | 'F';
  spo2: number;
  height: number;
  weight: number;
  bmi: number;
  bloodSugar?: number;
  recordedAt: string;
  recordedBy: string;
}

export interface TriageInfo {
  chiefComplaint: string;
  painScore: number;
  allergyVerified: boolean;
  pregnancyStatus: 'NA' | 'Pregnant' | 'NotPregnant' | 'Unknown';
  fallRisk: 'Low' | 'Medium' | 'High';
  infectionStatus: 'None' | 'Suspected' | 'Confirmed';
  observations: string;
}

export interface Diagnosis {
  id: string;
  description: string;
}

export interface PrescriptionItem {
  id: string;
  type: 'Tablet' | 'Injection' | 'Syrup' | 'Capsule' | 'Ointment' | 'Drops';
  medicineName: string;
  quantity: string | number;
  alerts: string[];
}

export interface LabOrder {
  id: string;
  testName: string;
  testCode: string;
  priority: 'Routine' | 'Urgent' | 'STAT';
  clinicalNotes: string;
  status: 'Ordered' | 'Collected' | 'Processing' | 'Resulted';
  result?: string;
}

export interface RadiologyOrder {
  id: string;
  modality: 'X-Ray' | 'CT Scan' | 'MRI' | 'Ultrasound' | 'Echo' | 'ECG' | 'Mammography' | 'PET Scan';
  bodyPart: string;
  indication: string;
  priority: 'Routine' | 'Urgent' | 'STAT';
  contrastRequired: boolean;
  specialInstructions: string;
  status: 'Ordered' | 'Scheduled' | 'Completed' | 'Reported';
}

export interface Referral {
  id: string;
  referralType: 'Internal' | 'External' | 'Allied';
  referredTo: string;
  department?: string;
  reason: string;
  urgency: 'Routine' | 'Urgent' | 'Emergency';
  clinicalSummary: string;
  notes: string;
}

export interface Procedure {
  id: string;
  procedureName: string;
  performedBy: string;
  startTime: string;
  endTime: string;
  notes: string;
  billingCode: string;
}

export interface AdmissionRequest {
  admissionReason: string;
  provisionalDiagnosis: string;
  recommendedWard: 'General' | 'Private' | 'ICU' | 'HDU' | 'Day Care';
  bedType: string;
  priority: 'Routine' | 'Emergency';
  expectedStayDays: number;
  specialRequirements: string;
}

export interface FollowUpPlan {
  followUpDate: string;
  reviewInterval: string;
  requiredInvestigations: string;
  specialInstructions: string;
}

// Removed complex consultation notes per new design

// ── Main Visit Record ──────────────────────────────────────────────────────
export interface OPDVisit {
  id: number;
  visitNumber: string;
  appointmentId?: number;
  uhid: string;
  patientName: string;
  age: number;
  gender: string;
  mobileNumber: string;
  doctorName: string;
  department: string;
  date: string;
  timeSlot: string;
  queueToken: string;
  appointmentNumber: string;
  visitType: 'OP' | 'Emergency' | 'Walk-In' | 'Follow-Up';
  priority: 'Normal' | 'High' | 'Emergency';
  status: OPDVisitStatus;
  billingStatus: 'Pending' | 'Completed' | 'Partially Paid' | 'Cancelled';
  // Allergies from patient record
  allergies: string[];
  // Clinical data
  vitals?: Vitals;
  triageInfo?: TriageInfo;
  diagnoses: Diagnosis[];
  prescriptions: PrescriptionItem[];
  labOrders: LabOrder[];
  radiologyOrders: RadiologyOrder[];
  procedures: Procedure[];
  admissionRequest?: AdmissionRequest;
  followUp?: FollowUpPlan;
  // Audit
  triageCompletedAt?: string;
  consultationStartedAt?: string;
  isFinalized: boolean;
  finalizedAt?: string;
  finalizedBy?: string;
}

// ── Context type ───────────────────────────────────────────────────────────
interface OPDVisitContextType {
  visits: OPDVisit[];
  addVisit: (visit: OPDVisit) => void;
  updateVisit: (id: number, updates: Partial<OPDVisit>) => void;
  updateVisitStatus: (id: number, status: OPDVisitStatus) => void;
  saveTriage: (id: number, vitals: Vitals, triageInfo: TriageInfo) => void;
  saveConsultation: (visitId: number, diagnoses: Diagnosis[]) => void;
  addDiagnosis: (visitId: number, diagnosis: Diagnosis) => void;
  removeDiagnosis: (visitId: number, diagnosisId: string) => void;
  addPrescription: (visitId: number, item: PrescriptionItem) => void;
  removePrescription: (visitId: number, itemId: string) => void;
  addLabOrder: (visitId: number, order: LabOrder) => void;
  removeLabOrder: (visitId: number, orderId: string) => void;
  addRadiologyOrder: (visitId: number, order: RadiologyOrder) => void;
  removeRadiologyOrder: (visitId: number, orderId: string) => void;
  addProcedure: (visitId: number, procedure: Procedure) => void;
  finalizeVisit: (visitId: number, doctorName: string) => void;
  generateVisitNumber: () => string;
  getVisitById: (id: number) => OPDVisit | undefined;
  hasLoaded?: boolean;
  fetchSchedule?: () => Promise<void>;
}

const OPDVisitContext = createContext<OPDVisitContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_URL as string;

let visitCounter = 0;

// ── Provider ───────────────────────────────────────────────────────────────
export const OPDVisitProvider = ({ children }: { children: ReactNode }) => {
  const [visits, setVisits] = useState<OPDVisit[]>([]);
  const [, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchSchedule = useCallback(async () => {
    if (hasLoaded) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/opd-visits/schedule`);
      if (res.ok) {
        const data = await res.json();
        // Map the backend data to frontend OPDVisit format
        const mapped = data.map((d: any) => ({
          ...d,
          visitNumber: d.queueToken || `OPD-${d.id}`,
          allergies: [],
          diagnoses: d.diagnoses || [],
          prescriptions: d.prescriptions || [],
          labOrders: d.labOrders || [],
          radiologyOrders: d.radiologyOrders || [],
          procedures: [],
        }));
        setVisits(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch OPD schedule", e);
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, [hasLoaded]);

  // Removed automatic useEffect for fetchSchedule

  const generateVisitNumber = useCallback((): string => {
    visitCounter += 1;
    const now = new Date();
    const yr = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    return `OPD-${yr}${mo}${String(visitCounter).padStart(2, '0')}`;
  }, []);

  const syncToBackend = async (visit: OPDVisit) => {
    try {
      const payload = {
        appointmentId: visit.appointmentId || visit.id,
        uhid: visit.uhid,
        isFinalized: visit.isFinalized || false,
        finalizedBy: visit.finalizedBy || "System",
        vitals: visit.vitals,
        triageInfo: visit.triageInfo,
        diagnoses: visit.diagnoses,
        // `alerts` is a string[] in the UI but the API stores it as a single
        // text field — flatten it to a string on the wire so the save is
        // accepted (an empty list becomes null, not "").
        prescriptions: (visit.prescriptions || []).map(p => ({
          ...p,
          alerts: Array.isArray(p.alerts)
            ? (p.alerts.length ? p.alerts.join('; ') : null)
            : (p.alerts ?? null),
        })),
        labOrders: visit.labOrders,
        radiologyOrders: visit.radiologyOrders,
        procedures: visit.procedures,
      };
      const res = await fetch(`${API_BASE}/opd-visits/save-clinical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) console.error("Failed to sync to backend", await res.text());
    } catch (e) {
      console.error("Failed to sync to backend", e);
    }
  };

  // Persisting the clinical record is debounced and serialised per visit.
  // Previously every edit fired its own /save-clinical POST from inside the
  // state updater — and because React StrictMode double-invokes updaters, each
  // save ran twice. Two concurrent SAVE_CLINICAL calls on the same appointment
  // race on the visit-row UPDATE and MariaDB rejects the loser with error 1020
  // ("Record has changed since last read"). Coalescing rapid edits into one
  // save, with only one request in flight at a time, removes that race.
  const saveTimer = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const latestVisit = useRef<Record<number, OPDVisit>>({});
  const inFlight = useRef<Record<number, boolean>>({});
  const resavePending = useRef<Record<number, boolean>>({});

  const flushSave = useCallback(async (visitId: number) => {
    if (inFlight.current[visitId]) { resavePending.current[visitId] = true; return; }
    const visit = latestVisit.current[visitId];
    if (!visit) return;
    inFlight.current[visitId] = true;
    try {
      await syncToBackend(visit);
    } finally {
      inFlight.current[visitId] = false;
      // Edits that arrived mid-save are persisted with the newest state.
      if (resavePending.current[visitId]) {
        resavePending.current[visitId] = false;
        flushSave(visitId);
      }
    }
  }, []);

  const scheduleSave = useCallback((visit: OPDVisit) => {
    latestVisit.current[visit.id] = visit;               // latest wins
    clearTimeout(saveTimer.current[visit.id]);
    saveTimer.current[visit.id] = setTimeout(() => flushSave(visit.id), 500);
  }, [flushSave]);

  const applyUpdateAndSync = (visitId: number, updater: (v: OPDVisit) => OPDVisit) => {
    setVisits(prev => {
      const next = prev.map(v => v.id === visitId ? updater(v) : v);
      const updatedVisit = next.find(v => v.id === visitId);
      // Safe under StrictMode's double-invoke: both runs just set the same
      // "latest" and reset one timer, collapsing to a single debounced save.
      if (updatedVisit) scheduleSave(updatedVisit);
      return next;
    });
  };

  const addVisit = (visit: OPDVisit) => setVisits(prev => [visit, ...prev]);

  const updateVisit = (id: number, updates: Partial<OPDVisit>) => applyUpdateAndSync(id, v => ({ ...v, ...updates }));
  const updateVisitStatus = (id: number, status: OPDVisitStatus) => applyUpdateAndSync(id, v => ({ ...v, status }));

  const saveTriage = (id: number, vitals: Vitals, triageInfo: TriageInfo) =>
    applyUpdateAndSync(id, v => ({ ...v, vitals, triageInfo, status: 'Waiting for Doctor', triageCompletedAt: new Date().toISOString() }));

  const saveConsultation = useCallback((visitId: number, diagnoses: Diagnosis[]) => {
    applyUpdateAndSync(visitId, v => ({ ...v, diagnoses, status: 'Consulting' }));
  }, []);

  const addDiagnosis = (visitId: number, diagnosis: Diagnosis) =>
    applyUpdateAndSync(visitId, v => ({ ...v, diagnoses: [...v.diagnoses, diagnosis] }));

  const removeDiagnosis = (visitId: number, diagnosisId: string) =>
    applyUpdateAndSync(visitId, v => ({ ...v, diagnoses: v.diagnoses.filter(d => d.id !== diagnosisId) }));

  const addPrescription = (visitId: number, item: PrescriptionItem) =>
    applyUpdateAndSync(visitId, v => ({ ...v, prescriptions: [...v.prescriptions, item] }));

  const removePrescription = (visitId: number, itemId: string) =>
    applyUpdateAndSync(visitId, v => ({ ...v, prescriptions: v.prescriptions.filter(p => p.id !== itemId) }));

  const addLabOrder = (visitId: number, order: LabOrder) =>
    applyUpdateAndSync(visitId, v => ({ ...v, labOrders: [...v.labOrders, order] }));

  const removeLabOrder = (visitId: number, orderId: string) =>
    applyUpdateAndSync(visitId, v => ({ ...v, labOrders: v.labOrders.filter(l => l.id !== orderId) }));

  const addRadiologyOrder = (visitId: number, order: RadiologyOrder) =>
    applyUpdateAndSync(visitId, v => ({ ...v, radiologyOrders: [...v.radiologyOrders, order] }));

  const removeRadiologyOrder = useCallback((visitId: number, orderId: string) => {
    applyUpdateAndSync(visitId, v => ({ ...v, radiologyOrders: v.radiologyOrders.filter(r => r.id !== orderId) }));
  }, []);

  const addProcedure = (visitId: number, procedure: Procedure) =>
    applyUpdateAndSync(visitId, v => ({ ...v, procedures: [...v.procedures, procedure] }));

  const finalizeVisit = (id: number, by: string) =>
    applyUpdateAndSync(id, v => ({ ...v, isFinalized: true, status: 'Completed', finalizedAt: new Date().toISOString(), finalizedBy: by }));

  const getVisitById = (id: number) => visits.find(v => v.id === id);

  return (
    <OPDVisitContext.Provider value={{
      visits, addVisit, updateVisit, updateVisitStatus,
      saveTriage, saveConsultation,
      addDiagnosis, removeDiagnosis,
      addPrescription, removePrescription,
      addLabOrder, removeLabOrder,
      addRadiologyOrder, removeRadiologyOrder,
      addProcedure,
      finalizeVisit, getVisitById, generateVisitNumber,
      hasLoaded, fetchSchedule
    }}>
      {children}
    </OPDVisitContext.Provider>

  );
};

export const useOPDVisits = () => {
  const ctx = useContext(OPDVisitContext);
  if (!ctx) throw new Error('useOPDVisits must be used within OPDVisitProvider');
  
  useEffect(() => {
    if (!ctx.hasLoaded && ctx.fetchSchedule) {
      ctx.fetchSchedule();
    }
  }, [ctx]);

  return ctx;
};
