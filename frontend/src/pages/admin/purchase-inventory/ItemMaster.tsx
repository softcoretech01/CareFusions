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

export interface ItemRecord {
  id: number; itemCode: string; itemName: string; category: string; subCategory: string; department: string; brand: string; manufacturer: string; vendor: string; uom: string; hsnCode: string; gstPercentage: number; reorderLevel: number; minStock: number; maxStock: number; shelfLife: number; batchRequired: boolean; expiryRequired: boolean; barcode: string; itemDescription: string; status: string; createdBy?: string; createdDate?: string; updatedBy?: string; updatedDate?: string;
}

type ItemForm = Omit<ItemRecord, 'id' | 'itemCode' | 'createdBy' | 'createdDate' | 'updatedBy' | 'updatedDate'>;

const emptyData: ItemForm = { itemName: '', category: '', subCategory: '', department: '', brand: '', manufacturer: '', vendor: '', uom: '', hsnCode: '', gstPercentage: 0, reorderLevel: 0, minStock: 0, maxStock: 0, shelfLife: 0, batchRequired: false, expiryRequired: false, barcode: '', itemDescription: '', status: 'Active' };

const LIMITS = {
  itemName: 200, category: 100, subCategory: 100, department: 100, brand: 100,
  manufacturer: 150, vendor: 150, uom: 50, hsnCode: 20, barcode: 50, description: 500,
  stockMax: 1000000, shelfMax: 36500,
};

const gstOptions = [0, 5, 12, 18, 28];

// NOTE: Retained ONLY for legacy inventory/procurement pages that import it as
// sample data. The Item Master page itself now loads from the live API.
export const mockData: ItemRecord[] = [{"id":1,"itemCode":"ITM-001","itemName":"Paracetamol 500 mg Tablet","category":"Medicines","subCategory":"Analgesics","department":"Pharmacy","brand":"GSK","manufacturer":"GSK","vendor":"Apollo Distributors","uom":"Strip","hsnCode":"30049099","gstPercentage":12,"reorderLevel":100,"minStock":50,"maxStock":500,"shelfLife":730,"batchRequired":true,"expiryRequired":true,"barcode":"8901234567890","itemDescription":"Fever and pain relief","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":2,"itemCode":"ITM-002","itemName":"Amoxicillin 500 mg Capsule","category":"Medicines","subCategory":"Antibiotics","department":"Pharmacy","brand":"Cipla","manufacturer":"Cipla Ltd","vendor":"Apollo Distributors","uom":"Strip","hsnCode":"30041010","gstPercentage":12,"reorderLevel":50,"minStock":25,"maxStock":200,"shelfLife":730,"batchRequired":true,"expiryRequired":true,"barcode":"8901234567891","itemDescription":"Antibiotic","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":3,"itemCode":"ITM-003","itemName":"Disposable Syringe 5 ml","category":"Medical Consumables","subCategory":"Syringes","department":"Central Store","brand":"BD","manufacturer":"Becton Dickinson India","vendor":"MediTech Supplies","uom":"Box","hsnCode":"90183100","gstPercentage":12,"reorderLevel":20,"minStock":10,"maxStock":100,"shelfLife":1825,"batchRequired":true,"expiryRequired":true,"barcode":"8901234567892","itemDescription":"With needle","status":"Active","createdBy":"System","createdDate":"2024-01-01"}];

const mapApiToRecord = (item: Record<string, unknown>): ItemRecord => ({
  id:              item.id              as number,
  itemCode:        item.itemCode        as string,
  itemName:        item.itemName        as string,
  category:        item.category        as string,
  subCategory:     (item.subCategory    as string) ?? '',
  department:      (item.department     as string) ?? '',
  brand:           (item.brand          as string) ?? '',
  manufacturer:    (item.manufacturer   as string) ?? '',
  vendor:          (item.vendor         as string) ?? '',
  uom:             item.uom             as string,
  hsnCode:         (item.hsnCode        as string) ?? '',
  gstPercentage:   Number(item.gstPercentage ?? 0),
  reorderLevel:    Number(item.reorderLevel ?? 0),
  minStock:        Number(item.minStock ?? 0),
  maxStock:        Number(item.maxStock ?? 0),
  shelfLife:       Number(item.shelfLife ?? 0),
  batchRequired:   Boolean(item.batchRequired),
  expiryRequired:  Boolean(item.expiryRequired),
  barcode:         (item.barcode        as string) ?? '',
  itemDescription: (item.itemDescription as string) ?? '',
  status:          item.status          as string,
  createdBy:       (item.createdBy      as string) ?? undefined,
  createdDate:     item.createdDate ? String(item.createdDate).split('T')[0] : undefined,
  updatedBy:       (item.updatedBy      as string) ?? undefined,
  updatedDate:     item.updatedDate ? String(item.updatedDate).split('T')[0] : undefined,
});

