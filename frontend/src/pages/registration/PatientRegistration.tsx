import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Filter, Edit2, Download, Trash2, Printer, Eye,
  User, Phone, FileText, Heart, Shield, Activity, Calendar, FileDigit, Info,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL as string;

import { exportToExcel } from '../../utils/exportToExcel';
import { DateFilter } from '../../components/ui/DateFilter';
import { PatientDetailsModal } from './PatientDetailsModal';interface PatientRecord {
  id: number;
  uhid: string;
  registrationDate: string;
  title: string;
  patientName: string;
  gender: string;
  dateOfBirth: string;
  age: number;
  maritalStatus: string;
  bloodGroup: string;
  nationality: string;
  religion: string;
  occupation: string;

  mobileNumber: string;
  alternateMobile: string;
  email: string;
  address1: string;
  address2: string;
  country: string;
  state: string;
  district: string;
  city: string;
  pinCode: string;

  aadhaarNumber: string;
  passportNumber: string;
  panNumber: string;
  drivingLicense: string;
  nationalIdType: string;
  nationalIdNumber: string;

  emergencyContactName: string;
  emergencyRelationship: string;
  emergencyMobile: string;
  emergencyAlternateMobile: string;
  emergencyAddress: string;

  allergies: string;
  chronicDiseases: string;
  currentMedication: string;
  organDonor: string;
  disability: string;

  insuranceRequired: 'Yes' | 'No';
  insuranceProvider: string;
  tpa: string;
  policyNumber: string;
  validTill: string;

  patientType: string;
  referredBy: string;
  primaryDoctor: string;
  department: string;
  registrationSource: string;

  privacyConsent: boolean;
  smsConsent: boolean;
  emailConsent: boolean;
  whatsappConsent: boolean;

  status: 'Active' | 'Inactive';
  remarks: string;
}



const initialFormState: Omit<PatientRecord, 'id'> = {
  uhid: '',
  registrationDate: new Date().toISOString().split('T')[0],
  title: 'Mr.',
  patientName: '',
  gender: 'Male',
  dateOfBirth: '',
  age: 0,
  maritalStatus: '',
  bloodGroup: '',
  nationality: 'Indian',
  religion: '',
  occupation: '',

  mobileNumber: '',
  alternateMobile: '',
  email: '',
  address1: '',
  address2: '',
  country: 'India',
  state: '',
  district: '',
  city: '',
  pinCode: '',

  aadhaarNumber: '',
  passportNumber: '',
  panNumber: '',
  drivingLicense: '',
  nationalIdType: '',
  nationalIdNumber: '',

  emergencyContactName: '',
  emergencyRelationship: '',
  emergencyMobile: '',
  emergencyAlternateMobile: '',
  emergencyAddress: '',

  allergies: '',
  chronicDiseases: '',
  currentMedication: '',
  organDonor: 'No',
  disability: 'No',

  insuranceRequired: 'No',
  insuranceProvider: '',
  tpa: '',
  policyNumber: '',
  validTill: '',

  patientType: 'OP',
  referredBy: '',
  primaryDoctor: '',
  department: '',
  registrationSource: 'Walk-In',

  privacyConsent: true,
  smsConsent: false,
  emailConsent: false,
  whatsappConsent: false,

  status: 'Active',
  remarks: ''
};

