import { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle,
  Save, RefreshCw, Upload, CheckCircle2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

// A const object rather than an enum: enums emit runtime code, which this
// project's `erasableSyntaxOnly` setting disallows. Object.values() is unchanged.
export const LaboratoryEnum = {
  MAIN_LAB: 'Main Lab',
  PATHOLOGY_LAB: 'Pathology Lab',
  MICROBIOLOGY_LAB: 'Microbiology Lab',
  BIOCHEMISTRY_LAB: 'Biochemistry Lab',
} as const;
export type LaboratoryEnum = typeof LaboratoryEnum[keyof typeof LaboratoryEnum];

interface LabTechnicianRecord {
  id: number;
  technicianId: string;
  name: string;
  qualification: string;
  department: string;
  laboratory: string;
  hospital: string;
  branch: string;
  mobile: string;
  email: string;
  address: string;
  joiningDate: string;
  experience: string;
  shift: string;
  manager: string;
  remarks: string;
  profilePhoto?: string;
  qualificationCertificate?: string;
  idProof?: string;
  licenseCertificate?: string;
}

const emptyData: Omit<LabTechnicianRecord, 'id'> = {
  technicianId: '',
  name: '',
  qualification: '',
  department: '',
  laboratory: '',
  hospital: '',
  branch: '',
  mobile: '',
  email: '',
  address: '',
  joiningDate: '',
  experience: '',
  shift: '',
  manager: '',
  remarks: ''
};

const API_BASE = import.meta.env.VITE_API_URL as string;

const mapApiToRecord = (item: any): LabTechnicianRecord => ({
  id: item.id,
  technicianId: item.technicianId as string,
  name: item.name as string,
  qualification: item.qualification as string,
  department: item.department as string,
  laboratory: item.laboratory as string,
  hospital: item.hospital as string || '',
  branch: item.branch as string || '',
  mobile: item.mobile as string,
  email: item.email as string || '',
  address: item.address as string || '',
  joiningDate: item.joiningDate ? String(item.joiningDate) : '',
  experience: item.experience != null ? String(item.experience) : '',
  shift: item.shift as string,
  manager: item.manager as string || '',
  remarks: item.remarks as string || '',
  profilePhoto: item.profilePhoto as string || '',
  qualificationCertificate: item.qualificationCertificate as string || '',
  idProof: item.idProof as string || '',
});

export const LabTechnicianMaster = () => {
  const [records, setRecords] = useState<LabTechnicianRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterLaboratory, setFilterLaboratory] = useState('');
  const [filterShift, setFilterShift] = useState('');
  
  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<LabTechnicianRecord | null>(null);
  const [formData, setFormData] = useState<Omit<LabTechnicianRecord, 'id'> & { technicianCode?: string; profilePhoto?: string; qualificationCertificate?: string; idProof?: string }>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Dropdowns
  const [departments, setDepartments] = useState<{ departmentName: string }[]>([]);

  const fetchTechnicians = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/lab-technicians/`);
      if (!res.ok) throw new Error('Failed to fetch lab technicians');
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
      const [dRes] = await Promise.all([
        fetch(`${API_BASE}/departments/`)
      ]);
      if (dRes.ok) {
        const dData = await dRes.json();
        setDepartments(dData);
      }
    } catch (err) {
      console.error('Failed to fetch dropdowns:', err);
    }
  };

  useEffect(() => {
    fetchTechnicians();
    fetchDropdowns();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.technicianId.trim()) newErrors.technicianId = 'Technician ID is required';    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.qualification.trim()) newErrors.qualification = 'Qualification is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.laboratory) newErrors.laboratory = 'Laboratory is required';
        if (!formData.mobile.trim()) newErrors.mobile = 'Mobile is required';
    if (!formData.shift) newErrors.shift = 'Shift is required';

    // Uniqueness checks
    if (records.some(r => r.technicianId === formData.technicianId && r.id !== selectedRecord?.id)) {
      newErrors.technicianId = 'Technician ID must be unique';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = async () => {
    let nextCode = '';
    try {
      const res = await fetch(`${API_BASE}/lab-technicians/next-code`);
      if (res.ok) {
        const data = await res.json();
        nextCode = data.nextCode;
      }
    } catch (err) {
      console.error("Failed to fetch next code", err);
    }
    setSelectedRecord(null);
    setFormData({ ...emptyData, technicianId: nextCode });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: LabTechnicianRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: LabTechnicianRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const handleSaveForm = async () => {
    if (!validateForm()) return;
    setIsSaving(true);

    try {
      const payload = {
        technicianId: formData.technicianId,
        name: formData.name.trim(),
        qualification: formData.qualification,
        department: formData.department,
        laboratory: formData.laboratory,
        hospital: formData.hospital || null,
        branch: formData.branch || null,
        mobile: formData.mobile,
        email: formData.email || null,
        address: formData.address || null,
        joiningDate: formData.joiningDate || null,
        experience: formData.experience ? Number(formData.experience) : null,
        shift: formData.shift,
        manager: formData.manager || null,

        profilePhoto: formData.profilePhoto || null,
        qualificationCertificate: formData.qualificationCertificate || null,
        idProof: formData.idProof || null,
        remarks: formData.remarks || null,
        ...(selectedRecord ? { modifiedBy: 'Dr. John Doe' } : { createdBy: 'Dr. John Doe' })
      };

      const url = selectedRecord
        ? `${API_BASE}/lab-technicians/${selectedRecord.id}`
        : `${API_BASE}/lab-technicians/`;
      const method = selectedRecord ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to save lab technician');
      }

      await fetchTechnicians();
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
      const res = await fetch(`${API_BASE}/lab-technicians/${selectedRecord.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to delete lab technician');

      await fetchTechnicians();
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
      record.technicianId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLaboratory = !filterLaboratory || record.laboratory === filterLaboratory;
    const matchesShift = !filterShift || record.shift === filterShift;

    return matchesSearch && matchesLaboratory && matchesShift;
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Lab Technician</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>
            <div className="flex gap-3">
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
                Add Technician
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
                <button onClick={() => { setSearchTerm(''); setFilterLaboratory(''); setFilterShift(''); }} title="Clear search & filters" className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <button onClick={() => exportToExcel(records, 'LabTechnicianMaster')} title="Export to Excel" className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select
                      value={filterLaboratory}
                      onChange={(e) => setFilterLaboratory(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Laboratories</option>
                      {Object.values(LaboratoryEnum).map((lab) => (
                        <option key={lab} value={lab}>{lab}</option>
                      ))}
                    </select>
                    <select
                      value={filterShift}
                      onChange={(e) => setFilterShift(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Shifts</option>
                      <option value="Morning">Morning</option>
                      <option value="Evening">Evening</option>
                      <option value="Night">Night</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Technician ID</th>
                    <th className="px-4 py-3 font-medium">Technician Name</th>
                    <th className="px-4 py-3 font-medium">Laboratory</th>
                    <th className="px-4 py-3 font-medium">Qualification</th>
                    <th className="px-4 py-3 font-medium">Shift</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    pagedRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{record.technicianId}</td>
                        <td className="px-4 py-3">{record.name}</td>
                        <td className="px-4 py-3 text-slate-600">{record.laboratory}</td>
                        <td className="px-4 py-3 text-slate-600">{record.qualification}</td>
                        <td className="px-4 py-3 text-slate-600">{record.shift}</td>
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
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        {isLoading ? 'Loading records...' : 'No lab technicians found matching your criteria.'}
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
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {selectedRecord ? `Edit Technician: ${selectedRecord.name}` : 'Add New Technician'}
              </h1>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Basic Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Technician ID <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.technicianId}
                      readOnly
                      maxLength={50} className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Technician Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} maxLength={50} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.name ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Qualification <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.qualification} onChange={e => setFormData({ ...formData, qualification: e.target.value })} placeholder="e.g., B.Sc MLT, DMLT" maxLength={50} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.qualification ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.qualification && <p className="text-red-500 text-xs mt-1">{errors.qualification}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department <span className="text-red-500">*</span></label>
                    <select value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.department ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Department</option>
                      {departments.map((d, i) => (
                        <option key={i} value={d.departmentName}>{d.departmentName}</option>
                      ))}
                    </select>
                    {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Laboratory <span className="text-red-500">*</span></label>
                    <select value={formData.laboratory} onChange={e => setFormData({ ...formData, laboratory: e.target.value })} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.laboratory ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Laboratory</option>
                      {Object.values(LaboratoryEnum).map((lab) => (
                        <option key={lab} value={lab}>{lab}</option>
                      ))}
                    </select>
                    {errors.laboratory && <p className="text-red-500 text-xs mt-1">{errors.laboratory}</p>}
                  </div>
                </div>
              </section>

              {/* Contact Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} maxLength={10} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.mobile ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} maxLength={20} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                    <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} maxLength={250} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

              {/* Employment Details */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Employment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Shift <span className="text-red-500">*</span></label>
                    <select value={formData.shift} onChange={e => setFormData({ ...formData, shift: e.target.value })} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.shift ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Shift</option>
                      <option value="Morning">Morning</option>
                      <option value="Evening">Evening</option>
                      <option value="Night">Night</option>
                    </select>
                    {errors.shift && <p className="text-red-500 text-xs mt-1">{errors.shift}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Experience (Years)</label>
                    <input type="number" min="0" value={formData.experience} onChange={e => setFormData({ ...formData, experience: e.target.value })} maxLength={50} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Reporting Manager</label>
                    <input type="text" value={formData.manager} onChange={e => setFormData({ ...formData, manager: e.target.value })} maxLength={50} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

              {/* Documents */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: 'Profile Photo', field: 'profilePhoto' },
                    { label: 'Qualification Certificate', field: 'qualificationCertificate' },
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
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0"
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
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                    <input type="text" value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} maxLength={250} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-6 flex items-center justify-between pt-6 border-t border-slate-100 p-4 bg-slate-50/50">
              <Button variant="outline" color="secondary" onClick={() => setFormData(selectedRecord ? selectedRecord : { ...emptyData, technicianCode: formData.technicianCode })} icon={RefreshCw}>
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


