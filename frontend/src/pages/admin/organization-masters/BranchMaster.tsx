import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, Save, RefreshCw, CheckCircle2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

const API_BASE = import.meta.env.VITE_API_URL as string;

interface HospitalOption {
  id: number;
  name: string;
}

interface BranchRecord {
  id: number;
  code: string;
  name: string;
  hospitalId: number;
  hospital: string;       // HospitalName for display
  branchType: string;
  address1: string;
  address2: string;
  country: string;
  state: string;
  city: string;
  postalCode: string;
  contactNumber: string;
  email: string;
  branchManager: string;
  workingHours: string;
  emergencyAvailable: string;
  numberOfFloors: string;
  numberOfBeds: string;
  status: string;
  remarks: string;
}

// `code` is server-generated, so it is optional here — but the form still
// displays the next code, so the type has to allow it.
const emptyFormData: Omit<BranchRecord, 'id' | 'code'> & { code?: string } = {
  name: '',
  hospitalId: 0,
  hospital: '',
  branchType: 'Main Hospital',
  address1: '',
  address2: '',
  country: '',
  state: '',
  city: '',
  postalCode: '',
  contactNumber: '',
  email: '',
  branchManager: '',
  workingHours: '24/7',
  emergencyAvailable: 'Yes',
  numberOfFloors: '',
  numberOfBeds: '',
  status: 'Active',
  remarks: ''
};

// Map API response → BranchRecord
const mapApiToRecord = (item: Record<string, unknown>): BranchRecord => ({
  id: item.id as number,
  code: item.code as string,
  name: item.name as string,
  hospitalId: item.hospitalId as number,
  hospital: item.hospital as string,
  branchType: item.branchType as string,
  address1: item.address1 as string,
  address2: (item.address2 as string) ?? '',
  country: item.country as string,
  state: item.state as string,
  city: item.city as string,
  postalCode: item.postalCode as string,
  contactNumber: item.contactNumber as string,
  email: (item.email as string) ?? '',
  branchManager: (item.branchManager as string) ?? '',
  workingHours: item.workingHours as string,
  emergencyAvailable: item.emergencyAvailable as string,
  numberOfFloors: item.numberOfFloors != null ? String(item.numberOfFloors) : '',
  numberOfBeds: item.numberOfBeds != null ? String(item.numberOfBeds) : '',
  status: item.status as string,
  remarks: (item.remarks as string) ?? '',
});


