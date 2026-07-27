import { createContext, useContext, useState, type ReactNode, useCallback } from 'react';

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
}

const DUMMY_WARDS: Ward[] = [
  { id: 1, name: 'General Ward - Male', type: 'General', genderRestriction: 'Male', capacity: 10 },
  { id: 2, name: 'General Ward - Female', type: 'General', genderRestriction: 'Female', capacity: 10 },
  { id: 3, name: 'Medical ICU', type: 'ICU', genderRestriction: 'Any', capacity: 5 },
  { id: 4, name: 'Private Suite A', type: 'Private', genderRestriction: 'Any', capacity: 2 },
  { id: 5, name: 'Operation Theater', type: 'OT', genderRestriction: 'Any', capacity: 4 },
];

const DUMMY_BEDS: Bed[] = [
  // General Male (Ward 1) - 10 beds, split into 2 rooms
  ...Array.from({ length: 10 }).map((_, i) => ({ id: 100 + i, wardId: 1, roomNumber: i < 5 ? '101' : '102', bedNumber: `GW-M-${i + 1}`, status: i === 0 ? 'Occupied' : 'Available' as BedStatus })),
  // General Female (Ward 2) - 10 beds, split into 2 rooms
  ...Array.from({ length: 10 }).map((_, i) => ({ id: 200 + i, wardId: 2, roomNumber: i < 5 ? '201' : '202', bedNumber: `GW-F-${i + 1}`, status: 'Available' as BedStatus })),
  // ICU (Ward 3)
  ...Array.from({ length: 5 }).map((_, i) => ({ id: 300 + i, wardId: 3, roomNumber: 'ICU-Main', bedNumber: `ICU-${i + 1}`, status: i < 2 ? 'Occupied' : 'Available' as BedStatus })),
  // Private (Ward 4)
  ...Array.from({ length: 2 }).map((_, i) => ({ id: 400 + i, wardId: 4, roomNumber: `Suite ${i + 1}`, bedNumber: `PVT-${i + 1}`, status: 'Available' as BedStatus })),
  // Operation Theater (Ward 5) — OT Tables
  { id: 500, wardId: 5, roomNumber: 'OT-1', bedNumber: 'OT Table 1', status: 'Occupied' as BedStatus },
  { id: 501, wardId: 5, roomNumber: 'OT-1', bedNumber: 'OT Table 2', status: 'Available' as BedStatus },
  { id: 502, wardId: 5, roomNumber: 'OT-2', bedNumber: 'OT Table 3', status: 'Cleaning' as BedStatus },
  { id: 503, wardId: 5, roomNumber: 'OT-2', bedNumber: 'OT Table 4', status: 'Available' as BedStatus },
];const DUMMY_PATIENTS: IPDPatient[] = [
  {
    id: 1,
    admissionNumber: 'IPD-20260401',
    uhid: 'UHID-2026-0006',
    patientName: 'Priya Sharma',
    age: 45,
    gender: 'Female',
    bloodGroup: 'O+',
    admissionDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    admittingDoctor: 'Dr. Sarah Jenkins',
    specialty: 'General Medicine',
    admissionType: 'General',
    priority: 'Normal',
    expectedStayDays: 3,
    status: 'Admitted',
    currentWardId: 1,
    currentBedId: 100, // GW-M-1
    provisionalDiagnosis: 'Viral Fever with severe dehydration',
    insuranceStatus: 'Covered',
    wardTransferHistory: [],
    dischargeInfo: null,
  },
  {
    id: 2,
    admissionNumber: 'IPD-20260402',
    uhid: 'UHID-2026-0007',
    patientName: 'Rahul Verma',
    age: 55,
    gender: 'Male',
    bloodGroup: 'A+',
    admissionDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    admittingDoctor: 'Dr. Michael Chen',
    specialty: 'Cardiology',
    admissionType: 'ICU',
    priority: 'Emergency',
    expectedStayDays: 7,
    status: 'Admitted',
    currentWardId: 3,
    currentBedId: 300, // ICU-1
    provisionalDiagnosis: 'Acute Myocardial Infarction',
    insuranceStatus: 'Covered',
    wardTransferHistory: [],
    dischargeInfo: null,
  },
  {
    id: 3,
    admissionNumber: 'IPD-20260403',
    uhid: 'UHID-2026-0008',
    patientName: 'Sneha Gupta',
    age: 32,
    gender: 'Female',
    bloodGroup: 'B+',
    admissionDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    admittingDoctor: 'Dr. Emily Brown',
    specialty: 'Obstetrics',
    admissionType: 'General',
    priority: 'Normal',
    expectedStayDays: 4,
    status: 'Admitted',
    currentWardId: 2,
    currentBedId: 201, // PW-F-2
    provisionalDiagnosis: 'Observation post mild complication',
    insuranceStatus: 'Covered',
    wardTransferHistory: [],
    dischargeInfo: null,
  },
  {
    id: 4,
    admissionNumber: 'IPD-20260404',
    uhid: 'UHID-2026-0009',
    patientName: 'Amit Patel',
    age: 41,
    gender: 'Male',
    bloodGroup: 'AB+',
    admissionDate: new Date(Date.now() - 4 * 86400000).toISOString(),
    admittingDoctor: 'Dr. David Wilson',
    specialty: 'Orthopedics',
    admissionType: 'Surgical',
    priority: 'Normal',
    expectedStayDays: 5,
    status: 'Discharge Requested',
    currentWardId: 1,
    currentBedId: 102,
    provisionalDiagnosis: 'Post-op femur fracture recovery',
    insuranceStatus: 'Covered',
    wardTransferHistory: [],
    dischargeInfo: {
      dischargeDate: new Date().toISOString().split('T')[0],
      dischargeSummary: 'Patient recovered well post surgery. Vitals stable. Physical therapy started.',
      dischargedBy: 'Dr. David Wilson',
      medicines: [
        { medicineId: 1, medicineName: 'Amoxicillin 500mg', dosage: '500mg', frequency: 'TDS', duration: '5 days', quantity: 15, notes: 'After food' },
        { medicineId: 2, medicineName: 'Paracetamol 650mg', dosage: '650mg', frequency: 'SOS', duration: '5 days', quantity: 10, notes: 'For pain' },
      ],
    },
  },
  {
    id: 5,
    admissionNumber: 'IPD-20260405',
    uhid: 'UHID-2026-0010',
    patientName: 'Anjali Desai',
    age: 68,
    gender: 'Female',
    bloodGroup: 'O-',
    admissionDate: new Date(Date.now() - 8 * 86400000).toISOString(),
    admittingDoctor: 'Dr. Lisa Wong',
    specialty: 'Neurology',
    admissionType: 'ICU',
    priority: 'Emergency',
    expectedStayDays: 10,
    status: 'Discharge Requested',
    currentWardId: 3,
    currentBedId: 302,
    provisionalDiagnosis: 'Ischemic Stroke observation',
    insuranceStatus: 'Self Pay',
    wardTransferHistory: [],
    dischargeInfo: {
      dischargeDate: new Date().toISOString().split('T')[0],
      dischargeSummary: 'Patient stabilised. Speech and motor functions improving. Discharged to rehab facility.',
      dischargedBy: 'Dr. Lisa Wong',
      medicines: [
        { medicineId: 3, medicineName: 'Aspirin 75mg', dosage: '75mg', frequency: 'OD', duration: '30 days', quantity: 30, notes: 'After breakfast' },
        { medicineId: 4, medicineName: 'Atorvastatin 20mg', dosage: '20mg', frequency: 'OD', duration: '30 days', quantity: 30, notes: 'At night' },
      ],
    },
  },
];

