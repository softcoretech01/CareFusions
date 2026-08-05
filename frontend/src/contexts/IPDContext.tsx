import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

const API_BASE = import.meta.env.VITE_API_URL as string;
const IPD = `${API_BASE}/ipd`;

export type BedStatus = 'Available' | 'Reserved' | 'Occupied' | 'Cleaning' | 'Maintenance';

export interface Ward {
  id: number;
  name: string;
  type: 'General' | 'Semi-Private' | 'Private' | 'Deluxe' | 'ICU' | 'NICU' | 'PICU' | 'HDU' | 'OT';
  genderRestriction: 'Male' | 'Female' | 'Any';
  capacity: number;
}

export interface Bed {
  id: number;
  wardId: number;
  roomNumber: string;
  bedNumber: string;
  status: BedStatus;
}

export interface AdmissionRequest {
  id: number;
  requestDate: string;
  uhid: string;
  patientName: string;
  specialty: string;
  admissionType: string;
  priority: string;
  provisionalDiagnosis: string;
  requestedBy: string; // Doctor Name
  status: 'Pending' | 'Admitted' | 'Cancelled';
}

export interface WardTransferRecord {
  id: string;
  fromWardId: number;
  toWardId: number;
  fromBedId: number;
  toBedId: number;
  transferDate: string;
  transferReason: string;
}

export interface DischargeInfo {
  dischargeDate: string;
  dischargeSummary: string;
  dischargedBy: string;
  medicines: Array<{
    medicineId: number;
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    notes: string;
  }>;
}

export interface IPDPatient {
  id: number;
  admissionNumber: string;
  uhid: string;
  patientName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  admissionDate: string;
  admittingDoctor: string;
  specialty: string;
  admissionType: string;
  priority: string;
  expectedStayDays: number;
  status: 'Admitted' | 'Discharge Requested' | 'Discharged';
  currentWardId: number | null;
  currentBedId: number | null;
  provisionalDiagnosis: string;
  insuranceStatus: string;
  wardTransferHistory: WardTransferRecord[];
  dischargeInfo: DischargeInfo | null;
}

interface IPDContextType {
  wards: Ward[];
  beds: Bed[];
  patients: IPDPatient[];
  admissionRequests: AdmissionRequest[];

  // Actions
  admitPatient: (patient: Omit<IPDPatient, 'id' | 'admissionNumber' | 'wardTransferHistory' | 'dischargeInfo'>) => void;
  requestDischarge: (id: number, dischargeInfo: DischargeInfo) => void;
  dischargePatient: (id: number, dischargeInfo?: DischargeInfo) => void;
  allocateBed: (patientId: number, bedId: number, reason?: string) => void;
  requestAdmission: (request: Omit<AdmissionRequest, 'id' | 'status' | 'requestDate'>) => void;
  updateAdmissionRequestStatus: (id: number, status: AdmissionRequest['status']) => void;
  generateAdmissionNumber: () => string;
  apiError: string | null;
  clearError: () => void;
}

const IPDContext = createContext<IPDContextType | undefined>(undefined);

// Pull a readable message out of a failed response.
async function errMsg(res: Response): Promise<string> {
  try {
    const d = (await res.json())?.detail;
    if (Array.isArray(d)) return d[0]?.msg ?? 'Request failed';
    if (typeof d === 'string') return d;
  } catch { /* not json */ }
  return `Request failed (${res.status})`;
}

