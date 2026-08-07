import { useState, useEffect } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, Save, RefreshCw, Upload, CheckCircle2, X
} from 'lucide-react';
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
  doctorPhoto: string;
  signatureImage: string;
  digitalSignature: string;
  registrationCertificate: string;
  status: string;
  remarks: string;
  createdBy: string;
  createdDate: string;
  modifiedBy: string;
  modifiedDate: string;
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
  doctorPhoto: '',
  signatureImage: '',
  digitalSignature: '',
  registrationCertificate: '',
  status: 'Active',
  remarks: '',
  createdBy: '',
  createdDate: '',
  modifiedBy: '',
  modifiedDate: ''
};

const API_BASE = import.meta.env.VITE_API_URL as string;

const mapApiToRecord = (item: Record<string, any>): DoctorRecord => ({
  id:                 item.id as number,
  doctorId:           item.doctorId as string,
  registrationNumber: item.registrationNumber as string,
  name:               item.name as string,
  gender:             item.gender as string,
  dob:                item.dob ? String(item.dob) : '',
  qualification:      item.qualification as string,
  specialization:     item.specialization as string,
  department:         item.department as string,
  designation:        item.designation as string,
  hospital:           item.hospital as string,
  branch:             item.branch as string,
  mobile:             item.mobile as string,
  alternateMobile:    item.alternateMobile as string || '',
  email:              item.email as string,
  address1:           item.address1 as string || '',
  address2:           item.address2 as string || '',
  city:               item.city as string || '',
  state:              item.state as string || '',
  country:            item.country as string || '',
  postalCode:         item.postalCode as string || '',
  medicalCouncil:     item.medicalCouncil as string || '',
  experience:         item.experience != null ? String(item.experience) : '',
  languages:          item.languages as string || '',
  doctorType:         item.doctorType as string || '',
  consultationType:   item.consultationType as string || '',
  joiningDate:        item.joiningDate ? String(item.joiningDate) : '',
  licenseExpiryDate:  item.licenseExpiryDate ? String(item.licenseExpiryDate) : '',
  consultationFee:    item.consultationFee != null ? String(item.consultationFee) : '',
  followUpFee:        item.followUpFee != null ? String(item.followUpFee) : '',
  emergencyFee:       item.emergencyFee != null ? String(item.emergencyFee) : '',
  teleConsultationFee:item.teleConsultationFee != null ? String(item.teleConsultationFee) : '',
  opDuration:         item.opDuration != null ? String(item.opDuration) : '',
  maxPatients:        item.maxPatients != null ? String(item.maxPatients) : '',
  allowOnlineBooking: Boolean(item.allowOnlineBooking),
  availableDays:      item.availableDays ? String(item.availableDays).split(',') : [],
  fromTime:           item.fromTime ? String(item.fromTime) : '',
  toTime:             item.toTime ? String(item.toTime) : '',
  breakFrom:          item.breakFrom ? String(item.breakFrom) : '',
  breakTo:            item.breakTo ? String(item.breakTo) : '',
  slotDuration:       item.slotDuration != null ? String(item.slotDuration) : '',
  availableEmergency: Boolean(item.availableEmergency),
  availableTele:      Boolean(item.availableTele),
  doctorPhoto:        item.doctorPhoto as string || '',
  signatureImage:     item.signatureImage as string || '',
  digitalSignature:   item.digitalSignature as string || '',
  registrationCertificate: item.registrationCertificate as string || '',
  status:             item.status as string,
  remarks:            item.remarks as string || '',
  createdBy:          item.createdBy as string || '',
  createdDate:        item.createdDate ? String(item.createdDate) : '',
  modifiedBy:         item.modifiedBy as string || '',
  modifiedDate:       item.modifiedDate ? String(item.modifiedDate) : ''
});

