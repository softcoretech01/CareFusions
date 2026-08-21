import { useState, useEffect, type KeyboardEvent } from 'react';
import {
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle,
  Save, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

const API_BASE = import.meta.env.VITE_API_URL as string;

interface PaymentTermRecord {
  id: number;
  paymentTermCode: string;
  paymentTermName: string;
  creditDays: number;
  description: string;
  status: string;
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
}

type PaymentTermForm = { paymentTermCode: string; paymentTermName: string; creditDays: number; description: string; status: string };

const emptyData: PaymentTermForm = { paymentTermCode: '', paymentTermName: '', creditDays: 0, description: '', status: 'Active' };

const LIMITS = { paymentTermName: 100, description: 500, creditMax: 3650 };

const blockIntKeys = (e: KeyboardEvent<HTMLInputElement>) => {
  if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
};

const mapApiToRecord = (item: Record<string, unknown>): PaymentTermRecord => ({
  id:              item.id              as number,
  paymentTermCode: (item.paymentTermCode as string) ?? '',
  paymentTermName: item.paymentTermName as string,
  creditDays:      Number(item.creditDays ?? 0),
  description:     (item.description     as string) ?? '',
  status:          item.status          as string,
  createdBy:       (item.createdBy      as string) ?? undefined,
  createdDate:     item.createdDate ? String(item.createdDate).split('T')[0] : undefined,
  updatedBy:       (item.updatedBy      as string) ?? undefined,
  updatedDate:     item.updatedDate ? String(item.updatedDate).split('T')[0] : undefined,
});

export const PaymentTermsMaster = () => {
  const [records, setRecords] = useState<PaymentTermRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PaymentTermRecord | null>(null);
  const [formData, setFormData] = useState<PaymentTermForm>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Fetch payment terms ──────────────────────────────────────
  const fetchPaymentTerms = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/payment-terms/`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: Record<string, unknown>[] = await res.json();
      setRecords(data.map(mapApiToRecord));
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to load payment terms');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPaymentTerms(); }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.paymentTermName.trim()) newErrors.paymentTermName = 'Payment Term Name is required';
    if (formData.creditDays < 0) newErrors.creditDays = 'Credit Days cannot be negative';
    else if (formData.creditDays > LIMITS.creditMax) newErrors.creditDays = `Credit Days cannot exceed ${LIMITS.creditMax}`;
    if (records.some(r => r.paymentTermName.toLowerCase() === formData.paymentTermName.trim().toLowerCase() && r.id !== selectedRecord?.id))
      newErrors.paymentTermName = 'Payment Term Name must be unique';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = async () => {
    setSelectedRecord(null);
    setErrors({});
    // Show the code the insert will claim; the database is still the authority.
    let code = '';
    try {
      const res = await fetch(`${API_BASE}/payment-terms/next-code`);
      if (res.ok) code = ((await res.json()).paymentTermCode as string) ?? '';
    } catch { /* the form works without the preview */ }
    setFormData({ ...emptyData, paymentTermCode: code });
    setIsFormOpen(true);
  };

  const handleEdit = (record: PaymentTermRecord) => {
    setSelectedRecord(record);
    setFormData({ paymentTermCode: record.paymentTermCode, paymentTermName: record.paymentTermName, creditDays: record.creditDays, description: record.description, status: record.status });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDelete = (record: PaymentTermRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/payment-terms/${selectedRecord.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      await fetchPaymentTerms();
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
        paymentTermName: formData.paymentTermName.trim(),
        creditDays:      formData.creditDays,
        description:     formData.description || null,
        status:         formData.status,
      };

      let res: Response;
      if (selectedRecord) {
        res = await fetch(`${API_BASE}/payment-terms/${selectedRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, updatedBy: 'Admin' }),
        });
      } else {
        res = await fetch(`${API_BASE}/payment-terms/`, {
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

      await fetchPaymentTerms();
      setIsFormOpen(false);
      setSelectedRecord(null);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = Object.values(record).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesStatus = filterStatus ? record.status === filterStatus : true;
    return matchesSearch && matchesStatus;
  });

  const _totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const _page = Math.min(currentPage, _totalPages);
  const pagedRecords = filteredRecords.slice((_page - 1) * itemsPerPage, _page * itemsPerPage);

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

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Payment Terms</h1>
          <p className="text-slate-500 mt-1"></p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
            Add New
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 border rounded-lg transition-colors ${showFilters ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              <Filter className="w-4 h-4" />
            </button>
            <button onClick={() => { setSearchTerm(''); setFilterStatus(''); }} title="Clear search & filters" className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <button onClick={() => exportToExcel(records, 'PaymentTermsMaster')} title="Export to Excel" className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
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
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="text-left py-4 px-6 font-medium text-slate-500 text-sm w-28">Code</th>
                <th className="text-left py-4 px-6 font-medium text-slate-500 text-sm">Payment Term Name</th>
                <th className="text-left py-4 px-6 font-medium text-slate-500 text-sm">Credit Days</th>
                <th className="text-left py-4 px-6 font-medium text-slate-500 text-sm">Description</th>
                <th className="text-left py-4 px-6 font-medium text-slate-500 text-sm">Status</th>
                <th className="text-right py-4 px-6 font-medium text-slate-500 text-sm w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">Loading payment terms...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">No records found</td></tr>
              ) : pagedRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 text-slate-500 font-medium">{record.paymentTermCode || '-'}</td>
                  <td className="py-4 px-6 text-slate-800">{record.paymentTermName}</td>
                  <td className="py-4 px-6 text-slate-800">{record.creditDays}</td>
                  <td className="py-4 px-6 text-slate-600 max-w-xs truncate">{record.description}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      record.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(record)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(record)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={`${selectedRecord ? 'Edit' : 'Add'} Payment Term`}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
            {/* Generated by the database on insert, so it is never editable. */}
            <input
              type="text"
              value={formData.paymentTermCode}
              readOnly
              placeholder="Auto-generated"
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-100 text-slate-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Term Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              maxLength={LIMITS.paymentTermName}
              value={formData.paymentTermName}
              onChange={(e) => setFormData({ ...formData, paymentTermName: e.target.value })}
              className={`w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${errors.paymentTermName ? 'border-red-500' : 'border-slate-200'}`}
            />
            {errors.paymentTermName && <p className="text-red-500 text-xs mt-1">{errors.paymentTermName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Credit Days</label>
            <input
              type="number"
              min="0"
              max={LIMITS.creditMax}
              step="1"
              onKeyDown={blockIntKeys}
              value={formData.creditDays}
              onChange={(e) => setFormData({ ...formData, creditDays: Number(e.target.value) })}
              className={`w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${errors.creditDays ? 'border-red-500' : 'border-slate-200'}`}
            />
            {errors.creditDays && <p className="text-red-500 text-xs mt-1">{errors.creditDays}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              maxLength={LIMITS.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {selectedRecord && (
          <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs text-slate-500">
            <div>
              <span className="block font-medium text-slate-700 mb-1">Created By</span>
              {selectedRecord.createdBy || 'System'} • {selectedRecord.createdDate || 'N/A'}
            </div>
            <div>
              <span className="block font-medium text-slate-700 mb-1">Last Updated</span>
              {selectedRecord.updatedBy || '-'} • {selectedRecord.updatedDate || '-'}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
          <Button variant="outline" onClick={() => setIsFormOpen(false)}>
            Cancel
          </Button>
          <Button variant="filled" color="primary" onClick={handleSave} icon={Save} disabled={isSaving}>
            {isSaving ? 'Saving...' : `${selectedRecord ? 'Update' : 'Save'} Payment Term`}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Record"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">Delete Payment Term?</h3>
          <p className="text-slate-500 mb-6">
            Are you sure you want to delete <strong>{selectedRecord?.paymentTermName}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="filled"
              className="bg-red-500 hover:bg-red-600 text-white border-transparent"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