export const IPDProvider = ({ children }: { children: ReactNode }) => {
  const [wards, setWards] = useState<Ward[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [patients, setPatients] = useState<IPDPatient[]>([]);
  const [admissionRequests, setAdmissionRequests] = useState<AdmissionRequest[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  const clearError = useCallback(() => setApiError(null), []);

  const loadWards = useCallback(async () => {
    try { const r = await fetch(`${IPD}/wards`); if (r.ok) setWards(await r.json()); } catch { /* offline */ }
  }, []);
  const loadBeds = useCallback(async () => {
    try { const r = await fetch(`${IPD}/beds`); if (r.ok) setBeds(await r.json()); } catch { /* offline */ }
  }, []);
  const loadAdmissions = useCallback(async () => {
    try { const r = await fetch(`${IPD}/admissions`); if (r.ok) setPatients(await r.json()); } catch { /* offline */ }
  }, []);
  const loadRequests = useCallback(async () => {
    try { const r = await fetch(`${IPD}/admission-requests`); if (r.ok) setAdmissionRequests(await r.json()); } catch { /* offline */ }
  }, []);

  useEffect(() => {
    loadWards(); loadBeds(); loadAdmissions(); loadRequests();
  }, [loadWards, loadBeds, loadAdmissions, loadRequests]);

  // ── Actions ────────────────────────────────────────────────
  const admitPatient = (p: Omit<IPDPatient, 'id' | 'admissionNumber' | 'wardTransferHistory' | 'dischargeInfo'>) => {
    (async () => {
      try {
        const res = await fetch(`${IPD}/admissions`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uhid: p.uhid, patientName: p.patientName, age: p.age, gender: p.gender,
            bloodGroup: p.bloodGroup, admittingDoctor: p.admittingDoctor, specialty: p.specialty,
            admissionType: p.admissionType, priority: p.priority, expectedStayDays: p.expectedStayDays,
            wardId: p.currentWardId, bedId: p.currentBedId,
            provisionalDiagnosis: p.provisionalDiagnosis, insuranceStatus: p.insuranceStatus,
          }),
        });
        if (!res.ok) { setApiError(`Admission failed: ${await errMsg(res)}`); return; }
        await Promise.all([loadAdmissions(), loadBeds()]);
      } catch { setApiError('Admission failed: server unreachable.'); }
    })();
  };

  const allocateBed = (patientId: number, bedId: number, reason?: string) => {
    const wardId = beds.find(b => b.id === bedId)?.wardId;
    if (wardId == null) { setApiError('Selected bed not found.'); return; }
    (async () => {
      try {
        const res = await fetch(`${IPD}/admissions/${patientId}/allocate-bed`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wardId, bedId, reason }),
        });
        if (!res.ok) { setApiError(`Bed allocation failed: ${await errMsg(res)}`); await loadBeds(); return; }
        await Promise.all([loadAdmissions(), loadBeds()]);
      } catch { setApiError('Bed allocation failed: server unreachable.'); }
    })();
  };

  const requestDischarge = (id: number, dischargeInfo: DischargeInfo) => {
    (async () => {
      try {
        const res = await fetch(`${IPD}/admissions/${id}/request-discharge`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dischargeSummary: dischargeInfo.dischargeSummary,
            dischargedBy: dischargeInfo.dischargedBy,
            medicines: dischargeInfo.medicines,
          }),
        });
        if (!res.ok) { setApiError(`Discharge request failed: ${await errMsg(res)}`); return; }
        await loadAdmissions();
      } catch { setApiError('Discharge request failed: server unreachable.'); }
    })();
  };

  const dischargePatient = (id: number, dischargeInfo?: DischargeInfo) => {
    (async () => {
      try {
        const res = await fetch(`${IPD}/admissions/${id}/discharge`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dischargeSummary: dischargeInfo?.dischargeSummary,
            dischargedBy: dischargeInfo?.dischargedBy,
            medicines: dischargeInfo?.medicines ?? [],
          }),
        });
        if (!res.ok) { setApiError(`Discharge failed: ${await errMsg(res)}`); return; }
        await Promise.all([loadAdmissions(), loadBeds()]);
      } catch { setApiError('Discharge failed: server unreachable.'); }
    })();
  };

  const requestAdmission = (request: Omit<AdmissionRequest, 'id' | 'status' | 'requestDate'>) => {
    (async () => {
      try {
        const res = await fetch(`${IPD}/admission-requests`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        if (!res.ok) { setApiError(`Request failed: ${await errMsg(res)}`); return; }
        await loadRequests();
      } catch { setApiError('Request failed: server unreachable.'); }
    })();
  };

  const updateAdmissionRequestStatus = (id: number, statusValue: AdmissionRequest['status']) => {
    (async () => {
      try {
        const res = await fetch(`${IPD}/admission-requests/${id}/status`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: statusValue }),
        });
        if (!res.ok) { setApiError(`Update failed: ${await errMsg(res)}`); return; }
        await loadRequests();
      } catch { setApiError('Update failed: server unreachable.'); }
    })();
  };

  // Provisional preview only — the definitive number is assigned by the server on admit.
  const generateAdmissionNumber = useCallback(() => {
    const yr = new Date().getFullYear();
    return `IPD-${yr}${String(patients.length + 1).padStart(4, '0')}`;
  }, [patients]);

  return (
    <IPDContext.Provider
      value={{
        wards,
        beds,
        patients,
        admissionRequests,
        admitPatient,
        requestDischarge,
        dischargePatient,
        allocateBed,
        requestAdmission,
        updateAdmissionRequestStatus,
        generateAdmissionNumber,
        apiError,
        clearError,
      }}
    >
      {children}
    </IPDContext.Provider>
  );
};

export const useIPD = () => {
  const context = useContext(IPDContext);
  if (context === undefined) {
    throw new Error('useIPD must be used within an IPDProvider');
  }
  return context;
};
