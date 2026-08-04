import { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, 
  Save, RefreshCw, Upload, CheckCircle2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

interface PharmacistRecord {
  id: number;
  pharmacistId: string;
  employeeCode: string;
  name: string;
  licenseNumber: string;
  qualification: string;
  hospital: string;
  branch: string;
  pharmacy: string;
  mobile: string;
  email: string;
  address: string;
  joiningDate: string;
  experience: string;
  shift: string;
  employmentType: string;
  status: string;
  remarks: string;
}

const emptyData: Omit<PharmacistRecord, 'id'> = {
  pharmacistId: '',
  employeeCode: '',
  name: '',
  licenseNumber: '',
  qualification: '',
  hospital: '',
  branch: '',
  pharmacy: '',
  mobile: '',
  email: '',
  address: '',
  joiningDate: '',
  experience: '',
  shift: '',
  employmentType: '',
  status: 'Active',
  remarks: ''
};

const mockData: PharmacistRecord[] = [];

const API_BASE = import.meta.env.VITE_API_URL as string;

const mapApiToRecord = (item: any): PharmacistRecord => ({
  id:                 item.id,
  pharmacistId:       item.pharmacistId as string,
  employeeCode:       item.employeeCode as string,
  name:               item.name as string,
  licenseNumber:      item.licenseNumber as string,
  qualification:      item.qualification as string || '',
  hospital:           item.hospital as string || '',
  branch:             item.branch as string || '',
  pharmacy:           item.pharmacy as string || '',
  mobile:             item.mobile as string,
  email:              item.email as string || '',
  address:            item.address as string || '',
  joiningDate:        item.joiningDate ? String(item.joiningDate) : '',
  experience:         item.experience != null ? String(item.experience) : '',
  shift:              item.shift as string || '',
  employmentType:     item.employmentType as string || '',
  status:             item.status as string,
  remarks:            item.remarks as string || '',
  photo:              item.photo as string || '',
  licenseCertificate: item.licenseCertificate as string || '',
  idProof:            item.idProof as string || '',
});

export const PharmacistMaster = () => {
  const [records, setRecords] = useState<PharmacistRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterPharmacy, setFilterPharmacy] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PharmacistRecord | null>(null);
  const [formData, setFormData] = useState<Omit<PharmacistRecord, 'id'> & { photo?: string, licenseCertificate?: string, idProof?: string }>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Dropdowns
  const [hospitals, setHospitals] = useState<{name: string}[]>([]);
  const [branches, setBranches] = useState<{name: string}[]>([]);

  const fetchPharmacists = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/pharmacists/`);
      if (!res.ok) throw new Error('Failed to fetch pharmacists');
      const data = await res.json();
      setRecords(data.map(mapApiToRecord));
    } catch (err: any) {
      setApiError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [hRes, bRes] = await Promise.all([
        fetch(`${API_BASE}/hospitals/`),
        fetch(`${API_BASE}/branches/`)
      ]);
      if (hRes.ok) {
        const hData = await hRes.json();
        setHospitals(hData);
      }
      if (bRes.ok) {
        const bData = await bRes.json();
        setBranches(bData);
      }
    } catch (err) {
      console.error('Failed to fetch dropdowns:', err);
    }
  };

  useEffect(() => {
    fetchPharmacists();
    fetchDropdowns();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.pharmacistId.trim()) newErrors.pharmacistId = 'Pharmacist ID is required';
    if (!formData.employeeCode.trim()) newErrors.employeeCode = 'Employee Code is required';
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.licenseNumber.trim()) newErrors.licenseNumber = 'License Number is required';
    if (!formData.qualification.trim()) newErrors.qualification = 'Qualification is required';
    if (!formData.hospital) newErrors.hospital = 'Hospital is required';
    if (!formData.branch) newErrors.branch = 'Branch is required';
    if (!formData.pharmacy) newErrors.pharmacy = 'Pharmacy is required';
    if (!formData.mobile.trim()) newErrors.mobile = 'Mobile is required';

    // Uniqueness checks
    if (records.some(r => r.licenseNumber === formData.licenseNumber && r.id !== selectedRecord?.id)) {
      newErrors.licenseNumber = 'License Number must be unique';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    const nextId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
    setFormData({
      ...emptyData,
      pharmacistId: `PHA-${nextId.toString().padStart(3, '0')}`
    });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: PharmacistRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: PharmacistRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const handleSaveForm = async () => {
    if (!validateForm()) return;
    setIsSaving(true);

    try {
      const payload = {
        employeeCode: formData.employeeCode,
        name: formData.name,
        licenseNumber: formData.licenseNumber,
        qualification: formData.qualification || null,
        hospital: formData.hospital || null,
        branch: formData.branch || null,
        pharmacy: formData.pharmacy || null,
        mobile: formData.mobile,
        email: formData.email || null,
        address: formData.address || null,
        joiningDate: formData.joiningDate || null,
        experience: formData.experience ? Number(formData.experience) : null,
        shift: formData.shift || null,
        employmentType: formData.employmentType || null,
        
        photo: formData.photo || null,
        licenseCertificate: formData.licenseCertificate || null,
        idProof: formData.idProof || null,

        status: formData.status,
        remarks: formData.remarks || null,
        ...(selectedRecord ? { modifiedBy: 'Dr. John Doe' } : { createdBy: 'Dr. John Doe' })
      };

      const url = selectedRecord 
        ? `${API_BASE}/pharmacists/${selectedRecord.id}`
        : `${API_BASE}/pharmacists/`;
      const method = selectedRecord ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to save pharmacist');
      }

      await fetchPharmacists();
      setIsFormOpen(false);
      setSuccessMessage('This record has been updated successfully.');
      setIsSuccessOpen(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;
    
    try {
      const res = await fetch(`${API_BASE}/pharmacists/${selectedRecord.id}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) throw new Error('Failed to delete pharmacist');
      
      await fetchPharmacists();
      setIsDeleteOpen(false);
      setSuccessMessage('This record has been deleted successfully.');
      setIsSuccessOpen(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/upload/`, {
        method: 'POST',
        body: fd
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setFormData(prev => ({ ...prev, [fieldName]: data.url }));
    } catch (err) {
      alert('Failed to upload file');
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.pharmacistId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPharmacy = !filterPharmacy || record.pharmacy === filterPharmacy;
    const matchesStatus = !filterStatus || record.status === filterStatus;

    return matchesSearch && matchesPharmacy && matchesStatus;
  });

  const _totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const _page = Math.min(currentPage, _totalPages);
  const pagedRecords = filteredRecords.slice((_page - 1) * itemsPerPage, _page * itemsPerPage);

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
              <h1 className="text-3xl font-bold text-slate-800">Pharmacist Master</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>
            <div className="flex gap-3">
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
                Add Pharmacist
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Name, ID, or License..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
              <button onClick={() => setShowFilters(!showFilters)} title="Filters" className={showFilters ? "p-2 border rounded-lg transition-colors border-primary bg-primary/5 text-primary" : "p-2 border rounded-lg transition-colors border-slate-200 text-slate-500 hover:bg-slate-50"}>
                <Filter className="w-4 h-4" />
              </button>
              <button onClick={() => { setSearchTerm(''); setFilterPharmacy(''); setFilterStatus(''); }} title="Clear search & filters" className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
              <button onClick={() => exportToExcel(records, 'PharmacistMaster')} title="Export to Excel" className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select
                      value={filterPharmacy}
                      onChange={(e) => setFilterPharmacy(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Pharmacies</option>
                      <option value="Main Pharmacy">Main Pharmacy</option>
                      <option value="OPD Pharmacy">OPD Pharmacy</option>
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
                    <th className="px-4 py-3 font-medium">Pharmacist ID</th>
                    <th className="px-4 py-3 font-medium">Pharmacist Name</th>
                    <th className="px-4 py-3 font-medium">License No</th>
                    <th className="px-4 py-3 font-medium">Pharmacy</th>
                    <th className="px-4 py-3 font-medium">Mobile</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    pagedRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{record.pharmacistId}</td>
                        <td className="px-4 py-3">{record.name}</td>
                        <td className="px-4 py-3 text-slate-600">{record.licenseNumber}</td>
                        <td className="px-4 py-3 text-slate-600">{record.pharmacy}</td>
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
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No pharmacists found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
                {selectedRecord ? `Edit Pharmacist: ${selectedRecord.name}` : 'Add New Pharmacist'}
              </h1>
              <p className="text-slate-500 text-sm">Fill in the complete pharmacist profile</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Basic Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Pharmacist ID <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.pharmacistId}
                      readOnly
                      maxLength={50} className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed focus:outline-none"
                    />
                    {errors.pharmacistId && <p className="text-red-500 text-xs mt-1">{errors.pharmacistId}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Employee Code <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.employeeCode} onChange={e => setFormData({...formData, employeeCode: e.target.value})} maxLength={10} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.employeeCode ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.employeeCode && <p className="text-red-500 text-xs mt-1">{errors.employeeCode}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Pharmacist Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} maxLength={50} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.name ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">License Number <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.licenseNumber} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} maxLength={50} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.licenseNumber ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.licenseNumber && <p className="text-red-500 text-xs mt-1">{errors.licenseNumber}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Qualification <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.qualification} onChange={e => setFormData({...formData, qualification: e.target.value})} placeholder="e.g., B.Pharm, D.Pharm" maxLength={50} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.qualification ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.qualification && <p className="text-red-500 text-xs mt-1">{errors.qualification}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Pharmacy <span className="text-red-500">*</span></label>
                    <select value={formData.pharmacy} onChange={e => setFormData({...formData, pharmacy: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.pharmacy ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Pharmacy</option>
                      <option value="Main Pharmacy">Main Pharmacy</option>
                      <option value="OPD Pharmacy">OPD Pharmacy</option>
                    </select>
                    {errors.pharmacy && <p className="text-red-500 text-xs mt-1">{errors.pharmacy}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hospital <span className="text-red-500">*</span></label>
                    <select value={formData.hospital} onChange={e => setFormData({...formData, hospital: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.hospital ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Hospital</option>
                      {hospitals.map((h, i) => (
                        <option key={i} value={h.name}>{h.name}</option>
                      ))}
                    </select>
                    {errors.hospital && <p className="text-red-500 text-xs mt-1">{errors.hospital}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Branch <span className="text-red-500">*</span></label>
                    <select value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.branch ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Branch</option>
                      {branches.map((b, i) => (
                        <option key={i} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                    {errors.branch && <p className="text-red-500 text-xs mt-1">{errors.branch}</p>}
                  </div>
                </div>
              </section>

              {/* Contact Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} maxLength={10} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.mobile ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} maxLength={20} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                    <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} maxLength={250} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

              {/* Employment Details */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Employment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Joining Date</label>
                    <input type="date" value={formData.joiningDate} onChange={e => setFormData({...formData, joiningDate: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Shift</label>
                    <select value={formData.shift} onChange={e => setFormData({...formData, shift: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="">Select Shift</option>
                      <option value="Morning">Morning</option>
                      <option value="Evening">Evening</option>
                      <option value="Night">Night</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Employment Type</label>
                    <select value={formData.employmentType} onChange={e => setFormData({...formData, employmentType: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="">Select Type</option>
                      <option value="Permanent">Permanent</option>
                      <option value="Contract">Contract</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Experience (Years)</label>
                    <input type="number" min="0" value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} maxLength={50} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

              {/* Documents */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Photo', field: 'photo' }, 
                    { label: 'License Certificate', field: 'licenseCertificate' }, 
                    { label: 'ID Proof', field: 'idProof' }
                  ].map((doc, i) => (
                    <div key={i} className="border border-slate-200 rounded-xl p-4 flex flex-col gap-2 relative">
                      <label className="block text-sm font-medium text-slate-700">{doc.label}</label>
                      <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative overflow-hidden group h-32">
                        {formData[doc.field as keyof typeof formData] ? (
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-sm font-medium text-emerald-600">File Uploaded</span>
                            <img 
                              src={`${API_BASE.replace('/api/v1', '')}${formData[doc.field as keyof typeof formData]}`} 
                              alt={doc.label}
                              className="h-16 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <div className="hidden text-slate-500 text-xs truncate max-w-full">
                              {formData[doc.field as keyof typeof formData]?.split('/').pop()}
                            </div>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-slate-400 mb-2 group-hover:text-primary transition-colors" />
                            <p className="text-sm text-slate-500">Click to upload</p>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileUpload(e, doc.field)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* System */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">System</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status <span className="text-red-500">*</span></label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                    <input type="text" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} maxLength={250} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <Button variant="outline" color="secondary" onClick={() => setFormData(emptyData)} icon={RefreshCw}>
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

      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Deletion"
        maxWidth="sm"
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
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
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
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
