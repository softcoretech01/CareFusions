import { useState } from 'react';
import { 
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, 
  Save, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

interface TestRecord {
  id: number;
  testCode: string;
  testName: string;
  testCategory: string;
  department: string;
  sampleType: string;
  description: string;
  normalRange: string;
  unit: string;
  testMethod: string;
  turnaroundTime: string;
  testPrice: string;
  gst: string;
  reportTemplate: string;
  requiresApproval: boolean;
  criticalValueAlert: boolean;
  status: string;
  remarks: string;
}

const emptyData: Omit<TestRecord, 'id'> = {
  testCode: '',
  testName: '',
  testCategory: '',
  department: '',
  sampleType: '',
  description: '',
  normalRange: '',
  unit: '',
  testMethod: '',
  turnaroundTime: '',
  testPrice: '',
  gst: '',
  reportTemplate: '',
  requiresApproval: false,
  criticalValueAlert: false,
  status: 'Active',
  remarks: ''
};

const mockData: TestRecord[] = [
  {
    id: 1,
    testCode: 'TST-001',
    testName: 'Complete Blood Count (CBC)',
    testCategory: 'Hematology',
    department: 'Pathology',
    sampleType: 'Blood',
    description: 'Routine blood test',
    normalRange: 'Varies',
    unit: 'cells/mcL',
    testMethod: 'Automated Analyzer',
    turnaroundTime: '4',
    testPrice: '450.00',
    gst: '0',
    reportTemplate: 'Standard Blood Report',
    requiresApproval: true,
    criticalValueAlert: true,
    status: 'Active',
    remarks: ''
  },
  {
    id: 2,
    testCode: 'TST-002',
    testName: 'Fasting Blood Sugar (FBS)',
    testCategory: 'Biochemistry',
    department: 'Pathology',
    sampleType: 'Blood',
    description: 'Glucose levels after fasting',
    normalRange: '70-100',
    unit: 'mg/dL',
    testMethod: 'Enzymatic',
    turnaroundTime: '2',
    testPrice: '150.00',
    gst: '0',
    reportTemplate: 'Standard Glucose Report',
    requiresApproval: false,
    criticalValueAlert: true,
    status: 'Active',
    remarks: ''
  }
];

const sampleTypes = ['Blood', 'Urine', 'Stool', 'Saliva', 'Sputum', 'Tissue', 'Swab'];
const testCategories = ['Hematology', 'Biochemistry', 'Microbiology', 'Immunology', 'Clinical Pathology', 'Serology'];
const departments = ['Pathology', 'Microbiology', 'Biochemistry'];

export const TestMaster = () => {
  const [records, setRecords] = useState<TestRecord[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterSampleType, setFilterSampleType] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TestRecord | null>(null);
  const [formData, setFormData] = useState<Omit<TestRecord, 'id'>>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.testCode.trim()) newErrors.testCode = 'Test Code is required';
    if (!formData.testName.trim()) newErrors.testName = 'Test Name is required';
    if (!formData.testCategory) newErrors.testCategory = 'Test Category is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.sampleType) newErrors.sampleType = 'Sample Type is required';
    
    if (!formData.turnaroundTime.trim()) newErrors.turnaroundTime = 'Turnaround Time is required';
    else if (Number(formData.turnaroundTime) <= 0) newErrors.turnaroundTime = 'Turnaround Time must be greater than zero';

    if (!formData.testPrice.trim()) newErrors.testPrice = 'Test Price is required';
    else if (Number(formData.testPrice) <= 0) newErrors.testPrice = 'Test Price must be greater than zero';

    // Uniqueness checks
    if (records.some(r => r.testCode.toLowerCase() === formData.testCode.toLowerCase() && r.id !== selectedRecord?.id)) {
      newErrors.testCode = 'Test Code must be unique';
    }
    if (records.some(r => r.testName.toLowerCase() === formData.testName.toLowerCase() && r.id !== selectedRecord?.id)) {
      newErrors.testName = 'Test Name must be unique';
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

  const handleEdit = (record: TestRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: TestRecord) => {
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
      record.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.testCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSampleType = !filterSampleType || record.sampleType === filterSampleType;
    const matchesDepartment = !filterDepartment || record.department === filterDepartment;
    const matchesStatus = !filterStatus || record.status === filterStatus;

    return matchesSearch && matchesSampleType && matchesDepartment && matchesStatus;
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
              <h1 className="text-3xl font-bold text-slate-800">Test Master</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" icon={Download} onClick={() => exportToExcel(records, 'TestMaster')}>Export</Button>
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
                Add Test
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Test Name or Code..."
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
                      value={filterSampleType}
                      onChange={(e) => setFilterSampleType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Sample Types</option>
                      {sampleTypes.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                    <select
                      value={filterDepartment}
                      onChange={(e) => setFilterDepartment(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Departments</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
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
                    <th className="px-4 py-3 font-medium">Test Code</th>
                    <th className="px-4 py-3 font-medium">Test Name</th>
                    <th className="px-4 py-3 font-medium">Sample Type</th>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium text-right">Price (₹)</th>
                    <th className="px-4 py-3 font-medium text-center">TAT (Hrs)</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{record.testCode}</td>
                        <td className="px-4 py-3">
                          {record.testName}
                          {record.criticalValueAlert && <span title="Critical Value Alert Enabled"><AlertTriangle className="inline-block ml-2 w-4 h-4 text-amber-500" /></span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <span className="inline-flex px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs">
                            {record.sampleType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{record.department}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">{record.testPrice}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{record.turnaroundTime}</td>
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
                        No laboratory tests found matching your criteria.
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
                {selectedRecord ? `Edit Test: ${selectedRecord.testName}` : 'Add New Test'}
              </h1>
              <p className="text-slate-500 text-sm">Define a new laboratory test</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Basic Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Test Code <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.testCode} onChange={e => setFormData({...formData, testCode: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all ${errors.testCode ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.testCode && <p className="text-red-500 text-xs mt-1">{errors.testCode}</p>}
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Test Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.testName} onChange={e => setFormData({...formData, testName: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.testName ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.testName && <p className="text-red-500 text-xs mt-1">{errors.testName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Test Category <span className="text-red-500">*</span></label>
                    <select value={formData.testCategory} onChange={e => setFormData({...formData, testCategory: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.testCategory ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Category</option>
                      {testCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.testCategory && <p className="text-red-500 text-xs mt-1">{errors.testCategory}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department <span className="text-red-500">*</span></label>
                    <select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.department ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sample Type <span className="text-red-500">*</span></label>
                    <select value={formData.sampleType} onChange={e => setFormData({...formData, sampleType: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.sampleType ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Sample Type</option>
                      {sampleTypes.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                    {errors.sampleType && <p className="text-red-500 text-xs mt-1">{errors.sampleType}</p>}
                  </div>
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                    <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

              {/* Clinical Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Clinical Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Normal Range (Optional)</label>
                    <input type="text" placeholder="e.g. 70-100" value={formData.normalRange} onChange={e => setFormData({...formData, normalRange: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unit (Optional)</label>
                    <input type="text" placeholder="e.g. mg/dL" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Test Method (Optional)</label>
                    <input type="text" value={formData.testMethod} onChange={e => setFormData({...formData, testMethod: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Turnaround Time (Hours) <span className="text-red-500">*</span></label>
                    <input type="number" min="1" value={formData.turnaroundTime} onChange={e => setFormData({...formData, turnaroundTime: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.turnaroundTime ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.turnaroundTime && <p className="text-red-500 text-xs mt-1">{errors.turnaroundTime}</p>}
                  </div>
                </div>
              </section>

              {/* Billing Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Billing Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Test Price (₹) <span className="text-red-500">*</span></label>
                    <input type="number" min="0" step="0.01" value={formData.testPrice} onChange={e => setFormData({...formData, testPrice: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.testPrice ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.testPrice && <p className="text-red-500 text-xs mt-1">{errors.testPrice}</p>}
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
                      <label htmlFor="requiresApproval" className="text-sm text-slate-700 font-medium">Requires Doctor Approval for Result</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="criticalValueAlert" checked={formData.criticalValueAlert} onChange={e => setFormData({...formData, criticalValueAlert: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                      <label htmlFor="criticalValueAlert" className="text-sm text-amber-600 font-bold flex items-center gap-1">
                        Critical Value Alert
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
              Are you sure you want to delete Test <strong>{selectedRecord?.testName}</strong>? 
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
