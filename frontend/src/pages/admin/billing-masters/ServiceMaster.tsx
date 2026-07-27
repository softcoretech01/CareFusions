import { useState } from 'react';
import { 
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, 
  Save, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

interface ServiceRecord {
  id: number;
  serviceCode: string;
  serviceName: string;
  serviceCategory: string;
  department: string;
  description: string;
  standardPrice: number;
  costPrice: number;
  taxApplicable: boolean;
  tax: string;
  allowDiscount: boolean;
  requiresDoctorApproval: boolean;
  availableForOp: boolean;
  availableForIp: boolean;
  availableForEmergency: boolean;
  status: string;
  remarks: string;
}

const emptyData: Omit<ServiceRecord, 'id'> = {
  serviceCode: '',
  serviceName: '',
  serviceCategory: '',
  department: '',
  description: '',
  standardPrice: 0,
  costPrice: 0,
  taxApplicable: false,
  tax: '',
  allowDiscount: false,
  requiresDoctorApproval: false,
  availableForOp: false,
  availableForIp: false,
  availableForEmergency: false,
  status: 'Active',
  remarks: ''
};

const mockData: ServiceRecord[] = [
  { id: 1, serviceCode: 'SRV-001', serviceName: 'Consultation', serviceCategory: 'Clinical', department: 'General Medicine', description: 'Doctor consultation', standardPrice: 500, costPrice: 0, taxApplicable: true, tax: 'GST 18%', allowDiscount: true, requiresDoctorApproval: false, availableForOp: true, availableForIp: true, availableForEmergency: true, status: 'Active', remarks: '' },
  { id: 2, serviceCode: 'SRV-002', serviceName: 'Room Charges', serviceCategory: 'Accommodation', department: 'Inpatient', description: 'Daily room charge', standardPrice: 2000, costPrice: 0, taxApplicable: false, tax: '', allowDiscount: false, requiresDoctorApproval: false, availableForOp: false, availableForIp: true, availableForEmergency: false, status: 'Active', remarks: '' },
  { id: 3, serviceCode: 'SRV-003', serviceName: 'Nursing Charges', serviceCategory: 'Clinical', department: 'Nursing', description: 'Daily nursing care', standardPrice: 1000, costPrice: 0, taxApplicable: false, tax: '', allowDiscount: false, requiresDoctorApproval: false, availableForOp: false, availableForIp: true, availableForEmergency: false, status: 'Active', remarks: '' },
  { id: 4, serviceCode: 'SRV-004', serviceName: 'Laboratory', serviceCategory: 'Diagnostics', department: 'Pathology', description: 'General lab tests', standardPrice: 1500, costPrice: 0, taxApplicable: true, tax: 'GST 5%', allowDiscount: true, requiresDoctorApproval: true, availableForOp: true, availableForIp: true, availableForEmergency: true, status: 'Active', remarks: '' },
  { id: 5, serviceCode: 'SRV-005', serviceName: 'Radiology', serviceCategory: 'Diagnostics', department: 'Radiology', description: 'Imaging services', standardPrice: 3000, costPrice: 0, taxApplicable: true, tax: 'GST 12%', allowDiscount: true, requiresDoctorApproval: true, availableForOp: true, availableForIp: true, availableForEmergency: true, status: 'Active', remarks: '' },
  { id: 6, serviceCode: 'SRV-006', serviceName: 'Pharmacy', serviceCategory: 'Medicines', department: 'Pharmacy', description: 'Medications', standardPrice: 0, costPrice: 0, taxApplicable: true, tax: 'GST 5%', allowDiscount: true, requiresDoctorApproval: true, availableForOp: true, availableForIp: true, availableForEmergency: true, status: 'Active', remarks: '' },
  { id: 7, serviceCode: 'SRV-007', serviceName: 'Surgery', serviceCategory: 'Surgical', department: 'Operation Theatre', description: 'Surgical procedures', standardPrice: 15000, costPrice: 0, taxApplicable: true, tax: 'GST 18%', allowDiscount: false, requiresDoctorApproval: true, availableForOp: false, availableForIp: true, availableForEmergency: true, status: 'Active', remarks: '' },
  { id: 8, serviceCode: 'SRV-008', serviceName: 'ICU', serviceCategory: 'Intensive Care', department: 'ICU', description: 'Intensive care unit charges', standardPrice: 5000, costPrice: 0, taxApplicable: false, tax: '', allowDiscount: false, requiresDoctorApproval: true, availableForOp: false, availableForIp: true, availableForEmergency: true, status: 'Active', remarks: '' },
  { id: 9, serviceCode: 'SRV-009', serviceName: 'Ambulance', serviceCategory: 'Transport', department: 'Emergency', description: 'Ambulance service', standardPrice: 1500, costPrice: 0, taxApplicable: false, tax: '', allowDiscount: false, requiresDoctorApproval: false, availableForOp: false, availableForIp: false, availableForEmergency: true, status: 'Active', remarks: '' }
];

export const ServiceMaster = () => {
  const [records, setRecords] = useState<ServiceRecord[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null);
  const [formData, setFormData] = useState<Omit<ServiceRecord, 'id'>>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const departments = Array.from(new Set(records.map(r => r.department))).sort();
  const categories = Array.from(new Set(records.map(r => r.serviceCategory))).sort();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.serviceCode.trim()) newErrors.serviceCode = 'Service Code is required';
    if (!formData.serviceName.trim()) newErrors.serviceName = 'Service Name is required';
    if (!formData.serviceCategory.trim()) newErrors.serviceCategory = 'Category is required';
    if (!formData.department.trim()) newErrors.department = 'Department is required';
    if (formData.standardPrice <= 0) newErrors.standardPrice = 'Price must be greater than zero';
    if (formData.taxApplicable && !formData.tax.trim()) newErrors.tax = 'Tax selection is required when Tax is applicable';

    // Uniqueness checks
    if (records.some(r => r.serviceCode.toLowerCase() === formData.serviceCode.toLowerCase() && r.id !== selectedRecord?.id)) {
      newErrors.serviceCode = 'Service Code must be unique';
    }
    if (records.some(r => r.serviceName.toLowerCase() === formData.serviceName.toLowerCase() && r.id !== selectedRecord?.id)) {
      newErrors.serviceName = 'Service Name cannot be duplicated';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    const nextId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
    setFormData({
      ...emptyData,
      serviceCode: `SRV-${nextId.toString().padStart(3, '0')}`
    });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: ServiceRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: ServiceRecord) => {
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
      record.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.serviceCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = !filterDepartment || record.department === filterDepartment;
    const matchesCategory = !filterCategory || record.serviceCategory === filterCategory;
    const matchesStatus = !filterStatus || record.status === filterStatus;

    return matchesSearch && matchesDept && matchesCategory && matchesStatus;
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
              <h1 className="text-3xl font-bold text-slate-800">Service Master</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" icon={Download} onClick={() => exportToExcel(records, 'ServiceMaster')}>Export</Button>
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
                Add Service
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Service Name or Code..."
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select
                      value={filterDepartment}
                      onChange={(e) => setFilterDepartment(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Departments</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
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
                    <th className="px-4 py-3 font-medium">Service Code</th>
                    <th className="px-4 py-3 font-medium">Service Name</th>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{record.serviceCode}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{record.serviceName}</td>
                      <td className="px-4 py-3 text-slate-600">{record.department}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs">
                          {record.serviceCategory}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium">₹{record.standardPrice.toFixed(2)}</td>
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
                  ))}
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No services found matching your criteria.
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
                {selectedRecord ? `Edit Service: ${selectedRecord.serviceName}` : 'Add New Service'}
              </h1>
              <p className="text-slate-500 text-sm">Configure hospital billing service</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Basic Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Service Code <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.serviceCode} readOnly className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed focus:outline-none" />
                    {errors.serviceCode && <p className="text-red-500 text-xs mt-1">{errors.serviceCode}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Service Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.serviceName} onChange={e => setFormData({...formData, serviceName: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.serviceName ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.serviceName && <p className="text-red-500 text-xs mt-1">{errors.serviceName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Service Category <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.serviceCategory} onChange={e => setFormData({...formData, serviceCategory: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.serviceCategory ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.serviceCategory && <p className="text-red-500 text-xs mt-1">{errors.serviceCategory}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.department ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

              {/* Pricing Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Pricing Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Standard Price <span className="text-red-500">*</span></label>
                    <input type="number" min="0" value={formData.standardPrice} onChange={e => setFormData({...formData, standardPrice: Number(e.target.value)})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.standardPrice ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.standardPrice && <p className="text-red-500 text-xs mt-1">{errors.standardPrice}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cost Price</label>
                    <input type="number" min="0" value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  
                  <div className="flex flex-col gap-3 justify-center">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="taxApplicable" checked={formData.taxApplicable} onChange={e => { setFormData({...formData, taxApplicable: e.target.checked}); if(!e.target.checked) setFormData(f => ({...f, tax: ''})); }} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                      <label htmlFor="taxApplicable" className="text-sm font-medium text-slate-700">Tax Applicable <span className="text-red-500">*</span></label>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tax Selection {formData.taxApplicable && <span className="text-red-500">*</span>}</label>
                    <select disabled={!formData.taxApplicable} value={formData.tax} onChange={e => setFormData({...formData, tax: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.tax ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'} disabled:opacity-50`}>
                      <option value="">Select Tax</option>
                      <option value="GST 5%">GST 5%</option>
                      <option value="GST 12%">GST 12%</option>
                      <option value="GST 18%">GST 18%</option>
                    </select>
                    {errors.tax && <p className="text-red-500 text-xs mt-1">{errors.tax}</p>}
                  </div>
                </div>
              </section>

              {/* Configuration */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Configuration</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="allowDiscount" checked={formData.allowDiscount} onChange={e => setFormData({...formData, allowDiscount: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                    <label htmlFor="allowDiscount" className="text-sm text-slate-700">Allow Discount</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="requiresDoctorApproval" checked={formData.requiresDoctorApproval} onChange={e => setFormData({...formData, requiresDoctorApproval: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                    <label htmlFor="requiresDoctorApproval" className="text-sm text-slate-700">Requires Doctor Approval</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="availableForOp" checked={formData.availableForOp} onChange={e => setFormData({...formData, availableForOp: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                    <label htmlFor="availableForOp" className="text-sm text-slate-700">Available for OP</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="availableForIp" checked={formData.availableForIp} onChange={e => setFormData({...formData, availableForIp: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                    <label htmlFor="availableForIp" className="text-sm text-slate-700">Available for IP</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="availableForEmergency" checked={formData.availableForEmergency} onChange={e => setFormData({...formData, availableForEmergency: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                    <label htmlFor="availableForEmergency" className="text-sm text-slate-700">Available for Emergency</label>
                  </div>
                </div>
              </section>

              {/* System */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">System</h3>
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
              Are you sure you want to delete Service <strong>{selectedRecord?.serviceName}</strong>? 
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
