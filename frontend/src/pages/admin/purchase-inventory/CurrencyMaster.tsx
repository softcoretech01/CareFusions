import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle,
  Save, ChevronLeft, ChevronRight, Eye, Power, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';
import { upperCode, freeText, decimalOnly, LIMITS } from '../../../utils/inputRules';

interface CurrencyRecord {
  id: number;
  currencyCode: string;
  currencyName: string;
  symbol: string;
  exchangeRate: number;
  baseCurrency: boolean;
  status: string;
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
}

const emptyData: Omit<CurrencyRecord, 'id'> = { currencyCode: '', currencyName: '', symbol: '', exchangeRate: 1.0, baseCurrency: false, status: 'Active' };

const API_BASE = import.meta.env.VITE_API_URL as string;

// The API sends DECIMAL(14,6) as a string so no precision is lost in JSON.
const mapApiToRecord = (item: any): CurrencyRecord => ({
  id:           item.id,
  currencyCode: item.currencyCode,
  currencyName: item.currencyName,
  symbol:       item.symbol,
  exchangeRate: Number(item.exchangeRate ?? 1),
  baseCurrency: Boolean(item.baseCurrency),
  status:       item.status,
  createdBy:    item.createdBy,
  createdDate:  item.createdDate,
  updatedBy:    item.updatedBy,
  updatedDate:  item.updatedDate,
});

