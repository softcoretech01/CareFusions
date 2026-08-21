import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Download, Edit2, Trash2, AlertTriangle, X, Power, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Pagination } from '../../../components/ui/Pagination';
import { usePagination } from '../../../hooks/usePagination';
import { exportToExcel } from '../../../utils/exportToExcel';
import { lettersOnly, freeText, LIMITS } from '../../../utils/inputRules';

export interface DoctorSpecializationRecord {
  id: number;
  specializationCode: string;
  specializationName: string;
  departmentName: string;
  description: string;
  status: string;
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
}

const emptyData: Omit<DoctorSpecializationRecord, 'id'> = {
  specializationCode: '',
  specializationName: '',
  departmentName: '',
  description: '',
  status: 'Active',
};

const API_BASE = import.meta.env.VITE_API_URL as string;

const mapApiToRecord = (item: any): DoctorSpecializationRecord => ({
  id:                 item.id,
  specializationCode: item.specializationCode,
  specializationName: item.specializationName,
  departmentName:     item.departmentName || '',
  description:        item.description || '',
  status:             item.status,
  createdBy:          item.createdBy,
  createdDate:        item.createdDate,
  updatedBy:          item.updatedBy,
  updatedDate:        item.updatedDate,
});

export const DoctorSpecializationMaster = () => {
  const [records, setRecords] = useState<DoctorSpecializationRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DoctorSpecializationRecord | null>(null);
  const [formData, setFormData] = useState<Omit<DoctorSpecializationRecord, 'id'>>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Departments come from the department master so the two lists agree.
  const [departments, setDepartments] = useState<string[]>([]);

  const fetchSpecializations = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/doctor-specializations/`);
      if (!res.ok) throw new Error('Failed to load specializations');
      setRecords((await res.json()).map(mapApiToRecord));
    } catch (err: any) {
      setApiError(err.message || 'Failed to load specializations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpecializations();
    fetch(`${API_BASE}/departments/`)
      .then(r => (r.ok ? r.json() : []))
      .then((rows: any[]) => setDepartments(
        rows.filter(d => d.status === 'Active').map(d => d.departmentName).filter(Boolean)
      ))
      .catch(() => { /* the department hint is optional */ });
  }, [fetchSpecializations]);

  const validateForm = () => {
    const next: Record<string, string> = {};
    const name = formData.specializationName.trim();
    if (!name) next.specializationName = 'Specialization Name is required';
    if (records.some(r => r.specializationName.trim().toLowerCase() === name.toLowerCase()
                          && r.id !== selectedRecord?.id)) {
      next.specializationName = 'Specialization Name must be unique';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreateNew = async () => {
    setSelectedRecord(null);
    setErrors({});
    let code = '';
    try {
      const res = await fetch(`${API_BASE}/doctor-specializations/next-code`);
      if (res.ok) code = (await res.json()).specializationCode || '';
    } catch { /* the form works without the preview */ }
    setFormData({ ...emptyData, specializationCode: code });
    setIsFormOpen(true);
  };

  const handleEdit = (record: DoctorSpecializationRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleToggleStatus = async (record: DoctorSpecializationRecord) => {
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/doctor-specializations/${record.id}/toggle-status`,
                              { method: 'PATCH' });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed to change status');
      await fetchSpecializations();
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const handleDeleteRequest = (record: DoctorSpecializationRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/doctor-specializations/${selectedRecord.id}`,
                              { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed to delete specialization');
      await fetchSpecializations();
      setIsDeleteOpen(false);
      setSelectedRecord(null);
    } catch (err: any) {
      // The server refuses while doctors are still assigned; show why.
      setIsDeleteOpen(false);
      setApiError(err.message);
    }
  };

  const handleSaveForm = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const payload = {
        specializationName: formData.specializationName.trim(),
        departmentName:     formData.departmentName || null,
        description:        formData.description?.trim() || null,
        status:             formData.status,
        ...(selectedRecord ? { updatedBy: 'Admin' } : { createdBy: 'Admin' }),
      };
      const res = await fetch(
        selectedRecord
          ? `${API_BASE}/doctor-specializations/${selectedRecord.id}`
          : `${API_BASE}/doctor-specializations/`,
        { method: selectedRecord ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload) }
      );
      if (!res.ok) {
        const body = await res.json();
        throw new Error(Array.isArray(body.detail)
          ? body.detail.map((d: any) => d.msg).join(', ')
          : body.detail || 'Failed to save specialization');
      }
      await fetchSpecializations();
      setIsFormOpen(false);
    } catch (err: any) {
      setErrors(prev => ({ ...prev, form: err.message }));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRecords = records.filter(r => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      r.specializationName.toLowerCase().includes(q) ||
      r.specializationCode.toLowerCase().includes(q) ||
      r.departmentName.toLowerCase().includes(q);
    return matchesSearch;
  });

  const { page, setPage, pageSize, total, paged } = usePagination(filteredRecords);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col relative"
    >
      {!isFormOpen ? (
        <>
          {/* A failed load or a refused delete used to be invisible. */}
          {apiError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Doctor Specialization</h1>
              <p className="text-slate-500 text-xs">
                The controlled list the Specialization field on Doctor Master picks from
              </p>
            </div>
            <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
              Add Specialization
            </Button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Name, Code or Department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setSearchTerm(''); }} title="Clear search & filters" className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <button onClick={() => exportToExcel(records, 'DoctorSpecializationMaster')} title="Export to Excel" className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 sticky top-0 backdrop-blur-sm z-10">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-16">S.No</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-28">Code</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Specialization</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paged.map((row, index) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-slate-500">
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-500">{row.specializationCode}</td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-900">{row.specializationName}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{row.departmentName || '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 max-w-xs truncate" title={row.description}>
                        {row.description || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(row)} title="Edit" className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteRequest(row)} title="Delete" className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paged.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        {isLoading ? 'Loading specializations...' : 'No specializations found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} />
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {selectedRecord ? 'Edit Doctor Specialization' : 'Create Doctor Specialization'}
              </h1>
              <p className="text-slate-500 text-xs">Fill in the specialization details</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 overflow-auto p-5">
            {errors.form && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errors.form}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Code</label>
                {/* Generated by the database on insert, so it is never editable. */}
                <input
                  type="text" value={formData.specializationCode} readOnly
                  placeholder="Auto-generated"
                  className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Specialization Name <span className="text-red-500">*</span>
                </label>
                {/* Letters and the punctuation real specialities use; digits are
                    rejected here and again by the API. */}
                <input
                  type="text"
                  value={formData.specializationName}
                  onChange={(e) => setFormData({
                    ...formData,
                    specializationName: lettersOnly(e.target.value, LIMITS.name),
                  })}
                  placeholder="Cardiologist"
                  className={`w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.specializationName ? 'border-red-300' : 'border-slate-200'}`}
                />
                {errors.specializationName && (
                  <p className="text-red-500 text-[11px] mt-0.5">{errors.specializationName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
                <select
                  value={formData.departmentName}
                  onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Not assigned</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>


              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({
                    ...formData,
                    description: freeText(e.target.value, LIMITS.remarks),
                  })}
                  placeholder="Heart and vascular conditions"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>
            </div>

            {selectedRecord && (
              <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs text-slate-500">
                <div>
                  <span className="block font-medium text-slate-700 mb-0.5">Created By</span>
                  {selectedRecord.createdBy || 'System'} • {selectedRecord.createdDate?.slice(0, 10) || 'N/A'}
                </div>
                <div>
                  <span className="block font-medium text-slate-700 mb-0.5">Last Updated</span>
                  {selectedRecord.updatedBy || '-'} • {selectedRecord.updatedDate?.slice(0, 10) || '-'}
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" color="secondary" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button variant="filled" color="primary" icon={Save} isLoading={isSaving} onClick={handleSaveForm}>
                {selectedRecord ? 'Save Changes' : 'Create Record'}
              </Button>
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
            Are you sure you want to delete{' '}
            <span className="font-semibold text-slate-700">{selectedRecord?.specializationName}</span>?
            Doctors already assigned to it must be reassigned first.
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
    </motion.div>
  );
};
