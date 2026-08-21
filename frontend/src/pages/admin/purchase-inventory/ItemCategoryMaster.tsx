import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, 
  Save, RefreshCw, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';
import { freeText, LIMITS } from '../../../utils/inputRules';

export interface ItemCategoryRecord {
  id: number;
  categoryCode: string;
  categoryName: string;
  inventoryType: string;
  description: string;
  
  stockRequired: boolean;
  batchTracking: boolean;
  expiryTracking: boolean;
  barcodeRequired: boolean;
  
  status: string;
  remarks: string;
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
}

const emptyData: Omit<ItemCategoryRecord, 'id'> = {
  categoryCode: '',
  categoryName: '',
  inventoryType: '',
  description: '',
  
  stockRequired: true,
  batchTracking: false,
  expiryTracking: false,
  barcodeRequired: false,
  
  status: 'Active',
  remarks: ''
};

const API_BASE = import.meta.env.VITE_API_URL as string;

const mapApiToRecord = (item: any): ItemCategoryRecord => ({
  id:              item.id,
  categoryCode:    item.categoryCode,
  categoryName:    item.categoryName,
  inventoryType:   item.inventoryType || '',
  description:     item.description || '',
  stockRequired:   Boolean(item.stockRequired),
  batchTracking:   Boolean(item.batchTracking),
  expiryTracking:  Boolean(item.expiryTracking),
  barcodeRequired: Boolean(item.barcodeRequired),
  status:          item.status,
  remarks:         item.remarks || '',
  createdBy:       item.createdBy,
  createdDate:     item.createdDate,
  updatedBy:       item.updatedBy,
  updatedDate:     item.updatedDate,
});

