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

// ── Dummy data ─────────────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];

const DUMMY_VISITS: OPDVisit[] = [
  {
    id: 1,
    visitNumber: 'OPD-202601',
    appointmentId: 1,
    uhid: 'UHID-2026-0001',
    patientName: 'John Doe',
    age: 52,
    gender: 'Male',
    mobileNumber: '9876543210',
    doctorName: 'Dr. Sarah Jenkins',
    department: 'Cardiology',
    date: today,
    timeSlot: '09:00 AM',
    queueToken: 'CAR-001',
    appointmentNumber: 'APT-202601',
    visitType: 'OP',
    priority: 'Normal',
    status: 'Nursing Assessment',
    billingStatus: 'Completed',
    allergies: [],
    diagnoses: [],
    prescriptions: [],
    labOrders: [],
    radiologyOrders: [],
    procedures: [],
    isFinalized: false,
  },
  {
    id: 2,
    visitNumber: 'OPD-202602',
    appointmentId: 2,
    uhid: 'UHID-2026-0002',
    patientName: 'Jane Smith',
    age: 34,
    gender: 'Female',
    mobileNumber: '9876543211',
    doctorName: 'Dr. Michael Chen',
    department: 'General Medicine',
    date: today,
    timeSlot: '09:15 AM',
    queueToken: 'GEN-001',
    appointmentNumber: 'APT-202602',
    visitType: 'Follow-Up',
    priority: 'Normal',
    status: 'Completed',
    billingStatus: 'Completed',
    allergies: ['Penicillin'],
    diagnoses: [],
    prescriptions: [],
    labOrders: [],
    radiologyOrders: [],
    procedures: [],
    isFinalized: false,
  },
  {
    id: 3,
    visitNumber: 'OPD-202603',
    appointmentId: 3,
    uhid: 'UHID-2026-0003',
    patientName: 'Robert Johnson',
    age: 47,
    gender: 'Male',
    mobileNumber: '9876543212',
    doctorName: 'Dr. Emily Brown',
    department: 'Orthopedics',
    date: today,
    timeSlot: '09:30 AM',
    queueToken: 'ORT-001',
    appointmentNumber: 'APT-202603',
    visitType: 'Walk-In',
    priority: 'Normal',
    status: 'Waiting for Doctor',
    billingStatus: 'Pending',
    allergies: [],
    vitals: {
      bp_systolic: 128, bp_diastolic: 82, pulse: 74,
      respRate: 16, temp: 37.1, tempUnit: 'C', spo2: 98,
      height: 175, weight: 82, bmi: 26.8,
      recordedAt: '09:10 AM', recordedBy: 'Nurse Priya',
    },
    triageInfo: {
      chiefComplaint: 'Right knee pain, difficulty walking',
      painScore: 6,
      allergyVerified: true,
      pregnancyStatus: 'NA',
      fallRisk: 'Medium',
      infectionStatus: 'None',
      observations: 'Patient limping, swelling on right knee',
    },
    diagnoses: [],
    prescriptions: [],
    labOrders: [],
    radiologyOrders: [],
    procedures: [],
    isFinalized: false,
  },
  {
    id: 4,
    visitNumber: 'OPD-202604',
    appointmentId: 4,
    uhid: 'UHID-2026-0004',
    patientName: 'Maria Garcia',
    age: 28,
    gender: 'Female',
    mobileNumber: '9876543213',
    doctorName: 'Dr. David Wilson',
    department: 'Pediatrics',
    date: today,
    timeSlot: '10:00 AM',
    queueToken: 'PED-001',
    appointmentNumber: 'APT-202604',
    visitType: 'Emergency',
    priority: 'Emergency',
    status: 'Consulting',
    billingStatus: 'Pending',
    allergies: ['Sulfa drugs', 'Aspirin'],
    vitals: {
      bp_systolic: 90, bp_diastolic: 60, pulse: 110,
      respRate: 22, temp: 38.9, tempUnit: 'C', spo2: 94,
      height: 162, weight: 58, bmi: 22.1,
      recordedAt: '09:55 AM', recordedBy: 'Nurse Kumar',
    },
    triageInfo: {
      chiefComplaint: 'High fever, difficulty breathing',
      painScore: 7,
      allergyVerified: true,
      pregnancyStatus: 'NotPregnant',
      fallRisk: 'High',
      infectionStatus: 'Suspected',
      observations: 'Tachycardic, febrile, SpO2 borderline',
    },
    diagnoses: [],
    prescriptions: [],
    labOrders: [],
    radiologyOrders: [],
    procedures: [],
    isFinalized: false,
  },
  {
    id: 5,
    visitNumber: 'OPD-202605',
    appointmentId: 5,
    uhid: 'UHID-2026-0005',
    patientName: 'William Taylor',
    age: 62,
    gender: 'Male',
    mobileNumber: '9876543214',
    doctorName: 'Dr. Lisa Wong',
    department: 'Ophthalmology',
    date: today,
    timeSlot: '10:30 AM',
    queueToken: 'OPH-001',
    appointmentNumber: 'APT-202605',
    visitType: 'OP',
    priority: 'Normal',
    status: 'Nursing Assessment',
    billingStatus: 'Pending',
    allergies: [],
    diagnoses: [],
    prescriptions: [],
    labOrders: [],
    radiologyOrders: [],
    procedures: [],
    isFinalized: false,
  },
];

let visitCounter = 5;

// ── Provider ───────────────────────────────────────────────────────────────
export const OPDVisitProvider = ({ children }: { children: ReactNode }) => {
  const [visits, setVisits] = useState<OPDVisit[]>(() => {
    const saved = localStorage.getItem('opdVisits_v4');
    if (saved) return JSON.parse(saved);
    return DUMMY_VISITS;
  });

  useEffect(() => {
    localStorage.setItem('opdVisits_v4', JSON.stringify(visits));
  }, [visits]);

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
