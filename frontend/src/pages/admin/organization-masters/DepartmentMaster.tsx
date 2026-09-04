import { API_BASE_URL } from '@/utils/apiBase';
import { useState, useMemo, useEffect } from 'react';
import {
  Plus, Search, Download, Edit2, Trash2, AlertTriangle,
  Save, ChevronLeft, ChevronRight, Eye, CheckCircle2, X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

const API_BASE = API_BASE_URL;

export interface DepartmentRecord {
  id: number;
  departmentCode: string;
  departmentName: string;
  departmentType: string;
  description: string;
  departmentHead: string;
  consultationFee: number | null;
  doctorsCount: number;
  status: string;
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
}

// `departmentCode` is server-generated but shown on the form, so it stays
// optional on the form state rather than being omitted outright.
const emptyData: Omit<DepartmentRecord, 'id' | 'departmentCode'> & { departmentCode?: string } = {
  departmentName: '',
  departmentType: 'Clinical',
  description: '',
  departmentHead: '',
  consultationFee: null,
  doctorsCount: 0,
  status: 'Active',
};

// Map API response → DepartmentRecord
const mapApiToRecord = (item: Record<string, unknown>): DepartmentRecord => ({
  id: item.id as number,
  departmentCode: item.departmentCode as string,
  departmentName: item.departmentName as string,
  departmentType: item.departmentType as string,
  description: (item.description as string) ?? '',
  departmentHead: (item.departmentHead as string) ?? '',
  consultationFee: (item.consultationFee as number | null) ?? null,
  doctorsCount: (item.doctorsCount as number) ?? 0,
  status: item.status as string,
  createdBy: (item.createdBy as string) ?? undefined,
  createdDate: item.createdDate ? String(item.createdDate).split('T')[0] : undefined,
  updatedBy: (item.updatedBy as string) ?? undefined,
  updatedDate: item.updatedDate ? String(item.updatedDate).split('T')[0] : undefined,
});

// Exported for backward-compatibility — other screens import this shape.
// DepartmentMaster itself loads live data from the API.
export const mockData: DepartmentRecord[] = [];

export const DepartmentMaster = () => {

  const [records, setRecords] = useState<DepartmentRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof DepartmentRecord | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  // Filter States

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<DepartmentRecord | null>(null);
  // Doctors in the department being edited. The head used to be free text, so
  // it could name anyone \u2014 including someone in another department.
  const [deptDoctors, setDeptDoctors] = useState<{ id: number; name: string }[]>([]);
  const [formData, setFormData] = useState<Omit<DepartmentRecord, 'id' | 'departmentCode'> & { departmentCode?: string }>(emptyData);

  useEffect(() => {
    if (!selectedRecord?.id) { setDeptDoctors([]); return; }
    fetch(`${API_BASE}/departments/${selectedRecord.id}/doctors`)
      .then(r => r.json())
      .then(d => setDeptDoctors(Array.isArray(d) ? d : []))
      .catch(() => setDeptDoctors([]));
  }, [selectedRecord]);

  // ── Fetch departments ────────────────────────────────────────
  const fetchDepartments = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/departments/`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: Record<string, unknown>[] = await res.json();
      setRecords(data.map(mapApiToRecord));
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to load departments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDepartments(); }, []);

  const validateForm = () => {
    if (!formData.departmentName.trim()) return false;
    return true;
  };

  const handleCreateNew = async () => {
    let nextCode = '';
    try {
      const res = await fetch(`${API_BASE}/departments/next-code`);
      if (res.ok) {
        const data = await res.json();
        nextCode = data.nextCode;
      }
    } catch (err) {
      console.error("Failed to fetch next code", err);
    }
    setSelectedRecord(null);
    setFormData({ ...emptyData, departmentCode: nextCode });
    setIsFormOpen(true);
  };

  const handleEdit = (record: DepartmentRecord) => {
    setSelectedRecord(record);
    const { id, departmentCode, ...rest } = record;
    setFormData(rest);
    setIsFormOpen(true);
  };

  const handleView = (record: DepartmentRecord) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };

  const handleDelete = (record: DepartmentRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;
    try {
      const res = await fetch(`${API_BASE}/departments/${selectedRecord.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      await fetchDepartments();
      setIsDeleteOpen(false);
      setSelectedRecord(null);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Delete failed');
      setIsDeleteOpen(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const body = {
        departmentName: formData.departmentName,
        departmentType: formData.departmentType,
        description: formData.description || null,
        departmentHead: formData.departmentHead || null,
        consultationFee: formData.consultationFee ?? null,
        status: formData.status,
      };

      if (selectedRecord) {
        const res = await fetch(`${API_BASE}/departments/${selectedRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, updatedBy: 'Admin' }),
        });
        if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      } else {
        const res = await fetch(`${API_BASE}/departments/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, createdBy: 'Admin' }),
        });
        if (!res.ok) throw new Error(`Create failed: ${res.status}`);
      }

      await fetchDepartments();

      setSuccessMessage(selectedRecord ? 'This record has been updated successfully.' : 'This record has been created successfully.');
      setIsSuccessOpen(true);
      setIsFormOpen(false);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSort = (key: keyof DepartmentRecord) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Process data (Filter -> Sort -> Paginate)
  const processedData = useMemo(() => {
    let result = records.filter(record => {
      const matchesSearch = Object.values(record).some(val =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      return matchesSearch;
    });

    if (sortConfig.key) {
      const sortKey = sortConfig.key;
      result.sort((a, b) => {
        const left = a?.[sortKey] as any;
        const right = b?.[sortKey] as any;
        if (left === undefined || right === undefined) return 0;
        if (left < right) return sortConfig.direction === 'asc' ? -1 : 1;
        if (left > right) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      result.sort((a, b) => b.id - a.id);
    }

    return result;
  }, [records, searchTerm, sortConfig]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedData = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col"
    >
      {/* Header & Breadcrumbs */}
      <div className="mb-6">
        {/* <div className="flex items-center text-sm text-slate-500 mb-2">
          <span>Masters</span>
          <span className="mx-2">/</span>
          <span className="text-primary font-medium">Department</span>
        </div> */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Department</h1>
            <p className="text-slate-500 mt-1"></p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
              Add New
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-wrap gap-4">
          <div className="relative flex-1 min-w-[250px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Name or ID..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
              className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors"
              title="Clear search & filters"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={() => exportToExcel(records, 'DepartmentMaster')}
              className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
              title="Export to Excel"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-medium text-slate-500 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('departmentCode')}>Code</th>
                <th className="py-3 px-4 font-medium text-slate-500 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('departmentName')}>Name</th>
                <th className="py-3 px-4 font-medium text-slate-500">Doctors</th>
                <th className="py-3 px-4 font-medium text-slate-500 whitespace-nowrap">Consultation Fee</th>
                <th className="py-3 px-4 font-medium text-slate-500">Department Head</th>
                <th className="py-3 px-4 font-medium text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {apiError ? (
                <tr><td colSpan={6} className="py-6 text-center text-red-500 text-sm">{apiError}</td></tr>
              ) : isLoading ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">Loading...</td></tr>
              ) : paginatedData.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">No records found</td></tr>
              ) : paginatedData.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 text-slate-800 font-medium">{record.departmentCode}</td>
                  <td className="py-3 px-4 text-slate-800 truncate" title={record.departmentName}>{record.departmentName}</td>
                  <td className="py-3 px-4 tabular-nums text-slate-800">{record.doctorsCount}</td>
                  <td className="py-3 px-4 tabular-nums text-slate-800">
                    {record.consultationFee == null ? '-' : `\u20b9${record.consultationFee.toLocaleString('en-IN')}`}
                  </td>
                  <td className="py-3 px-4 text-slate-800 truncate" title={record.departmentHead || ''}>{record.departmentHead || '-'}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleView(record)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(record)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button onClick={() => handleDelete(record)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-sm text-slate-500">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, processedData.length)} of {processedData.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-slate-200 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-600 px-2">Page {currentPage} of {totalPages || 1}</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1 rounded border border-slate-200 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={`Department`}
        size="3xl"
      >
        <div className="grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto px-1">
          {/* DepartmentCode: hidden on Create, read-only on Edit */}
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Department Code</label><input type="text" value={formData.departmentCode} readOnly maxLength={10} className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed focus:outline-none" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Name <span className="text-red-500">*</span></label><input type="text" value={formData.departmentName} onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })} maxLength={50} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary" /></div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Consultation Fee</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={formData.consultationFee ?? ''}
              onChange={(e) => setFormData({ ...formData, consultationFee: e.target.value === '' ? null : Number(e.target.value) })}
              placeholder="0.00"
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Doctors</label>
            <input
              type="text"
              readOnly
              value={selectedRecord ? `${selectedRecord.doctorsCount} doctor${selectedRecord.doctorsCount === 1 ? '' : 's'}` : 'Saved first'}
              title="Counted from doctors assigned to this department"
              className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed focus:outline-none"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Department Head</label>
            <select
              value={formData.departmentHead}
              onChange={(e) => setFormData({ ...formData, departmentHead: e.target.value })}
              disabled={!selectedRecord || deptDoctors.length === 0}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              <option value="">
                {!selectedRecord
                  ? 'Save the department first'
                  : deptDoctors.length === 0
                    ? 'No doctors assigned to this department'
                    : 'Select a doctor'}
              </option>
              {deptDoctors.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
            {selectedRecord && deptDoctors.length === 0 && (
              <p className="text-xs text-slate-400 mt-1">
                Assign doctors to this department in the Doctor master to pick a head.
              </p>
            )}
          </div>
        </div>

        {selectedRecord && (
          <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs text-slate-500">
            <div><span className="block font-medium text-slate-700 mb-1">Created By</span>{selectedRecord.createdBy || 'System'} • {selectedRecord.createdDate || 'N/A'}</div>
            <div><span className="block font-medium text-slate-700 mb-1">Last Updated</span>{selectedRecord.updatedBy || '-'} • {selectedRecord.updatedDate || '-'}</div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
          <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
          <Button variant="filled" color="primary" onClick={handleSave} icon={Save} disabled={isSaving}>{isSaving ? 'Saving...' : selectedRecord ? 'Update' : 'Save'}</Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={`View Department Master Details`} size="md">
        {selectedRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-slate-400 block">Code</span><span className="text-sm font-medium">{selectedRecord.departmentCode}</span></div>
              <div><span className="text-xs text-slate-400 block">Name</span><span className="text-sm font-medium">{selectedRecord.departmentName}</span></div>
              <div><span className="text-xs text-slate-400 block">Doctors</span><span className="text-sm font-medium">{selectedRecord.doctorsCount}</span></div>
              <div><span className="text-xs text-slate-400 block">Consultation Fee</span><span className="text-sm font-medium">{selectedRecord.consultationFee == null ? '-' : `₹${selectedRecord.consultationFee.toLocaleString('en-IN')}`}</span></div>
              <div><span className="text-xs text-slate-400 block">Department Head</span><span className="text-sm font-medium">{selectedRecord.departmentHead || '-'}</span></div>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-400 block mb-1">Status</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${selectedRecord.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                }`}>
                {selectedRecord.status}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Record" size="sm">
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">Delete Record?</h3>
          <p className="text-slate-500 mb-6">Are you sure you want to delete this record?</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="filled" className="bg-red-500 hover:bg-red-600 text-white border-transparent" onClick={confirmDelete}>Delete</Button>
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
