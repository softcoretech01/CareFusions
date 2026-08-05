import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

// ── Status flow ────────────────────────────────────────────────────────────
export type OPDVisitStatus =
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
  getVisitById: (id: number) => OPDVisit | undefined;
  generateVisitNumber: () => string;
}

const OPDVisitContext = createContext<OPDVisitContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_URL as string;

let visitCounter = 0;

// ── Provider ───────────────────────────────────────────────────────────────
export const OPDVisitProvider = ({ children }: { children: ReactNode }) => {
  const [visits, setVisits] = useState<OPDVisit[]>([]);

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/opd-visits/schedule`);
      if (res.ok) {
        const data = await res.json();
        // Map the backend data to frontend OPDVisit format
        const mapped = data.map((d: any) => ({
          ...d,
          visitNumber: d.queueToken || `OPD-${d.id}`,
          allergies: [],
          diagnoses: [],
          prescriptions: [],
          labOrders: d.labOrders || [],
          radiologyOrders: d.radiologyOrders || [],
          procedures: [],
        }));
        setVisits(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch OPD schedule", e);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const generateVisitNumber = useCallback((): string => {
    visitCounter += 1;
    const now = new Date();
    const yr = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    return `OPD-${yr}${mo}${String(visitCounter).padStart(2, '0')}`;
  }, []);

  const addVisit = (visit: OPDVisit) =>
    setVisits(prev => [visit, ...prev]);

  const updateVisit = (id: number, updates: Partial<OPDVisit>) =>
    setVisits(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));

  const updateVisitStatus = (id: number, status: OPDVisitStatus) =>
    setVisits(prev => prev.map(v => v.id === id ? { ...v, status } : v));

  const saveTriage = (id: number, vitals: Vitals, triageInfo: TriageInfo) =>
    setVisits(prev => prev.map(v => v.id === id
      ? { ...v, vitals, triageInfo, status: 'Waiting for Doctor', triageCompletedAt: new Date().toISOString() }
      : v));

  const saveConsultation = useCallback((visitId: number, diagnoses: Diagnosis[]) => {
    setVisits(prev => prev.map(v => v.id === visitId ? { ...v, diagnoses, status: 'Consulting' } : v));
  }, []);

  const addDiagnosis = (visitId: number, diagnosis: Diagnosis) =>
    setVisits(prev => prev.map(v => v.id === visitId
      ? { ...v, diagnoses: [...v.diagnoses, diagnosis] } : v));

  const removeDiagnosis = (visitId: number, diagnosisId: string) =>
    setVisits(prev => prev.map(v => v.id === visitId
      ? { ...v, diagnoses: v.diagnoses.filter(d => d.id !== diagnosisId) } : v));

  const addPrescription = (visitId: number, item: PrescriptionItem) =>
    setVisits(prev => prev.map(v => v.id === visitId
      ? { ...v, prescriptions: [...v.prescriptions, item] } : v));

  const removePrescription = (visitId: number, itemId: string) =>
    setVisits(prev => prev.map(v => v.id === visitId
      ? { ...v, prescriptions: v.prescriptions.filter(p => p.id !== itemId) } : v));

  const addLabOrder = (visitId: number, order: LabOrder) =>
    setVisits(prev => prev.map(v => v.id === visitId
      ? { ...v, labOrders: [...v.labOrders, order] } : v));

  const removeLabOrder = (visitId: number, orderId: string) =>
    setVisits(prev => prev.map(v => v.id === visitId
      ? { ...v, labOrders: v.labOrders.filter(l => l.id !== orderId) } : v));

  const addRadiologyOrder = (visitId: number, order: RadiologyOrder) =>
    setVisits(prev => prev.map(v => v.id === visitId
      ? { ...v, radiologyOrders: [...v.radiologyOrders, order] } : v));

  const removeRadiologyOrder = useCallback((visitId: number, orderId: string) => {
    setVisits(prev => prev.map(v => v.id === visitId ? { ...v, radiologyOrders: v.radiologyOrders.filter(r => r.id !== orderId) } : v));
  }, []);

  const addProcedure = (visitId: number, procedure: Procedure) =>
    setVisits(prev => prev.map(v => v.id === visitId
      ? { ...v, procedures: [...v.procedures, procedure] } : v));

  const finalizeVisit = (id: number, by: string) =>
    setVisits(prev => prev.map(v => v.id === id
      ? { ...v, isFinalized: true, status: 'Completed', finalizedAt: new Date().toISOString(), finalizedBy: by }
      : v));

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
    }}>
      {children}
    </OPDVisitContext.Provider>

  );
};

export const useOPDVisits = () => {
  const ctx = useContext(OPDVisitContext);
  if (!ctx) throw new Error('useOPDVisits must be used within OPDVisitProvider');
  return ctx;
};
