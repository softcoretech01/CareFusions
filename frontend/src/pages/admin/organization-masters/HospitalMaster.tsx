import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, Save, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

const API_BASE = import.meta.env.VITE_API_URL as string;

interface HospitalOptions {
  currencies: string[];
  financialYears: string[];
  timeZones: string[];
  statuses: string[];
}

interface HospitalRecord {
  id: number;
  code: string;
  name: string;
  legalName: string;
  registrationNo: string;
  gstVatNo: string;
  panTinNo: string;
  contactNumber: string;
  alternateNumber: string;
  email: string;
  website: string;
  address1: string;
  address2: string;
  country: string;
  state: string;
  city: string;
  postalCode: string;
  currency: string;
  financialYear: string;
  timeZone: string;
  status: string;
  remarks: string;
}

const emptyFormData: Omit<HospitalRecord, 'id'> = {
  code: '',
  name: '',
  legalName: '',
  registrationNo: '',
  gstVatNo: '',
  panTinNo: '',
  contactNumber: '',
  alternateNumber: '',
  email: '',
  website: '',
  address1: '',
  address2: '',
  country: '',
  state: '',
  city: '',
  postalCode: '',
  currency: '',
  financialYear: '',
  timeZone: '',
  status: '',
  remarks: ''
};

// Map API response field names → HospitalRecord
const mapApiToRecord = (item: Record<string, unknown>): HospitalRecord => ({
  id: item.id as number,
  code: item.code as string,
  name: item.name as string,
  legalName: item.legalName as string,
  registrationNo: item.registrationNo as string,
  gstVatNo: (item.gstVatNo as string) ?? '',
  panTinNo: (item.panTinNo as string) ?? '',
  contactNumber: item.contactNumber as string,
  alternateNumber: (item.alternateNumber as string) ?? '',
  email: item.email as string,
  website: (item.website as string) ?? '',
  address1: item.address1 as string,
  address2: (item.address2 as string) ?? '',
  country: item.country as string,
  state: item.state as string,
  city: item.city as string,
  postalCode: item.postalCode as string,
  currency: item.currency as string,
  financialYear: item.financialYear as string,
  timeZone: item.timeZone as string,
  status: item.status as string,
  remarks: (item.remarks as string) ?? '',
});

