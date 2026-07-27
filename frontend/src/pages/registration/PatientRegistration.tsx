import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Filter, Edit2, Download, Trash2, Printer, 
  User, Phone, FileText, Heart, Shield, Activity, Calendar, FileDigit, Info
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useLocation } from 'react-router-dom';
import { usePatients } from '../../contexts/PatientContext';
import type { GlobalPatientRecord } from '../../contexts/PatientContext';
import { exportToExcel } from '../../utils/exportToExcel';

interface PatientRecord {
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
  const { patients, addPatient, updatePatient } = usePatients();
  const location = useLocation();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<GlobalPatientRecord | null>(null);
  const [formData, setFormData] = useState<Partial<GlobalPatientRecord>>(initialFormState);

  useEffect(() => {
    if (location.state && location.state.uhid) {
      const patient = patients.find(p => p.uhid === location.state.uhid);
      if (patient) {
        setFormData({ ...initialFormState, ...patient });
        setSelectedRecord(patient);
        setIsFormOpen(true);
        // Clear the state to prevent reopening on subsequent renders
        window.history.replaceState({}, document.title);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.uhid]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterPatientType, setFilterPatientType] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

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

  const generateUHID = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `UHID-${year}-${random}`;
  };

  const handleCreateNew = () => {
    setFormData({ ...initialFormState, uhid: generateUHID() });
    setSelectedRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (record: GlobalPatientRecord) => {
    setFormData({ ...initialFormState, ...record });
    setSelectedRecord(record);
    setIsFormOpen(true);
  };

  const handlePrint = (record: GlobalPatientRecord) => {
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
            <div class="row"><div class="label">Gender / Age</div><div class="value">${record.gender} / ${record.age || record.approximateAge || 0} Yrs</div></div>
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

  const handleDeleteRequest = (record: GlobalPatientRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const handleConfirmDeactivate = () => {
    if (selectedRecord) {
      updatePatient(selectedRecord.id, { status: 'Inactive' });
    }
    setIsDeleteOpen(false);
  };

  const confirmDelete = handleConfirmDeactivate;

  const handleSave = (e: React.FormEvent, isSaveAndNew: boolean = false) => {
    e.preventDefault();
    if (selectedRecord) {
      updatePatient(selectedRecord.id, formData);
    } else {
      const newId = Math.max(...patients.map(r => r.id), 0) + 1;
      addPatient({ id: newId, ...formData } as GlobalPatientRecord);
    }
    
    if (isSaveAndNew) {
      setFormData({ ...initialFormState, uhid: generateUHID() });
      setSelectedRecord(null);
    } else {
      setIsFormOpen(false);
      setSelectedRecord(null);
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

    return matchesSearch && matchesPatientType && matchesGender && matchesStatus;
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
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
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
                      <option value="">All Patient Types</option>
                      <option value="OP">OP</option>
                      <option value="IP">IP</option>
                      <option value="Emergency">Emergency</option>
                    </select>
                    <select
                      value={filterGender}
                      onChange={(e) => setFilterGender(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Genders</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
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
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-primary">{record.uhid}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {record.patientName || `${record.title || ''} `}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{record.gender} / {record.age || record.approximateAge || 0} Yrs</td>
                        <td className="px-4 py-3 text-slate-600">{record.mobileNumber}</td>
                        <td className="px-4 py-3 text-slate-600">{record.registrationDate}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            record.status === 'Active' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handlePrint(record)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Print Card">
                              <Printer className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleEdit(record)}
                              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteRequest(record)}
                              className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Deactivate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title <span className="text-red-500">*</span></label>
                  <select
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Miss">Miss</option>
                    <option value="Dr.">Dr.</option>
                    <option value="Mast.">Mast.</option>
                    <option value="Baby">Baby</option>
                  </select>
                </div>
                <div className="md:col-span-3">
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
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
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
                    type="number"
                    value={formData.age}
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
                    <option value="">Select Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.mobileNumber}
                    onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="10-digit mobile number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Alternate Mobile</label>
                  <input
                    type="text"
                    value={formData.alternateMobile}
                    onChange={(e) => handleInputChange('alternateMobile', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
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
                
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 1 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.address1}
                    onChange={(e) => handleInputChange('address1', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div className="md:col-span-3">
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
                    <option value="">Select ID Type</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Ration Card">Ration Card</option>
                  </select>
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
                    <option value="">Select Relationship</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Child">Child</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Friend">Friend</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.emergencyMobile}
                    onChange={(e) => handleInputChange('emergencyMobile', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Alternate Mobile</label>
                  <input
                    type="text"
                    value={formData.emergencyAlternateMobile}
                    onChange={(e) => handleInputChange('emergencyAlternateMobile', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
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
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Allergies</label>
                  <input
                    type="text"
                    value={formData.allergies}
                    onChange={(e) => handleInputChange('allergies', e.target.value)}
                    placeholder="E.g., Penicillin, Peanuts, Dust"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Chronic Diseases</label>
                  <input
                    type="text"
                    value={formData.chronicDiseases}
                    onChange={(e) => handleInputChange('chronicDiseases', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div className="md:col-span-3">
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
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
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
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
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
                    <option value="OP">OP (Outpatient)</option>
                    <option value="IP">IP (Inpatient)</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Registration Source</label>
                  <select
                    value={formData.registrationSource}
                    onChange={(e) => handleInputChange('registrationSource', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="Walk-In">Walk-In</option>
                    <option value="Online">Online</option>
                    <option value="Referral">Referral</option>
                  </select>
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
                    onChange={(e) => handleInputChange('status', e.target.value as 'Active' | 'Inactive')}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
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

      {/* Deactivate Confirmation Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center gap-4 text-red-600 mb-4">
                <div className="bg-red-50 p-3 rounded-full">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">Deactivate Patient Record</h3>
              </div>
              <p className="text-slate-600 mb-6">
                Are you sure you want to deactivate the record for <strong>{selectedRecord?.title} {selectedRecord?.firstName} {selectedRecord?.lastName}</strong> (UHID: {selectedRecord?.uhid})? 
                Patient records cannot be permanently deleted.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                <Button variant="filled" color="danger" onClick={confirmDelete}>Deactivate</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
