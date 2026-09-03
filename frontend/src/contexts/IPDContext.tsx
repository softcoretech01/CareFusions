import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';

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
  admissionReason: string;
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
  currentWardName: string;
  currentBedId: number | null;
  admissionReason: string;
  provisionalDiagnosis?: string;
  // Set by GET /ipd/admissions: true only when an OT service order item has
  // cleared PRO approval, payment and Service Release. Gates the Operations tab.
  hasReleasedOT?: boolean;
  coverageType: 'Self Pay' | 'Insurance';
  insuranceStatus: 'NOT_APPLICABLE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  financialStatus: 'PENDING' | 'ADVANCE_PENDING' | 'PARTIALLY_PAID' | 'READY_FOR_DISCHARGE' | 'FULLY_PAID' | 'REFUND_PENDING' | 'CLEARED';
  insuranceCompany?: string | null;
  tpa?: string | null;
  policyNumber?: string | null;
  memberId?: string | null;
  policyHolderName?: string | null;
  relationship?: string | null;
  policyStartDate?: string | null;
  policyEndDate?: string | null;
  preAuthNumber?: string | null;
  authStatus?: string | null;
  approvedAmount?: number | null;
  coveragePercentage?: number | null;
  deductible?: number | null;
  coPay?: number | null;
  nonCoveredAmount?: number | null;
  insuranceRemarks?: string | null;
  wardTransferHistory: WardTransferRecord[];
  dischargeInfo: DischargeInfo | null;
  operations?: any[];
}

interface IPDContextType {
  wards: Ward[];
  beds: Bed[];
  patients: IPDPatient[];
  admissionRequests: AdmissionRequest[];
  /** Maps IPD_Wards.WardId → Mst_WardCharges.Id (charge-master id) by name match */
  ipdWardMap: Record<number, number>;

