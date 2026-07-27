import { useState } from 'react';
import { 
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, 
  Save, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

interface RadiologyServiceRecord {
  id: number;
  serviceCode: string;
  serviceName: string;
  department: string;
  description: string;
  serviceCategory: string;
  estimatedDuration: string;
  reportTat: string;
  requiresAppointment: boolean;
  requiresContrast: boolean;
  requiresFasting: boolean;
  servicePrice: string;
  gst: string;
  reportTemplate: string;
  requiresApproval: boolean;
  criticalFindingAlert: boolean;
  status: string;
  remarks: string;
}

const emptyData: Omit<RadiologyServiceRecord, 'id'> = {
  serviceCode: '',
  serviceName: '',
  department: '',
  description: '',
  serviceCategory: '',
  estimatedDuration: '',
  reportTat: '',
  requiresAppointment: true,
  requiresContrast: false,
  requiresFasting: false,
  servicePrice: '',
  gst: '',
  reportTemplate: '',
  requiresApproval: true,
  criticalFindingAlert: false,
  status: 'Active',
  remarks: ''
};

const mockData: RadiologyServiceRecord[] = [
  {
    id: 1,
    serviceCode: 'RAD-001',
    serviceName: 'Chest X-Ray',
    department: 'Radiology',
    description: 'Standard PA View',
    serviceCategory: 'X-Ray',
    estimatedDuration: '15',
    reportTat: '2',
    requiresAppointment: false,
    requiresContrast: false,
    requiresFasting: false,
    servicePrice: '500.00',
    gst: '0',
    reportTemplate: 'Standard X-Ray',
    requiresApproval: true,
    criticalFindingAlert: false,
    status: 'Active',
    remarks: ''
  },
  {
    id: 2,
    serviceCode: 'RAD-002',
    serviceName: 'MRI Brain with Contrast',
    department: 'Radiology',
    description: 'Detailed brain imaging',
    serviceCategory: 'MRI',
    estimatedDuration: '45',
    reportTat: '24',
    requiresAppointment: true,
    requiresContrast: true,
    requiresFasting: true,
    servicePrice: '8500.00',
    gst: '0',
    reportTemplate: 'Standard MRI',
    requiresApproval: true,
    criticalFindingAlert: true,
    status: 'Active',
    remarks: ''
  }
];

const serviceCategories = ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Mammogram', 'ECG', 'Echo', 'PET Scan'];
const departments = ['Radiology', 'Cardiology', 'Nuclear Medicine'];

export const RadiologyServiceMaster = () => {
  const [records, setRecords] = useState<RadiologyServiceRecord[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RadiologyServiceRecord | null>(null);
  const [formData, setFormData] = useState<Omit<RadiologyServiceRecord, 'id'>>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.serviceCode.trim()) newErrors.serviceCode = 'Service Code is required';
    if (!formData.serviceName.trim()) newErrors.serviceName = 'Service Name is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.serviceCategory) newErrors.serviceCategory = 'Service Category is required';

    if (!formData.estimatedDuration.trim()) newErrors.estimatedDuration = 'Estimated Duration is required';
    else if (Number(formData.estimatedDuration) <= 0) newErrors.estimatedDuration = 'Duration must be greater than zero';

    if (!formData.reportTat.trim()) newErrors.reportTat = 'Report Turnaround Time is required';
    else if (Number(formData.reportTat) <= 0) newErrors.reportTat = 'Turnaround Time must be greater than zero';

    if (!formData.servicePrice.trim()) newErrors.servicePrice = 'Service Price is required';
    else if (Number(formData.servicePrice) <= 0) newErrors.servicePrice = 'Price must be greater than zero';

    // Uniqueness checks
    if (records.some(r => r.serviceCode.toLowerCase() === formData.serviceCode.toLowerCase() && r.id !== selectedRecord?.id)) {
      newErrors.serviceCode = 'Service Code must be unique';
    }
    if (records.some(r => r.serviceName.toLowerCase() === formData.serviceName.toLowerCase() && r.id !== selectedRecord?.id)) {
      newErrors.serviceName = 'Service Name must be unique';
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

  const handleEdit = (record: RadiologyServiceRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: RadiologyServiceRecord) => {
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
    
    const matchesDepartment = !filterDepartment || record.department === filterDepartment;
    const matchesCategory = !filterCategory || record.serviceCategory === filterCategory;
    const matchesStatus = !filterStatus || record.status === filterStatus;

    return matchesSearch && matchesDepartment && matchesCategory && matchesStatus;
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
              <h1 className="text-3xl font-bold text-slate-800">Radiology Service Master</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" icon={Download} onClick={() => exportToExcel(records, 'RadiologyServiceMaster')}>Export</Button>
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      {serviceCategories.map(sc => <option key={sc} value={sc}>{sc}</option>)}
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
                    <th className="px-4 py-3 font-medium text-right">Price (₹)</th>
                    <th className="px-4 py-3 font-medium text-center">Report TAT</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{record.serviceCode}</td>
                        <td className="px-4 py-3">
                          {record.serviceName}
                          {record.requiresAppointment && <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold" title="Appointment Required">APP</span>}
                          {record.requiresContrast && <span className="ml-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold" title="Contrast Required">CON</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{record.department}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">{record.servicePrice}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{record.reportTat} Hrs</td>
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
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No radiology services found matching your criteria.
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
              <p className="text-slate-500 text-sm">Define a new radiology service</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Basic Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Service Code <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.serviceCode} onChange={e => setFormData({...formData, serviceCode: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all ${errors.serviceCode ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.serviceCode && <p className="text-red-500 text-xs mt-1">{errors.serviceCode}</p>}
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Service Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.serviceName} onChange={e => setFormData({...formData, serviceName: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.serviceName ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.serviceName && <p className="text-red-500 text-xs mt-1">{errors.serviceName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department <span className="text-red-500">*</span></label>
                    <select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.department ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                    <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

              {/* Service Details */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Service Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Service Category <span className="text-red-500">*</span></label>
                    <select value={formData.serviceCategory} onChange={e => setFormData({...formData, serviceCategory: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.serviceCategory ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Category</option>
                      {serviceCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.serviceCategory && <p className="text-red-500 text-xs mt-1">{errors.serviceCategory}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Duration (Mins) <span className="text-red-500">*</span></label>
                    <input type="number" min="1" value={formData.estimatedDuration} onChange={e => setFormData({...formData, estimatedDuration: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.estimatedDuration ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.estimatedDuration && <p className="text-red-500 text-xs mt-1">{errors.estimatedDuration}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Report Turnaround Time (Hrs) <span className="text-red-500">*</span></label>
                    <input type="number" min="1" value={formData.reportTat} onChange={e => setFormData({...formData, reportTat: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.reportTat ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.reportTat && <p className="text-red-500 text-xs mt-1">{errors.reportTat}</p>}
                  </div>
                  <div className="lg:col-span-3 flex flex-wrap gap-6 mt-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="requiresAppointment" checked={formData.requiresAppointment} onChange={e => setFormData({...formData, requiresAppointment: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                      <label htmlFor="requiresAppointment" className="text-sm text-slate-700 font-medium">Requires Appointment</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="requiresContrast" checked={formData.requiresContrast} onChange={e => setFormData({...formData, requiresContrast: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                      <label htmlFor="requiresContrast" className="text-sm text-slate-700 font-medium">Requires Contrast</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="requiresFasting" checked={formData.requiresFasting} onChange={e => setFormData({...formData, requiresFasting: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                      <label htmlFor="requiresFasting" className="text-sm text-slate-700 font-medium">Requires Fasting</label>
                    </div>
                  </div>
                </div>
              </section>

              {/* Billing Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Billing Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Service Price (₹) <span className="text-red-500">*</span></label>
                    <input type="number" min="0" step="0.01" value={formData.servicePrice} onChange={e => setFormData({...formData, servicePrice: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.servicePrice ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.servicePrice && <p className="text-red-500 text-xs mt-1">{errors.servicePrice}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">GST/Tax (%) (Optional)</label>
                    <input type="number" min="0" max="100" value={formData.gst} onChange={e => setFormData({...formData, gst: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

              {/* Report Configuration */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Report Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Report Template (Optional)</label>
                    <input type="text" value={formData.reportTemplate} onChange={e => setFormData({...formData, reportTemplate: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div className="flex flex-col gap-3 justify-center">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="requiresApproval" checked={formData.requiresApproval} onChange={e => setFormData({...formData, requiresApproval: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                      <label htmlFor="requiresApproval" className="text-sm text-slate-700 font-medium">Doctor Approval Required</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="criticalFindingAlert" checked={formData.criticalFindingAlert} onChange={e => setFormData({...formData, criticalFindingAlert: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                      <label htmlFor="criticalFindingAlert" className="text-sm text-amber-600 font-bold flex items-center gap-1">
                        Critical Finding Alert
                        <AlertTriangle className="w-4 h-4" />
                      </label>
                    </div>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Remarks (Optional)</label>
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
              Are you sure you want to delete Radiology Service <strong>{selectedRecord?.serviceName}</strong>? 
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