export const DoctorMaster = () => {
  const [records, setRecords] = useState<DoctorRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Dropdowns
  const [hospitals, setHospitals] = useState<{name: string}[]>([]);
  const [branches, setBranches] = useState<{name: string}[]>([]);
  const [departments, setDepartments] = useState<{departmentName: string}[]>([]);
  
  const fetchDoctors = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/doctors/`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setRecords(data.map(mapApiToRecord));
    } catch (err: any) {
      setApiError(err.message || 'Failed to load doctors');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [hRes, bRes, dRes] = await Promise.all([
        fetch(`${API_BASE}/hospitals/`),
        fetch(`${API_BASE}/branches/`),
        fetch(`${API_BASE}/departments/`)
      ]);
      if (hRes.ok) setHospitals(await hRes.json());
      if (bRes.ok) setBranches(await bRes.json());
      if (dRes.ok) setDepartments(await dRes.json());
    } catch {}
  };

  useEffect(() => {
    fetchDoctors();
    fetchDropdowns();
  }, []);
  
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
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof DoctorRecord) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/upload/`, {
        method: 'POST',
        body: form
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setFormData(prev => ({ ...prev, [fieldName]: data.url }));
    } catch (err) {
      alert('Failed to upload file');
    }
  };

  const validateForm = (tabId?: string) => {
    const newErrors: Record<string, string> = tabId ? { ...errors } : {};
    let isValid = true;
    
    if (!tabId || tabId === 'general') {
      ['registrationNumber', 'name', 'gender', 'mobile', 'email'].forEach(k => delete newErrors[k]);
      if (!formData.registrationNumber.trim()) { newErrors.registrationNumber = 'Registration Number is required'; isValid = false; }
      else if (records.some(r => r.registrationNumber === formData.registrationNumber && r.id !== selectedRecord?.id)) {
        newErrors.registrationNumber = 'Registration Number must be unique'; isValid = false;
      }
      if (!formData.name.trim()) { newErrors.name = 'Name is required'; isValid = false; }
      if (!formData.gender) { newErrors.gender = 'Gender is required'; isValid = false; }
      if (!formData.mobile.trim()) {
        newErrors.mobile = 'Mobile is required'; isValid = false;
      } else if (!/^\d{10}$/.test(formData.mobile.replace(/\D/g, ''))) {
        newErrors.mobile = 'Enter a valid 10-digit mobile number'; isValid = false;
      }
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required'; isValid = false;
      } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
        newErrors.email = 'Enter a valid email'; isValid = false;
      }
    }
    
    if (!tabId || tabId === 'professional') {
      ['qualification', 'specialization', 'department', 'designation', 'hospital', 'branch'].forEach(k => delete newErrors[k]);
      if (!formData.qualification.trim()) { newErrors.qualification = 'Qualification is required'; isValid = false; }
      if (!formData.specialization.trim()) { newErrors.specialization = 'Specialization is required'; isValid = false; }
      if (!formData.department) { newErrors.department = 'Department is required'; isValid = false; }
      if (!formData.designation.trim()) { newErrors.designation = 'Designation is required'; isValid = false; }
      if (!formData.hospital) { newErrors.hospital = 'Hospital is required'; isValid = false; }
      if (!formData.branch) { newErrors.branch = 'Branch is required'; isValid = false; }
    }
    
    if (!tabId || tabId === 'consultation') {
      delete newErrors.consultationFee;
      if (!formData.consultationFee) {
        newErrors.consultationFee = 'Fee is required'; isValid = false;
      } else if (Number(formData.consultationFee) < 0) {
        newErrors.consultationFee = 'Fee must be >= 0'; isValid = false;
      }
    }
    
    if (!tabId || tabId === 'schedule') {
      ['opDuration', 'availableDays', 'fromTime', 'toTime', 'slotDuration'].forEach(k => delete newErrors[k]);
      if (!formData.opDuration) {
        newErrors.opDuration = 'Duration is required'; isValid = false;
      } else if (Number(formData.opDuration) <= 0) {
        newErrors.opDuration = 'Duration must be > 0'; isValid = false;
      }
      if (formData.availableDays.length === 0) { newErrors.availableDays = 'Select at least one day'; isValid = false; }
      if (!formData.fromTime) { newErrors.fromTime = 'From Time is required'; isValid = false; }
      if (!formData.toTime) { newErrors.toTime = 'To Time is required'; isValid = false; }
      if (formData.fromTime && formData.toTime && formData.fromTime >= formData.toTime) {
        newErrors.toTime = 'To Time must be after From Time'; isValid = false;
      }
      if (!formData.slotDuration) { newErrors.slotDuration = 'Slot Duration is required'; isValid = false; }
      if (formData.opDuration && formData.slotDuration && (Number(formData.opDuration) % Number(formData.slotDuration) !== 0)) {
        newErrors.slotDuration = 'Slot must divide consultation duration'; isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
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

  const handleSaveForm = async () => {
    const tabIndex = tabs.findIndex(t => t.id === activeTab);
    
    if (tabIndex < tabs.length - 1) {
      if (validateForm(activeTab)) {
        setActiveTab(tabs[tabIndex + 1].id);
      }
      return;
    }

    if (!validateForm()) return;
    
    setIsSaving(true);
    setErrors({});
    
    try {
      const payload = {
        registrationNumber: formData.registrationNumber,
        name: formData.name,
        gender: formData.gender,
        dob: formData.dob || null,
        mobile: formData.mobile,
        alternateMobile: formData.alternateMobile || null,
        email: formData.email,
        address1: formData.address1 || null,
        address2: formData.address2 || null,
        city: formData.city || null,
        state: formData.state || null,
        country: formData.country || null,
        postalCode: formData.postalCode || null,

        qualification: formData.qualification,
        specialization: formData.specialization,
        hospital: formData.hospital,
        branch: formData.branch,
        department: formData.department,
        designation: formData.designation,
        medicalCouncil: formData.medicalCouncil || null,
        experience: formData.experience ? Number(formData.experience) : null,
        languages: formData.languages || null,
        doctorType: formData.doctorType || null,
        consultationType: formData.consultationType || null,
        joiningDate: formData.joiningDate || null,
        licenseExpiryDate: formData.licenseExpiryDate || null,

        consultationFee: Number(formData.consultationFee),
        followUpFee: formData.followUpFee ? Number(formData.followUpFee) : null,
        emergencyFee: formData.emergencyFee ? Number(formData.emergencyFee) : null,
        teleConsultationFee: formData.teleConsultationFee ? Number(formData.teleConsultationFee) : null,
        opDuration: Number(formData.opDuration),
        maxPatients: formData.maxPatients ? Number(formData.maxPatients) : null,
        allowOnlineBooking: formData.allowOnlineBooking,

        availableDays: formData.availableDays.join(','),
        fromTime: formData.fromTime,
        toTime: formData.toTime,
        breakFrom: formData.breakFrom || null,
        breakTo: formData.breakTo || null,
        slotDuration: Number(formData.slotDuration),
        availableEmergency: formData.availableEmergency,
        availableTele: formData.availableTele,

        doctorPhoto: formData.doctorPhoto || null,
        signatureImage: formData.signatureImage || null,
        digitalSignature: formData.digitalSignature || null,
        registrationCertificate: formData.registrationCertificate || null,

        status: formData.status,
        remarks: formData.remarks || null,
        
        // Audit
        ...(selectedRecord ? { modifiedBy: 'Dr. John Doe' } : { createdBy: 'Dr. John Doe' })
      };

      const url = selectedRecord ? `${API_BASE}/doctors/${selectedRecord.id}` : `${API_BASE}/doctors/`;
      const method = selectedRecord ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${res.status}`);
      }

      await fetchDoctors();
      
      setSuccessMessage(selectedRecord ? 'This record has been updated successfully.' : 'This record has been created successfully.');
      setIsSuccessOpen(true);
      setIsFormOpen(false);
    } catch (err: any) {
      setErrors({ _api: err.message || 'Failed to save record' });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;
    try {
      const res = await fetch(`${API_BASE}/doctors/${selectedRecord.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      
      await fetchDoctors();
      setIsDeleteOpen(false);
      setSelectedRecord(null);
    } catch (err: any) {
      setApiError(err.message || 'Failed to delete record');
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

  const _totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const _page = Math.min(currentPage, _totalPages);
  const pagedRecords = filteredRecords.slice((_page - 1) * itemsPerPage, _page * itemsPerPage);

  const { page, setPage, pageSize, total, paged } = usePagination(tabs);

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
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
                Create New
              </Button>
            </div>
          </div>

          {/* The load failure used to be swallowed, leaving an empty table that
              looked like 'no data' rather than 'the server is unreachable'. */}
          {apiError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}
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
              <div className="flex items-center gap-2">
              <button onClick={() => setShowFilters(!showFilters)} title="Filters" className={showFilters ? "p-2 border rounded-lg transition-colors border-primary bg-primary/5 text-primary" : "p-2 border rounded-lg transition-colors border-slate-200 text-slate-500 hover:bg-slate-50"}>
                <Filter className="w-4 h-4" />
              </button>
              <button onClick={() => { setSearchTerm(''); setFilterBranch(''); setFilterDept(''); setFilterHospital(''); setFilterSpec(''); setFilterStatus(''); }} title="Clear search & filters" className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
              <button onClick={() => exportToExcel(records, 'DoctorMaster')} title="Export to Excel" className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
                <Download className="w-4 h-4" />
              </button>
            </div>
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
                    pagedRecords.map((record) => (
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
                        {isLoading ? 'Loading records...' : 'No doctors found matching your criteria.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        <Pagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} />
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-100 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <span>Show</span>
                <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>entries</span>
                <span className="text-slate-400">· {filteredRecords.length} total</span>
              </div>
              <div className="flex items-center gap-3">
                <span>Page {_page} of {_totalPages}</span>
                <div className="flex gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={_page <= 1} className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">Prev</button>
                  <button onClick={() => setCurrentPage(p => Math.min(_totalPages, p + 1))} disabled={_page >= _totalPages} className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
                </div>
              </div>
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
              {paged.map((tab) => (
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
                      maxLength={50} className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed focus:outline-none"
                    />
                    {errors.doctorId && <p className="text-red-500 text-xs mt-1">{errors.doctorId}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Registration Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.registrationNumber} maxLength={50}
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
                      value={formData.name} maxLength={50}
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
                      value={formData.mobile} maxLength={10}
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
                      value={formData.alternateMobile} maxLength={10}
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
                      value={formData.email} maxLength={50}
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
                        value={formData.address1} maxLength={250}
                        onChange={e => setFormData({...formData, address1: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 2</label>
                      <input
                        type="text"
                        value={formData.address2} maxLength={250}
                        onChange={e => setFormData({...formData, address2: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                      <input
                        type="text"
                        value={formData.city} maxLength={50}
                        onChange={e => setFormData({...formData, city: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                      <input
                        type="text"
                        value={formData.state} maxLength={50}
                        onChange={e => setFormData({...formData, state: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
                      <input
                        type="text"
                        value={formData.country} maxLength={50}
                        onChange={e => setFormData({...formData, country: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Postal Code</label>
                      <input
                        type="text"
                        value={formData.postalCode} maxLength={10}
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
                      value={formData.qualification} maxLength={50}
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
                      value={formData.specialization} maxLength={50}
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
                      {hospitals.map((h, i) => (
                        <option key={i} value={h.name}>{h.name}</option>
                      ))}
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
                      {branches.map((b, i) => (
                        <option key={i} value={b.name}>{b.name}</option>
                      ))}
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
                      {departments.map((d, i) => (
                        <option key={i} value={d.departmentName}>{d.departmentName}</option>
                      ))}
                    </select>
                    {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Designation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.designation} maxLength={50}
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
                      value={formData.medicalCouncil} maxLength={50}
                      onChange={e => setFormData({...formData, medicalCouncil: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Experience (Years)</label>
                    <input
                      type="number"
                      value={formData.experience} maxLength={50}
                      onChange={e => setFormData({...formData, experience: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Languages Known</label>
                    <input
                      type="text"
                      value={formData.languages} maxLength={50}
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
                      value={formData.consultationFee} maxLength={50}
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
                      value={formData.followUpFee} maxLength={50}
                      onChange={e => setFormData({...formData, followUpFee: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Fee</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.emergencyFee} maxLength={50}
                      onChange={e => setFormData({...formData, emergencyFee: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tele Consultation Fee</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.teleConsultationFee} maxLength={50}
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
                      value={formData.opDuration} maxLength={50}
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
                      value={formData.maxPatients} maxLength={50}
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
                        value={formData.slotDuration} maxLength={50}
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
                    { label: 'Doctor Photo', note: 'Display Image', field: 'doctorPhoto' },
                    { label: 'Signature Image', note: 'Prescription print', field: 'signatureImage' },
                    { label: 'Digital Signature', note: 'E-prescription', field: 'digitalSignature' },
                    { label: 'Registration Certificate', note: 'Compliance', field: 'registrationCertificate' },
                  ].map((doc, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-xl p-4 flex flex-col gap-2 relative">
                      <label className="block text-sm font-medium text-slate-700">{doc.label}</label>
                      <span className="text-xs text-slate-500 mb-2">{doc.note}</span>
                      
                      <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative overflow-hidden group h-32">
                        {formData[doc.field as keyof typeof formData] ? (
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-sm font-medium text-emerald-600">File Uploaded</span>
                            <img 
                              src={`http://localhost:8000${formData[doc.field as keyof typeof formData]}`} 
                              alt="preview" 
                              className="h-16 object-contain" 
                              onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="text-white text-xs font-medium">Click to change</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-slate-400 mb-2" />
                            <p className="text-sm text-primary font-medium">Click to upload</p>
                            <p className="text-xs text-slate-500 mt-1">or drag and drop</p>
                          </>
                        )}
                        <input 
                          type="file" 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={(e) => handleFileUpload(e, doc.field as keyof DoctorRecord)}
                          accept="image/*,.pdf"
                        />
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
                      value={formData.remarks} maxLength={250}
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
                            <p className="text-sm text-slate-700 mt-1">{selectedRecord.createdBy || 'System'}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <label className="block text-xs font-medium text-slate-500">Created Date</label>
                            <p className="text-sm text-slate-700 mt-1">{selectedRecord.createdDate ? new Date(selectedRecord.createdDate + 'Z').toLocaleString() : 'N/A'}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <label className="block text-xs font-medium text-slate-500">Modified By</label>
                            <p className="text-sm text-slate-700 mt-1">{selectedRecord.modifiedBy || 'N/A'}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <label className="block text-xs font-medium text-slate-500">Modified Date</label>
                            <p className="text-sm text-slate-700 mt-1">{selectedRecord.modifiedDate ? new Date(selectedRecord.modifiedDate + 'Z').toLocaleString() : 'N/A'}</p>
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
                <Button variant="filled" color="primary" onClick={handleSaveForm} icon={Save} isLoading={isSaving}>
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
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Record</h3>
          <p className="text-slate-500 text-sm mb-6">
            Are you sure you want to delete <span className="font-semibold text-slate-700">{selectedRecord?.name}</span>?
          </p>
          <div className="flex items-center gap-3 w-full">
            <Button variant="outline" color="secondary" className="flex-1" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="filled" color="danger" className="flex-1" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        title="Success"
        maxWidth="sm"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Success</h3>
          <p className="text-slate-500 text-sm mb-6">
            {successMessage}
          </p>
          
          <div className="flex items-center justify-center w-full">
            <Button variant="filled" color="primary" className="w-full" onClick={() => setIsSuccessOpen(false)}>
              OK
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
