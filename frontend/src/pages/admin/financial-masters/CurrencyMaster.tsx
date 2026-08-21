import { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle,
  Save, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

const API_BASE = import.meta.env.VITE_API_URL as string;

export interface CurrencyRecord {
  id: number;
  currencyCode: string;
  currencyName: string;
  exchangeRate: number;
  baseCurrency: boolean;
  status: string;
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
}

type CurrencyForm = { currencyCode: string; currencyName: string; exchangeRate: string; baseCurrency: boolean; status: string };

const emptyData: CurrencyForm = { currencyCode: '', currencyName: '', exchangeRate: '1', baseCurrency: false, status: 'Active' };

const LIMITS = { currencyCode: 10, currencyName: 100 };

// Digits and a single decimal point; anything else would not survive the
// DECIMAL(14,6) column the API writes to.
const rateChars = (v: string) => {
  const cleaned = v.replace(/[^0-9.]/g, '');
  const [head, ...rest] = cleaned.split('.');
  return rest.length ? `${head}.${rest.join('').slice(0, 6)}` : head;
};

// NOTE: Retained ONLY for legacy pages (e.g. PurchaseOrders) that import it as
// sample data. The Currency Master page itself now loads from the live API.
export const mockData: CurrencyRecord[] = [
  { id: 1, currencyCode: 'INR', currencyName: 'Indian Rupee', exchangeRate: 1, baseCurrency: true, status: 'Active' },
  { id: 2, currencyCode: 'USD', currencyName: 'US Dollar', exchangeRate: 88.25, baseCurrency: false, status: 'Active' }
];

const mapApiToRecord = (item: Record<string, unknown>): CurrencyRecord => ({
  id:           item.id           as number,
  currencyCode: item.currencyCode as string,
  currencyName: item.currencyName as string,
  // DECIMAL(14,6) arrives as a string so JSON does not lose precision.
  exchangeRate: Number(item.exchangeRate ?? 1),
  baseCurrency: Boolean(item.baseCurrency),
  status:       item.status       as string,
  createdBy:    (item.createdBy   as string) ?? undefined,
  createdDate:  item.createdDate ? String(item.createdDate).split('T')[0] : undefined,
  updatedBy:    (item.updatedBy   as string) ?? undefined,
  updatedDate:  item.updatedDate ? String(item.updatedDate).split('T')[0] : undefined,
});

export const CurrencyMaster = () => {
  const [records, setRecords] = useState<CurrencyRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Filter States
  const [showFilters, setShowFilters] = useState(false);

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CurrencyRecord | null>(null);
  const [formData, setFormData] = useState<CurrencyForm>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Fetch currencies ─────────────────────────────────────────
  const fetchCurrencies = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/currencies/`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: Record<string, unknown>[] = await res.json();
      setRecords(data.map(mapApiToRecord));
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to load currencies');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCurrencies(); }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.currencyCode.trim()) newErrors.currencyCode = 'Currency Code is required';
    if (!formData.currencyName.trim()) newErrors.currencyName = 'Currency Name is required';
    // The base currency is 1 by definition, so only the others need a rate.
    // Zero or less would silently zero out every amount converted through it.
    if (!formData.baseCurrency && !(Number(formData.exchangeRate) > 0))
      newErrors.exchangeRate = 'Exchange Rate must be greater than zero';

    if (records.some(r => r.currencyCode.toLowerCase() === formData.currencyCode.trim().toLowerCase() && r.id !== selectedRecord?.id))
      newErrors.currencyCode = 'Currency Code must be unique';
    if (records.some(r => r.currencyName.toLowerCase() === formData.currencyName.trim().toLowerCase() && r.id !== selectedRecord?.id))
      newErrors.currencyName = 'Currency Name must be unique';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData(emptyData);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: CurrencyRecord) => {
    setSelectedRecord(record);
    setFormData({
      currencyCode: record.currencyCode,
      currencyName: record.currencyName,
      exchangeRate: String(record.exchangeRate ?? 1),
      baseCurrency: record.baseCurrency ?? false,
      status:       record.status,
    });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDelete = (record: CurrencyRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/currencies/${selectedRecord.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      await fetchCurrencies();
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
        currencyCode: formData.currencyCode.trim().toUpperCase(),
        currencyName: formData.currencyName.trim(),
        exchangeRate: formData.baseCurrency ? 1 : Number(formData.exchangeRate),
        baseCurrency: formData.baseCurrency,
        status:       formData.status,
      };

      let res: Response;
      if (selectedRecord) {
        res = await fetch(`${API_BASE}/currencies/${selectedRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, updatedBy: 'Admin' }),
        });
      } else {
        res = await fetch(`${API_BASE}/currencies/`, {
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

      await fetchCurrencies();
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
    return matchesSearch;
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
          <h1 className="text-3xl font-bold text-slate-800">Currency</h1>
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
            <button onClick={() => { setSearchTerm(''); }} title="Clear search & filters" className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <button onClick={() => exportToExcel(records, 'CurrencyMaster')} title="Export to Excel" className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="text-left py-4 px-6 font-medium text-slate-500 text-sm">Currency Code</th>
                <th className="text-left py-4 px-6 font-medium text-slate-500 text-sm">Currency Name</th>
                <th className="text-left py-4 px-6 font-medium text-slate-500 text-sm">Exchange Rate</th>
                <th className="text-right py-4 px-6 font-medium text-slate-500 text-sm w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={4} className="py-8 text-center text-slate-500">Loading currencies...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-slate-500">No records found</td></tr>
              ) : pagedRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 text-slate-800 font-medium">{record.currencyCode}</td>
                  <td className="py-4 px-6 text-slate-800">{record.currencyName}</td>
                  <td className="py-4 px-6 text-left text-slate-800 tabular-nums">
                    {record.baseCurrency
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Base</span>
                      : record.exchangeRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
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
        title={`${selectedRecord ? 'Edit' : 'Add'} Currency`}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Currency Code <span className="text-red-500">*</span></label>
            <input
              type="text"
              maxLength={LIMITS.currencyCode}
              value={formData.currencyCode}
              onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value.toUpperCase() })}
              className={`w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${errors.currencyCode ? 'border-red-500' : 'border-slate-200'}`}
              placeholder="e.g. INR, USD"
            />
            {errors.currencyCode && <p className="text-red-500 text-xs mt-1">{errors.currencyCode}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Currency Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              maxLength={LIMITS.currencyName}
              value={formData.currencyName}
              onChange={(e) => setFormData({ ...formData, currencyName: e.target.value })}
              className={`w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${errors.currencyName ? 'border-red-500' : 'border-slate-200'}`}
            />
            {errors.currencyName && <p className="text-red-500 text-xs mt-1">{errors.currencyName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Exchange Rate <span className="text-red-500">*</span>
            </label>
            {/* The base currency is 1 by definition, so its rate is locked. */}
            <input
              type="text"
              inputMode="decimal"
              value={formData.baseCurrency ? '1' : formData.exchangeRate}
              disabled={formData.baseCurrency}
              onChange={(e) => setFormData({ ...formData, exchangeRate: rateChars(e.target.value) })}
              className={`w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:bg-slate-100 disabled:text-slate-500 ${errors.exchangeRate ? 'border-red-500' : 'border-slate-200'}`}
              placeholder="e.g. 88.25"
            />
            <p className="text-[11px] text-slate-400 mt-1">Units per 1 base currency</p>
            {errors.exchangeRate && <p className="text-red-500 text-xs mt-1">{errors.exchangeRate}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Base Currency</label>
            <label className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={formData.baseCurrency}
                onChange={(e) => setFormData({
                  ...formData,
                  baseCurrency: e.target.checked,
                  exchangeRate: e.target.checked ? '1' : formData.exchangeRate,
                })}
                className="rounded border-slate-300 text-primary focus:ring-primary/30"
              />
              <span className="text-slate-600">This is the base currency</span>
            </label>
            <p className="text-[11px] text-slate-400 mt-1">Marking this demotes the current base</p>
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
            {isSaving ? 'Saving...' : `${selectedRecord ? 'Update' : 'Save'} Currency`}
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
          <h3 className="text-lg font-medium text-slate-800 mb-2">Delete Currency?</h3>
          <p className="text-slate-500 mb-6">
            Are you sure you want to delete <strong>{selectedRecord?.currencyName}</strong>? This action cannot be undone.
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