export const PatientRegistration = () => {
  const location = useLocation();

  const [patients, setPatients] = useState<any[]>([]);
  const [options, setOptions] = useState<any>({
    Title: [], Gender: [], MaritalStatus: [], NationalIdType: [],
    EmergencyRelationship: [], YesNo: [], PatientType: [],
    RegistrationSource: [], Status: [], BloodGroups: []
  });

  const fetchOptions = async () => {
    try {
      const res = await fetch(`${API_BASE}/patients/options`);
      if (res.ok) {
        const data = await res.json();
        setOptions(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPatients = async () => {
    try {
      const [patientsRes, quickRes, emergencyRes] = await Promise.all([
        fetch(`${API_BASE}/patients/`),
        fetch(`${API_BASE}/quick-registrations/`),
        fetch(`${API_BASE}/emergency-registrations/`)
      ]);

      let allPatients: any[] = [];

      if (patientsRes.ok) {
        const data = await patientsRes.json();
        allPatients = allPatients.concat(data.map((d: any) => ({
          id: d.PatientId || d.PatientRegistrationId,
          uhid: d.Uhid,
          registrationDate: d.RegistrationDate,
          title: d.Title,
          patientName: d.PatientName,
          gender: d.Gender,
          dateOfBirth: d.DateOfBirth,
          age: d.Age,
          maritalStatus: d.MaritalStatus,
          bloodGroup: d.BloodGroup,
          nationality: d.Nationality,
          religion: d.Religion,
          occupation: d.Occupation,
          mobileNumber: d.MobileNumber,
          alternateMobile: d.AlternateMobile,
          email: d.Email,
          address1: d.Address1,
          address2: d.Address2,
          country: d.Country,
          state: d.State,
          district: d.District,
          city: d.City,
          pinCode: d.PinCode,
          aadhaarNumber: d.AadhaarNumber,
          passportNumber: d.PassportNumber,
          panNumber: d.PanNumber,
          drivingLicense: d.DrivingLicense,
          nationalIdType: d.NationalIdType,
          nationalIdNumber: d.NationalIdNumber,
          emergencyContactName: d.EmergencyContactName,
          emergencyRelationship: d.EmergencyRelationship,
          emergencyMobile: d.EmergencyMobile,
          emergencyAlternateMobile: d.EmergencyAlternateMobile,
          emergencyAddress: d.EmergencyAddress,
          allergies: d.Allergies,
          chronicDiseases: d.ChronicDiseases,
          currentMedication: d.CurrentMedication,
          organDonor: d.OrganDonor,
          disability: d.Disability,
          insuranceRequired: d.InsuranceRequired,
          insuranceProvider: d.InsuranceProvider,
          tpa: d.Tpa,
          policyNumber: d.PolicyNumber,
          validTill: d.ValidTill,
          patientType: d.PatientType,
          referredBy: d.ReferredBy,
          primaryDoctor: d.PrimaryDoctor,
          department: d.Department,
          registrationSource: d.RegistrationSource,
          privacyConsent: d.PrivacyConsent,
          smsConsent: d.SmsConsent,
          emailConsent: d.EmailConsent,
          whatsappConsent: d.WhatsappConsent,
          status: d.Status,
          remarks: d.Remarks,
          sourceType: 'Patient'
        })));
      }

      if (quickRes.ok) {
        const data = await quickRes.json();
        allPatients = allPatients.concat(data.map((d: any) => ({
          id: d.QuickRegistrationId,
          uhid: d.Uhid,
          registrationDate: d.RegistrationDate,
          title: d.Title || '',
          patientName: d.PatientName,
          gender: d.Gender,
          dateOfBirth: d.DateOfBirth || '',
          age: d.Age,
          mobileNumber: d.MobileNumber,
          alternateMobile: d.AlternateMobile || '',
          patientType: d.VisitType || '',
          department: d.Department || '',
          primaryDoctor: d.Doctor || '',
          insuranceRequired: d.InsuranceRequired || 'No',
          status: d.Status,
          remarks: d.Remarks || '',
          sourceType: 'Quick'
        })));
      }

      if (emergencyRes.ok) {
        const data = await emergencyRes.json();
        allPatients = allPatients.concat(data.map((d: any) => ({
          id: d.EmergencyRegistrationId,
          uhid: d.Uhid,
          registrationDate: d.RegistrationDate,
          patientName: d.PatientName,
          gender: d.Gender,
          age: d.ApproximateAge,
          mobileNumber: d.EmergencyContactPhone || '',
          emergencyContactName: d.EmergencyContactName || '',
          emergencyRelationship: d.EmergencyRelationship || '',
          emergencyMobile: d.EmergencyContactPhone || '',
          status: d.Status,
          remarks: d.Remarks || '',
          sourceType: 'Emergency'
        })));
      }

      const uniquePatients = new Map();
      allPatients.forEach(p => {
        if (!uniquePatients.has(p.uhid)) {
          uniquePatients.set(p.uhid, p);
        } else {
          const existing = uniquePatients.get(p.uhid);
          if (p.sourceType === 'Patient') {
            uniquePatients.set(p.uhid, p);
          } else if (p.sourceType === 'Emergency' && existing.sourceType === 'Quick') {
            uniquePatients.set(p.uhid, p);
          }
        }
      });
      allPatients = Array.from(uniquePatients.values());

      const getSeq = (uhid: string) => {
        if (!uhid) return 0;
        const match = uhid.match(/\d+$/);
        return match ? parseInt(match[0], 10) : 0;
      };

      allPatients.sort((a, b) => getSeq(b.uhid) - getSeq(a.uhid));

      setPatients(allPatients);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchOptions();
    fetchPatients();
  }, []);


  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [formData, setFormData] = useState<Partial<any>>(initialFormState);

  useEffect(() => {
    if (location.state && location.state.uhid && patients.length > 0) {
      const patient = patients.find(p => p.uhid === location.state.uhid);
      if (patient) {
        const sanitizedRecord = Object.fromEntries(
          Object.entries(patient).map(([k, v]) => [k, v === null ? '' : v])
        );
        setFormData({ ...initialFormState, ...sanitizedRecord });
        setSelectedRecord(patient);
        setIsFormOpen(true);
        // Clear the state to prevent reopening on subsequent renders
        window.history.replaceState({}, document.title);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.uhid, patients]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterPatientType, setFilterPatientType] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatAgeDisplay = (dob: string) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    if (years > 0) {
      return `${years} ${years === 1 ? 'Year' : 'Years'}`;
    } else if (months > 0) {
      return `${months} ${months === 1 ? 'Month' : 'Months'}`;
    } else {
      return `${days} ${days === 1 ? 'Day' : 'Days'}`;
    }
  };


  const handleCreateNew = () => {
    setFormData({ ...initialFormState, uhid: '' });
    setSelectedRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (record: any) => {
    const sanitizedRecord = Object.fromEntries(
      Object.entries(record).map(([k, v]) => [k, v === null ? '' : v])
    );
    setFormData({ ...initialFormState, ...sanitizedRecord });
    setSelectedRecord(record);
    setIsFormOpen(true);
  };

  const handlePrint = (record: any) => {
    const printContent = `
      <html>
        <head>
          <title>Patient Registration Card - ${record.uhid}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; }
            .card { border: 2px solid #e2e8f0; padding: 30px; border-radius: 16px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
            .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px; }
            .header h2 { margin: 0; color: #0f172a; font-size: 24px; font-weight: 700; }
            .header h3 { margin: 8px 0 0; color: #64748b; font-size: 16px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
            .row { display: flex; margin-bottom: 16px; align-items: center; }
            .label { font-weight: 600; width: 180px; color: #475569; font-size: 14px; }
            .value { flex: 1; font-size: 16px; font-weight: 500; color: #0f172a; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h2>CareFusions Hospital</h2>
              <h3>Patient Registration Card</h3>
            </div>
            <div class="row"><div class="label">UHID</div><div class="value">${record.uhid}</div></div>
            <div class="row"><div class="label">Patient Name</div><div class="value">${record.title || ''} ${record.patientName || record.firstName || ''}</div></div>
            <div class="row"><div class="label">Gender / Age</div><div class="value">${record.gender} / ${record.dateOfBirth ? formatAgeDisplay(record.dateOfBirth) : (record.age || record.approximateAge || 0) + ' Yrs'}</div></div>
            <div class="row"><div class="label">Mobile Number</div><div class="value">${record.mobileNumber || 'N/A'}</div></div>
            <div class="row"><div class="label">Registration Date</div><div class="value">${record.registrationDate}</div></div>
            <div class="footer">
              Printed on: ${new Date().toLocaleString()}
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const handleDeleteRequest = (record: any) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };


  const handleConfirmDeactivate = async () => {
    if (selectedRecord) {
      try {
        const res = await fetch(`${API_BASE}/patients/${selectedRecord.id}`, { method: 'DELETE' });
        if (res.ok) {
          toast.success('Patient deleted successfully');
          await fetchPatients();
        } else {
          toast.error('Failed to delete patient');
        }
      } catch (error) {
        console.error(error);
        toast.error('Network error');
      }
    }
    setIsDeleteOpen(false);
  };


  const confirmDelete = handleConfirmDeactivate;


  const handleSave = async (e: React.FormEvent, isSaveAndNew: boolean = false) => {
    e.preventDefault();

    // Map frontend camelCase back to backend PascalCase
    const payload = {
      RegistrationDate: formData.registrationDate,
      Title: formData.title,
      PatientName: formData.patientName,
      Gender: formData.gender,
      DateOfBirth: formData.dateOfBirth,
      Age: formData.age || 0,
      MaritalStatus: formData.maritalStatus || null,
      BloodGroup: formData.bloodGroup || null,
      Nationality: formData.nationality || 'Indian',
      Religion: formData.religion || null,
      Occupation: formData.occupation || null,
      MobileNumber: formData.mobileNumber,
      AlternateMobile: formData.alternateMobile || null,
      Email: formData.email || null,
      Address1: formData.address1,
      Address2: formData.address2 || null,
      Country: formData.country || 'India',
      State: formData.state,
      District: formData.district || null,
      City: formData.city,
      PinCode: formData.pinCode,
      AadhaarNumber: formData.aadhaarNumber || null,
      PassportNumber: formData.passportNumber || null,
      PanNumber: formData.panNumber || null,
      DrivingLicense: formData.drivingLicense || null,
      NationalIdType: formData.nationalIdType || null,
      NationalIdNumber: formData.nationalIdNumber || null,
      EmergencyContactName: formData.emergencyContactName,
      EmergencyRelationship: formData.emergencyRelationship,
      EmergencyMobile: formData.emergencyMobile || null,
      EmergencyAlternateMobile: formData.emergencyAlternateMobile || null,
      EmergencyAddress: formData.emergencyAddress || null,
      Allergies: formData.allergies || null,
      ChronicDiseases: formData.chronicDiseases || null,
      CurrentMedication: formData.currentMedication || null,
      OrganDonor: formData.organDonor || 'No',
      Disability: formData.disability || null,
      InsuranceRequired: formData.insuranceRequired || 'No',
      InsuranceProvider: formData.insuranceProvider || null,
      Tpa: formData.tpa || null,
      PolicyNumber: formData.policyNumber || null,
      ValidTill: formData.validTill || null,
      PatientType: formData.patientType || 'OP',
      ReferredBy: formData.referredBy || null,
      PrimaryDoctor: formData.primaryDoctor || null,
      Department: formData.department || null,
      RegistrationSource: formData.registrationSource || 'Walk-In',
      PrivacyConsent: formData.privacyConsent ?? true,
      SmsConsent: formData.smsConsent ?? false,
      EmailConsent: formData.emailConsent ?? false,
      WhatsappConsent: formData.whatsappConsent ?? false,
      Status: formData.status || 'Active',
      Remarks: formData.remarks || null
    };

    try {
      let res;
      // If we are editing an existing full Patient Registration, use PUT.
      // If we are upgrading a Quick/Emergency registration, use POST to create the full record.
      if (selectedRecord && selectedRecord.sourceType === 'Patient') {
        res = await fetch(`${API_BASE}/patients/${selectedRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // If it's an upgrade, we include the Uhid in the payload to preserve it
        const postPayload = { ...payload };
        if (selectedRecord && selectedRecord.uhid) {
          (postPayload as any).Uhid = selectedRecord.uhid;
        }

        res = await fetch(`${API_BASE}/patients/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postPayload)
        });
      }

      if (res.ok) {
        toast.success(selectedRecord ? 'Patient updated successfully' : 'Patient registered successfully');
        await fetchPatients();

        if (isSaveAndNew) {
          setFormData({ ...initialFormState, uhid: '' });
          setSelectedRecord(null);
        } else {
          setIsFormOpen(false);
          setSelectedRecord(null);
        }
      } else {
        const err = await res.json();
        const errorMessage = Array.isArray(err.detail)
          ? err.detail.map((e: any) => `${e.loc.join('.')}: ${e.msg}`).join(', ')
          : (err.detail || 'Failed to save patient');
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error(error);
      toast.error('Network error');
    }
  };


  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      if (field === 'dateOfBirth') {
        newData.age = calculateAge(value);
      }
      return newData;
    });
  };

  const filteredRecords = patients.filter(record => {
    const matchesSearch =
      record.uhid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.patientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.mobileNumber || '').includes(searchTerm) ||
      (record.aadhaarNumber || record.nationalId || '').includes(searchTerm);

    const matchesPatientType = !filterPatientType || record.patientType === filterPatientType;
    const matchesGender = !filterGender || record.gender === filterGender;
    const matchesStatus = !filterStatus || record.status === filterStatus;

    const recordDate = record.registrationDate ? record.registrationDate.substring(0, 10) : '';
    const matchesDate = (!dateFrom || recordDate >= dateFrom) && (!dateTo || recordDate <= dateTo);

    return matchesSearch && matchesPatientType && matchesGender && matchesStatus && matchesDate;
  });

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col relative">
      {!isFormOpen ? (
        <>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Patient Registration</h1>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" icon={Download} onClick={() => exportToExcel(patients, 'PatientRegistration')}>Export</Button>
              <Button variant="filled" color="primary" icon={Plus} onClick={() => {
                setSelectedRecord(null);
                setFormData(initialFormState);
                setIsFormOpen(true);
              }}>
                Register Patient
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by UHID, Name, Mobile, Aadhaar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>
              
              <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block" />

              <DateFilter
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
                onReset={() => { setDateFrom(''); setDateTo(''); }}
              />

              <Button
                variant={showFilters ? "filled" : "outline"}
                color="secondary"
                icon={Filter}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
              </Button>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b border-slate-200 bg-slate-50/50 p-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select
                      value={filterPatientType}
                      onChange={(e) => setFilterPatientType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Patient Types</option>{options.PatientType.map((o: string) => <option key={o} value={o}>{o}</option>)}</select>
                    <select
                      value={filterGender}
                      onChange={(e) => setFilterGender(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Genders</option>{options.Gender.map((o: string) => <option key={o} value={o}>{o}</option>)}</select>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Statuses</option>{options.Status.map((o: string) => <option key={o} value={o}>{o}</option>)}</select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">UHID</th>
                    <th className="px-4 py-3 font-medium">Patient Name</th>
                    <th className="px-4 py-3 font-medium">Gender/Age</th>
                    <th className="px-4 py-3 font-medium">Mobile Number</th>
                    <th className="px-4 py-3 font-medium">Reg. Date</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <tr key={record.uhid} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-primary">{record.uhid}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {record.patientName || `${record.title || ''} `}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{record.gender} / {record.dateOfBirth ? formatAgeDisplay(record.dateOfBirth) : `${record.age || record.approximateAge || 0} Yrs`}</td>
                        <td className="px-4 py-3 text-slate-600">{record.mobileNumber}</td>
                        <td className="px-4 py-3 text-slate-600">{record.registrationDate}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => {
                              setSelectedRecord(record);
                              setIsViewMode(true);
                            }} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="View Patient">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                handleEdit(record);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <User className="w-8 h-8 text-slate-400" />
                          <p>No patients found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col bg-slate-50 rounded-3xl z-10 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-white border-b border-slate-200 shrink-0 shadow-sm z-20">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {selectedRecord ? 'Edit Patient' : 'Register New Patient'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold border border-primary/20">
                  {formData.uhid || 'Generating UHID...'}
                </span>
                <span className="text-sm text-slate-500">Date: {formData.registrationDate}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button variant="outline" icon={Printer} className="hidden sm:flex">Print Slip</Button>
              {!selectedRecord && (
                <Button variant="outline" color="primary" onClick={(e) => handleSave(e, true)}>
                  Save & New
                </Button>
              )}
              <Button variant="filled" color="primary" onClick={(e) => handleSave(e, false)}>
                {selectedRecord ? 'Update Record' : 'Save Record'}
              </Button>
            </div>
          </div>

          {/* Form Content - Scrolling */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

            {/* Section 1 - Basic Information */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <User className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-800">Basic Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title <span className="text-red-500">*</span></label>
                  <select
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select Title</option>{options.Title.map((o: string) => <option key={o} value={o}>{o}</option>)}</select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Patient Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.patientName}
                    onChange={(e) => handleInputChange('patientName', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Full Patient Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gender <span className="text-red-500">*</span></label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select Gender</option>{options.Gender.map((o: string) => <option key={o} value={o}>{o}</option>)}</select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Age (Auto)</label>
                  <input
                    type="text"
                    value={formData.dateOfBirth ? formatAgeDisplay(formData.dateOfBirth) : formData.age}
                    readOnly
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Marital Status</label>
                  <select
                    value={formData.maritalStatus}
                    onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select Status</option>{options.MaritalStatus.map((o: string) => <option key={o} value={o}>{o}</option>)}</select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nationality</label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => handleInputChange('nationality', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Religion</label>
                  <input
                    type="text"
                    value={formData.religion}
                    onChange={(e) => handleInputChange('religion', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Occupation</label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => handleInputChange('occupation', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Section 2 - Contact Information */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <Phone className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-800">Contact Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.mobileNumber}
                    onChange={(e) => { const val = e.target.value; if (/^\d{0,10}$/.test(val)) handleInputChange('mobileNumber', val); }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="10-digit mobile number" maxLength={10} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Alternate Mobile</label>
                  <input
                    type="text"
                    value={formData.alternateMobile}
                    onChange={(e) => { const val = e.target.value; if (/^\d{0,10}$/.test(val)) handleInputChange('alternateMobile', val); }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary" maxLength={10} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 1 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.address1}
                    onChange={(e) => handleInputChange('address1', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 2</label>
                  <input
                    type="text"
                    value={formData.address2}
                    onChange={(e) => handleInputChange('address2', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Country <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">State <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">District</label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => handleInputChange('district', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">City <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PIN Code <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.pinCode}
                    onChange={(e) => handleInputChange('pinCode', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Section 3 - Identification */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <FileDigit className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-800">Identification Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Aadhaar Number</label>
                  <input
                    type="text"
                    value={formData.aadhaarNumber}
                    onChange={(e) => handleInputChange('aadhaarNumber', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Passport Number</label>
                  <input
                    type="text"
                    value={formData.passportNumber}
                    onChange={(e) => handleInputChange('passportNumber', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={formData.panNumber}
                    onChange={(e) => handleInputChange('panNumber', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Driving License</label>
                  <input
                    type="text"
                    value={formData.drivingLicense}
                    onChange={(e) => handleInputChange('drivingLicense', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Other ID Type</label>
                  <select
                    value={formData.nationalIdType}
                    onChange={(e) => handleInputChange('nationalIdType', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select ID Type</option>{options.NationalIdType.map((o: string) => <option key={o} value={o}>{o}</option>)}</select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Other ID Number</label>
                  <input
                    type="text"
                    value={formData.nationalIdNumber}
                    onChange={(e) => handleInputChange('nationalIdNumber', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Section 4 - Emergency Contact */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <Heart className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-800">Emergency Contact</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Relationship <span className="text-red-500">*</span></label>
                  <select
                    value={formData.emergencyRelationship}
                    onChange={(e) => handleInputChange('emergencyRelationship', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select Relationship</option>{options.EmergencyRelationship.map((o: string) => <option key={o} value={o}>{o}</option>)}</select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.emergencyMobile}
                    onChange={(e) => { const val = e.target.value; if (/^\d{0,10}$/.test(val)) handleInputChange('emergencyMobile', val); }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary" maxLength={10} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Alternate Mobile</label>
                  <input
                    type="text"
                    value={formData.emergencyAlternateMobile}
                    onChange={(e) => { const val = e.target.value; if (/^\d{0,10}$/.test(val)) handleInputChange('emergencyAlternateMobile', val); }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary" maxLength={10} />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Address</label>
                  <input
                    type="text"
                    value={formData.emergencyAddress}
                    onChange={(e) => handleInputChange('emergencyAddress', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Section 5 - Medical Information */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <Activity className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-800">Medical Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select Blood Group</option>{options.BloodGroups.map((o: string) => <option key={o} value={o}>{o}</option>)}</select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Allergies</label>
                  <input
                    type="text"
                    value={formData.allergies}
                    onChange={(e) => handleInputChange('allergies', e.target.value)}
                    placeholder="E.g., Penicillin, Peanuts, Dust"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Chronic Diseases</label>
                  <input
                    type="text"
                    value={formData.chronicDiseases}
                    onChange={(e) => handleInputChange('chronicDiseases', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Current Medication</label>
                  <input
                    type="text"
                    value={formData.currentMedication}
                    onChange={(e) => handleInputChange('currentMedication', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Organ Donor</label>
                  <select
                    value={formData.organDonor}
                    onChange={(e) => handleInputChange('organDonor', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select Yes/No</option>{options.YesNo.map((o: string) => <option key={o} value={o}>{o}</option>)}</select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Disability (if any)</label>
                  <input
                    type="text"
                    value={formData.disability}
                    onChange={(e) => handleInputChange('disability', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Section 6 - Insurance Information */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <Shield className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-800">Insurance Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Insurance Required <span className="text-red-500">*</span></label>
                  <select
                    value={formData.insuranceRequired}
                    onChange={(e) => handleInputChange('insuranceRequired', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select Yes/No</option>{options.YesNo.map((o: string) => <option key={o} value={o}>{o}</option>)}</select>
                </div>

                {formData.insuranceRequired === 'Yes' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Insurance Provider <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formData.insuranceProvider}
                        onChange={(e) => handleInputChange('insuranceProvider', e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">TPA <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formData.tpa}
                        onChange={(e) => handleInputChange('tpa', e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Policy Number <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formData.policyNumber}
                        onChange={(e) => handleInputChange('policyNumber', e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Valid Till <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        value={formData.validTill}
                        onChange={(e) => handleInputChange('validTill', e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Section 7 - Registration Information */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-800">Registration Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Patient Type <span className="text-red-500">*</span></label>
                  <select
                    value={formData.patientType}
                    onChange={(e) => handleInputChange('patientType', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select Patient Type</option>{options.PatientType.map((o: string) => <option key={o} value={o}>{o}</option>)}</select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Registration Source</label>
                  <select
                    value={formData.registrationSource}
                    onChange={(e) => handleInputChange('registrationSource', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select Source</option>{options.RegistrationSource.map((o: string) => <option key={o} value={o}>{o}</option>)}</select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Referred By</label>
                  <input
                    type="text"
                    value={formData.referredBy}
                    onChange={(e) => handleInputChange('referredBy', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Primary Doctor</label>
                  <input
                    type="text"
                    value={formData.primaryDoctor}
                    onChange={(e) => handleInputChange('primaryDoctor', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Section 8 - Consent & Privacy */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-800">Consent & Privacy</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.privacyConsent}
                    onChange={(e) => handleInputChange('privacyConsent', e.target.checked)}
                    className="w-5 h-5 text-primary border-slate-300 rounded focus:ring-primary"
                  />
                  <span className="font-medium text-slate-700">Privacy Consent <span className="text-red-500">*</span></span>
                </label>
                <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.smsConsent}
                    onChange={(e) => handleInputChange('smsConsent', e.target.checked)}
                    className="w-5 h-5 text-primary border-slate-300 rounded focus:ring-primary"
                  />
                  <span className="font-medium text-slate-700">SMS Consent</span>
                </label>
                <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.emailConsent}
                    onChange={(e) => handleInputChange('emailConsent', e.target.checked)}
                    className="w-5 h-5 text-primary border-slate-300 rounded focus:ring-primary"
                  />
                  <span className="font-medium text-slate-700">Email Consent</span>
                </label>
                <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.whatsappConsent}
                    onChange={(e) => handleInputChange('whatsappConsent', e.target.checked)}
                    className="w-5 h-5 text-primary border-slate-300 rounded focus:ring-primary"
                  />
                  <span className="font-medium text-slate-700">WhatsApp Consent</span>
                </label>
              </div>
            </div>

            {/* Section 9 - System Information */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <Info className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-800">System Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status <span className="text-red-500">*</span></label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select Status</option>{options.Status.map((o: string) => <option key={o} value={o}>{o}</option>)}</select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => handleInputChange('remarks', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Padding */}
            <div className="h-10"></div>
          </div>
        </div>
      )}

      {/* Patient Details Modal */}
      {isViewMode && (
        <PatientDetailsModal
          patient={selectedRecord}
          onClose={() => setIsViewMode(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
          >
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Delete Record</h3>
              <p className="text-slate-500 mb-8">
                Are you sure you want to delete <strong>{selectedRecord?.patientName || selectedRecord?.firstName + ' ' + selectedRecord?.lastName}</strong>?
              </p>
              <div className="flex w-full gap-4">
                <button
                  onClick={() => setIsDeleteOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border-[1.5px] border-amber-500 text-amber-500 font-bold hover:bg-amber-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-[#b91c1c] text-white font-bold hover:bg-[#991b1b] transition-colors text-sm shadow-md shadow-red-900/10"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
