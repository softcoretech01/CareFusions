import { API_BASE_URL } from '@/utils/apiBase';
import { useState, useMemo, useEffect } from 'react';
import {
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle,
  Save, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';
import { INVENTORY_TYPES } from '../../../utils/inventoryTypes';

const API_BASE = API_BASE_URL;

export interface SubCategoryRecord {
  id: number;
  subCategoryCode: string;
  categoryId: number;
  category?: string;
  subCategoryName: string;
  description: string;
  status: string;
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
}

type SubCategoryForm = { categoryId: number; category?: string; subCategoryName: string; description: string; status: string };

const emptyData: SubCategoryForm = { categoryId: 0, category: '', subCategoryName: '', description: '', status: 'Active' };

const LIMITS = { subCategoryName: 100, description: 500 };

const mapApiToRecord = (item: Record<string, unknown>): SubCategoryRecord => ({
  id:              item.id              as number,
  subCategoryCode: item.subCategoryCode as string,
  categoryId:      item.categoryId      as number,
  category:        item.category        as string,
  subCategoryName: item.subCategoryName as string,
  description:     (item.description    as string) ?? '',
  status:          item.status          as string,
  createdBy:       (item.createdBy      as string) ?? undefined,
  createdDate:     item.createdDate ? String(item.createdDate).split('T')[0] : undefined,
  updatedBy:       (item.updatedBy      as string) ?? undefined,
  updatedDate:     item.updatedDate ? String(item.updatedDate).split('T')[0] : undefined,
});

export const SubCategoryMaster = () => {
  const [records, setRecords] = useState<SubCategoryRecord[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ id: number; name: string; type: string }[]>([]);
  const [formType, setFormType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [nextCode, setNextCode] = useState('');

  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{key: keyof SubCategoryRecord | null, direction: 'asc'|'desc'}>({ key: null, direction: 'asc' });

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SubCategoryRecord | null>(null);
  const [formData, setFormData] = useState<SubCategoryForm>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Fetch sub-categories ─────────────────────────────────────
  const fetchSubCategories = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/sub-categories/`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: Record<string, unknown>[] = await res.json();
      setRecords(data.map(mapApiToRecord));
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to load sub-categories');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategoryOptions = async () => {
    try {
      const catRes = await fetch(`${API_BASE}/categories/?status_filter=Active`);
      
      let allOptions: { id: number; name: string; type: string }[] = [];
      
      if (catRes.ok) {
        const data: Record<string, unknown>[] = await catRes.json();
        allOptions = data.map(c => ({
          id: c.id as number,
          name: c.categoryName as string,
          type: (c.inventoryType as string) ?? '',
        }));
      }
      
      setCategoryOptions(allOptions);
    } catch {
      setCategoryOptions([]);
    }
  };

  useEffect(() => { fetchSubCategories(); fetchCategoryOptions(); }, []);

  const fetchNextCode = async () => {
    setNextCode('');
    try {
      const res = await fetch(`${API_BASE}/sub-categories/next-code`);
      if (res.ok) {
        const data = await res.json();
        setNextCode(data.subCategoryCode ?? '');
      }
    } catch {
      setNextCode('');
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.categoryId) newErrors.categoryId = 'Category is required';
    if (!formData.subCategoryName.trim()) newErrors.subCategoryName = 'Sub Category Name is required';
    if (records.some(r => r.categoryId === formData.categoryId && r.subCategoryName.toLowerCase() === formData.subCategoryName.trim().toLowerCase() && r.id !== selectedRecord?.id))
      newErrors.subCategoryName = 'This sub-category already exists under the selected category';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData(emptyData);
    setErrors({});
    setIsFormOpen(true);
    fetchNextCode();
    fetchCategoryOptions();
  };

  const handleEdit = (record: SubCategoryRecord) => {
    setSelectedRecord(record);
    setFormType(categoryOptions.find(c => c.id === record.categoryId)?.type ?? '');
    setFormData({ categoryId: record.categoryId, category: record.category, subCategoryName: record.subCategoryName, description: record.description, status: record.status });
    setErrors({});
    setIsFormOpen(true);
    fetchCategoryOptions();
  };


  const handleDelete = (record: SubCategoryRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/sub-categories/${selectedRecord.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      await fetchSubCategories();
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
        categoryId:      formData.categoryId,
        subCategoryName: formData.subCategoryName.trim(),
        description:     formData.description || null,
        status:          formData.status,
      };

      let res: Response;
      if (selectedRecord) {
        res = await fetch(`${API_BASE}/sub-categories/${selectedRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, updatedBy: 'Admin' }),
        });
      } else {
        res = await fetch(`${API_BASE}/sub-categories/`, {
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

      await fetchSubCategories();
      setIsFormOpen(false);
      setSelectedRecord(null);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSort = (key: keyof SubCategoryRecord) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Category options for the list filter (union of live categories + any used
  // in records, so an existing row's category is always selectable).
  const allCategories = useMemo(() => {
    const opts = new Map<number, string>();
    categoryOptions.forEach(c => opts.set(c.id, c.name));
    records.forEach(r => {
      if (r.categoryId) opts.set(r.categoryId, r.category || 'Unknown');
    });
    return Array.from(opts.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [categoryOptions, records]);

  // The form narrows the parent list to the chosen inventory type: a
  // sub-category may only hang off a category of that type. With no type
  // picked yet the full list is offered, which is what editing an existing
  // row needs.
  const formCategories = useMemo(
    () => (formType
      ? categoryOptions.filter(c => c.type === formType).map(c => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name))
      : allCategories),
    [categoryOptions, formType, allCategories]
  );

  // Process data (Filter -> Sort -> Paginate)
  const processedData = useMemo(() => {
    const result = records.filter(record => {
      const matchesSearch = Object.values(record).some(val =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesCategory = filterCategory ? record.category === filterCategory : true;
      return matchesSearch && matchesCategory;
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
  }, [records, searchTerm, filterCategory, sortConfig]);

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Sub Category</h1>
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
            <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors" title="Clear search & filters">
              <X className="w-4 h-4" />
            </button>
            <button onClick={() => exportToExcel(records, 'SubCategoryMaster')} className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors" title="Export to Excel">
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
                  value={filterCategory}
                  onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value="">All Categories</option>
                  {allCategories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">S.No</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('category')}>Category</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('subCategoryName')}>Sub Category</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 text-sm w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={4} className="py-8 text-center text-slate-500">Loading sub-categories...</td></tr>
              ) : paginatedData.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-slate-500">No records found</td></tr>
              ) : paginatedData.map((record, index) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 text-slate-800 font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td className="py-3 px-4 text-slate-800">{record.category}</td>
                  <td className="py-3 px-4 text-slate-800">{record.subCategoryName}</td>
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
        title={`${selectedRecord ? 'Edit' : 'Add'} Sub Category`}
        size="3xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto px-1">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sub Category Code</label>
            <input type="text" value={selectedRecord ? selectedRecord.subCategoryCode : (nextCode || 'Auto-generating…')} disabled readOnly className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Inventory Type</label>
            <select
              value={formType}
              onChange={(e) => { setFormType(e.target.value); setFormData({ ...formData, category: '' }); }}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="">All Types</option>
              {INVENTORY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category <span className="text-red-500">*</span></label>
            <select 
              value={formData.categoryId || ""} 
              onChange={(e) => {
                const id = Number(e.target.value);
                const cat = formCategories.find(c => c.id === id);
                setFormData({...formData, categoryId: id || 0, category: cat?.name || ""});
              }} 
              className={`w-full px-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 transition-all ${errors.categoryId ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'}`}
            >
              <option value="">Select Category</option>
              {formCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>}
            {formCategories.length === 0 && <p className="text-amber-600 text-xs mt-1">No categories for this type — add one in Category Master first.</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name <span className="text-red-500">*</span></label>
            <input type="text" maxLength={LIMITS.subCategoryName} value={formData.subCategoryName} onChange={(e) => setFormData({...formData, subCategoryName: e.target.value})} className={`w-full px-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 transition-all ${errors.subCategoryName ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'}`} />
            {errors.subCategoryName && <p className="text-red-500 text-xs mt-1">{errors.subCategoryName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={formData.description} maxLength={LIMITS.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" rows={1}/>
            {/* <p className="text-slate-400 text-xs mt-1 text-right">{formData.description.length}/{LIMITS.description}</p> */}
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

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Record" size="sm">
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">Delete Record?</h3>
          <p className="text-slate-500 mb-6">Are you sure you want to delete <strong>{selectedRecord?.subCategoryName}</strong>? This action cannot be undone.</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="filled" className="bg-red-500 hover:bg-red-600 text-white border-transparent" onClick={confirmDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
