import { useState } from 'react';
import { 
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, 
  Save, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

interface MedicineRecord {
  id: number;
  medicineCode: string;
  genericName: string;
  brandName: string;
  category: string;
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
  brandName: '',
  category: '',
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

const mockData: MedicineRecord[] = [
  {
    id: 1,
    medicineCode: 'MED-001',
    genericName: 'Paracetamol',
    brandName: 'Dolo 650',
    category: 'Tablets',
    manufacturer: 'Micro Labs Ltd',
    strength: '650mg',
    dosageForm: 'Tablet',
    unit: 'Strip',
    batchTracking: true,
    expiryRequired: true,
    controlledDrug: false,
    reorderLevel: '50',
    purchasePrice: '25.00',
    sellingPrice: '30.00',
    gst: '12',
    barcode: '8901111222333',
    status: 'Active',
    remarks: ''
  },
  {
    id: 2,
    medicineCode: 'MED-002',
    genericName: 'Amoxicillin',
    brandName: 'Amoxil',
    category: 'Capsules',
    manufacturer: 'GSK',
    strength: '500mg',
    dosageForm: 'Capsule',
    unit: 'Strip',
    batchTracking: true,
    expiryRequired: true,
    controlledDrug: true,
    reorderLevel: '20',
    purchasePrice: '100.00',
    sellingPrice: '125.00',
    gst: '12',
    barcode: '8904444555666',
    status: 'Active',
    remarks: ''
  }
];

const categories = ['Tablets', 'Capsules', 'Syrups', 'Injections', 'Ointments', 'Drops', 'Vaccines'];

export const MedicineMaster = () => {
  const [records, setRecords] = useState<MedicineRecord[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');
  
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.medicineCode.trim()) newErrors.medicineCode = 'Medicine Code is required';
    if (!formData.genericName.trim()) newErrors.genericName = 'Generic Name is required';
    if (!formData.brandName.trim()) newErrors.brandName = 'Brand Name is required';
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

  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData(emptyData);
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
      record.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.medicineCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.manufacturer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !filterCategory || record.category === filterCategory;
    const matchesStatus = !filterStatus || record.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

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
              <h1 className="text-3xl font-bold text-slate-800">Medicine Master</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" icon={Download} onClick={() => exportToExcel(records, 'MedicineMaster')}>Export</Button>
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
              <Button
                variant={showFilters ? "filled" : "outline"}
                color="secondary"
                icon={Filter}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
              </Button>
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
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
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
                    <th className="px-4 py-3 font-medium">Brand Name</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Strength</th>
                    <th className="px-4 py-3 font-medium text-right">Selling Price (₹)</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{record.medicineCode}</td>
                        <td className="px-4 py-3">
                          {record.genericName}
                          {record.controlledDrug && <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold" title="Controlled Drug">CD</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{record.brandName}</td>
                        <td className="px-4 py-3 text-slate-600">{record.category}</td>
                        <td className="px-4 py-3 text-slate-600">{record.strength}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">{record.sellingPrice}</td>
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
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        No medicines found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {selectedRecord ? `Edit Medicine: ${selectedRecord.brandName}` : 'Add New Medicine'}
              </h1>
              <p className="text-slate-500 text-sm">Define a new medicine in the pharmacy inventory</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Basic Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Medicine Code <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.medicineCode} onChange={e => setFormData({...formData, medicineCode: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all ${errors.medicineCode ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.medicineCode && <p className="text-red-500 text-xs mt-1">{errors.medicineCode}</p>}
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Generic Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.genericName} onChange={e => setFormData({...formData, genericName: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.genericName ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.genericName && <p className="text-red-500 text-xs mt-1">{errors.genericName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Brand Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.brandName} onChange={e => setFormData({...formData, brandName: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.brandName ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.brandName && <p className="text-red-500 text-xs mt-1">{errors.brandName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Medicine Category <span className="text-red-500">*</span></label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.category ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Category</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Manufacturer <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.manufacturer ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.manufacturer && <p className="text-red-500 text-xs mt-1">{errors.manufacturer}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Strength <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="e.g. 500mg" value={formData.strength} onChange={e => setFormData({...formData, strength: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.strength ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.strength && <p className="text-red-500 text-xs mt-1">{errors.strength}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Dosage Form <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="e.g. Tablet" value={formData.dosageForm} onChange={e => setFormData({...formData, dosageForm: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.dosageForm ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.dosageForm && <p className="text-red-500 text-xs mt-1">{errors.dosageForm}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unit <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="e.g. Strip" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.unit ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
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
                    <input type="number" min="0" step="0.01" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.purchasePrice ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.purchasePrice && <p className="text-red-500 text-xs mt-1">{errors.purchasePrice}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price (₹) <span className="text-red-500">*</span></label>
                    <input type="number" min="0" step="0.01" value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.sellingPrice ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.sellingPrice && <p className="text-red-500 text-xs mt-1">{errors.sellingPrice}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">GST/Tax (%) <span className="text-red-500">*</span></label>
                    <input type="number" min="0" max="100" value={formData.gst} onChange={e => setFormData({...formData, gst: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.gst ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
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
                    <input type="number" min="0" value={formData.reorderLevel} onChange={e => setFormData({...formData, reorderLevel: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.reorderLevel ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.reorderLevel && <p className="text-red-500 text-xs mt-1">{errors.reorderLevel}</p>}
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Barcode (Optional)</label>
                    <input type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

              {/* System Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">System Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status <span className="text-red-500">*</span></label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
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
              Are you sure you want to delete Medicine <strong>{selectedRecord?.brandName}</strong>? 
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