export const HospitalMaster = () => {
  const [records, setRecords] = useState<HospitalRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [options, setOptions] = useState<HospitalOptions>({
    currencies: [],
    financialYears: [],
    timeZones: [],
    statuses: []
  });

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<HospitalRecord | null>(null);
  const [formData, setFormData] = useState<Omit<HospitalRecord, 'id'>>(emptyFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  // ── Fetch all hospitals on mount ──────────────────────────
  const fetchHospitals = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [hospitalsRes, optionsRes, fyRes] = await Promise.all([
        fetch(`${API_BASE}/hospitals/`),
        fetch(`${API_BASE}/hospitals/options`),
        fetch(`${API_BASE}/financial-years/`)
      ]);

      if (!hospitalsRes.ok) throw new Error(`Server error: ${hospitalsRes.status}`);
      if (!optionsRes.ok) throw new Error(`Server error: ${optionsRes.status}`);
      if (!fyRes.ok) throw new Error(`Server error: ${fyRes.status}`);

      const hospitalsData: Record<string, unknown>[] = await hospitalsRes.json();
      const optionsData: HospitalOptions = await optionsRes.json();
      
      let financialYears = optionsData.financialYears;
      try {
        const fyData = await fyRes.json();
        if (Array.isArray(fyData)) {
          const activeFys = fyData.filter(fy => fy.status === 'Active').map(fy => fy.financialYear);
          if (activeFys.length > 0) financialYears = activeFys;
        }
      } catch (e) {
        console.warn('Could not parse financial years', e);
      }

      setRecords(hospitalsData.map(mapApiToRecord));
      setOptions({
        ...optionsData,
        financialYears
      });
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchHospitals(); }, []);

  // Handlers
  const handleCreateNew = async () => {
    // Calculate current financial year (April to March)
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-11
    const currentYear = today.getFullYear();
    const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
    const currentFinancialYear = `${startYear}-${startYear + 1}`;

    let nextCode = '';
    try {
      const res = await fetch(`${API_BASE}/hospitals/next-code`);
      if (res.ok) {
        const data = await res.json();
        nextCode = data.nextCode;
      }
    } catch (err) {
      console.error("Failed to fetch next code", err);
    }

    setSelectedRecord(null);
    setFormData({
      ...emptyFormData,
      code: nextCode,
      currency: options.currencies.includes('INR') ? 'INR' : (options.currencies[0] || ''),
      financialYear: options.financialYears.includes(currentFinancialYear) ? currentFinancialYear : (options.financialYears[0] || ''),
      timeZone: options.timeZones.includes('IST') ? 'IST' : (options.timeZones[0] || ''),
      status: options.statuses.includes('Active') ? 'Active' : (options.statuses[0] || '')
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: HospitalRecord) => {
    setSelectedRecord(record);
    const { id, ...rest } = record;
    setFormData(rest);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: HospitalRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) errors.code = 'Hospital Code is required';
    if (!formData.name.trim()) errors.name = 'Hospital Name is required';
    if (!formData.legalName.trim()) errors.legalName = 'Legal Name is required';
    if (!formData.registrationNo.trim()) errors.registrationNo = 'Registration Number is required';
    else if (formData.registrationNo.trim().length !== 15) errors.registrationNo = 'Registration Number must be 15 numbers';

    if (formData.gstVatNo && formData.gstVatNo.trim().length !== 15) errors.gstVatNo = 'GST/VAT Number must be 15 characters';
    if (formData.panTinNo && formData.panTinNo.trim().length !== 10) errors.panTinNo = 'PAN/TIN Number must be 10 characters';
    if (!formData.contactNumber.trim()) errors.contactNumber = 'Contact Number is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) errors.email = 'Invalid email format';

    if (!formData.address1.trim()) errors.address1 = 'Address Line 1 is required';
    if (!formData.country.trim()) errors.country = 'Country is required';
    if (!formData.state.trim()) errors.state = 'State is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (!formData.postalCode.trim()) errors.postalCode = 'Postal Code is required';

    if (!formData.currency.trim()) errors.currency = 'Currency is required';
    if (!formData.financialYear.trim()) errors.financialYear = 'Financial Year is required';
    if (!formData.timeZone.trim()) errors.timeZone = 'Time Zone is required';
    if (!formData.status) errors.status = 'Status is required';

    // Unique checks against loaded records
    if (records.some(r => r.code === formData.code && r.id !== selectedRecord?.id)) {
      errors.code = 'Hospital Code must be unique';
    }
    if (records.some(r => r.name === formData.name && r.id !== selectedRecord?.id)) {
      errors.name = 'Hospital Name must be unique';
    }
    if (records.some(r => r.registrationNo === formData.registrationNo && r.id !== selectedRecord?.id)) {
      errors.registrationNo = 'Registration Number must be unique';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveForm = async (saveAndNew: boolean = false) => {
    if (!validateForm()) return;
    setIsSaving(true);

    try {
      const body = {
        code: formData.code,
        name: formData.name,
        legalName: formData.legalName,
        registrationNo: formData.registrationNo,
        gstVatNo: formData.gstVatNo || null,
        panTinNo: formData.panTinNo || null,
        contactNumber: formData.contactNumber,
        alternateNumber: formData.alternateNumber || null,
        email: formData.email,
        website: formData.website || null,
        address1: formData.address1,
        address2: formData.address2 || null,
        country: formData.country,
        state: formData.state,
        city: formData.city,
        postalCode: formData.postalCode,
        currency: formData.currency,
        financialYear: formData.financialYear,
        timeZone: formData.timeZone,
        status: formData.status,
        remarks: formData.remarks || null,
      };

      if (selectedRecord) {
        // UPDATE
        const res = await fetch(`${API_BASE}/hospitals/${selectedRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      } else {
        // CREATE
        const res = await fetch(`${API_BASE}/hospitals/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Create failed: ${res.status}`);
      }

      await fetchHospitals();

      setSuccessMessage(selectedRecord ? 'This record has been updated successfully.' : 'This record has been created successfully.');
      setIsSuccessOpen(true);

      if (saveAndNew) {
        handleCreateNew();
      } else {
        setIsFormOpen(false);
      }
    } catch (err: unknown) {
      setFormErrors({ _api: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;
    try {
      const res = await fetch(`${API_BASE}/hospitals/${selectedRecord.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      await fetchHospitals();
      setIsDeleteOpen(false);
      setSuccessMessage('This record has been deleted successfully.');
      setIsSuccessOpen(true);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Delete failed');
      setIsDeleteOpen(false);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Hospital</h1>
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
                  placeholder="Search by Code, Name, City, State, or Status..."
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
                <button onClick={() => exportToExcel(records, 'HospitalMaster')} title="Export to Excel" className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
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
              {/* API Error Banner */}
              {apiError && (
                <div className="mx-4 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  {apiError}
                </div>
              )}
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 sticky top-0 backdrop-blur-sm z-10">
                  <tr>
                    <th className="px-6 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Hospital Code</th>
                    <th className="px-6 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Hospital Name</th>
                    <th className="px-6 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Registration No</th>
                    <th className="px-6 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">City</th>
                    <th className="px-6 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Number</th>
                    <th className="px-6 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        Loading...
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filteredRecords.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-2 text-sm font-semibold text-slate-600">{row.code}</td>
                          <td className="px-6 py-2 text-sm font-bold text-slate-900">{row.name}</td>
                          <td className="px-6 py-2 text-sm font-medium text-slate-500">{row.registrationNo}</td>
                          <td className="px-6 py-2 text-sm font-medium text-slate-500">{row.city}</td>
                          <td className="px-6 py-2 text-sm font-medium text-slate-500">{row.contactNumber}</td>
                          <td className="px-6 py-2">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${row.status === 'Inactive' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-6 py-2 text-right">
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
                            {searchTerm ? `No records found matching "${searchTerm}"` : 'No hospital records found'}
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
              <h1 className="text-3xl font-bold text-slate-800">{selectedRecord ? 'Edit Hospital' : 'Create Hospital'}</h1>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hospital Code <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      value={formData.code}
                      readOnly
                      maxLength={10} className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm cursor-not-allowed text-slate-500 focus:outline-none"
                    />
                    {formErrors.code && <p className="text-xs text-danger mt-1">{formErrors.code}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hospital Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      value={formData.name} maxLength={50}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.name ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    />
                    {formErrors.name && <p className="text-xs text-danger mt-1">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Legal Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      value={formData.legalName} maxLength={50}
                      onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.legalName ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    />
                    {formErrors.legalName && <p className="text-xs text-danger mt-1">{formErrors.legalName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Registration Number <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      value={formData.registrationNo} maxLength={15}
                      onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value.replace(/\D/g, '') })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.registrationNo ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    />
                    {formErrors.registrationNo && <p className="text-xs text-danger mt-1">{formErrors.registrationNo}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">GST/VAT Number</label>
                    <input
                      type="text"
                      value={formData.gstVatNo} maxLength={15}
                      onChange={(e) => setFormData({ ...formData, gstVatNo: e.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.gstVatNo ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    />
                    {formErrors.gstVatNo && <p className="text-xs text-danger mt-1">{formErrors.gstVatNo}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">PAN/TIN Number</label>
                    <input
                      type="text"
                      value={formData.panTinNo} maxLength={10}
                      onChange={(e) => setFormData({ ...formData, panTinNo: e.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.panTinNo ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    />
                    {formErrors.panTinNo && <p className="text-xs text-danger mt-1">{formErrors.panTinNo}</p>}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Alternate Number</label>
                    <input
                      type="text"
                      value={formData.alternateNumber} maxLength={10}
                      onChange={(e) => setFormData({ ...formData, alternateNumber: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-danger">*</span></label>
                    <input
                      type="email"
                      value={formData.email} maxLength={50}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.email ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    />
                    {formErrors.email && <p className="text-xs text-danger mt-1">{formErrors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                    <input
                      type="text"
                      value={formData.website} maxLength={50}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
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

              {/* Financial & System Information */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Financial & System Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Currency <span className="text-danger">*</span></label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.currency ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    >
                      <option value="" disabled>Select Currency</option>
                      {options.currencies.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {formErrors.currency && <p className="text-xs text-danger mt-1">{formErrors.currency}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Financial Year <span className="text-danger">*</span></label>
                    <select
                      value={formData.financialYear}
                      onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.financialYear ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    >
                      <option value="" disabled>Select Year</option>
                      {options.financialYears.map(fy => <option key={fy} value={fy}>{fy}</option>)}
                    </select>
                    {formErrors.financialYear && <p className="text-xs text-danger mt-1">{formErrors.financialYear}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Time Zone <span className="text-danger">*</span></label>
                    <select
                      value={formData.timeZone}
                      onChange={(e) => setFormData({ ...formData, timeZone: e.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.timeZone ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    >
                      <option value="" disabled>Select Time Zone</option>
                      {options.timeZones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                    {formErrors.timeZone && <p className="text-xs text-danger mt-1">{formErrors.timeZone}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status <span className="text-danger">*</span></label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.status ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                    >
                      <option value="" disabled>Select Status</option>
                      {options.statuses.map(s => <option key={s} value={s}>{s}</option>)}
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
                {formErrors._api && (
                  <p className="text-xs text-danger">{formErrors._api}</p>
                )}
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
        size="sm"
      >
        <div className="flex flex-col items-center text-center py-4">
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

