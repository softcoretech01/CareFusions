import { useState } from 'react';
import { Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, Save, RefreshCw, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

interface DoctorRecord {
  id: number;
  doctorId: string;
  registrationNumber: string;
  name: string;
  gender: string;
  dob: string;
  qualification: string;
  specialization: string;
  department: string;
  designation: string;
  hospital: string;
  branch: string;
  mobile: string;
  alternateMobile: string;
  email: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  medicalCouncil: string;
  experience: string;
  languages: string;
  doctorType: string;
  consultationType: string;
  joiningDate: string;
  licenseExpiryDate: string;
  consultationFee: string;
  followUpFee: string;
  emergencyFee: string;
  teleConsultationFee: string;
  opDuration: string;
  maxPatients: string;
  allowOnlineBooking: boolean;
  availableDays: string[];
  fromTime: string;
  toTime: string;
  breakFrom: string;
  breakTo: string;
  slotDuration: string;
  availableEmergency: boolean;
  availableTele: boolean;
  status: string;
  remarks: string;
}

const emptyDoctorData: Omit<DoctorRecord, 'id'> = {
  doctorId: '',
  registrationNumber: '',
  name: '',
  gender: '',
  dob: '',
  qualification: '',
  specialization: '',
  department: '',
  designation: '',
  hospital: '',
  branch: '',
  mobile: '',
  alternateMobile: '',
  email: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  country: '',
  postalCode: '',
  medicalCouncil: '',
  experience: '',
  languages: '',
  doctorType: 'Full-time',
  consultationType: 'OP',
  joiningDate: '',
  licenseExpiryDate: '',
  consultationFee: '',
  followUpFee: '',
  emergencyFee: '',
  teleConsultationFee: '',
  opDuration: '',
  maxPatients: '',
  allowOnlineBooking: false,
  availableDays: [],
  fromTime: '',
  toTime: '',
  breakFrom: '',
  breakTo: '',
  slotDuration: '',
  availableEmergency: false,
  availableTele: false,
  status: 'Active',
  remarks: ''
};

const mockDoctors: DoctorRecord[] = [
  {
    id: 1,
    doctorId: 'DOC-001',
    registrationNumber: 'MED-12345',
    name: 'Dr. Sarah Jenkins',
    gender: 'Female',
    dob: '1980-05-15',
    qualification: 'MD, DM',
    specialization: 'Cardiology',
    department: 'Cardiology',
    designation: 'Senior Consultant',
    hospital: 'City General Hospital',
    branch: 'Main Campus',
    mobile: '9876543210',
    alternateMobile: '',
    email: 'sarah.jenkins@hospital.com',
    address1: '123 Medical Way',
    address2: '',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    postalCode: '10001',
    medicalCouncil: 'National Medical Board',
    experience: '15',
    languages: 'English, Spanish',
    doctorType: 'Full-time',
    consultationType: 'OP/IP',
    joiningDate: '2015-01-10',
    licenseExpiryDate: '2028-12-31',
    consultationFee: '150',
    followUpFee: '100',
    emergencyFee: '250',
    teleConsultationFee: '120',
    opDuration: '20',
    maxPatients: '30',
    allowOnlineBooking: true,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    fromTime: '09:00',
    toTime: '17:00',
    breakFrom: '13:00',
    breakTo: '14:00',
    slotDuration: '20',
    availableEmergency: true,
    availableTele: true,
    status: 'Active',
    remarks: ''
  }
];

export const DoctorMaster = () => {
  const [records, setRecords] = useState<DoctorRecord[]>(mockDoctors);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterSpec, setFilterSpec] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterHospital, setFilterHospital] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DoctorRecord | null>(null);
  const [formData, setFormData] = useState<Omit<DoctorRecord, 'id'>>(emptyDoctorData);
  const [activeTab, setActiveTab] = useState('general');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const tabs = [
    { id: 'general', label: 'General Information' },
    { id: 'professional', label: 'Professional Details' },
    { id: 'consultation', label: 'Consultation & Billing' },
    { id: 'schedule', label: 'Schedule & Availability' },
    { id: 'documents', label: 'Documents' },
    { id: 'audit', label: 'Audit' }
  ];

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.doctorId.trim()) newErrors.doctorId = 'Doctor ID is required';
    if (!formData.registrationNumber.trim()) newErrors.registrationNumber = 'Registration Number is required';
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.qualification.trim()) newErrors.qualification = 'Qualification is required';
    if (!formData.specialization.trim()) newErrors.specialization = 'Specialization is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.designation.trim()) newErrors.designation = 'Designation is required';
    if (!formData.hospital) newErrors.hospital = 'Hospital is required';
    if (!formData.branch) newErrors.branch = 'Branch is required';
    
    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile is required';
    } else if (!/^\d{10}$/.test(formData.mobile.replace(/\D/g, ''))) {
      newErrors.mobile = 'Enter a valid 10-digit mobile number';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email';
    }

    if (!formData.consultationFee) {
      newErrors.consultationFee = 'Fee is required';
    } else if (Number(formData.consultationFee) < 0) {
      newErrors.consultationFee = 'Fee must be >= 0';
    }

    if (!formData.opDuration) {
      newErrors.opDuration = 'Duration is required';
    } else if (Number(formData.opDuration) <= 0) {
      newErrors.opDuration = 'Duration must be > 0';
    }

    if (formData.availableDays.length === 0) newErrors.availableDays = 'Select at least one day';
    if (!formData.fromTime) newErrors.fromTime = 'From Time is required';
    if (!formData.toTime) newErrors.toTime = 'To Time is required';
    
    if (formData.fromTime && formData.toTime && formData.fromTime >= formData.toTime) {
      newErrors.toTime = 'To Time must be after From Time';
    }

    if (!formData.slotDuration) newErrors.slotDuration = 'Slot Duration is required';
    if (formData.opDuration && formData.slotDuration && (Number(formData.opDuration) % Number(formData.slotDuration) !== 0)) {
      newErrors.slotDuration = 'Slot must divide consultation duration';
    }

    // Check Uniqueness
    const isIdDuplicate = records.some(r => r.doctorId === formData.doctorId && r.id !== selectedRecord?.id);
    if (isIdDuplicate) newErrors.doctorId = 'Doctor ID must be unique';

    const isRegDuplicate = records.some(r => r.registrationNumber === formData.registrationNumber && r.id !== selectedRecord?.id);
    if (isRegDuplicate) newErrors.registrationNumber = 'Registration Number must be unique';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    const nextId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
    setFormData({
      ...emptyDoctorData,
      doctorId: `DOC-${nextId.toString().padStart(3, '0')}`
    });
    setErrors({});
    setActiveTab('general');
    setIsFormOpen(true);
  };

  const handleEdit = (record: DoctorRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setActiveTab('general');
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: DoctorRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const handleSaveForm = () => {
    if (!validateForm()) {
      return;
    }

    if (selectedRecord) {
      setRecords(records.map(r => r.id === selectedRecord.id ? { ...r, ...formData } : r));
    } else {
      const newId = Math.max(...records.map(r => r.id), 0) + 1;
      setRecords([...records, { id: newId, ...formData }]);
    }
    setIsFormOpen(false);
  };

  const confirmDelete = () => {
    if (selectedRecord) {
      setRecords(records.filter(r => r.id !== selectedRecord.id));
      setIsDeleteOpen(false);
    }
  };

  const toggleDay = (day: string) => {
    const newDays = formData.availableDays.includes(day)
      ? formData.availableDays.filter(d => d !== day)
      : [...formData.availableDays, day];
    setFormData({ ...formData, availableDays: newDays });
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.doctorId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSpec = !filterSpec || record.specialization === filterSpec;
    const matchesDept = !filterDept || record.department === filterDept;
    const matchesHosp = !filterHospital || record.hospital === filterHospital;
    const matchesBranch = !filterBranch || record.branch === filterBranch;
    const matchesStatus = !filterStatus || record.status === filterStatus;

    return matchesSearch && matchesSpec && matchesDept && matchesHosp && matchesBranch && matchesStatus;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col relative"
    >
      {!isFormOpen ? (
        <>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Doctor Master</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" icon={Download} onClick={() => exportToExcel(records, 'DoctorMaster')}>Export</Button>
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
                Create New
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Name or ID..."
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
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <select
                      value={filterSpec}
                      onChange={(e) => setFilterSpec(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Specializations</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Orthopedics">Orthopedics</option>
                    </select>
                    <select
                      value={filterDept}
                      onChange={(e) => setFilterDept(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Departments</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Neurology">Neurology</option>
                    </select>
                    <select
                      value={filterHospital}
                      onChange={(e) => setFilterHospital(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Hospitals</option>
                      <option value="City General Hospital">City General Hospital</option>
                    </select>
                    <select
                      value={filterBranch}
                      onChange={(e) => setFilterBranch(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Branches</option>
                      <option value="Main Campus">Main Campus</option>
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
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Doctor ID</th>
                    <th className="px-4 py-3 font-medium">Doctor Name</th>
                    <th className="px-4 py-3 font-medium">Specialization</th>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium">Qualification</th>
                    <th className="px-4 py-3 font-medium text-right">Fee</th>
                    <th className="px-4 py-3 font-medium">Mobile</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{record.doctorId}</td>
                        <td className="px-4 py-3">{record.name}</td>
                        <td className="px-4 py-3 text-slate-600">{record.specialization}</td>
                        <td className="px-4 py-3 text-slate-600">{record.department}</td>
                        <td className="px-4 py-3 text-slate-600">{record.qualification}</td>
                        <td className="px-4 py-3 text-right">{record.consultationFee}</td>
                        <td className="px-4 py-3 text-slate-600">{record.mobile}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            record.status === 'Active' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handleEdit(record)}
                              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteRequest(record)}
                              className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                        No doctors found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {selectedRecord ? `Edit Doctor: ${selectedRecord.name}` : 'Create Doctor'}
              </h1>
              <p className="text-slate-500 text-sm">Fill in the doctor details</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 overflow-x-auto shrink-0 bg-slate-50/50">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeTab === 'general' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Doctor ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.doctorId}
                      readOnly
                      className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed focus:outline-none"
                    />
                    {errors.doctorId && <p className="text-red-500 text-xs mt-1">{errors.doctorId}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Registration Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.registrationNumber}
                      onChange={e => setFormData({...formData, registrationNumber: e.target.value})}
                      className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.registrationNumber ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'
                      }`}
                    />
                    {errors.registrationNumber && <p className="text-red-500 text-xs mt-1">{errors.registrationNumber}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Doctor Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.name ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'
                      }`}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.gender}
                      onChange={e => setFormData({...formData, gender: e.target.value})}
                      className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.gender ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'
                      }`}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={e => setFormData({...formData, dob: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.mobile}
                      onChange={e => setFormData({...formData, mobile: e.target.value})}
                      className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.mobile ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'
                      }`}
                    />
                    {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Alternate Mobile</label>
                    <input
                      type="tel"
                      value={formData.alternateMobile}
                      onChange={e => setFormData({...formData, alternateMobile: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.email ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'
                      }`}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 1</label>
                      <input
                        type="text"
                        value={formData.address1}
                        onChange={e => setFormData({...formData, address1: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 2</label>
                      <input
                        type="text"
                        value={formData.address2}
                        onChange={e => setFormData({...formData, address2: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={e => setFormData({...formData, city: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={e => setFormData({...formData, state: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={e => setFormData({...formData, country: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Postal Code</label>
                      <input
                        type="text"
                        value={formData.postalCode}
                        onChange={e => setFormData({...formData, postalCode: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'professional' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Qualification <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.qualification}
                      onChange={e => setFormData({...formData, qualification: e.target.value})}
                      placeholder="e.g., MBBS, MD"
                      className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.qualification ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'
                      }`}
                    />
                    {errors.qualification && <p className="text-red-500 text-xs mt-1">{errors.qualification}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Specialization <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.specialization}
                      onChange={e => setFormData({...formData, specialization: e.target.value})}
                      className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.specialization ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'
                      }`}
                    />
                    {errors.specialization && <p className="text-red-500 text-xs mt-1">{errors.specialization}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Hospital <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.hospital}
                      onChange={e => setFormData({...formData, hospital: e.target.value})}
                      className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.hospital ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'
                      }`}
                    >
                      <option value="">Select Hospital</option>
                      <option value="City General Hospital">City General Hospital</option>
                    </select>
                    {errors.hospital && <p className="text-red-500 text-xs mt-1">{errors.hospital}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Branch <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.branch}
                      onChange={e => setFormData({...formData, branch: e.target.value})}
                      className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.branch ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'
                      }`}
                    >
                      <option value="">Select Branch</option>
                      <option value="Main Campus">Main Campus</option>
                    </select>
                    {errors.branch && <p className="text-red-500 text-xs mt-1">{errors.branch}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.department}
                      onChange={e => setFormData({...formData, department: e.target.value})}
                      className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.department ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'
                      }`}
                    >
                      <option value="">Select Department</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Neurology">Neurology</option>
                    </select>
                    {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Designation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.designation}
                      onChange={e => setFormData({...formData, designation: e.target.value})}
                      className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.designation ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'
                      }`}
                    />
                    {errors.designation && <p className="text-red-500 text-xs mt-1">{errors.designation}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Medical Council</label>
                    <input
                      type="text"
                      value={formData.medicalCouncil}
                      onChange={e => setFormData({...formData, medicalCouncil: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Experience (Years)</label>
                    <input
                      type="number"
                      value={formData.experience}
                      onChange={e => setFormData({...formData, experience: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Languages Known</label>
                    <input
                      type="text"
                      value={formData.languages}
                      onChange={e => setFormData({...formData, languages: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Doctor Type</label>
                    <select
                      value={formData.doctorType}
                      onChange={e => setFormData({...formData, doctorType: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Visiting">Visiting</option>
                      <option value="On-call">On-call</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Consultation Type</label>
                    <select
                      value={formData.consultationType}
                      onChange={e => setFormData({...formData, consultationType: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="OP">OP Only</option>
                      <option value="IP">IP Only</option>
                      <option value="OP/IP">OP & IP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">License Expiry Date</label>
                    <input
                      type="date"
                      value={formData.licenseExpiryDate}
                      onChange={e => setFormData({...formData, licenseExpiryDate: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'consultation' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Consultation Fee <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.consultationFee}
                      onChange={e => setFormData({...formData, consultationFee: e.target.value})}
                      className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.consultationFee ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'
                      }`}
                    />
                    {errors.consultationFee && <p className="text-red-500 text-xs mt-1">{errors.consultationFee}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Follow-up Fee</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.followUpFee}
                      onChange={e => setFormData({...formData, followUpFee: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Fee</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.emergencyFee}
                      onChange={e => setFormData({...formData, emergencyFee: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tele Consultation Fee</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.teleConsultationFee}
                      onChange={e => setFormData({...formData, teleConsultationFee: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      OP Consultation Duration (Minutes) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.opDuration}
                      onChange={e => setFormData({...formData, opDuration: e.target.value})}
                      className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                        errors.opDuration ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'
                      }`}
                    />
                    {errors.opDuration && <p className="text-red-500 text-xs mt-1">{errors.opDuration}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Maximum Patients Per Slot</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.maxPatients}
                      onChange={e => setFormData({...formData, maxPatients: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-7">
                    <input
                      type="checkbox"
                      id="allowOnlineBooking"
                      checked={formData.allowOnlineBooking}
                      onChange={e => setFormData({...formData, allowOnlineBooking: e.target.checked})}
                      className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="allowOnlineBooking" className="text-sm text-slate-700">Allow Online Booking</label>
                  </div>
                </div>
              )}

              {activeTab === 'schedule' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Available Days <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {daysOfWeek.map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                            formData.availableDays.includes(day)
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-primary/50'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                    {errors.availableDays && <p className="text-red-500 text-xs mt-1">{errors.availableDays}</p>}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        From Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={formData.fromTime}
                        onChange={e => setFormData({...formData, fromTime: e.target.value})}
                        className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                          errors.fromTime ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'
                        }`}
                      />
                      {errors.fromTime && <p className="text-red-500 text-xs mt-1">{errors.fromTime}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        To Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        value={formData.toTime}
                        onChange={e => setFormData({...formData, toTime: e.target.value})}
                        className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                          errors.toTime ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'
                        }`}
                      />
                      {errors.toTime && <p className="text-red-500 text-xs mt-1">{errors.toTime}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Break From</label>
                      <input
                        type="time"
                        value={formData.breakFrom}
                        onChange={e => setFormData({...formData, breakFrom: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Break To</label>
                      <input
                        type="time"
                        value={formData.breakTo}
                        onChange={e => setFormData({...formData, breakTo: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Appointment Slot Duration (Mins) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.slotDuration}
                        onChange={e => setFormData({...formData, slotDuration: e.target.value})}
                        className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                          errors.slotDuration ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'
                        }`}
                      />
                      {errors.slotDuration && <p className="text-red-500 text-xs mt-1">{errors.slotDuration}</p>}
                    </div>
                  </div>

                  <div className="flex gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="availableEmergency"
                        checked={formData.availableEmergency}
                        onChange={e => setFormData({...formData, availableEmergency: e.target.checked})}
                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="availableEmergency" className="text-sm text-slate-700">Available for Emergency</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="availableTele"
                        checked={formData.availableTele}
                        onChange={e => setFormData({...formData, availableTele: e.target.checked})}
                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor="availableTele" className="text-sm text-slate-700">Available for Tele Consultation</label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'documents' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: 'Doctor Photo', note: 'Display Image' },
                    { label: 'Signature Image', note: 'Prescription print' },
                    { label: 'Digital Signature', note: 'E-prescription' },
                    { label: 'Registration Certificate', note: 'Compliance' },
                    { label: 'Qualification Certificate', note: 'Verification' },
                    { label: 'ID Proof', note: 'Records' },
                  ].map((doc, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
                      <label className="block text-sm font-medium text-slate-700">{doc.label}</label>
                      <span className="text-xs text-slate-500 mb-2">{doc.note}</span>
                      <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer">
                        <Upload className="w-6 h-6 text-slate-400 mb-2" />
                        <p className="text-sm text-primary font-medium">Click to upload</p>
                        <p className="text-xs text-slate-500 mt-1">or drag and drop</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'audit' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                      onChange={e => setFormData({...formData, remarks: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  
                  {selectedRecord && (
                    <>
                      <div className="pt-4 border-t border-slate-200 md:col-span-2">
                        <h4 className="text-sm font-medium text-slate-800 mb-4">System Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <label className="block text-xs font-medium text-slate-500">Created By</label>
                            <p className="text-sm text-slate-700 mt-1">Admin User</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <label className="block text-xs font-medium text-slate-500">Created Date</label>
                            <p className="text-sm text-slate-700 mt-1">2023-10-15 10:30 AM</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <label className="block text-xs font-medium text-slate-500">Modified By</label>
                            <p className="text-sm text-slate-700 mt-1">System Admin</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <label className="block text-xs font-medium text-slate-500">Modified Date</label>
                            <p className="text-sm text-slate-700 mt-1">2023-10-18 02:45 PM</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <Button variant="outline" color="secondary" onClick={() => setFormData(emptyDoctorData)} icon={RefreshCw}>
                Reset
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" color="secondary" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button variant="filled" color="primary" onClick={handleSaveForm} icon={Save}>
                  {selectedRecord ? 'Update' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Deletion"
        maxWidth="sm"
      >
        <div className="p-1">
          <div className="flex items-center gap-4 mb-6 text-amber-600 bg-amber-50 p-4 rounded-xl">
            <AlertTriangle className="w-8 h-8 shrink-0" />
            <p className="text-sm font-medium">
              Are you sure you want to delete Doctor <strong>{selectedRecord?.name}</strong>? 
              This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" color="secondary" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="filled" color="danger" onClick={confirmDelete}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
