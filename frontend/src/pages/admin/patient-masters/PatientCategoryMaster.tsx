import { API_BASE_URL } from '@/utils/apiBase';
import { useState, useEffect } from 'react';
import {
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle,
  Save, RefreshCw, CheckCircle2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

interface PatientCategoryRecord {
  id: number;
  categoryCode: string;
  categoryName: string;
  description: string;
  billingType: string;
  defaultDiscount: string;
  creditLimit: string;
  approvalRequired: boolean;
  insuranceApplicable: boolean;
  corporateApplicable: boolean;
  status: string;
  remarks: string;
}

const emptyData: Omit<PatientCategoryRecord, 'id'> = {
  categoryCode: '',
  categoryName: '',
  description: '',
  billingType: 'Cash',
  defaultDiscount: '0',
  creditLimit: '0',
  approvalRequired: false,
  insuranceApplicable: false,
  corporateApplicable: false,
  status: 'Active',
  remarks: ''
};

const API_BASE = API_BASE_URL;

const mapApiToRecord = (item: any): PatientCategoryRecord => ({
  id: item.id,
  categoryCode: item.categoryCode,
  categoryName: item.categoryName,
  description: item.description || '',
  billingType: item.billingType,
  defaultDiscount: item.defaultDiscount || '0',
  creditLimit: item.creditLimit || '0',
  approvalRequired: Boolean(item.approvalRequired),
  insuranceApplicable: Boolean(item.insuranceApplicable),
  corporateApplicable: Boolean(item.corporateApplicable),
  status: item.status,
  remarks: item.remarks || ''
});

export const PatientCategoryMaster = () => {
  const [records, setRecords] = useState<PatientCategoryRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterBillingType, setFilterBillingType] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PatientCategoryRecord | null>(null);
  const [formData, setFormData] = useState<Omit<PatientCategoryRecord, 'id'>>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/patient-categories/`);
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      setRecords(data.map(mapApiToRecord));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.categoryCode.trim()) newErrors.categoryCode = 'Category Code is required';
    if (!formData.categoryName.trim()) newErrors.categoryName = 'Category Name is required';
    if (!formData.billingType) newErrors.billingType = 'Billing Type is required';

    if (Number(formData.defaultDiscount) > 100 || Number(formData.defaultDiscount) < 0) {
      newErrors.defaultDiscount = 'Discount must be between 0 and 100';
    }

    // Uniqueness checks
    if (records.some(r => r.categoryCode === formData.categoryCode && r.id !== selectedRecord?.id)) {
      newErrors.categoryCode = 'Category Code must be unique';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = async () => {
    let nextCode = '';
    try {
      const res = await fetch(`${API_BASE}/patient-categories/next-code`);
      if (res.ok) {
        const data = await res.json();
        nextCode = data.nextCode;
      }
    } catch (err) {
      console.error("Failed to fetch next code", err);
    }
    setSelectedRecord(null);
    setFormData({ ...emptyData, categoryCode: nextCode });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: PatientCategoryRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: PatientCategoryRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const handleSaveForm = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const payload = {
        categoryCode: formData.categoryCode,
        categoryName: formData.categoryName,
        description: formData.description || null,
        billingType: formData.billingType,
        defaultDiscount: parseFloat(formData.defaultDiscount) || 0,
        creditLimit: parseFloat(formData.creditLimit) || 0,
        approvalRequired: formData.approvalRequired,
        insuranceApplicable: formData.insuranceApplicable,
        corporateApplicable: formData.corporateApplicable,
        status: formData.status,
        remarks: formData.remarks || null,
        ...(selectedRecord ? { modifiedBy: 'Dr. John Doe' } : { createdBy: 'Dr. John Doe' }),
      };

      const url = selectedRecord
        ? `${API_BASE}/patient-categories/${selectedRecord.id}`
        : `${API_BASE}/patient-categories/`;
      const method = selectedRecord ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to save category');
      }

      await fetchCategories();
      setIsFormOpen(false);
      setSuccessMessage('This record has been updated successfully.');
      setIsSuccessOpen(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;
    try {
      const res = await fetch(`${API_BASE}/patient-categories/${selectedRecord.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete category');
      await fetchCategories();
      setIsDeleteOpen(false);
      setSuccessMessage('This record has been deleted successfully.');
      setIsSuccessOpen(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch =
      record.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.categoryCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBillingType = !filterBillingType || record.billingType === filterBillingType;

    return matchesSearch && matchesBillingType;
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
              <h1 className="text-3xl font-bold text-slate-800">Patient Category</h1>
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
                  placeholder="Search by Category Name or Code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowFilters(!showFilters)} title="Filters" className={showFilters ? "p-2 border rounded-lg transition-colors border-primary bg-primary/5 text-primary" : "p-2 border rounded-lg transition-colors border-slate-200 text-slate-500 hover:bg-slate-50"}>
                  <Filter className="w-4 h-4" />
                </button>
                <button onClick={() => { setSearchTerm(''); setFilterBillingType(''); }} title="Clear search & filters" className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <button onClick={() => exportToExcel(records, 'PatientCategoryMaster')} title="Export to Excel" className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
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
                      value={filterBillingType}
                      onChange={(e) => setFilterBillingType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Billing Types</option>
                      <option value="Cash">Cash</option>
                      <option value="Credit">Credit</option>
                      <option value="Insurance">Insurance</option>
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
                    <th className="px-4 py-3 font-medium">Discount (%)</th>
                    <th className="px-4 py-3 font-medium">Billing Type</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    pagedRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{record.categoryCode}</td>
                        <td className="px-4 py-3">{record.categoryName}</td>
                        <td className="px-4 py-3 text-slate-600">{record.defaultDiscount}%</td>
                        <td className="px-4 py-3 text-slate-600">{record.billingType}</td>
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
                        {isLoading ? 'Loading records...' : 'No patient categories found matching your criteria.'}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category Code <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.categoryCode}
                      readOnly
                      maxLength={10} className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.categoryName} onChange={e => setFormData({ ...formData, categoryName: e.target.value })} maxLength={50} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.categoryName ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.categoryName && <p className="text-red-500 text-xs mt-1">{errors.categoryName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} maxLength={250} rows={1} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

              {/* Billing Details */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Billing Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Billing Type <span className="text-red-500">*</span></label>
                    <select value={formData.billingType} onChange={e => setFormData({ ...formData, billingType: e.target.value })} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.billingType ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="Cash">Cash</option>
                      <option value="Credit">Credit</option>
                      <option value="Insurance">Insurance</option>
                    </select>
                    {errors.billingType && <p className="text-red-500 text-xs mt-1">{errors.billingType}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Default Discount (%)</label>
                    <input type="number" min="0" max="100" value={formData.defaultDiscount} onChange={e => setFormData({ ...formData, defaultDiscount: e.target.value })} maxLength={50} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.defaultDiscount ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.defaultDiscount && <p className="text-red-500 text-xs mt-1">{errors.defaultDiscount}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Credit Limit</label>
                    <input type="number" min="0" value={formData.creditLimit} onChange={e => setFormData({ ...formData, creditLimit: e.target.value })} maxLength={50} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="flex items-center gap-2 md:col-span-3">
                    <input type="checkbox" id="approvalRequired" checked={formData.approvalRequired} onChange={e => setFormData({ ...formData, approvalRequired: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                    <label htmlFor="approvalRequired" className="text-sm text-slate-700">Approval Required for Billing</label>
                  </div>
                </div>
              </section>

              {/* Insurance */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Insurance</h3>
                <div className="flex flex-wrap items-center gap-8">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="insuranceApplicable" checked={formData.insuranceApplicable} onChange={e => setFormData({ ...formData, insuranceApplicable: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                    <label htmlFor="insuranceApplicable" className="text-sm text-slate-700">Insurance Applicable</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="corporateApplicable" checked={formData.corporateApplicable} onChange={e => setFormData({ ...formData, corporateApplicable: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                    <label htmlFor="corporateApplicable" className="text-sm text-slate-700">Corporate Applicable</label>
                  </div>
                </div>
              </section>

              {/* System */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">System</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                    <input type="text" value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} maxLength={250} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-6 flex items-center justify-between pt-6 border-t border-slate-100">
              <Button variant="outline" color="secondary" onClick={() => setFormData(selectedRecord ? selectedRecord : { ...emptyData, categoryCode: formData.categoryCode })} icon={RefreshCw}>
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
            Are you sure you want to delete Category <span className="font-semibold text-slate-700">{selectedRecord?.categoryName}</span>?
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
    </motion.div>
  );
};


