import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, 
  Save, RefreshCw, CheckCircle2, XCircle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

interface MedicineRecord {
  id: number;
  medicineCode: string;
  genericName: string;
  category: string;
  subCategory: string;
  manufacturer: string;
  strength: string;
  dosageForm: string;
  unit: string;
  batchTracking: boolean;
  expiryRequired: boolean;
  controlledDrug: boolean;
  reorderLevel: string;
  purchasePrice: string;
  sellingPrice: string;
  gst: string;
  barcode: string;
  status: string;
  remarks: string;
}

const emptyData: Omit<MedicineRecord, 'id'> = {
  medicineCode: '',
  genericName: '',
  category: '',
  subCategory: '',
  manufacturer: '',
  strength: '',
  dosageForm: '',
  unit: '',
  batchTracking: true,
  expiryRequired: true,
  controlledDrug: false,
  reorderLevel: '10',
  purchasePrice: '',
  sellingPrice: '',
  gst: '12',
  barcode: '',
  status: 'Active',
  remarks: ''
};

const API_BASE = import.meta.env.VITE_API_URL as string;

const mapApiToRecord = (item: any): MedicineRecord => ({
  id:             item.id,
  medicineCode:   item.medicineCode,
  genericName:    item.genericName,
  category:       item.category,
  subCategory:    item.subCategory ?? '',
  manufacturer:   item.manufacturer,
  strength:       item.strength,
  dosageForm:     item.dosageForm,
  unit:           item.unit,
  batchTracking:  Boolean(item.batchTracking),
  expiryRequired: Boolean(item.expiryRequired),
  controlledDrug: Boolean(item.controlledDrug),
  reorderLevel:   item.reorderLevel != null ? String(item.reorderLevel) : '10',
  barcode:        item.barcode || '',
  purchasePrice:  item.purchasePrice != null ? String(item.purchasePrice) : '',
  sellingPrice:   item.sellingPrice != null ? String(item.sellingPrice) : '',
  gst:            item.gst != null ? String(item.gst) : '12',
  status:         item.status,
  remarks:        item.remarks || ''
});