export const BranchMaster = () => {
  const [records, setRecords] = useState<BranchRecord[]>([]);
  const [hospitals, setHospitals] = useState<HospitalOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  // Modal States
  const [isFormOpen, setIsFormOpen]         = useState(false);
  const [isDeleteOpen, setIsDeleteOpen]     = useState(false);
  const [isSuccessOpen, setIsSuccessOpen]   = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<BranchRecord | null>(null);
  const [formData, setFormData] = useState<Omit<BranchRecord, 'id' | 'code'> & { code?: string }>(emptyFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Fetch hospitals for dropdown ──────────────────────────
  const fetchHospitals = async () => {
    try {
      const res = await fetch(`${API_BASE}/hospitals/`);
      if (!res.ok) return;
      const data: Record<string, unknown>[] = await res.json();
      setHospitals(data.map(h => ({ id: h.id as number, name: h.name as string })));
    } catch { /* silent — dropdown will be empty */ }
  };

  // ── Fetch all branches ────────────────────────────────────
  const fetchBranches = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/branches/`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: Record<string, unknown>[] = await res.json();
      setRecords(data.map(mapApiToRecord));
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to load branches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchHospitals();
  }, []);

  // Handlers
  const handleCreateNew = async () => {
    let nextCode = '';
    try {
      const res = await fetch(`${API_BASE}/branches/next-code`);
      if (res.ok) {
        const data = await res.json();
        nextCode = data.nextCode;
      }
    } catch (err) {
      console.error("Failed to fetch next code", err);
    }
    setSelectedRecord(null);
    setFormData({ ...emptyFormData, code: nextCode });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: BranchRecord) => {
    setSelectedRecord(record);
    const { id, code, ...rest } = record;
    setFormData(rest);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: BranchRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Branch Name is required';
    if (!formData.hospitalId) errors.hospital = 'Hospital selection is mandatory';
    if (!formData.branchType.trim()) errors.branchType = 'Branch Type is required';
    if (!formData.address1.trim()) errors.address1 = 'Address Line 1 is required';
    if (!formData.country.trim()) errors.country = 'Country is required';
    if (!formData.state.trim()) errors.state = 'State is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (!formData.postalCode.trim()) errors.postalCode = 'Postal Code is required';
    if (!formData.contactNumber.trim()) errors.contactNumber = 'Contact Number is required';
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) errors.email = 'Invalid email format';
    if (!formData.workingHours.trim()) errors.workingHours = 'Working Hours is required';
    if (!formData.emergencyAvailable.trim()) errors.emergencyAvailable = 'Emergency Available selection is required';
    if (!formData.status) errors.status = 'Status is required';

    // Unique check: BranchName within same Hospital
    if (records.some(r =>
      r.name === formData.name &&
      r.hospitalId === formData.hospitalId &&
      r.id !== selectedRecord?.id
    )) {
      errors.name = 'Branch Name must be unique within the selected Hospital';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveForm = async (saveAndNew: boolean = false) => {
    if (!validateForm()) return;
    setIsSaving(true);

    try {
      const body = {
        name: formData.name,
        hospitalId: formData.hospitalId,
        branchType: formData.branchType,
        address1: formData.address1,
        address2: formData.address2 || null,
        country: formData.country,
        state: formData.state,
        city: formData.city,
        postalCode: formData.postalCode,
        contactNumber: formData.contactNumber,
        email: formData.email || null,
        branchManager: formData.branchManager || null,
        workingHours: formData.workingHours,
        emergencyAvailable: formData.emergencyAvailable,
        numberOfFloors: formData.numberOfFloors ? parseInt(formData.numberOfFloors) : null,
        numberOfBeds: formData.numberOfBeds ? parseInt(formData.numberOfBeds) : null,
        status: formData.status,
        remarks: formData.remarks || null,
      };

      if (selectedRecord) {
        const res = await fetch(`${API_BASE}/branches/${selectedRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      } else {
        const res = await fetch(`${API_BASE}/branches/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Create failed: ${res.status}`);
      }

      await fetchBranches();
      
      setSuccessMessage(selectedRecord ? 'This record has been updated successfully.' : 'This record has been created successfully.');
      setIsSuccessOpen(true);
      
      if (saveAndNew) { handleCreateNew(); } else { setIsFormOpen(false); }
    } catch (err: unknown) {
      setFormErrors({ _api: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;
    try {
      const res = await fetch(`${API_BASE}/branches/${selectedRecord.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      await fetchBranches();
      setIsDeleteOpen(false);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Delete failed');
      setIsDeleteOpen(false);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.hospital.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.status.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus ? r.status === filterStatus : true;
    return matchesSearch && matchesStatus;
  });


  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col relative"
    >
      {!isFormOpen ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Branch Master</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>

            <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
              Create New
            </Button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Code, Name, Hospital, City, or Status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 border rounded-lg transition-colors ${showFilters ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  title="Filters"
                >
                  <Filter className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => { setSearchTerm(''); setFilterStatus(''); setShowFilters(false); }} 
                  title="Clear search & filters" 
                  className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <button onClick={() => exportToExcel(records, 'BranchMaster')} title="Export to Excel" className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
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
                  className="border-b border-slate-100 bg-slate-50 overflow-hidden"
                >
                  <div className="p-4 flex gap-4">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    >
                      <option value="">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              {apiError && (
                <div className="mx-4 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  {apiError}
                </div>
              )}
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 sticky top-0 backdrop-blur-sm z-10">
                  <tr>
                    <th className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Branch Code</th>
                    <th className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Branch Name</th>
                    <th className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Hospital</th>
                    <th className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">City</th>
                    <th className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Working Hours</th>
                    <th className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">Loading...</td>
                    </tr>
                  ) : (
                    <>
                      {filteredRecords.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-2.5 text-sm font-semibold text-slate-600">{row.code}</td>
                          <td className="px-6 py-2.5 text-sm font-bold text-slate-900">{row.name}</td>
                          <td className="px-6 py-2.5 text-sm font-medium text-slate-500">{row.hospital}</td>
                          <td className="px-6 py-2.5 text-sm font-medium text-slate-500">{row.city}</td>
                          <td className="px-6 py-2.5 text-sm font-medium text-slate-500">{row.workingHours}</td>
                          <td className="px-6 py-2.5">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${row.status === 'Inactive' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-6 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-2 transition-opacity">
                              <Button variant="text" color="primary" icon={Edit2} className="!p-2" aria-label="Edit" onClick={() => handleEdit(row)} />
                              <Button variant="text" color="danger" icon={Trash2} className="!p-2" aria-label="Delete" onClick={() => handleDeleteRequest(row)} />
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredRecords.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                            {searchTerm ? `No records found matching "${searchTerm}"` : 'No branch records found'}
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-sm">
              <span className="text-slate-500 font-medium">Showing {filteredRecords.length} entries</span>
              <div className="flex gap-1">
                <button className="px-3 py-1 border border-slate-200 rounded-lg text-slate-500 hover:bg-white transition-colors">Prev</button>
                <button className="px-3 py-1 bg-primary text-white rounded-lg font-medium shadow-sm shadow-primary/20">1</button>
                <button className="px-3 py-1 border border-slate-200 rounded-lg text-slate-500 hover:bg-white transition-colors">Next</button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Form Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">{selectedRecord ? 'Edit Branch Master' : 'Create Branch Master'}</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>

            <Button variant="outline" color="secondary" onClick={() => setIsFormOpen(false)}>
              Back to List
            </Button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden p-8">
            <div className="flex-1 overflow-y-auto pr-6 custom-scrollbar">
              {/* Basic Information */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Branch Code</label>
                    <input
                      type="text"
                      value={formData.code}
                      readOnly
                      maxLength={10} className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Branch Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      value={formData.name} maxLength={50}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.name ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    />
                    {formErrors.name && <p className="text-xs text-danger mt-1">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hospital <span className="text-danger">*</span></label>
                    <select
                      value={formData.hospitalId}
                      onChange={(e) => {
                        const id = parseInt(e.target.value);
                        const h = hospitals.find(h => h.id === id);
                        setFormData({ ...formData, hospitalId: id, hospital: h?.name ?? '' });
                      }}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.hospital ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    >
                      <option value={0} disabled hidden>Select Hospital</option>
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                    {formErrors.hospital && <p className="text-xs text-danger mt-1">{formErrors.hospital}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Branch Type <span className="text-danger">*</span></label>
                    <select
                      value={formData.branchType}
                      onChange={(e) => setFormData({ ...formData, branchType: e.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.branchType ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    >
                      <option value="Main Hospital">Main Hospital</option>
                      <option value="Corporate Hospital">Corporate Hospital</option>
                      <option value="Multi-Specialty Hospital">Multi-Specialty Hospital</option>
                      <option value="Super Specialty Hospital">Super Specialty Hospital</option>
                      <option value="Specialty Hospital">Specialty Hospital</option>
                      <option value="Branch Hospital">Branch Hospital</option>
                      <option value="Satellite Clinic">Satellite Clinic</option>
                      <option value="Outpatient Clinic (OPD Centre)">Outpatient Clinic (OPD Centre)</option>
                      <option value="Diagnostic Centre">Diagnostic Centre</option>
                      <option value="Day Care Centre">Day Care Centre</option>
                      <option value="Emergency Centre">Emergency Centre</option>
                      <option value="Rehabilitation Centre">Rehabilitation Centre</option>
                      <option value="Medical College Hospital">Medical College Hospital</option>
                      <option value="Rural Health Centre">Rural Health Centre</option>
                      <option value="Urban Health Centre">Urban Health Centre</option>
                    </select>
                    {formErrors.branchType && <p className="text-xs text-danger mt-1">{formErrors.branchType}</p>}
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 1 <span className="text-danger">*</span></label>
                    <textarea
                      value={formData.address1} maxLength={250} rows={1}
                      onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.address1 ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all resize-y`}
                    />
                    {formErrors.address1 && <p className="text-xs text-danger mt-1">{formErrors.address1}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 2</label>
                    <textarea
                      value={formData.address2} maxLength={250} rows={1}
                      onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Country <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      value={formData.country} maxLength={50}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.country ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    />
                    {formErrors.country && <p className="text-xs text-danger mt-1">{formErrors.country}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">State <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      value={formData.state} maxLength={50}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.state ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    />
                    {formErrors.state && <p className="text-xs text-danger mt-1">{formErrors.state}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">City <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      value={formData.city} maxLength={50}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.city ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    />
                    {formErrors.city && <p className="text-xs text-danger mt-1">{formErrors.city}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Postal Code <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      value={formData.postalCode} maxLength={10}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.postalCode ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    />
                    {formErrors.postalCode && <p className="text-xs text-danger mt-1">{formErrors.postalCode}</p>}
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      value={formData.contactNumber} maxLength={10}
                      onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.contactNumber ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    />
                    {formErrors.contactNumber && <p className="text-xs text-danger mt-1">{formErrors.contactNumber}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email} maxLength={50}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.email ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    />
                    {formErrors.email && <p className="text-xs text-danger mt-1">{formErrors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Branch Manager</label>
                    <input
                      type="text"
                      value={formData.branchManager} maxLength={50}
                      onChange={(e) => setFormData({ ...formData, branchManager: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Operations */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Operations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Working Hours <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      value={formData.workingHours} maxLength={50}
                      placeholder="e.g. 24/7 or 08:00 AM - 08:00 PM"
                      onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.workingHours ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    />
                    {formErrors.workingHours && <p className="text-xs text-danger mt-1">{formErrors.workingHours}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Available <span className="text-danger">*</span></label>
                    <select
                      value={formData.emergencyAvailable}
                      onChange={(e) => setFormData({ ...formData, emergencyAvailable: e.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.emergencyAvailable ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                    {formErrors.emergencyAvailable && <p className="text-xs text-danger mt-1">{formErrors.emergencyAvailable}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Number of Floors</label>
                    <input
                      type="number"
                      value={formData.numberOfFloors} maxLength={50}
                      onChange={(e) => setFormData({ ...formData, numberOfFloors: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Number of Beds</label>
                    <input
                      type="number"
                      value={formData.numberOfBeds} maxLength={50}
                      onChange={(e) => setFormData({ ...formData, numberOfBeds: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* System */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">System</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status <span className="text-danger">*</span></label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.status ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                    {formErrors.status && <p className="text-xs text-danger mt-1">{formErrors.status}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                    <textarea
                      value={formData.remarks} maxLength={250} rows={1}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between pt-6 border-t border-slate-100">
              <Button variant="outline" color="secondary" onClick={() => setFormData(selectedRecord ? selectedRecord : { ...emptyFormData, code: formData.code })} icon={RefreshCw}>
                Reset
              </Button>
              <div className="flex items-center gap-3">
                {formErrors._api && <p className="text-xs text-danger">{formErrors._api}</p>}
                <Button variant="outline" color="secondary" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button variant="filled" color="primary" onClick={() => handleSaveForm(false)} icon={Save} disabled={isSaving}>
                  {isSaving ? 'Saving...' : selectedRecord ? 'Update' : 'Save'}
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