const blockIntKeys = (e: KeyboardEvent<HTMLInputElement>) => {
  if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
};

export const ItemMaster = () => {
  const [records, setRecords] = useState<ItemRecord[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [subCategoryList, setSubCategoryList] = useState<{ category: string; name: string }[]>([]);
  const [vendorOptions, setVendorOptions] = useState<string[]>([]);
  const [uomOptions, setUomOptions] = useState<string[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [nextCode, setNextCode] = useState('');

  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{key: keyof ItemRecord | null, direction: 'asc'|'desc'}>({ key: null, direction: 'asc' });

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ItemRecord | null>(null);
  const [formData, setFormData] = useState<ItemForm>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Fetch items ──────────────────────────────────────────────
  const fetchItems = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/items/`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: Record<string, unknown>[] = await res.json();
      setRecords(data.map(mapApiToRecord));
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setIsLoading(false);
    }
  };

  // Reference data from the live masters (active only)
  const fetchLookups = async () => {
    try {
      const [catRes, subRes, venRes, uomRes] = await Promise.all([
        fetch(`${API_BASE}/categories/?status_filter=Active`),
        fetch(`${API_BASE}/sub-categories/?status_filter=Active`),
        fetch(`${API_BASE}/vendors/?status_filter=Active`),
        fetch(`${API_BASE}/uoms/?status_filter=Active`),
      ]);
      if (catRes.ok) setCategoryOptions((await catRes.json()).map((c: Record<string, unknown>) => c.categoryName as string));
      if (subRes.ok) setSubCategoryList((await subRes.json()).map((s: Record<string, unknown>) => ({ category: s.category as string, name: s.subCategoryName as string })));
      if (venRes.ok) setVendorOptions((await venRes.json()).map((v: Record<string, unknown>) => v.vendorName as string));
      if (uomRes.ok) setUomOptions((await uomRes.json()).map((u: Record<string, unknown>) => u.uomName as string));
    } catch { /* leave options as-is */ }
  };

  useEffect(() => { fetchItems(); fetchLookups(); }, []);

  const fetchNextCode = async () => {
    setNextCode('');
    try {
      const res = await fetch(`${API_BASE}/items/next-code`);
      if (res.ok) setNextCode((await res.json()).itemCode ?? '');
    } catch { setNextCode(''); }
  };

  // Options unioned with values present in records (so existing data always shows)
  const allCategories = useMemo(() => Array.from(new Set([...categoryOptions, ...records.map(r => r.category)].filter(Boolean))).sort(), [categoryOptions, records]);
  const allVendors = useMemo(() => Array.from(new Set([...vendorOptions, ...records.map(r => r.vendor)].filter(Boolean))).sort(), [vendorOptions, records]);
  const allUoms = useMemo(() => Array.from(new Set([...uomOptions, ...records.map(r => r.uom)].filter(Boolean))).sort(), [uomOptions, records]);
  const subCategoriesForCategory = useMemo(() => {
    const fromApi = subCategoryList.filter(s => s.category === formData.category).map(s => s.name);
    const fromRecords = records.filter(r => r.category === formData.category).map(r => r.subCategory);
    return Array.from(new Set([...fromApi, ...fromRecords].filter(Boolean))).sort();
  }, [subCategoryList, records, formData.category]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.itemName.trim()) newErrors.itemName = 'Item Name is required';
    if (!formData.category.trim()) newErrors.category = 'Category is required';
    if (!formData.uom.trim()) newErrors.uom = 'UOM is required';

    if (formData.minStock < 0 || formData.maxStock < 0 || formData.reorderLevel < 0) newErrors.minStock = 'Stock values cannot be negative';
    else if (formData.maxStock < formData.minStock) newErrors.maxStock = 'Max Stock cannot be less than Min Stock';

    if (records.some(r => r.itemName.toLowerCase() === formData.itemName.trim().toLowerCase() && r.id !== selectedRecord?.id))
      newErrors.itemName = 'Item Name must be unique';
    if (formData.barcode.trim() && records.some(r => r.barcode && r.barcode === formData.barcode.trim() && r.id !== selectedRecord?.id))
      newErrors.barcode = 'Barcode is already assigned to another item';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData(emptyData);
    setErrors({});
    setIsFormOpen(true);
    fetchNextCode();
    fetchLookups();
  };

  const handleEdit = (record: ItemRecord) => {
    setSelectedRecord(record);
    const { id, itemCode, createdBy, createdDate, updatedBy, updatedDate, ...rest } = record;
    setFormData(rest);
    setErrors({});
    setIsFormOpen(true);
    fetchLookups();
  };

  const handleView = (record: ItemRecord) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };

  const handleToggleStatus = async (record: ItemRecord) => {
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/items/${record.id}/toggle-status`, { method: 'PATCH' });
      if (!res.ok) throw new Error(`Toggle failed: ${res.status}`);
      await fetchItems();
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  const handleDelete = (record: ItemRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/items/${selectedRecord.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      await fetchItems();
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
        itemName:        formData.itemName.trim(),
        category:        formData.category,
        subCategory:     formData.subCategory || null,
        department:      formData.department || null,
        brand:           formData.brand || null,
        manufacturer:    formData.manufacturer || null,
        vendor:          formData.vendor || null,
        uom:             formData.uom,
        hsnCode:         formData.hsnCode || null,
        gstPercentage:   formData.gstPercentage,
        reorderLevel:    formData.reorderLevel,
        minStock:        formData.minStock,
        maxStock:        formData.maxStock,
        shelfLife:       formData.shelfLife,
        batchRequired:   formData.batchRequired,
        expiryRequired:  formData.expiryRequired,
        barcode:         formData.barcode || null,
        itemDescription: formData.itemDescription || null,
        status:          formData.status,
      };

      let res: Response;
      if (selectedRecord) {
        res = await fetch(`${API_BASE}/items/${selectedRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, updatedBy: 'Admin' }),
        });
      } else {
        res = await fetch(`${API_BASE}/items/`, {
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

      await fetchItems();
      setIsFormOpen(false);
      setSelectedRecord(null);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSort = (key: keyof ItemRecord) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
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

  const inputCls = (err?: string) =>
    `w-full px-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 transition-all ${err ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'}`;

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
          <span className="text-primary font-medium">Item</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Item</h1>
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
            <button onClick={() => exportToExcel(records, 'ItemMaster')} className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors" title="Export to Excel">
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
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('itemCode')}>Code</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('itemName')}>Name</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Category</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Stock Limits</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Status</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 text-sm w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">Loading items...</td></tr>
              ) : paginatedData.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">No records found</td></tr>
              ) : paginatedData.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 text-slate-800 font-medium">{record.itemCode}</td>
                  <td className="py-3 px-4 text-slate-800">{record.itemName}</td>
                  <td className="py-3 px-4 text-slate-800 text-sm">{record.category}</td>
                  <td className="py-3 px-4 text-slate-500 text-sm">Min: {record.minStock} | Max: {record.maxStock}</td>
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
            Showing {processedData.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, processedData.length)} of {processedData.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-1 rounded border border-slate-200 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-600 px-2">Page {currentPage} of {totalPages || 1}</span>
            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="p-1 rounded border border-slate-200 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={`${selectedRecord ? 'Edit' : 'Add'} Item`}
        size="3xl"
      >
        <div className="space-y-4 px-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Item Code</label>
              <input type="text" value={selectedRecord ? selectedRecord.itemCode : (nextCode || 'Auto-generating…')} disabled readOnly className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Item Name <span className="text-red-500">*</span></label>
              <input type="text" maxLength={LIMITS.itemName} value={formData.itemName} onChange={(e) => setFormData({...formData, itemName: e.target.value})} className={inputCls(errors.itemName)} />
              {errors.itemName && <p className="text-red-500 text-xs mt-1">{errors.itemName}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category <span className="text-red-500">*</span></label>
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value, subCategory: ''})} className={inputCls(errors.category)}>
                <option value="">Select Category</option>
                {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sub Category</label>
              <select value={formData.subCategory} onChange={(e) => setFormData({...formData, subCategory: e.target.value})} className={inputCls()}>
                <option value="">Select Sub Category</option>
                {subCategoriesForCategory.map(sc => <option key={sc} value={sc}>{sc}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
              <input type="text" maxLength={LIMITS.department} value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className={inputCls()} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
              <input type="text" maxLength={LIMITS.brand} value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} className={inputCls()} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Manufacturer</label>
              <input type="text" maxLength={LIMITS.manufacturer} value={formData.manufacturer} onChange={(e) => setFormData({...formData, manufacturer: e.target.value})} className={inputCls()} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
              <select value={formData.vendor} onChange={(e) => setFormData({...formData, vendor: e.target.value})} className={inputCls()}>
                <option value="">Select Vendor</option>
                {allVendors.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">UOM <span className="text-red-500">*</span></label>
              <select value={formData.uom} onChange={(e) => setFormData({...formData, uom: e.target.value})} className={inputCls(errors.uom)}>
                <option value="">Select UOM</option>
                {allUoms.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              {errors.uom && <p className="text-red-500 text-xs mt-1">{errors.uom}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">HSN Code</label>
              <input type="text" maxLength={LIMITS.hsnCode} value={formData.hsnCode} onChange={(e) => setFormData({...formData, hsnCode: e.target.value})} className={inputCls()} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tax (GST)</label>
              <select value={formData.gstPercentage} onChange={(e) => setFormData({...formData, gstPercentage: Number(e.target.value)})} className={inputCls()}>
                {gstOptions.map(g => <option key={g} value={g}>{g}%</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Level</label>
              <input type="number" min="0" max={LIMITS.stockMax} step="1" onKeyDown={blockIntKeys} value={formData.reorderLevel} onChange={(e) => setFormData({...formData, reorderLevel: Number(e.target.value)})} className={inputCls()} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Stock</label>
              <input type="number" min="0" max={LIMITS.stockMax} step="1" onKeyDown={blockIntKeys} value={formData.minStock} onChange={(e) => setFormData({...formData, minStock: Number(e.target.value)})} className={inputCls(errors.minStock)} />
              {errors.minStock && <p className="text-red-500 text-xs mt-1">{errors.minStock}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Stock</label>
              <input type="number" min="0" max={LIMITS.stockMax} step="1" onKeyDown={blockIntKeys} value={formData.maxStock} onChange={(e) => setFormData({...formData, maxStock: Number(e.target.value)})} className={inputCls(errors.maxStock)} />
              {errors.maxStock && <p className="text-red-500 text-xs mt-1">{errors.maxStock}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Shelf Life (Days)</label>
              <input type="number" min="0" max={LIMITS.shelfMax} step="1" onKeyDown={blockIntKeys} value={formData.shelfLife} onChange={(e) => setFormData({...formData, shelfLife: Number(e.target.value)})} className={inputCls()} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Barcode</label>
              <input type="text" maxLength={LIMITS.barcode} value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})} className={inputCls(errors.barcode)} />
              {errors.barcode && <p className="text-red-500 text-xs mt-1">{errors.barcode}</p>}
            </div>
            <div className="flex items-end gap-6 pb-2">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={formData.batchRequired} onChange={(e) => setFormData({...formData, batchRequired: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                Batch Required
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={formData.expiryRequired} onChange={(e) => setFormData({...formData, expiryRequired: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                Expiry Required
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Item Description</label>
            <textarea value={formData.itemDescription} maxLength={LIMITS.description} onChange={(e) => setFormData({...formData, itemDescription: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" rows={2}/>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={inputCls()}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
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
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={`View Item Master Details`} size="md">
        {selectedRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-xs text-slate-400 block">Code</span><span className="text-sm font-medium">{selectedRecord.itemCode}</span></div>
              <div><span className="text-xs text-slate-400 block">Name</span><span className="text-sm font-medium">{selectedRecord.itemName}</span></div>
              <div><span className="text-xs text-slate-400 block">Category</span><span className="text-sm font-medium">{selectedRecord.category}</span></div>
              <div><span className="text-xs text-slate-400 block">Sub Category</span><span className="text-sm font-medium">{selectedRecord.subCategory || '-'}</span></div>
              <div><span className="text-xs text-slate-400 block">UOM</span><span className="text-sm font-medium">{selectedRecord.uom}</span></div>
              <div><span className="text-xs text-slate-400 block">GST</span><span className="text-sm font-medium">{selectedRecord.gstPercentage}%</span></div>
              <div><span className="text-xs text-slate-400 block">Vendor</span><span className="text-sm font-medium">{selectedRecord.vendor || '-'}</span></div>
              <div><span className="text-xs text-slate-400 block">HSN</span><span className="text-sm font-medium">{selectedRecord.hsnCode || '-'}</span></div>
              <div><span className="text-xs text-slate-400 block">Stock (Min/Max)</span><span className="text-sm font-medium">{selectedRecord.minStock} / {selectedRecord.maxStock}</span></div>
              <div><span className="text-xs text-slate-400 block">Barcode</span><span className="text-sm font-medium">{selectedRecord.barcode || '-'}</span></div>
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
          <p className="text-slate-500 mb-6">Are you sure you want to delete <strong>{selectedRecord?.itemName}</strong>? This action cannot be undone.</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="filled" className="bg-red-500 hover:bg-red-600 text-white border-transparent" onClick={confirmDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
