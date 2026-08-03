import { useState } from 'react';
import { useLocalStorage } from '../../../utils/useLocalStorage';
import { 
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, 
  Save, RefreshCw, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

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

export const initialCategories: ItemCategoryRecord[] = [
  {
    id: 1,
    categoryCode: 'CAT-001',
    categoryName: 'Medicines',
    inventoryType: 'Medical',
    description: 'All types of medicines and drugs',
    stockRequired: true,
    batchTracking: true,
    expiryTracking: true,
    barcodeRequired: true,
    status: 'Active',
    remarks: 'Critical inventory'
  },
  {
    id: 2,
    categoryCode: 'CAT-002',
    categoryName: 'Surgical Items',
    inventoryType: 'Medical',
    description: 'Surgical and OT instruments',
    stockRequired: true,
    batchTracking: true,
    expiryTracking: false,
    barcodeRequired: true,
    status: 'Active',
    remarks: ''
  },
  {
    id: 3,
    categoryCode: 'CAT-003',
    categoryName: 'Medical Consumables',
    inventoryType: 'Medical',
    description: 'Disposable items like syringes, masks, gloves',
    stockRequired: true,
    batchTracking: true,
    expiryTracking: true,
    barcodeRequired: true,
    status: 'Active',
    remarks: ''
  },
  {
    id: 4,
    categoryCode: 'CAT-004',
    categoryName: 'Laboratory Supplies',
    inventoryType: 'Medical',
    description: 'Reagents and lab equipment',
    stockRequired: true,
    batchTracking: true,
    expiryTracking: true,
    barcodeRequired: true,
    status: 'Active',
    remarks: ''
  },
  {
    id: 5,
    categoryCode: 'CAT-005',
    categoryName: 'Medical Equipment',
    inventoryType: 'Medical',
    description: 'Capital equipment and monitors',
    stockRequired: true,
    batchTracking: false,
    expiryTracking: false,
    barcodeRequired: true,
    status: 'Active',
    remarks: ''
  },
  {
    id: 6,
    categoryCode: 'CAT-006',
    categoryName: 'Housekeeping Materials',
    inventoryType: 'Non-Medical',
    description: 'Cleaning and hygiene supplies',
    stockRequired: true,
    batchTracking: false,
    expiryTracking: false,
    barcodeRequired: false,
    status: 'Active',
    remarks: ''
  },
  {
    id: 7,
    categoryCode: 'CAT-007',
    categoryName: 'Linen & Laundry',
    inventoryType: 'Non-Medical',
    description: 'Gowns, sheets, and uniforms',
    stockRequired: true,
    batchTracking: false,
    expiryTracking: false,
    barcodeRequired: false,
    status: 'Active',
    remarks: ''
  },
  {
    id: 8,
    categoryCode: 'CAT-008',
    categoryName: 'Office Stationery',
    inventoryType: 'Non-Medical',
    description: 'Paper, pens, and office supplies',
    stockRequired: true,
    batchTracking: false,
    expiryTracking: false,
    barcodeRequired: false,
    status: 'Active',
    remarks: ''
  }
];

export const ItemCategoryMaster = () => {
  const [records, setRecords] = useLocalStorage<ItemCategoryRecord[]>('procurement_item_categories', initialCategories);
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.categoryCode.trim()) newErrors.categoryCode = 'Category Code is required';
    if (!formData.categoryName.trim()) newErrors.categoryName = 'Category Name is required';
    if (!formData.inventoryType) newErrors.inventoryType = 'Inventory Type is required';

    // Uniqueness checks
    if (records.some(r => r.categoryCode === formData.categoryCode && r.id !== selectedRecord?.id)) {
      newErrors.categoryCode = 'Category Code must be unique';
    }
    if (records.some(r => r.categoryName === formData.categoryName && r.id !== selectedRecord?.id)) {
      newErrors.categoryName = 'Category Name cannot be duplicated';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    const nextId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
    setFormData({
      ...emptyData,
      categoryCode: `CAT-${nextId.toString().padStart(3, '0')}`
    });
    setErrors({});
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

  const handleSaveForm = () => {
    if (!validateForm()) return;

    if (selectedRecord) {
      setRecords(records.map(r => r.id === selectedRecord.id ? { ...r, ...formData } : r));
    } else {
      const newId = Math.max(...records.map(r => r.id), 0) + 1;
      setRecords([...records, { id: newId, ...formData }]);
    }
    setIsFormOpen(false);
  };

  const confirmDelete = () => {
    if (selectedRecord) {
      // Soft Delete
      setRecords(records.filter(r => r.id !== selectedRecord.id));
      setIsDeleteOpen(false);
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Item Category Master</h1>
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
                        No categories found matching your criteria.
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
                {selectedRecord ? `Edit Category: ${selectedRecord.categoryName}` : 'Add New Category'}
              </h1>
              <p className="text-slate-500 text-sm">Fill in the item category settings and rules</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
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
                    <input type="text" value={formData.categoryName} onChange={e => setFormData({...formData, categoryName: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.categoryName ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.categoryName && <p className="text-red-500 text-xs mt-1">{errors.categoryName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Inventory Type <span className="text-red-500">*</span></label>
                    <select value={formData.inventoryType} onChange={e => setFormData({...formData, inventoryType: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.inventoryType ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Inventory Type</option>
                      <option value="Medical">Medical</option>
                      <option value="Non-Medical">Non-Medical</option>
                    </select>
                    {errors.inventoryType && <p className="text-red-500 text-xs mt-1">{errors.inventoryType}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
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
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="batchTracking" checked={formData.batchTracking} onChange={e => setFormData({...formData, batchTracking: e.target.checked})} className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                    <label htmlFor="batchTracking" className="text-sm font-medium text-slate-700">Batch Tracking</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="expiryTracking" checked={formData.expiryTracking} onChange={e => setFormData({...formData, expiryTracking: e.target.checked})} className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                    <label htmlFor="expiryTracking" className="text-sm font-medium text-slate-700">Expiry Tracking</label>
                  </div>
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
                    <input type="text" value={formData.remarks} onChange={e => setFormData({...formData, remarks: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <Button variant="outline" color="secondary" onClick={() => setFormData(emptyData)} icon={RefreshCw}>
                Reset
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" color="secondary" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button variant="filled" color="primary" onClick={handleSaveForm} icon={Save}>
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