const DUMMY_REQUESTS: AdmissionRequest[] = [
  {
    id: 1,
    requestDate: new Date().toISOString(),
    uhid: 'UHID-2026-0005',
    patientName: 'William Taylor',
    specialty: 'Orthopedics',
    admissionType: 'Surgical',
    priority: 'Normal',
    provisionalDiagnosis: 'Fractured Tibia',
    requestedBy: 'Dr. Emily White',
    status: 'Pending'
  }
];

const IPDContext = createContext<IPDContextType | undefined>(undefined);

export const IPDProvider = ({ children }: { children: ReactNode }) => {
  const [wards] = useState<Ward[]>(DUMMY_WARDS);
  const [beds, setBeds] = useState<Bed[]>(DUMMY_BEDS);
  const [patients, setPatients] = useState<IPDPatient[]>(DUMMY_PATIENTS);
  const [admissionRequests, setAdmissionRequests] = useState<AdmissionRequest[]>(DUMMY_REQUESTS);

  const generateAdmissionNumber = useCallback(() => {
    const yr = new Date().getFullYear();
    const count = patients.length + 1;
    return `IPD-${yr}${String(count).padStart(4, '0')}`;
  }, [patients]);

  const admitPatient = (patientData: Omit<IPDPatient, 'id' | 'admissionNumber' | 'wardTransferHistory' | 'dischargeInfo'>) => {
    const newPatient: IPDPatient = {
      ...patientData,
      id: Date.now(),
      admissionNumber: generateAdmissionNumber(),
      wardTransferHistory: [],
      dischargeInfo: null,
    };
    
    // If bed is assigned, update bed status
    if (patientData.currentBedId) {
      setBeds(prev => prev.map(b => b.id === patientData.currentBedId ? { ...b, status: 'Occupied' } : b));
    }

    setPatients(prev => [newPatient, ...prev]);
  };

  const allocateBed = (patientId: number, bedId: number, reason?: string) => {
    setPatients(prev => prev.map(p => {
      if (p.id === patientId) {
        const oldBedId = p.currentBedId;
        const oldWardId = p.currentWardId;
        const newWardId = beds.find(b => b.id === bedId)?.wardId || null;
        
        // Record transfer if ward has changed
        let newTransferHistory = p.wardTransferHistory;
        if (oldWardId && newWardId && oldWardId !== newWardId && oldBedId) {
          const transfer: WardTransferRecord = {
            id: Date.now().toString(),
            fromWardId: oldWardId,
            toWardId: newWardId,
            fromBedId: oldBedId,
            toBedId: bedId,
            transferDate: new Date().toISOString(),
            transferReason: reason || 'Patient transfer'
          };
          newTransferHistory = [...p.wardTransferHistory, transfer];
        }
        
        // Free old bed if any
        if (p.currentBedId) {
          setBeds(bPrev => bPrev.map(b => b.id === p.currentBedId ? { ...b, status: 'Cleaning' } : b));
        }
        return { ...p, currentBedId: bedId, currentWardId: newWardId, wardTransferHistory: newTransferHistory };
      }
      return p;
    }));
    
    // Occupy new bed
    setBeds(prev => prev.map(b => b.id === bedId ? { ...b, status: 'Occupied' } : b));
  };

  const requestDischarge = (id: number, dischargeInfo: DischargeInfo) => {
    setPatients(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, status: 'Discharge Requested', dischargeInfo };
      }
      return p;
    }));
  };

  const dischargePatient = (id: number, dischargeInfo?: DischargeInfo) => {
    setPatients(prev => prev.map(p => {
      if (p.id === id) {
        if (p.currentBedId) {
          // Free the bed back to Available immediately on discharge
          setBeds(bPrev => bPrev.map(b => b.id === p.currentBedId ? { ...b, status: 'Available' } : b));
        }
        return {
          ...p,
          status: 'Discharged',
          currentBedId: null,
          currentWardId: null,
          ...(dischargeInfo ? { dischargeInfo } : {})
        };
      }
      return p;
    }));
  };

  const requestAdmission = (request: Omit<AdmissionRequest, 'id' | 'status' | 'requestDate'>) => {
    const newReq: AdmissionRequest = {
      ...request,
      id: Date.now(),
      status: 'Pending',
      requestDate: new Date().toISOString(),
    };
    setAdmissionRequests(prev => [newReq, ...prev]);
  };

  const updateAdmissionRequestStatus = (id: number, status: AdmissionRequest['status']) => {
    setAdmissionRequests(prev => prev.map(req => req.id === id ? { ...req, status } : req));
  };

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