export const MedicineMaster = () => {
  const [records, setRecords] = useState<MedicineRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicineRecord | null>(null);
  const [formData, setFormData] = useState<Omit<MedicineRecord, 'id'>>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isErrorOpen, setIsErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Dynamic lookup
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [subCategoryList, setSubCategoryList] = useState<{ category: string; name: string }[]>([]);

  /** Sub-categories under the selected medicine category. Values already used
   *  by existing medicines are kept so an older record stays editable. */
  const subCategoriesForCategory = useMemo(() => {
    const fromMaster = subCategoryList.filter(sc => sc.category === formData.category).map(sc => sc.name);
    const fromRecords = records.filter(r => r.category === formData.category).map(r => r.subCategory);
    return Array.from(new Set([...fromMaster, ...fromRecords].filter(Boolean))).sort();
  }, [subCategoryList, records, formData.category]);

  const fetchMedicines = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/medicines/`);
      if (!res.ok) throw new Error('Failed to fetch medicines');
      const data = await res.json();
      setRecords(data.map(mapApiToRecord));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      // Categories come from the one Category master, narrowed to MEDICINE.
      // The old Master_MedicineCategory list was merged into it, so this is
      // the same set of names with a single place to maintain them.
      const [catRes, subRes] = await Promise.all([
        fetch(`${API_BASE}/categories/?inventoryType=MEDICINE&status_filter=Active`),
        fetch(`${API_BASE}/sub-categories/?status_filter=Active`),
      ]);
      if (catRes.ok) {
        const data = await catRes.json();
        setCategoriesList(data.map((c: any) => c.categoryName));
      }
      // One sub-category master serves medicines and items alike; each row
      // names its parent category, so the list below narrows to that.
      if (subRes.ok) {
        const data = await subRes.json();
        setSubCategoryList(data.map((sc: any) => ({ category: sc.category, name: sc.subCategoryName })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMedicines();
    fetchLookups();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.medicineCode.trim()) newErrors.medicineCode = 'Medicine Code is required';
    if (!formData.genericName.trim()) newErrors.genericName = 'Generic Name is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.manufacturer.trim()) newErrors.manufacturer = 'Manufacturer is required';
    if (!formData.strength.trim()) newErrors.strength = 'Strength is required';
    if (!formData.dosageForm.trim()) newErrors.dosageForm = 'Dosage Form is required';
    if (!formData.unit.trim()) newErrors.unit = 'Unit is required';
    if (!formData.purchasePrice.trim()) newErrors.purchasePrice = 'Purchase Price is required';
    if (!formData.sellingPrice.trim()) newErrors.sellingPrice = 'Selling Price is required';
    if (!formData.gst.trim()) newErrors.gst = 'GST/Tax is required';

    // Business rule checks
    const pp = parseFloat(formData.purchasePrice);
    const sp = parseFloat(formData.sellingPrice);
    if (!isNaN(pp) && !isNaN(sp) && sp < pp) {
      newErrors.sellingPrice = 'Selling Price cannot be less than Purchase Price';
    }

    const rl = parseInt(formData.reorderLevel);
    if (!isNaN(rl) && rl < 0) {
      newErrors.reorderLevel = 'Reorder Level cannot be negative';
    }

    const gstVal = parseFloat(formData.gst);
    if (isNaN(gstVal) || gstVal < 0 || gstVal > 100) {
      newErrors.gst = 'GST must be a valid percentage (0-100)';
    }

    // Uniqueness checks
    if (records.some(r => r.medicineCode.toLowerCase() === formData.medicineCode.toLowerCase() && r.id !== selectedRecord?.id)) {
      newErrors.medicineCode = 'Medicine Code must be unique';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = async () => {
    setSelectedRecord(null);
    // Fetch the real next code from the backend so it matches the DB sequence
    let nextCode = 'MED-001';
    try {
      const res = await fetch(`${API_BASE}/medicines/next-code`);
      if (res.ok) {
        const data = await res.json();
        nextCode = data.medicineCode || nextCode;
      }
    } catch {
      // fallback: compute locally if the endpoint is unreachable
      const maxNum = records.reduce((max, r) => {
        const m = r.medicineCode.match(/(\d+)$/);
        return m ? Math.max(max, parseInt(m[1])) : max;
      }, 0);
      nextCode = `MED-${String(maxNum + 1).padStart(3, '0')}`;
    }
    setFormData({ ...emptyData, medicineCode: nextCode });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: MedicineRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: MedicineRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const handleSaveForm = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const payload = {
        medicineCode:   formData.medicineCode,
        genericName:    formData.genericName,
        category:       formData.category,
        subCategory:    formData.subCategory || null,
        manufacturer:   formData.manufacturer,
        strength:       formData.strength,
        dosageForm:     formData.dosageForm,
        unit:           formData.unit,
        batchTracking:  formData.batchTracking,
        expiryRequired: formData.expiryRequired,
        controlledDrug: formData.controlledDrug,
        reorderLevel:   formData.reorderLevel,
        barcode:        formData.barcode || null,
        purchasePrice:  formData.purchasePrice,
        sellingPrice:   formData.sellingPrice,
        gst:            formData.gst,
        status:         formData.status,
        remarks:        formData.remarks || null,
        ...(selectedRecord ? { modifiedBy: 'Dr. John Doe' } : { createdBy: 'Dr. John Doe' }),
      };

      const url = selectedRecord
        ? `${API_BASE}/medicines/${selectedRecord.id}`
        : `${API_BASE}/medicines/`;
      const method = selectedRecord ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to save medicine');
      }

      await fetchMedicines();
      setIsFormOpen(false);
      setSuccessMessage('This record has been updated successfully.');
      setIsSuccessOpen(true);
    } catch (err: any) {
      setErrorMessage(err.message);
      setIsErrorOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;
    try {
      const res = await fetch(`${API_BASE}/medicines/${selectedRecord.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete medicine');
      await fetchMedicines();
      setIsDeleteOpen(false);
      setSuccessMessage('This record has been deleted successfully.');
      setIsSuccessOpen(true);
    } catch (err: any) {
      setErrorMessage(err.message);
      setIsErrorOpen(true);
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.medicineCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !filterCategory || record.category === filterCategory;
    const matchesStatus = !filterStatus || record.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Medicine</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>
            <div className="flex gap-3">
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
                Add Medicine
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Generic, Brand, Code, or Manufacturer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
              <button onClick={() => setShowFilters(!showFilters)} title="Filters" className={showFilters ? "p-2 border rounded-lg transition-colors border-primary bg-primary/5 text-primary" : "p-2 border rounded-lg transition-colors border-slate-200 text-slate-500 hover:bg-slate-50"}>
                <Filter className="w-4 h-4" />
              </button>
              <button onClick={() => { setSearchTerm(''); setFilterCategory(''); setFilterStatus(''); }} title="Clear search & filters" className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
              <button onClick={() => exportToExcel(records, 'MedicineMaster')} title="Export to Excel" className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Categories</option>
                      {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
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
                    <th className="px-4 py-3 font-medium">Medicine Code</th>
                    <th className="px-4 py-3 font-medium">Generic Name</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium text-right">Selling Price (₹)</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    pagedRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{record.medicineCode}</td>
                        <td className="px-4 py-3">
                          {record.genericName}
                          {record.controlledDrug && <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold" title="Controlled Drug">CD</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{record.category}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">{record.sellingPrice}</td>
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
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        {isLoading ? 'Loading records...' : 'No medicines found matching your criteria.'}
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
                {selectedRecord ? `Edit Medicine: ${selectedRecord.genericName}` : 'Add New Medicine'}
              </h1>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Basic Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Medicine Code <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.medicineCode} readOnly maxLength={10} className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed" />
                    {errors.medicineCode && <p className="text-red-500 text-xs mt-1">{errors.medicineCode}</p>}
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Generic Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.genericName} onChange={e => setFormData({...formData, genericName: e.target.value})} maxLength={50} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.genericName ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.genericName && <p className="text-red-500 text-xs mt-1">{errors.genericName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Medicine Category <span className="text-red-500">*</span></label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.category ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Category</option>
                      {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sub Category</label>
                    <select
                      value={formData.subCategory}
                      onChange={e => setFormData({ ...formData, subCategory: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    >
                      <option value="">Select Sub Category</option>
                      {subCategoriesForCategory.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                    </select>
                    {formData.category && subCategoriesForCategory.length === 0 && (
                      <p className="text-amber-600 text-xs mt-1">
                        No sub-categories under “{formData.category}” — add one in Sub Category master.
                      </p>
                    )}
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Manufacturer <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} maxLength={50} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.manufacturer ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.manufacturer && <p className="text-red-500 text-xs mt-1">{errors.manufacturer}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Strength <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="e.g. 500mg" value={formData.strength} onChange={e => setFormData({...formData, strength: e.target.value})} maxLength={50} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.strength ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.strength && <p className="text-red-500 text-xs mt-1">{errors.strength}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Dosage Form <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="e.g. Tablet" value={formData.dosageForm} onChange={e => setFormData({...formData, dosageForm: e.target.value})} maxLength={50} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.dosageForm ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.dosageForm && <p className="text-red-500 text-xs mt-1">{errors.dosageForm}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unit <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="e.g. Strip" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} maxLength={50} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.unit ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit}</p>}
                  </div>
                </div>
              </section>

              {/* Pricing Details */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Pricing Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Price (₹) <span className="text-red-500">*</span></label>
                    <input type="number" min="0" step="0.01" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} maxLength={50} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.purchasePrice ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.purchasePrice && <p className="text-red-500 text-xs mt-1">{errors.purchasePrice}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price (₹) <span className="text-red-500">*</span></label>
                    <input type="number" min="0" step="0.01" value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: e.target.value})} maxLength={50} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.sellingPrice ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.sellingPrice && <p className="text-red-500 text-xs mt-1">{errors.sellingPrice}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">GST/Tax (%) <span className="text-red-500">*</span></label>
                    <input type="number" min="0" max="100" value={formData.gst} onChange={e => setFormData({...formData, gst: e.target.value})} maxLength={50} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.gst ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.gst && <p className="text-red-500 text-xs mt-1">{errors.gst}</p>}
                  </div>
                </div>
              </section>

              {/* Inventory & Tracking Details */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Inventory & Tracking Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="flex flex-col gap-3 justify-center">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="batchTracking" checked={formData.batchTracking} onChange={e => setFormData({...formData, batchTracking: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                      <label htmlFor="batchTracking" className="text-sm text-slate-700 font-medium">Batch Tracking Enabled</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="expiryRequired" checked={formData.expiryRequired} onChange={e => setFormData({...formData, expiryRequired: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                      <label htmlFor="expiryRequired" className="text-sm text-slate-700 font-medium">Expiry Required</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="controlledDrug" checked={formData.controlledDrug} onChange={e => setFormData({...formData, controlledDrug: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                      <label htmlFor="controlledDrug" className="text-sm text-red-600 font-bold">Controlled Drug</label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Level</label>
                    <input type="number" min="0" value={formData.reorderLevel} onChange={e => setFormData({...formData, reorderLevel: e.target.value})} maxLength={50} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.reorderLevel ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.reorderLevel && <p className="text-red-500 text-xs mt-1">{errors.reorderLevel}</p>}
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Barcode (Optional)</label>
                    <input type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} maxLength={10} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
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
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Record</h3>
          <p className="text-slate-500 text-sm mb-6">
            Are you sure you want to delete Medicine <span className="font-semibold text-slate-700">{selectedRecord?.genericName}</span>?
          </p>
          <div className="flex items-center gap-3 w-full">
            <Button variant="outline" color="secondary" className="flex-1" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="filled" color="danger" className="flex-1" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        title="Success"
        maxWidth="sm"
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
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

      {/* Error Modal */}
      <Modal
        isOpen={isErrorOpen}
        onClose={() => setIsErrorOpen(false)}
        title="Error"
        maxWidth="sm"
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
            <XCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Error</h3>
          <p className="text-slate-500 text-sm mb-6">
            {errorMessage}
          </p>
          
          <div className="flex items-center justify-center w-full">
            <Button variant="filled" color="primary" className="w-full" onClick={() => setIsErrorOpen(false)}>
              OK
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};


