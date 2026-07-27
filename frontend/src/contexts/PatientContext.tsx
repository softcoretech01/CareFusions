import { createContext, useContext, useState, type ReactNode } from 'react';

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
  nationalId?: string;
  
  // Visit info
  visitType?: string;
  department?: string;
  doctor?: string;
  priority?: string;
  
  // Emergency Contacts
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  
  // Allow dynamic addition of other fields from massive form
  [key: string]: any;
}

interface PatientContextType {
  patients: GlobalPatientRecord[];
  addPatient: (patient: GlobalPatientRecord) => void;
  updatePatient: (id: number, data: Partial<GlobalPatientRecord>) => void;
  getPatientByUhid: (uhid: string) => GlobalPatientRecord | undefined;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

// Initial mock data — matches appointment context UHIDs so existing patient search works
const initialPatients: GlobalPatientRecord[] = [
  // ── OP Patients ──
  {
    id: 1,
    uhid: 'UHID-2026-0001',
    patientName: 'John Doe',
    gender: 'Male',
    age: 52,
    mobileNumber: '9876543210',
    registrationDate: '2026-07-23',
    registrationTime: '08:30 AM',
    registrationType: 'New',
    status: 'Active',
    department: 'Cardiology',
    doctor: 'Dr. Sarah Jenkins',
  },
  {
    id: 2,
    uhid: 'UHID-2026-0002',
    patientName: 'Jane Smith',
    gender: 'Female',
    age: 34,
    mobileNumber: '9876543211',
    email: 'jane.smith@email.com',
    registrationDate: '2026-07-23',
    registrationTime: '08:45 AM',
    registrationType: 'New',
    status: 'Active',
    department: 'General Medicine',
    doctor: 'Dr. Michael Chen',
  },
  {
    id: 3,
    uhid: 'UHID-2026-0003',
    patientName: 'Robert Johnson',
    gender: 'Male',
    age: 47,
    mobileNumber: '9876543212',
    registrationDate: '2026-07-23',
    registrationTime: '09:00 AM',
    registrationType: 'Quick',
    status: 'Active',
    department: 'Orthopedics',
    doctor: 'Dr. Emily Brown',
  },
  {
    id: 4,
    uhid: 'UHID-2026-0004',
    patientName: 'Maria Garcia',
    gender: 'Female',
    age: 28,
    mobileNumber: '9876543213',
    registrationDate: '2026-07-23',
    registrationTime: '09:15 AM',
    registrationType: 'Emergency',
    status: 'Active',
    department: 'Pediatrics',
    doctor: 'Dr. David Wilson',
  },
  {
    id: 5,
    uhid: 'UHID-2026-0005',
    patientName: 'William Taylor',
    gender: 'Male',
    age: 62,
    mobileNumber: '9876543214',
    registrationDate: '2026-07-23',
    registrationTime: '09:30 AM',
    registrationType: 'New',
    status: 'Active',
    department: 'Ophthalmology',
    doctor: 'Dr. Lisa Wong',
  },
  // ── IP Patients ──
  {
    id: 6,
    uhid: 'UHID-2026-0006',
    patientName: 'Priya Sharma',
    gender: 'Female',
    age: 45,
    mobileNumber: '9876543215',
    registrationDate: '2026-07-20',
    registrationTime: '10:00 AM',
    registrationType: 'New',
    status: 'Active',
    department: 'General Medicine',
    doctor: 'Dr. Sarah Jenkins',
  },
  {
    id: 7,
    uhid: 'UHID-2026-0007',
    patientName: 'Rahul Verma',
    gender: 'Male',
    age: 55,
    mobileNumber: '9876543216',
    registrationDate: '2026-07-18',
    registrationTime: '11:30 AM',
    registrationType: 'Emergency',
    status: 'Active',
    department: 'Cardiology',
    doctor: 'Dr. Michael Chen',
  },
  {
    id: 8,
    uhid: 'UHID-2026-0008',
    patientName: 'Sneha Gupta',
    gender: 'Female',
    age: 32,
    mobileNumber: '9876543217',
    registrationDate: '2026-07-21',
    registrationTime: '02:15 PM',
    registrationType: 'New',
    status: 'Active',
    department: 'Obstetrics',
    doctor: 'Dr. Emily Brown',
  },
  {
    id: 9,
    uhid: 'UHID-2026-0009',
    patientName: 'Amit Patel',
    gender: 'Male',
    age: 41,
    mobileNumber: '9876543218',
    registrationDate: '2026-07-19',
    registrationTime: '04:45 PM',
    registrationType: 'Quick',
    status: 'Active',
    department: 'Orthopedics',
    doctor: 'Dr. David Wilson',
  },
  {
    id: 10,
    uhid: 'UHID-2026-0010',
    patientName: 'Anjali Desai',
    gender: 'Female',
    age: 68,
    mobileNumber: '9876543219',
    registrationDate: '2026-07-15',
    registrationTime: '08:00 AM',
    registrationType: 'Emergency',
    status: 'Active',
    department: 'Neurology',
    doctor: 'Dr. Lisa Wong',
  },
];

export const PatientProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<GlobalPatientRecord[]>(initialPatients);

  const addPatient = (patient: GlobalPatientRecord) => {
    setPatients((prev) => [patient, ...prev]);
  };

  const updatePatient = (id: number, data: Partial<GlobalPatientRecord>) => {
    setPatients((prev) => 
      prev.map(p => (p.id === id ? { ...p, ...data } : p))
    );
  };

  const getPatientByUhid = (uhid: string) => {
    return patients.find(p => p.uhid === uhid);
  };

  return (
    <PatientContext.Provider value={{ patients, addPatient, updatePatient, getPatientByUhid }}>
      {children}
    </PatientContext.Provider>
  );
};

export const usePatients = () => {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatients must be used within a PatientProvider');
  }
  return context;
};
