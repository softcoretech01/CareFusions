import { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Download, Eye, Edit2, Trash2, AlertTriangle, 
  Save, RefreshCw, CheckCircle2, XCircle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { FlagChip, ChipList } from '../../../components/ui/DetailChips';
import { exportToExcel } from '../../../utils/exportToExcel';

interface MajorOperationRecord {
  id: number;
  serialNo: number;
  operationCode: string;
  operationName: string;
  department: string;
  requirements: string;
  
  description: string;
  defaultCharge: string;
  taxApplicable: boolean;
  estimatedDuration: string;
  requiresConsent: boolean;
  requiresAdmission: boolean;
  otRequired: boolean;
  status: string;
  remarks: string;
}

const emptyData: Omit<MajorOperationRecord, 'id' | 'serialNo'> = {
  operationCode: '',
  operationName: '',
  department: '',
  requirements: '',
  
  description: '',
  defaultCharge: '',
  taxApplicable: true,
  estimatedDuration: '',
  requiresConsent: false,
  requiresAdmission: false,
  otRequired: false,
  status: 'Active',
  remarks: ''
};

const API_BASE = import.meta.env.VITE_API_URL as string;

const mapApiToRecord = (item: any): MajorOperationRecord => ({
  id:                item.id,
  serialNo:          item.serialNo,
  operationCode:     item.operationCode,
  operationName:     item.operationName,
  department:        item.department,
  requirements:      item.medications || '',
  
  description:       item.description || '',
  defaultCharge:     item.defaultCharge || '0',
  taxApplicable:     Boolean(item.taxApplicable),
  estimatedDuration: item.estimatedDuration || '',
  requiresConsent:   Boolean(item.requiresConsent),
  requiresAdmission: Boolean(item.requiresAdmission),
  otRequired:        Boolean(item.otRequired),
  status:            item.status,
  remarks:           item.remarks || ''
});

export const MajorOperationMaster = () => {
  const [records, setRecords] = useState<MajorOperationRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Dynamic Dropdowns
  const [departments, setDepartments] = useState<{departmentName: string}[]>([]);
  
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MajorOperationRecord | null>(null);
  const [formData, setFormData] = useState<Omit<MajorOperationRecord, 'id' | 'serialNo'>>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isErrorOpen, setIsErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchMajorOperations = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/major-operations/`);
      if (!res.ok) throw new Error('Failed to fetch Major Operation records');
      const data = await res.json();
      setRecords(data.map(mapApiToRecord));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [dRes] = await Promise.all([
        fetch(`${API_BASE}/departments/`),
      ]);
      if (dRes.ok) setDepartments(await dRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMajorOperations();
    fetchDropdowns();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.operationName.trim()) newErrors.operationName = 'Major Operation Name is required';
    if (!formData.department) newErrors.department = 'Department is required';
    
    if (!formData.defaultCharge.trim()) newErrors.defaultCharge = 'Default Charge is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    const nextId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
    setFormData({
      ...emptyData,
      operationCode: `MAJ-${nextId.toString().padStart(3, '0')}`
    });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: MajorOperationRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleView = (record: MajorOperationRecord) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };

  const handleDeleteRequest = (record: MajorOperationRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const handleSaveForm = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const payload = {
        operationCode:     formData.operationCode,
        operationName:     formData.operationName,
        department:        formData.department,
        medications:       formData.requirements,
        procedures:        "",
        equipment:         "",
        
        description:       formData.description || null,
        defaultCharge:     formData.defaultCharge || "0",
        taxApplicable:     formData.taxApplicable,
        estimatedDuration: formData.estimatedDuration || "0",
        requiresConsent:   formData.requiresConsent,
        requiresAdmission: formData.requiresAdmission,
        otRequired:        formData.otRequired,
        status:            formData.status,
        remarks:           formData.remarks || null,
        ...(selectedRecord ? { modifiedBy: 'Dr. John Doe' } : { createdBy: 'Dr. John Doe' }),
      };

      const url = selectedRecord 
        ? `${API_BASE}/major-operations/${selectedRecord.id}`
        : `${API_BASE}/major-operations/`;
      const method = selectedRecord ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to save Major Operation');
      }

      await fetchMajorOperations();
      setIsFormOpen(false);
      setSuccessMessage('This record has been updated successfully.');
      setIsSuccessOpen(true);
    } catch (err: any) {
      setErrorMessage(err.message);
      setIsErrorOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;
    try {
      const res = await fetch(`${API_BASE}/major-operations/${selectedRecord.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete Major Operation');
      await fetchMajorOperations();
      setIsDeleteOpen(false);
      setSuccessMessage('This record has been deleted successfully.');
      setIsSuccessOpen(true);
    } catch (err: any) {
      setErrorMessage(err.message);
      setIsErrorOpen(true);
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.operationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.operationCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = !filterDepartment || record.department === filterDepartment;

    return matchesSearch && matchesDepartment;
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
              <h1 className="text-3xl font-bold text-slate-800">Major Operation</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>
            <div className="flex gap-3">
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
                Add Major Operation
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Major Operation Name or Code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
              <button onClick={() => setShowFilters(!showFilters)} title="Filters" className={showFilters ? "p-2 border rounded-lg transition-colors border-primary bg-primary/5 text-primary" : "p-2 border rounded-lg transition-colors border-slate-200 text-slate-500 hover:bg-slate-50"}>
                <Filter className="w-4 h-4" />
              </button>
              <button onClick={() => { setSearchTerm(''); setFilterDepartment('');  }} title="Clear search & filters" className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
              <button onClick={() => exportToExcel(records, 'MajorOperationMaster')} title="Export to Excel" className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
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
                      value={filterDepartment}
                      onChange={(e) => setFilterDepartment(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Departments</option>
                      {departments.map(d => <option key={d.departmentName} value={d.departmentName}>{d.departmentName}</option>)}
                    </select>
                    
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium w-16">S.No</th>
                    <th className="px-4 py-3 font-medium">Major Operation Name</th>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium text-right">Charge (₹)</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    pagedRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-500">{record.serialNo}</td>
                        <td className="px-4 py-3">{record.operationName}</td>
                        <td className="px-4 py-3 text-slate-600">{record.department}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">{record.defaultCharge}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handleView(record)}
                              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
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
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        {isLoading ? 'Loading records...' : 'No Major Operation records found matching your criteria.'}
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
                {selectedRecord ? `Edit Major Operation: ${selectedRecord.operationName}` : 'Add New Major Operation'}
              </h1>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Basic Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Major Operation Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.operationName} onChange={e => setFormData({...formData, operationName: e.target.value})} maxLength={100} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.operationName ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.operationName && <p className="text-red-500 text-xs mt-1">{errors.operationName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department <span className="text-red-500">*</span></label>
                    <select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.department ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d.departmentName} value={d.departmentName}>{d.departmentName}</option>)}
                    </select>
                    {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} maxLength={250} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

              {/* Billing Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Billing Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Default Charge (₹) <span className="text-red-500">*</span></label>
                    <input type="number" min="0" value={formData.defaultCharge} onChange={e => setFormData({...formData, defaultCharge: e.target.value})} maxLength={50} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.defaultCharge ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.defaultCharge && <p className="text-red-500 text-xs mt-1">{errors.defaultCharge}</p>}
                  </div>
                  <div className="flex items-center gap-2 mt-7">
                    <input type="checkbox" id="taxApplicable" checked={formData.taxApplicable} onChange={e => setFormData({...formData, taxApplicable: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                    <label htmlFor="taxApplicable" className="text-sm text-slate-700">Tax Applicable</label>
                  </div>
                </div>
              </section>

              {/* Clinical Details */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Clinical Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Duration (Minutes)</label>
                    <input type="number" min="0" value={formData.estimatedDuration} onChange={e => setFormData({...formData, estimatedDuration: e.target.value})} maxLength={50} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="flex flex-col gap-3 justify-center">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="requiresConsent" checked={formData.requiresConsent} onChange={e => setFormData({...formData, requiresConsent: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                      <label htmlFor="requiresConsent" className="text-sm text-slate-700">Requires Patient Consent</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="requiresAdmission" checked={formData.requiresAdmission} onChange={e => setFormData({...formData, requiresAdmission: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                      <label htmlFor="requiresAdmission" className="text-sm text-slate-700">Requires Admission</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="otRequired" checked={formData.otRequired} onChange={e => setFormData({...formData, otRequired: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                      <label htmlFor="otRequired" className="text-sm text-slate-700">OT (Operation Theater) Required</label>
                    </div>
                  </div>
                </div>
              </section>

              {/* Requirements */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Requirements</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Summary of Requirements</label>
                    <textarea 
                      value={formData.requirements} 
                      onChange={e => setFormData({...formData, requirements: e.target.value})} 
                      maxLength={500} 
                      rows={3}
                      placeholder="Enter required medications, procedures, and equipment..."
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                  </div>
                </div>
              </section>

              {/* System */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">System</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <Button variant="filled" color="primary" onClick={handleSaveForm} icon={Save} isLoading={isSaving}>
                  {selectedRecord ? 'Update' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* View Modal */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title="Major Operation Details"
        maxWidth="2xl"
      >
        {selectedRecord && (
          <div className="space-y-6">
            {/* Identity */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{selectedRecord.operationName}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedRecord.operationCode}
                  {selectedRecord.department ? ` · ${selectedRecord.department}` : ''}
                </p>
              </div>
              <span className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold">
                S.No {selectedRecord.serialNo}
              </span>
            </div>

            {/* Figures */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-xs text-slate-400 block mb-1">Charge</span>
                <span className="text-lg font-bold text-slate-800">
                  ₹{Number(selectedRecord.defaultCharge || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-xs text-slate-400 block mb-1">Duration</span>
                <span className="text-lg font-bold text-slate-800">
                  {selectedRecord.estimatedDuration ? `${selectedRecord.estimatedDuration} min` : '—'}
                </span>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-xs text-slate-400 block mb-1">Tax</span>
                <span className="text-lg font-bold text-slate-800">
                  {selectedRecord.taxApplicable ? 'Applicable' : 'Exempt'}
                </span>
              </div>
            </div>

            {/* Requirements */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Requirements</span>
              <div className="flex flex-wrap gap-2">
                <FlagChip label="Patient Consent" on={selectedRecord.requiresConsent} />
                <FlagChip label="Admission" on={selectedRecord.requiresAdmission} />
                <FlagChip label="Operation Theater" on={selectedRecord.otRequired} />
              </div>
            </div>

            {/* Linked masters */}
            <div className="grid grid-cols-1 gap-5 pt-4 border-t border-slate-100">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Requirements Summary</span>
                <span className="text-sm text-slate-700 whitespace-pre-wrap">{selectedRecord.requirements || '—'}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-slate-100">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Description</span>
                <span className="text-sm text-slate-700">{selectedRecord.description || '—'}</span>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">Remarks</span>
                <span className="text-sm text-slate-700">{selectedRecord.remarks || '—'}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

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
            Are you sure you want to delete Major Operation <span className="font-semibold text-slate-700">{selectedRecord?.operationName}</span>?
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

      {/* Error Modal */}
      <Modal
        isOpen={isErrorOpen}
        onClose={() => setIsErrorOpen(false)}
        title="Error"
        maxWidth="sm"
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
            <XCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Error</h3>
          <p className="text-slate-500 text-sm mb-6">
            {errorMessage}
          </p>
          
          <div className="flex items-center justify-center w-full">
            <Button variant="filled" color="primary" className="w-full" onClick={() => setIsErrorOpen(false)}>
              OK
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};


