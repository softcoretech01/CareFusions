import { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle,
  Save, RefreshCw, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

const API_BASE = import.meta.env.VITE_API_URL as string;

interface FinancialYearRecord {
  id: number;
  financialYear: string;
  startDate: string;
  endDate: string;
  isCurrentFinancialYear: boolean;
  allowBackdatedEntry: boolean;
  closingDate: string;
  status: string;
  remarks: string;
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
}

type FinancialYearForm = Omit<FinancialYearRecord, 'id' | 'createdBy' | 'createdDate' | 'updatedBy' | 'updatedDate'>;

const emptyData: FinancialYearForm = {
  financialYear: '',
  startDate: '',
  endDate: '',
  isCurrentFinancialYear: false,
  allowBackdatedEntry: false,
  closingDate: '',
  status: 'Open',
  remarks: ''
};

const LIMITS = { financialYear: 50, remarks: 500 };

const mapApiToRecord = (item: Record<string, unknown>): FinancialYearRecord => ({
  id:                     item.id                     as number,
  financialYear:          item.financialYear          as string,
  startDate:              (item.startDate             as string) ?? '',
  endDate:                (item.endDate               as string) ?? '',
  isCurrentFinancialYear: Boolean(item.isCurrentFinancialYear),
  allowBackdatedEntry:    Boolean(item.allowBackdatedEntry),
  closingDate:            (item.closingDate           as string) ?? '',
  status:                 item.status                 as string,
  remarks:                (item.remarks               as string) ?? '',
  createdBy:              (item.createdBy             as string) ?? undefined,
  createdDate:            item.createdDate ? String(item.createdDate).split('T')[0] : undefined,
  updatedBy:              (item.updatedBy             as string) ?? undefined,
  updatedDate:            item.updatedDate ? String(item.updatedDate).split('T')[0] : undefined,
});

export const FinancialYearMaster = () => {
  const [records, setRecords] = useState<FinancialYearRecord[]>([]);
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
  const [selectedRecord, setSelectedRecord] = useState<FinancialYearRecord | null>(null);
  const [formData, setFormData] = useState<FinancialYearForm>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Fetch financial years ────────────────────────────────────
  const fetchFinancialYears = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/financial-years/`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: Record<string, unknown>[] = await res.json();
      setRecords(data.map(mapApiToRecord));
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to load financial years');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchFinancialYears(); }, []);

  const currentFy = records.find(r => r.isCurrentFinancialYear && r.id !== selectedRecord?.id);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.financialYear.trim()) newErrors.financialYear = 'Financial Year is required';
    if (!formData.startDate) newErrors.startDate = 'Start Date is required';
    if (!formData.endDate) newErrors.endDate = 'End Date is required';

    if (formData.startDate && formData.endDate && formData.endDate <= formData.startDate)
      newErrors.endDate = 'End Date must be after Start Date';
    if (formData.closingDate && formData.endDate && formData.closingDate < formData.endDate)
      newErrors.closingDate = 'Closing Date cannot be before the End Date';

    if (records.some(r => r.financialYear.toLowerCase() === formData.financialYear.trim().toLowerCase() && r.id !== selectedRecord?.id))
      newErrors.financialYear = 'Financial Year must be unique';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData(emptyData);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: FinancialYearRecord) => {
    setSelectedRecord(record);
    const { id, createdBy, createdDate, updatedBy, updatedDate, ...rest } = record;
    setFormData(rest);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: FinancialYearRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const handleSaveForm = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    setApiError(null);
    try {
      const body = {
        financialYear:          formData.financialYear.trim(),
        startDate:              formData.startDate,
        endDate:                formData.endDate,
        isCurrentFinancialYear: formData.isCurrentFinancialYear,
        allowBackdatedEntry:    formData.allowBackdatedEntry,
        closingDate:            formData.closingDate || null,
        status:                 formData.status,
        remarks:                formData.remarks || null,
      };

      let res: Response;
      if (selectedRecord) {
        res = await fetch(`${API_BASE}/financial-years/${selectedRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, updatedBy: 'Admin' }),
        });
      } else {
        res = await fetch(`${API_BASE}/financial-years/`, {
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

      await fetchFinancialYears();
      setIsFormOpen(false);
      setSelectedRecord(null);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/financial-years/${selectedRecord.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      await fetchFinancialYears();
      setIsDeleteOpen(false);
      setSelectedRecord(null);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Delete failed');
      setIsDeleteOpen(false);
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.financialYear.toLowerCase().includes(searchTerm.toLowerCase());
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
      {apiError && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{apiError}</span>
          <button onClick={() => setApiError(null)} className="text-red-500 hover:text-red-700 font-medium">Dismiss</button>
        </div>
      )}

      {!isFormOpen ? (
        <>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Financial Year Master</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>
            <div className="flex gap-3">
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
                Add Financial Year
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Year..."
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
              <button onClick={() => exportToExcel(records, 'FinancialYearMaster')} title="Export to Excel" className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Statuses</option>
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Financial Year</th>
                    <th className="px-4 py-3 font-medium">Start Date</th>
                    <th className="px-4 py-3 font-medium">End Date</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading financial years...</td></tr>
                  ) : filteredRecords.length > 0 ? (
                    pagedRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {record.financialYear}
                          {record.isCurrentFinancialYear && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-bold">CURRENT</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{record.startDate}</td>
                        <td className="px-4 py-3 text-slate-600">{record.endDate}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            record.status === 'Open'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-300'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleEdit(record)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteRequest(record)} className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No financial years found matching your criteria.
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
                {selectedRecord ? `Edit Financial Year: ${selectedRecord.financialYear}` : 'Add New Financial Year'}
              </h1>
              <p className="text-slate-500 text-sm">Configure accounting period duration and rules</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* Basic Information */}
              <section>
                <h3 className="text-base font-bold text-slate-800 mb-3 border-b border-slate-100 pb-1.5">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Financial Year <span className="text-red-500">*</span></label>
                    <input type="text" maxLength={LIMITS.financialYear} value={formData.financialYear} onChange={e => setFormData({...formData, financialYear: e.target.value})} placeholder="e.g. FY 2024-2025" className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.financialYear ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.financialYear && <p className="text-red-500 text-xs mt-1">{errors.financialYear}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                    <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.startDate ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date <span className="text-red-500">*</span></label>
                    <input type="date" min={formData.startDate || undefined} value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.endDate ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
                  </div>
                </div>
              </section>

              {/* Configuration */}
              <section>
                <h3 className="text-base font-bold text-slate-800 mb-3 border-b border-slate-100 pb-1.5">Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3 mt-2">
                      <input type="checkbox" id="isCurrentFinancialYear" checked={formData.isCurrentFinancialYear} onChange={e => setFormData({...formData, isCurrentFinancialYear: e.target.checked})} className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                      <label htmlFor="isCurrentFinancialYear" className="text-sm font-medium text-slate-700">Is Current Financial Year</label>
                    </div>
                    {formData.isCurrentFinancialYear && currentFy && (
                      <p className="text-amber-600 text-xs">This will replace the current year ({currentFy.financialYear}).</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <input type="checkbox" id="allowBackdated" checked={formData.allowBackdatedEntry} onChange={e => setFormData({...formData, allowBackdatedEntry: e.target.checked})} className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                    <label htmlFor="allowBackdated" className="text-sm font-medium text-slate-700">Allow Backdated Entry</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Closing Date</label>
                    <input type="date" min={formData.endDate || undefined} value={formData.closingDate} onChange={e => setFormData({...formData, closingDate: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.closingDate ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.closingDate && <p className="text-red-500 text-xs mt-1">{errors.closingDate}</p>}
                  </div>
                </div>
              </section>

              {/* System Information */}
              <section>
                <h3 className="text-base font-bold text-slate-800 mb-3 border-b border-slate-100 pb-1.5">System Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status <span className="text-red-500">*</span></label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                    <input type="text" maxLength={LIMITS.remarks} value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <Button variant="outline" color="secondary" onClick={() => setFormData(emptyData)} icon={RefreshCw}>
                Reset
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" color="secondary" onClick={() => { setIsFormOpen(false); setSelectedRecord(null); }}>
                  Cancel
                </Button>
                <Button variant="filled" color="primary" onClick={handleSaveForm} icon={Save} disabled={isSaving}>
                  {isSaving ? 'Saving...' : (selectedRecord ? 'Update' : 'Save')}
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
        <div className="p-1">
          <div className="flex items-center gap-4 mb-6 text-amber-600 bg-amber-50 p-4 rounded-xl">
            <AlertTriangle className="w-8 h-8 shrink-0" />
            <p className="text-sm font-medium">
              Are you sure you want to delete Financial Year <strong>{selectedRecord?.financialYear}</strong>?
              This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" color="secondary" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="filled" color="danger" onClick={confirmDelete}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