  // Actions
  admitPatient: (patient: Omit<IPDPatient, 'id' | 'admissionNumber' | 'wardTransferHistory' | 'dischargeInfo'>) => void;
  requestDischarge: (id: number, dischargeInfo: DischargeInfo) => void;
  dischargePatient: (id: number, dischargeInfo?: DischargeInfo) => void;
  allocateBed: (patientId: number, bedId: number, reason?: string, operations?: any[]) => void;
  requestAdmission: (request: Omit<AdmissionRequest, 'id' | 'status' | 'requestDate'>) => void;
  updateAdmissionRequestStatus: (id: number, status: AdmissionRequest['status']) => void;
  updateBedStatus: (bedId: number, status: BedStatus) => Promise<boolean>;
  generateAdmissionNumber: () => string;
  addWard: (ward: { name: string; type: Ward['type']; genderRestriction: Ward['genderRestriction']; capacity: number }) => Promise<boolean>;
  addBed: (bed: { wardId: number; roomNumber: string; bedNumber: string }) => Promise<boolean>;
  apiError: string | null;
  clearError: () => void;
  hasLoaded?: boolean;
  loadAll?: () => Promise<void>;
  /** Force a reload, ignoring the load-once cache. */
  refreshAll?: () => Promise<void>;
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
  const [, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [ipdWardMap] = useState<Record<number, number>>({});

  const clearError = useCallback(() => setApiError(null), []);

  const loadAdmissions = useCallback(async () => {
    try { const r = await fetch(`${IPD}/admissions`); if (r.ok) setPatients(await r.json()); } catch { /* offline */ }
  }, []);
  const loadRequests = useCallback(async () => {
    try { const r = await fetch(`${IPD}/admission-requests`); if (r.ok) setAdmissionRequests(await r.json()); } catch { /* offline */ }
  }, []);

  const loadWardsAndBeds = useCallback(async (currentPatients: IPDPatient[]) => {
    try {
      // Restore wards from cache immediately so sidebar shows wards on reload
      const cached = sessionStorage.getItem('ipd_wards_cache');
      if (cached) {
        try { setWards(JSON.parse(cached)); } catch { /* ignore bad cache */ }
      }

      const res = await fetch(`${API_BASE}/ward-charges/`);
      if (res.ok) {
        const wardCharges = await res.json();
        const activeAdmissions = currentPatients.filter(p => p.status === 'Admitted' || p.status === 'Discharge Requested');
        const occupiedBedIds = new Set(activeAdmissions.map(p => p.currentBedId).filter(Boolean));

        const newWards: Ward[] = [];
        const newBeds: Bed[] = [];

        wardCharges.forEach((wc: any) => {
          let parsedRooms: any[] = [];
          try {
            if (wc.Description) {
              const parsed = JSON.parse(wc.Description);
              if (parsed.rooms && Array.isArray(parsed.rooms)) {
                parsedRooms = parsed.rooms;
              }
            }
          } catch (e) {
            // ignore
          }

          let capacity = 0;
          parsedRooms.forEach(r => {
             const qty = typeof r === 'string' ? 1 : (r.bedQty || 1);
             const roomNo = typeof r === 'string' ? r : (r.roomNo || '');
             for (let i = 1; i <= qty; i++) {
               const bedNumber = qty === 1 ? '1' : String(i);
               
               // Generate a synthetic integer ID for the bed based on WardId and sequence
               const syntheticBedId = (wc.Id * 10000) + capacity + 1;
               
               newBeds.push({
                 id: syntheticBedId,
                 wardId: wc.Id,
                 roomNumber: roomNo,
                 bedNumber: bedNumber,
                 status: occupiedBedIds.has(syntheticBedId) ? 'Occupied' : 'Available'
               });
               capacity++;
             }
          });

          newWards.push({
            id: wc.Id,
            name: wc.WardType,
            type: wc.WardType as any,
            genderRestriction: 'Any',
            capacity: capacity || 1
          });
        });
        
        const sortOrder = ['General Male', 'General Female', 'Semi-Private', 'Private', 'Deluxe', 'OT'];
        newWards.sort((a, b) => {
          const indexA = sortOrder.findIndex(name => name.toLowerCase() === a.name.toLowerCase());
          const indexB = sortOrder.findIndex(name => name.toLowerCase() === b.name.toLowerCase());
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return a.name.localeCompare(b.name);
        });

        setWards(newWards);
        setBeds(newBeds);
        // Cache ward list so sidebar renders instantly on next reload
        try { sessionStorage.setItem('ipd_wards_cache', JSON.stringify(newWards)); } catch { /* ignore */ }
      }
    } catch { /* offline */ }
  }, []);

  // `hasLoaded` only flips once the four fetches resolve, so it cannot guard the
  // async window in between — a ref is set synchronously on entry instead.
  // Without it, every re-render during the in-flight period launched another
  // full round of requests.
  const inFlight = useRef(false);

  const loadAll = useCallback(async () => {
    if (hasLoaded || inFlight.current) return;
    inFlight.current = true;
    setIsLoading(true);
    try {
      // First load admissions so we can compute occupancy
      let currentAdmissions: IPDPatient[] = [];
      try { 
        const r = await fetch(`${IPD}/admissions`); 
        if (r.ok) {
          currentAdmissions = await r.json();
          setPatients(currentAdmissions);
        }
      } catch { /* offline */ }

      await Promise.all([
        loadWardsAndBeds(currentAdmissions), 
        loadRequests()
      ]);
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
      inFlight.current = false;
    }
  }, [hasLoaded, loadWardsAndBeds, loadRequests]);

  // Ward, bed and admission state changes constantly, so screens that show it
  // re-pull on open. loadAll short-circuits once loaded, which would leave those
  // screens showing whatever was cached when the module was first entered.
  const refreshAll = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      let currentAdmissions: IPDPatient[] = [];
      try { 
        const r = await fetch(`${IPD}/admissions`); 
        if (r.ok) {
          currentAdmissions = await r.json();
          setPatients(currentAdmissions);
        }
      } catch { /* offline */ }

      await Promise.all([
        loadWardsAndBeds(currentAdmissions), 
        loadRequests()
      ]);
      setHasLoaded(true);
    } finally {
      inFlight.current = false;
    }
  }, [loadWardsAndBeds, loadRequests]);

  // Removed automatic useEffect for loading all data on mount

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
            operations: p.operations,
          }),
        });
        if (!res.ok) { setApiError(`Admission failed: ${await errMsg(res)}`); return; }
        await refreshAll();
      } catch { setApiError('Admission failed: server unreachable.'); }
    })();
  };

  const allocateBed = (patientId: number, bedId: number, reason?: string, operations?: any[]) => {
    const wardId = beds.find(b => b.id === bedId)?.wardId;
    if (wardId == null) { setApiError('Selected bed not found.'); return; }
    (async () => {
      try {
        const res = await fetch(`${IPD}/admissions/${patientId}/allocate-bed`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wardId, bedId, reason, operations }),
        });
        if (!res.ok) { setApiError(`Bed allocation failed: ${await errMsg(res)}`); await refreshAll(); return; }
        await refreshAll();
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
        await refreshAll();
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

  const updateBedStatus = async (bedId: number, status: BedStatus): Promise<boolean> => {
    try {
      const res = await fetch(`${IPD}/beds/${bedId}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { setApiError(`Update bed failed: ${await errMsg(res)}`); return false; }
      await refreshAll();
      return true;
    } catch { setApiError('Update bed failed: server unreachable.'); return false; }
  };

  const addWard = async (w: { name: string; type: Ward['type']; genderRestriction: Ward['genderRestriction']; capacity: number }): Promise<boolean> => {
    try {
      const res = await fetch(`${IPD}/wards`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wardName: w.name, wardType: w.type, genderRestriction: w.genderRestriction, capacity: w.capacity }),
      });
      if (!res.ok) { setApiError(`Add ward failed: ${await errMsg(res)}`); return false; }
      await refreshAll();
      return true;
    } catch { setApiError('Add ward failed: server unreachable.'); return false; }
  };

  const addBed = async (b: { wardId: number; roomNumber: string; bedNumber: string }): Promise<boolean> => {
    try {
      const res = await fetch(`${IPD}/beds`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wardId: b.wardId, roomNumber: b.roomNumber, bedNumber: b.bedNumber }),
      });
      if (!res.ok) { setApiError(`Add bed failed: ${await errMsg(res)}`); return false; }
      await refreshAll();
      return true;
    } catch { setApiError('Add bed failed: server unreachable.'); return false; }
  };

  // Provisional preview only — the definitive number is assigned by the server on admit.
  const generateAdmissionNumber = useCallback(() => {
    const yr = new Date().getFullYear();
    return `IPD-${yr}${String(patients.length + 1).padStart(4, '0')}`;
  }, [patients]);

  return (
    <IPDContext.Provider
      value={{
        wards, beds, patients, admissionRequests,
        ipdWardMap,
        admitPatient, requestDischarge, dischargePatient, allocateBed,
        requestAdmission, updateAdmissionRequestStatus, updateBedStatus, generateAdmissionNumber, addWard, addBed,
        apiError, clearError, hasLoaded, loadAll, refreshAll
      }}
    >
      {children}
    </IPDContext.Provider>
  );
};

export const useIPD = () => {
  const context = useContext(IPDContext);
  if (!context) throw new Error('useIPD must be used within IPDProvider');
  
  // Depend on the two values actually used, not the whole context object — the
  // provider builds a new object every render, so `[context]` re-fired this
  // effect on each one and every consumer triggered another load.
  const { hasLoaded, loadAll } = context;
  useEffect(() => {
    if (!hasLoaded) loadAll?.();
  }, [hasLoaded, loadAll]);

  return context;
};
