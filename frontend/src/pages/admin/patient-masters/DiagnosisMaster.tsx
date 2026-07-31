import { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, 
  Save, RefreshCw, CheckCircle2, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

interface DiagnosisRecord {
  id: number;
  diagnosisCode: string;
  diagnosisName: string;
  icdVersion: string;
  category: string;
  description: string;
  chronicDisease: boolean;
  notifiableDisease: boolean;
  status: string;
  remarks: string;
}

const emptyData: Omit<DiagnosisRecord, 'id'> = {
  diagnosisCode: '',
  diagnosisName: '',
  icdVersion: 'ICD-10',
  category: '',
  description: '',
  chronicDisease: false,
  notifiableDisease: false,
  status: 'Active',
  remarks: ''
};

const mockData: DiagnosisRecord[] = [];

const API_BASE = import.meta.env.VITE_API_URL as string;

const mapApiToRecord = (item: any): DiagnosisRecord => ({
  id:                item.id,
  diagnosisCode:     item.diagnosisCode,
  diagnosisName:     item.diagnosisName,
  icdVersion:        item.icdVersion,
  category:          item.category,
  description:       item.description || '',
  chronicDisease:    Boolean(item.chronicDisease),
  notifiableDisease: Boolean(item.notifiableDisease),
  status:            item.status,
  remarks:           item.remarks || ''
});

export const DiagnosisMaster = () => {
  const [records, setRecords] = useState<DiagnosisRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterIcdVersion, setFilterIcdVersion] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DiagnosisRecord | null>(null);
  const [formData, setFormData] = useState<Omit<DiagnosisRecord, 'id'>>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isErrorOpen, setIsErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [icdVersionsList, setIcdVersionsList] = useState<string[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);

  const fetchLookups = async () => {
    try {
      const [icdRes, catRes] = await Promise.all([
        fetch(`${API_BASE}/diagnosis/icd-versions`),
        fetch(`${API_BASE}/diagnosis/categories`)
      ]);
      if (icdRes.ok) setIcdVersionsList(await icdRes.json());
      if (catRes.ok) setCategoriesList(await catRes.json());
    } catch (err) {
      console.error('Failed to fetch lookups:', err);
    }
  };

  const fetchDiagnosis = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/diagnosis/`);
      if (!res.ok) throw new Error('Failed to fetch diagnosis records');
      const data = await res.json();
      setRecords(data.map(mapApiToRecord));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLookups();
    fetchDiagnosis();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.diagnosisCode.trim()) newErrors.diagnosisCode = 'Diagnosis Code is required';
    if (!formData.diagnosisName.trim()) newErrors.diagnosisName = 'Diagnosis Name is required';
    if (!formData.icdVersion) newErrors.icdVersion = 'ICD Version is required';
    if (!formData.category) newErrors.category = 'Category is required';

    // Uniqueness checks
    if (records.some(r => r.diagnosisCode === formData.diagnosisCode && r.id !== selectedRecord?.id)) {
      newErrors.diagnosisCode = 'Diagnosis Code must be unique';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    const nextId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
    setFormData({
      ...emptyData,
      diagnosisCode: `DIA-${nextId.toString().padStart(3, '0')}`
    });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: DiagnosisRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: DiagnosisRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const handleSaveForm = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const payload = {
        diagnosisCode:     formData.diagnosisCode,
        diagnosisName:     formData.diagnosisName,
        icdVersion:        formData.icdVersion,
        category:          formData.category,
        description:       formData.description || null,
        chronicDisease:    formData.chronicDisease,
        notifiableDisease: formData.notifiableDisease,
        status:            formData.status,
        remarks:           formData.remarks || null,
        ...(selectedRecord ? { modifiedBy: 'Dr. John Doe' } : { createdBy: 'Dr. John Doe' }),
      };

      const url = selectedRecord 
        ? `${API_BASE}/diagnosis/${selectedRecord.id}`
        : `${API_BASE}/diagnosis/`;
      const method = selectedRecord ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to save diagnosis');
      }

      await fetchDiagnosis();
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
      const res = await fetch(`${API_BASE}/diagnosis/${selectedRecord.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete diagnosis');
      await fetchDiagnosis();
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
      record.diagnosisName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.diagnosisCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesIcd = !filterIcdVersion || record.icdVersion === filterIcdVersion;
    const matchesCategory = !filterCategory || record.category === filterCategory;
    const matchesStatus = !filterStatus || record.status === filterStatus;

    return matchesSearch && matchesIcd && matchesCategory && matchesStatus;
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
              <h1 className="text-3xl font-bold text-slate-800">Diagnosis Master</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" icon={Download} onClick={() => exportToExcel(records, 'DiagnosisMaster')}>Export</Button>
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
                Add Diagnosis
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Code or Diagnosis Name..."
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
                      value={filterIcdVersion}
                      onChange={(e) => setFilterIcdVersion(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All ICD Versions</option>
                      {icdVersionsList.map(icd => (
                        <option key={icd} value={icd}>{icd}</option>
                      ))}
                    </select>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Categories</option>
                      {categoriesList.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
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
                    <th className="px-4 py-3 font-medium">Diagnosis Code</th>
                    <th className="px-4 py-3 font-medium">Diagnosis Name</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">ICD Version</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{record.diagnosisCode}</td>
                        <td className="px-4 py-3">{record.diagnosisName}</td>
                        <td className="px-4 py-3 text-slate-600">{record.category}</td>
                        <td className="px-4 py-3 text-slate-600">{record.icdVersion}</td>
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
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No diagnosis records found matching your criteria.
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
                {selectedRecord ? `Edit Diagnosis: ${selectedRecord.diagnosisCode}` : 'Add New Diagnosis'}
              </h1>
              <p className="text-slate-500 text-sm">Fill in the clinical diagnosis details</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Basic Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Diagnosis Code <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.diagnosisCode} readOnly className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed focus:outline-none" />
                    {errors.diagnosisCode && <p className="text-red-500 text-xs mt-1">{errors.diagnosisCode}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Diagnosis Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.diagnosisName} onChange={e => setFormData({...formData, diagnosisName: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.diagnosisName ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.diagnosisName && <p className="text-red-500 text-xs mt-1">{errors.diagnosisName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ICD Version <span className="text-red-500">*</span></label>
                    <select value={formData.icdVersion} onChange={e => setFormData({...formData, icdVersion: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.icdVersion ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Version</option>
                      {icdVersionsList.map(icd => (
                        <option key={icd} value={icd}>{icd}</option>
                      ))}
                    </select>
                    {errors.icdVersion && <p className="text-red-500 text-xs mt-1">{errors.icdVersion}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category <span className="text-red-500">*</span></label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.category ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Category</option>
                      {categoriesList.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

              {/* Clinical Details */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Clinical Details</h3>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="chronicDisease" checked={formData.chronicDisease} onChange={e => setFormData({...formData, chronicDisease: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                    <label htmlFor="chronicDisease" className="text-sm text-slate-700">Chronic Disease</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="notifiableDisease" checked={formData.notifiableDisease} onChange={e => setFormData({...formData, notifiableDisease: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                    <label htmlFor="notifiableDisease" className="text-sm text-slate-700">Notifiable Disease</label>
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
                    <input type="text" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
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
            Are you sure you want to delete Diagnosis <span className="font-semibold text-slate-700">{selectedRecord?.diagnosisName}</span>?
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