export const ItemCategoryMaster = () => {
  const [records, setRecords] = useState<ItemCategoryRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ItemCategoryRecord | null>(null);
  const [formData, setFormData] = useState<Omit<ItemCategoryRecord, 'id'>>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/categories/`);
      if (!res.ok) throw new Error('Failed to load item categories');
      setRecords((await res.json()).map(mapApiToRecord));
    } catch (err: any) {
      setApiError(err.message || 'Failed to load item categories');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.categoryName.trim()) newErrors.categoryName = 'Category Name is required';
    if (!formData.inventoryType) newErrors.inventoryType = 'Inventory Type is required';

    if (records.some(r => r.categoryName.trim().toLowerCase() === formData.categoryName.trim().toLowerCase()
                          && r.id !== selectedRecord?.id)) {
      newErrors.categoryName = 'Category Name cannot be duplicated';
    }
    // An expiry date needs a batch to hang on, and neither applies to a
    // category that is not stocked. Same rules the SP enforces.
    if (formData.expiryTracking && !formData.batchTracking) {
      newErrors.expiryTracking = 'Expiry tracking requires batch tracking';
    }
    if (!formData.stockRequired && (formData.batchTracking || formData.expiryTracking)) {
      newErrors.stockRequired = 'Batch and expiry tracking only apply to stocked categories';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = async () => {
    setSelectedRecord(null);
    setErrors({});
    let code = '';
    try {
      const res = await fetch(`${API_BASE}/categories/next-code`);
      if (res.ok) code = (await res.json()).categoryCode || '';
    } catch { /* the form works without the preview */ }
    setFormData({ ...emptyData, categoryCode: code });
    setIsFormOpen(true);
  };

  const handleEdit = (record: ItemCategoryRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: ItemCategoryRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const handleSaveForm = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const payload = {
        categoryName:    formData.categoryName.trim(),
        inventoryType:   formData.inventoryType || null,
        description:     formData.description?.trim() || null,
        stockRequired:   formData.stockRequired,
        batchTracking:   formData.batchTracking,
        expiryTracking:  formData.expiryTracking,
        barcodeRequired: formData.barcodeRequired,
        remarks:         formData.remarks?.trim() || null,
        status:          formData.status,
        ...(selectedRecord ? { updatedBy: 'Admin' } : { createdBy: 'Admin' }),
      };
      const res = await fetch(
        selectedRecord ? `${API_BASE}/categories/${selectedRecord.id}` : `${API_BASE}/categories/`,
        { method: selectedRecord ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload) }
      );
      if (!res.ok) {
        const body = await res.json();
        throw new Error(Array.isArray(body.detail)
          ? body.detail.map((d: any) => d.msg).join(', ')
          : body.detail || 'Failed to save item category');
      }
      await fetchCategories();
      setIsFormOpen(false);
    } catch (err: any) {
      setErrors(prev => ({ ...prev, form: err.message }));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/categories/${selectedRecord.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed to delete item category');
      await fetchCategories();
      setIsDeleteOpen(false);
      setSelectedRecord(null);
    } catch (err: any) {
      setIsDeleteOpen(false);
      setApiError(err.message);
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.categoryCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !filterType || record.inventoryType === filterType;
    const matchesStatus = !filterStatus || record.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
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
      {!isFormOpen ? (
        <>
          {/* A failed load left an empty grid that read as "no categories". */}
          {apiError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Item Category</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>
            <div className="flex gap-3">
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
                Add Category
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Code or Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
              <button onClick={() => setShowFilters(!showFilters)} title="Filters" className={showFilters ? "p-2 border rounded-lg transition-colors border-primary bg-primary/5 text-primary" : "p-2 border rounded-lg transition-colors border-slate-200 text-slate-500 hover:bg-slate-50"}>
                <Filter className="w-4 h-4" />
              </button>
              <button onClick={() => { setSearchTerm(''); setFilterStatus(''); setFilterType(''); }} title="Clear search & filters" className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
              <button onClick={() => exportToExcel(records, 'ItemCategoryMaster')} title="Export to Excel" className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
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
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Inventory Types</option>
                      <option value="Medical">Medical</option>
                      <option value="Non-Medical">Non-Medical</option>
                      <option value="Asset">Asset</option>
                      <option value="Service">Service</option>
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
                    <th className="px-4 py-3 font-medium">Category Code</th>
                    <th className="px-4 py-3 font-medium">Category Name</th>
                    <th className="px-4 py-3 font-medium">Inventory Type</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    pagedRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{record.categoryCode}</td>
                        <td className="px-4 py-3 font-medium text-primary">{record.categoryName}</td>
                        <td className="px-4 py-3 text-slate-600">{record.inventoryType}</td>
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
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        {isLoading ? 'Loading item categories...' : 'No categories found matching your criteria.'}
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
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {selectedRecord ? `Edit Category: ${selectedRecord.categoryName}` : 'Add New Category'}
              </h1>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {/* Basic Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category Code <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.categoryCode} readOnly className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed focus:outline-none" />
                    {errors.categoryCode && <p className="text-red-500 text-xs mt-1">{errors.categoryCode}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.categoryName} onChange={e => setFormData({...formData, categoryName: freeText(e.target.value, LIMITS.name)})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.categoryName ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.categoryName && <p className="text-red-500 text-xs mt-1">{errors.categoryName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Inventory Type <span className="text-red-500">*</span></label>
                    <select value={formData.inventoryType} onChange={e => setFormData({...formData, inventoryType: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.inventoryType ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Inventory Type</option>
                      <option value="Medical">Medical</option>
                      <option value="Non-Medical">Non-Medical</option>
                      <option value="Asset">Asset</option>
                      <option value="Service">Service</option>
                    </select>
                    {errors.inventoryType && <p className="text-red-500 text-xs mt-1">{errors.inventoryType}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: freeText(e.target.value, LIMITS.remarks)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

              {/* Inventory Settings */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Inventory Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="stockRequired" checked={formData.stockRequired} onChange={e => setFormData({...formData, stockRequired: e.target.checked})} className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                    <label htmlFor="stockRequired" className="text-sm font-medium text-slate-700">Stock Required <span className="text-red-500">*</span></label>
                  </div>
                  {errors.stockRequired && <p className="text-red-500 text-xs md:col-span-4 -mt-4">{errors.stockRequired}</p>}
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="batchTracking" checked={formData.batchTracking} onChange={e => setFormData({...formData, batchTracking: e.target.checked})} className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                    <label htmlFor="batchTracking" className="text-sm font-medium text-slate-700">Batch Tracking</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="expiryTracking" checked={formData.expiryTracking} onChange={e => setFormData({...formData, expiryTracking: e.target.checked})} className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                    <label htmlFor="expiryTracking" className="text-sm font-medium text-slate-700">Expiry Tracking</label>
                  </div>
                  {errors.expiryTracking && <p className="text-red-500 text-xs md:col-span-4 -mt-4">{errors.expiryTracking}</p>}
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="barcodeRequired" checked={formData.barcodeRequired} onChange={e => setFormData({...formData, barcodeRequired: e.target.checked})} className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                    <label htmlFor="barcodeRequired" className="text-sm font-medium text-slate-700">Barcode Required</label>
                  </div>
                </div>
              </section>

              {/* System Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">System Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status <span className="text-red-500">*</span></label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                    <input type="text" value={formData.remarks} onChange={e => setFormData({...formData, remarks: freeText(e.target.value, LIMITS.remarks)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

            </div>

            {errors.form && (
              <div className="mx-4 mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errors.form}</span>
              </div>
            )}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <Button variant="outline" color="secondary" onClick={() => setFormData(emptyData)} icon={RefreshCw}>
                Reset
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" color="secondary" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button variant="filled" color="primary" onClick={handleSaveForm} icon={Save} isLoading={isSaving}>
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
        <div className="p-1">
          <div className="flex items-center gap-4 mb-6 text-amber-600 bg-amber-50 p-4 rounded-xl">
            <AlertTriangle className="w-8 h-8 shrink-0" />
            <p className="text-sm font-medium">
              Are you sure you want to delete Category <strong>{selectedRecord?.categoryName}</strong>? 
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


