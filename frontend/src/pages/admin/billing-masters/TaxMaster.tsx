import { useState, useMemo, useEffect, type KeyboardEvent } from 'react';
import {
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle,
  Save, ChevronLeft, ChevronRight, Eye, Power, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

const API_BASE = import.meta.env.VITE_API_URL as string;

export interface TaxRecord {
  id: number;
  taxCode: string;
  gstPercentage: number;
  cgst: number;
  sgst: number;
  igst: number;
  effectiveDate: string;
  status: string;
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
}

type TaxForm = { gstPercentage: number; effectiveDate: string; status: string };

const emptyData: TaxForm = { gstPercentage: 0, effectiveDate: '', status: 'Active' };

const GST_MIN = 0;
const GST_MAX = 100;

const pad2 = (n: number) => String(Math.trunc(n)).padStart(2, '0');

// Block characters invalid inside an integer <input type="number">.
const blockIntKeys = (e: KeyboardEvent<HTMLInputElement>) => {
  if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
};

const mapApiToRecord = (item: Record<string, unknown>): TaxRecord => ({
  id:            item.id            as number,
  taxCode:       item.taxCode       as string,
  gstPercentage: Number(item.gstPercentage ?? 0),
  cgst:          Number(item.cgst ?? 0),
  sgst:          Number(item.sgst ?? 0),
  igst:          Number(item.igst ?? 0),
  effectiveDate: (item.effectiveDate as string) ?? '',
  status:        item.status        as string,
  createdBy:     (item.createdBy    as string) ?? undefined,
  createdDate:   item.createdDate ? String(item.createdDate).split('T')[0] : undefined,
  updatedBy:     (item.updatedBy    as string) ?? undefined,
  updatedDate:   item.updatedDate ? String(item.updatedDate).split('T')[0] : undefined,
});

export const TaxMaster = () => {
  const [records, setRecords] = useState<TaxRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{key: keyof TaxRecord | null, direction: 'asc'|'desc'}>({ key: null, direction: 'asc' });

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TaxRecord | null>(null);
  const [formData, setFormData] = useState<TaxForm>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Fetch taxes ──────────────────────────────────────────────
  const fetchTaxes = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/taxes/`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: Record<string, unknown>[] = await res.json();
      setRecords(data.map(mapApiToRecord));
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to load taxes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTaxes(); }, []);

  // Derived (computed) values shown as read-only previews
  const previewCode = `GST-${pad2(formData.gstPercentage || 0)}`;
  const previewCgst = (formData.gstPercentage || 0) / 2;
  const previewSgst = previewCgst;
  const previewIgst = formData.gstPercentage || 0;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (formData.gstPercentage < GST_MIN || formData.gstPercentage > GST_MAX)
      newErrors.gstPercentage = `GST % must be between ${GST_MIN} and ${GST_MAX}`;
    else if (!Number.isInteger(formData.gstPercentage))
      newErrors.gstPercentage = 'GST % must be a whole number';

    if (!formData.effectiveDate) newErrors.effectiveDate = 'Effective Date is required';

    if (records.some(r => r.gstPercentage === formData.gstPercentage && r.id !== selectedRecord?.id))
      newErrors.gstPercentage = `A tax with ${formData.gstPercentage}% already exists`;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData(emptyData);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: TaxRecord) => {
    setSelectedRecord(record);
    setFormData({ gstPercentage: record.gstPercentage, effectiveDate: record.effectiveDate, status: record.status });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleView = (record: TaxRecord) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };

  const handleToggleStatus = async (record: TaxRecord) => {
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/taxes/${record.id}/toggle-status`, { method: 'PATCH' });
      if (!res.ok) throw new Error(`Toggle failed: ${res.status}`);
      await fetchTaxes();
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  const handleDelete = (record: TaxRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/taxes/${selectedRecord.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      await fetchTaxes();
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
    setApiError(null);
    try {
      const body = {
        gstPercentage: formData.gstPercentage,
        effectiveDate: formData.effectiveDate,
        status:        formData.status,
      };

      let res: Response;
      if (selectedRecord) {
        res = await fetch(`${API_BASE}/taxes/${selectedRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, updatedBy: 'Admin' }),
        });
      } else {
        res = await fetch(`${API_BASE}/taxes/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, createdBy: 'Admin' }),
        });
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const detail = data && typeof data.detail === 'string' ? data.detail : `Save failed: ${res.status}`;
        throw new Error(detail);
      }

      await fetchTaxes();
      setIsFormOpen(false);
      setSelectedRecord(null);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSort = (key: keyof TaxRecord) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Process data (Filter -> Sort -> Paginate)
  const processedData = useMemo(() => {
    const result = records.filter(record => {
      const matchesSearch = Object.values(record).some(val =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesStatus = filterStatus ? record.status === filterStatus : true;
      return matchesSearch && matchesStatus;
    });

    if (sortConfig.key) {
      const sortKey = sortConfig.key;
      result.sort((a, b) => {
        const left = a?.[sortKey] as string | number | undefined;
        const right = b?.[sortKey] as string | number | undefined;
        if (left === undefined || right === undefined) return 0;
        if (left < right) return sortConfig.direction === 'asc' ? -1 : 1;
        if (left > right) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [records, searchTerm, filterStatus, sortConfig]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedData = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col"
    >
      {apiError && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{apiError}</span>
          <button onClick={() => setApiError(null)} className="text-red-500 hover:text-red-700 font-medium">Dismiss</button>
        </div>
      )}

      {/* Header & Breadcrumbs */}
      <div className="mb-6">
        <div className="flex items-center text-sm text-slate-500 mb-2">
          <span>Masters</span>
          <span className="mx-2">/</span>
          <span className="text-primary font-medium">Tax (GST)</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Tax (GST)</h1>
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
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 border rounded-lg transition-colors ${showFilters ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              title="Advanced Filters"
            >
              <Filter className="w-4 h-4" />
            </button>
            <button onClick={() => { setSearchTerm(''); setFilterStatus(''); setCurrentPage(1); }} className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors" title="Clear search & filters">
              <X className="w-4 h-4" />
            </button>
            <button onClick={() => exportToExcel(records, 'TaxMaster')} className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors" title="Export to Excel">
              <Download className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="border border-slate-200 rounded-lg px-2 py-1 outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
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
                  onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
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

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('taxCode')}>Code</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('gstPercentage')}>GST %</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">CGST</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">SGST</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">IGST</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('effectiveDate')}>Effective Date</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 text-sm w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-500">Loading taxes...</td></tr>
              ) : paginatedData.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-500">No records found</td></tr>
              ) : paginatedData.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 text-slate-800 font-medium">{record.taxCode}</td>
                  <td className="py-3 px-4 text-slate-800">{record.gstPercentage}%</td>
                  <td className="py-3 px-4 text-slate-600">{record.cgst}%</td>
                  <td className="py-3 px-4 text-slate-600">{record.sgst}%</td>
                  <td className="py-3 px-4 text-slate-600">{record.igst}%</td>
                  <td className="py-3 px-4 text-slate-800">{record.effectiveDate}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
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
            Showing {processedData.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, processedData.length)} of {processedData.length} entries
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
        title={`${selectedRecord ? 'Edit' : 'Add'} Tax (GST)`}
        size="3xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto px-1">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tax Code</label>
            <input type="text" value={previewCode} disabled readOnly className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed outline-none" />
            <p className="text-slate-400 text-xs mt-1">Auto-generated from GST %</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">GST Percentage (%) <span className="text-red-500">*</span></label>
            <input type="number" min={GST_MIN} max={GST_MAX} step="1" onKeyDown={blockIntKeys} value={formData.gstPercentage} onChange={(e) => setFormData({...formData, gstPercentage: Number(e.target.value)})} className={`w-full px-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 transition-all ${errors.gstPercentage ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'}`} />
            {errors.gstPercentage && <p className="text-red-500 text-xs mt-1">{errors.gstPercentage}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Effective Date <span className="text-red-500">*</span></label>
            <input type="date" value={formData.effectiveDate} onChange={(e) => setFormData({...formData, effectiveDate: e.target.value})} className={`w-full px-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 transition-all ${errors.effectiveDate ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'}`} />
            {errors.effectiveDate && <p className="text-red-500 text-xs mt-1">{errors.effectiveDate}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CGST</label>
            <input type="text" value={`${previewCgst}%`} disabled readOnly className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">SGST</label>
            <input type="text" value={`${previewSgst}%`} disabled readOnly className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">IGST</label>
            <input type="text" value={`${previewIgst}%`} disabled readOnly className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed outline-none" />
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
          <Button variant="filled" color="primary" onClick={handleSave} icon={Save} disabled={isSaving}>{isSaving ? 'Saving...' : (selectedRecord ? 'Update' : 'Save')}</Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={`View Tax (GST) Master Details`} size="md">
        {selectedRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-slate-400 block">Code</span><span className="text-sm font-medium">{selectedRecord.taxCode}</span></div>
              <div><span className="text-xs text-slate-400 block">GST %</span><span className="text-sm font-medium">{selectedRecord.gstPercentage}%</span></div>
              <div><span className="text-xs text-slate-400 block">CGST</span><span className="text-sm font-medium">{selectedRecord.cgst}%</span></div>
              <div><span className="text-xs text-slate-400 block">SGST</span><span className="text-sm font-medium">{selectedRecord.sgst}%</span></div>
              <div><span className="text-xs text-slate-400 block">IGST</span><span className="text-sm font-medium">{selectedRecord.igst}%</span></div>
              <div><span className="text-xs text-slate-400 block">Effective Date</span><span className="text-sm font-medium">{selectedRecord.effectiveDate}</span></div>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-400 block mb-1">Status</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                selectedRecord.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
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
          <p className="text-slate-500 mb-6">Are you sure you want to delete <strong>{selectedRecord?.taxCode}</strong>? This action cannot be undone.</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="filled" className="bg-red-500 hover:bg-red-600 text-white border-transparent" onClick={confirmDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
