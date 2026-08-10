import { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, 
  Save, RefreshCw, CheckCircle2, XCircle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

interface ConsultationTypeRecord {
  id: number;
  consultationCode: string;
  consultationType: string;
  description: string;
  duration: string;
  status: string;
  remarks: string;
}

const emptyData: Omit<ConsultationTypeRecord, 'id'> = {
  consultationCode: '',
  consultationType: '',
  description: '',
  duration: '',
  status: 'Active',
  remarks: ''
};

const API_BASE = import.meta.env.VITE_API_URL as string;

const mapApiToRecord = (item: any): ConsultationTypeRecord => ({
  id:                item.id,
  consultationCode:  item.consultationCode,
  consultationType:  item.consultationType,
  description:       item.description || '',
  duration:          item.duration || '',
  status:            item.status,
  remarks:           item.remarks || ''
});

export const ConsultationTypeMaster = () => {
  const [records, setRecords] = useState<ConsultationTypeRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ConsultationTypeRecord | null>(null);
  const [formData, setFormData] = useState<Omit<ConsultationTypeRecord, 'id'>>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isErrorOpen, setIsErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchConsultationTypes = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/consultation-types/`);
      if (!res.ok) throw new Error('Failed to fetch consultation type records');
      const data = await res.json();
      setRecords(data.map(mapApiToRecord));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultationTypes();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.consultationCode.trim()) newErrors.consultationCode = 'Consultation Code is required';
    if (!formData.consultationType.trim()) newErrors.consultationType = 'Consultation Type is required';
    if (!formData.duration.trim()) newErrors.duration = 'Duration is required';
    else if (Number(formData.duration) <= 0) newErrors.duration = 'Duration must be greater than zero';

    // Uniqueness checks
    if (records.some(r => r.consultationCode.toLowerCase() === formData.consultationCode.toLowerCase() && r.id !== selectedRecord?.id)) {
      newErrors.consultationCode = 'Consultation Code must be unique';
    }
    if (records.some(r => r.consultationType.toLowerCase() === formData.consultationType.toLowerCase() && r.id !== selectedRecord?.id)) {
      newErrors.consultationType = 'Consultation Type must be unique';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = async () => {
    let nextCode = '';
    try {
      const res = await fetch(`${API_BASE}/consultation-types/next-code`);
      if (res.ok) {
        const data = await res.json();
        nextCode = data.nextCode;
      }
    } catch (err) {
      console.error("Failed to fetch next code", err);
    }
    setSelectedRecord(null);
    setFormData({ ...emptyData, consultationCode: nextCode });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: ConsultationTypeRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: ConsultationTypeRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const handleSaveForm = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const payload = {
        consultationCode:  formData.consultationCode,
        consultationType:  formData.consultationType,
        description:       formData.description || null,
        duration:          formData.duration,
        status:            formData.status,
        remarks:           formData.remarks || null,
        ...(selectedRecord ? { modifiedBy: 'Dr. John Doe' } : { createdBy: 'Dr. John Doe' }),
      };

      const url = selectedRecord 
        ? `${API_BASE}/consultation-types/${selectedRecord.id}`
        : `${API_BASE}/consultation-types/`;
      const method = selectedRecord ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to save consultation type');
      }

      await fetchConsultationTypes();
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
      const res = await fetch(`${API_BASE}/consultation-types/${selectedRecord.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete consultation type');
      await fetchConsultationTypes();
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
      record.consultationType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.consultationCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !filterStatus || record.status === filterStatus;

    return matchesSearch && matchesStatus;
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
              <h1 className="text-3xl font-bold text-slate-800">Consultation Type Master</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>
            <div className="flex gap-3">
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
                Add Consultation Type
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Type Name or Code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
              <button onClick={() => setShowFilters(!showFilters)} title="Filters" className={showFilters ? "p-2 border rounded-lg transition-colors border-primary bg-primary/5 text-primary" : "p-2 border rounded-lg transition-colors border-slate-200 text-slate-500 hover:bg-slate-50"}>
                <Filter className="w-4 h-4" />
              </button>
              <button onClick={() => { setSearchTerm(''); setFilterStatus(''); }} title="Clear search & filters" className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
              <button onClick={() => exportToExcel(records, 'ConsultationTypeMaster')} title="Export to Excel" className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
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
                    <th className="px-4 py-3 font-medium">Consultation Code</th>
                    <th className="px-4 py-3 font-medium">Consultation Type</th>
                    <th className="px-4 py-3 font-medium">Duration (Min)</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    pagedRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{record.consultationCode}</td>
                        <td className="px-4 py-3">{record.consultationType}</td>
                        <td className="px-4 py-3 text-slate-600">{record.duration} mins</td>
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
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        {isLoading ? 'Loading records...' : 'No consultation types found matching your criteria.'}
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
                {selectedRecord ? `Edit Consultation Type: ${selectedRecord.consultationType}` : 'Add New Consultation Type'}
              </h1>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Basic Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Consultation Code <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.consultationCode}
                      readOnly
                      maxLength={10} className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Consultation Type <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.consultationType} onChange={e => setFormData({...formData, consultationType: e.target.value})} maxLength={50} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.consultationType ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.consultationType && <p className="text-red-500 text-xs mt-1">{errors.consultationType}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} maxLength={250} rows={1} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

              {/* Consultation Details */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Consultation Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration (Minutes) <span className="text-red-500">*</span></label>
                    <input type="number" min="1" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} maxLength={50} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.duration ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.duration && <p className="text-red-500 text-xs mt-1">{errors.duration}</p>}
                  </div>
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
            Are you sure you want to delete Consultation Type <span className="font-semibold text-slate-700">{selectedRecord?.consultationType}</span>?
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