const mockData: CurrencyRecord[] = [{"id":1,"currencyCode":"INR","currencyName":"Indian Rupee","symbol":"₹","exchangeRate":1,"baseCurrency":true,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":2,"currencyCode":"USD","currencyName":"US Dollar","symbol":"$","exchangeRate":83.5,"baseCurrency":false,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":3,"currencyCode":"EUR","currencyName":"Euro","symbol":"€","exchangeRate":90.2,"baseCurrency":false,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":4,"currencyCode":"GBP","currencyName":"British Pound","symbol":"£","exchangeRate":105.8,"baseCurrency":false,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":5,"currencyCode":"AED","currencyName":"UAE Dirham","symbol":"د.إ","exchangeRate":22.7,"baseCurrency":false,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":6,"currencyCode":"SGD","currencyName":"Singapore Dollar","symbol":"S$","exchangeRate":61.3,"baseCurrency":false,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":7,"currencyCode":"AUD","currencyName":"Australian Dollar","symbol":"A$","exchangeRate":54.1,"baseCurrency":false,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":8,"currencyCode":"JPY","currencyName":"Japanese Yen","symbol":"¥","exchangeRate":0.55,"baseCurrency":false,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":9,"currencyCode":"CHF","currencyName":"Swiss Franc","symbol":"CHF","exchangeRate":91.4,"baseCurrency":false,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":10,"currencyCode":"CAD","currencyName":"Canadian Dollar","symbol":"C$","exchangeRate":60.8,"baseCurrency":false,"status":"Active","createdBy":"System","createdDate":"2024-01-01"}];

export const CurrencyMaster = () => {
  const [records, setRecords] = useState<CurrencyRecord[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{key: keyof CurrencyRecord | null, direction: 'asc'|'desc'}>({ key: null, direction: 'asc' });

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CurrencyRecord | null>(null);
  const [formData, setFormData] = useState<Omit<CurrencyRecord, 'id'>>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchCurrencies = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/currencies/`);
      if (!res.ok) throw new Error('Failed to load currencies');
      const data = await res.json();
      setRecords(data.map(mapApiToRecord));
    } catch (err: any) {
      setApiError(err.message || 'Failed to load currencies');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCurrencies(); }, [fetchCurrencies]);

  const validateForm = () => {
    const next: Record<string, string> = {};
    if (!formData.currencyCode.trim()) next.currencyCode = 'Currency Code is required';
    if (!formData.currencyName.trim()) next.currencyName = 'Currency Name is required';
    if (!formData.symbol.trim()) next.symbol = 'Symbol is required';
    // The base currency is 1 by definition, so only the others need a rate.
    if (!formData.baseCurrency && !(Number(formData.exchangeRate) > 0)) {
      next.exchangeRate = 'Exchange Rate must be greater than zero';
    }
    if (records.some(r => r.currencyCode.toUpperCase() === formData.currencyCode.trim().toUpperCase()
                          && r.id !== selectedRecord?.id)) {
      next.currencyCode = 'Currency Code must be unique';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData(emptyData);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: CurrencyRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleView = (record: CurrencyRecord) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };

  const handleToggleStatus = async (record: CurrencyRecord) => {
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/currencies/${record.id}/toggle-status`, { method: 'PATCH' });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed to change status');
      await fetchCurrencies();
    } catch (err: any) {
      setApiError(err.message);
    }
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
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed to delete currency');
      await fetchCurrencies();
      setIsDeleteOpen(false);
      setSelectedRecord(null);
    } catch (err: any) {
      setIsDeleteOpen(false);
      setApiError(err.message);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const payload = {
        currencyCode: formData.currencyCode.trim().toUpperCase(),
        currencyName: formData.currencyName.trim(),
        symbol:       formData.symbol.trim(),
        exchangeRate: formData.baseCurrency ? 1 : Number(formData.exchangeRate),
        baseCurrency: formData.baseCurrency,
        status:       formData.status,
        ...(selectedRecord ? { updatedBy: 'Admin' } : { createdBy: 'Admin' }),
      };
      const res = await fetch(
        selectedRecord ? `${API_BASE}/currencies/${selectedRecord.id}` : `${API_BASE}/currencies/`,
        { method: selectedRecord ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload) }
      );
      if (!res.ok) {
        const body = await res.json();
        // FastAPI validation errors arrive as a list of {loc, msg}.
        throw new Error(Array.isArray(body.detail)
          ? body.detail.map((d: any) => d.msg).join(', ')
          : body.detail || 'Failed to save currency');
      }
      await fetchCurrencies();
      setIsFormOpen(false);
    } catch (err: any) {
      setErrors(prev => ({ ...prev, form: err.message }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSort = (key: keyof CurrencyRecord) => {
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
      const matchesStatus = filterStatus ? record.status === filterStatus : true;
      return matchesSearch && matchesStatus;
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
      {/* Header & Breadcrumbs */}
      <div className="mb-6">
        <div className="flex items-center text-sm text-slate-500 mb-2">
          <span>Masters</span>
          <span className="mx-2">/</span>
          <span className="text-primary font-medium">Currency Master</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Currency Master</h1>
            <p className="text-slate-500 mt-1"></p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
              Add New
            </Button>
          </div>
        </div>
      </div>

      {/* A failed load used to leave an empty grid that read as "no currencies". */}
      {apiError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

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
            <button onClick={() => exportToExcel(records, 'CurrencyMaster')} className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors" title="Export to Excel">
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
                {/* Additional advanced filters can go here */}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <tr>
<th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('currencyCode')}>Code</th>
<th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('currencyName')}>Name</th>
<th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('symbol')}>Symbol</th>
<th className="text-right py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('exchangeRate')}>Exchange Rate</th>
<th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Status</th>
<th className="text-right py-3 px-4 font-medium text-slate-500 text-sm w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">{isLoading ? 'Loading currencies...' : 'No records found'}</td></tr>
              ) : paginatedData.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
<td className="py-3 px-4 text-slate-800 font-medium">{record.currencyCode}</td>
<td className="py-3 px-4 text-slate-800">{record.currencyName}</td>
<td className="py-3 px-4 text-slate-800">{record.symbol}</td>
                  <td className="py-3 px-4 text-right text-slate-800 tabular-nums">
                    {record.baseCurrency
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Base</span>
                      : record.exchangeRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      record.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleView(record)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(record)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggleStatus(record)} className={`p-1.5 rounded-lg transition-colors ${record.status === 'Active' ? 'text-slate-400 hover:text-orange-500 hover:bg-orange-50' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'}`} title={record.status === 'Active' ? 'Deactivate' : 'Activate'}>
                        <Power className="w-4 h-4" />
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
        title={`${selectedRecord ? 'Edit' : 'Add'} Currency Master`}
        size="3xl"
      >
        <div className="space-y-3 max-h-[70vh] overflow-y-auto px-1">
          {errors.form && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errors.form}</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Code <span className="text-red-500">*</span></label>
              {/* ISO codes are letters/digits only and always stored upper-case. */}
              <input type="text" value={formData.currencyCode}
                onChange={(e) => setFormData({ ...formData, currencyCode: upperCode(e.target.value, LIMITS.code) })}
                placeholder="INR"
                className={`w-full px-3 py-1.5 border rounded-lg text-sm outline-none focus:border-primary ${errors.currencyCode ? 'border-red-400' : 'border-slate-200'}`} />
              {errors.currencyCode && <p className="text-[11px] text-red-500 mt-0.5">{errors.currencyCode}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Name <span className="text-red-500">*</span></label>
              <input type="text" value={formData.currencyName}
                onChange={(e) => setFormData({ ...formData, currencyName: freeText(e.target.value, LIMITS.name) })}
                placeholder="Indian Rupee"
                className={`w-full px-3 py-1.5 border rounded-lg text-sm outline-none focus:border-primary ${errors.currencyName ? 'border-red-400' : 'border-slate-200'}`} />
              {errors.currencyName && <p className="text-[11px] text-red-500 mt-0.5">{errors.currencyName}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Symbol <span className="text-red-500">*</span></label>
              <input type="text" value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: freeText(e.target.value, 10) })}
                placeholder="₹"
                className={`w-full px-3 py-1.5 border rounded-lg text-sm outline-none focus:border-primary ${errors.symbol ? 'border-red-400' : 'border-slate-200'}`} />
              {errors.symbol && <p className="text-[11px] text-red-500 mt-0.5">{errors.symbol}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Exchange Rate <span className="text-red-500">*</span></label>
              <input type="text" inputMode="decimal"
                value={formData.baseCurrency ? '1' : String(formData.exchangeRate)}
                disabled={formData.baseCurrency}
                onChange={(e) => setFormData({ ...formData, exchangeRate: Number(decimalOnly(e.target.value, 14)) })}
                className={`w-full px-3 py-1.5 border rounded-lg text-sm outline-none focus:border-primary disabled:bg-slate-100 disabled:text-slate-500 ${errors.exchangeRate ? 'border-red-400' : 'border-slate-200'}`} />
              <p className="text-[11px] text-slate-400 mt-0.5">Units per 1 base currency</p>
              {errors.exchangeRate && <p className="text-[11px] text-red-500 mt-0.5">{errors.exchangeRate}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Base Currency</label>
              <label className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm cursor-pointer">
                <input type="checkbox" checked={formData.baseCurrency}
                  onChange={(e) => setFormData({ ...formData, baseCurrency: e.target.checked,
                                                 exchangeRate: e.target.checked ? 1 : formData.exchangeRate })}
                  className="rounded border-slate-300 text-primary focus:ring-primary/30" />
                <span className="text-slate-600">This is the base currency</span>
              </label>
              <p className="text-[11px] text-slate-400 mt-0.5">Marking this demotes the current base</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:border-primary outline-none"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
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
          <Button variant="filled" color="primary" onClick={handleSave} icon={Save} isLoading={isSaving}>{selectedRecord ? 'Update' : 'Save'}</Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={`View Currency Master Details`} size="md">
        {selectedRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
<div><span className="text-xs text-slate-400 block">Code</span><span className="text-sm font-medium">{selectedRecord.currencyCode}</span></div>
<div><span className="text-xs text-slate-400 block">Name</span><span className="text-sm font-medium">{selectedRecord.currencyName}</span></div>
<div><span className="text-xs text-slate-400 block">Symbol</span><span className="text-sm font-medium">{selectedRecord.symbol}</span></div>
<div><span className="text-xs text-slate-400 block">Exchange Rate</span><span className="text-sm font-medium">{selectedRecord.baseCurrency ? '1 (base currency)' : selectedRecord.exchangeRate}</span></div>
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
          <p className="text-slate-500 mb-6">Are you sure you want to delete this record? This action cannot be undone.</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="filled" className="bg-red-500 hover:bg-red-600 text-white border-transparent" onClick={confirmDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
