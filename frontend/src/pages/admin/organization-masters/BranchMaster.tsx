import { useState } from 'react';
import { Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, Save, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

interface BranchRecord {
  id: number;
  code: string;
  name: string;
  hospital: string;
  branchType: string;
  address1: string;
  address2: string;
  country: string;
  state: string;
  city: string;
  postalCode: string;
  contactNumber: string;
  email: string;
  branchManager: string;
  workingHours: string;
  emergencyAvailable: string;
  numberOfFloors: string;
  numberOfBeds: string;
  status: string;
  remarks: string;
}

const emptyFormData: Omit<BranchRecord, 'id'> = {
  code: '',
  name: '',
  hospital: '',
  branchType: 'Main',
  address1: '',
  address2: '',
  country: '',
  state: '',
  city: '',
  postalCode: '',
  contactNumber: '',
  email: '',
  branchManager: '',
  workingHours: '24/7',
  emergencyAvailable: 'Yes',
  numberOfFloors: '',
  numberOfBeds: '',
  status: 'Active',
  remarks: ''
};

// Mock hospitals for dropdown
const mockHospitals = ['City General Hospital', 'CareFusions North', 'CareFusions South'];

const generateInitialData = (): BranchRecord[] => {
  return [
    {
      id: 1,
      code: 'BR-001',
      name: 'Main Campus',
      hospital: 'City General Hospital',
      branchType: 'Main',
      address1: '123 Health Ave',
      address2: 'Suite 100',
      country: 'USA',
      state: 'New York',
      city: 'New York City',
      postalCode: '10001',
      contactNumber: '+1 234 567 8900',
      email: 'main@citygeneral.com',
      branchManager: 'Dr. Robert Lee',
      workingHours: '24/7',
      emergencyAvailable: 'Yes',
      numberOfFloors: '10',
      numberOfBeds: '500',
      status: 'Active',
      remarks: 'Headquarters'
    },
    {
      id: 2,
      code: 'BR-002',
      name: 'North Wing',
      hospital: 'CareFusions North',
      branchType: 'Satellite',
      address1: '456 North Blvd',
      address2: '',
      country: 'USA',
      state: 'Illinois',
      city: 'Chicago',
      postalCode: '60601',
      contactNumber: '+1 987 654 3210',
      email: 'northwing@carefusions.com',
      branchManager: 'Sarah Jenkins',
      workingHours: '08:00 AM - 08:00 PM',
      emergencyAvailable: 'No',
      numberOfFloors: '3',
      numberOfBeds: '50',
      status: 'Active',
      remarks: 'Outpatient only'
    }
  ];
};

export const BranchMaster = () => {
  const [records, setRecords] = useState<BranchRecord[]>(generateInitialData());
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<BranchRecord | null>(null);
  const [formData, setFormData] = useState<Omit<BranchRecord, 'id'>>(emptyFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Handlers
  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData({ ...emptyFormData });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: BranchRecord) => {
    setSelectedRecord(record);
    const { id, ...rest } = record;
    setFormData(rest);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: BranchRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.code.trim()) errors.code = 'Branch Code is required';
    if (!formData.name.trim()) errors.name = 'Branch Name is required';
    if (!formData.hospital.trim()) errors.hospital = 'Hospital selection is mandatory';
    if (!formData.branchType.trim()) errors.branchType = 'Branch Type is required';
    
    if (!formData.address1.trim()) errors.address1 = 'Address Line 1 is required';
    if (!formData.country.trim()) errors.country = 'Country is required';
    if (!formData.state.trim()) errors.state = 'State is required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (!formData.postalCode.trim()) errors.postalCode = 'Postal Code is required';
    
    if (!formData.contactNumber.trim()) errors.contactNumber = 'Contact Number is required';
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) errors.email = 'Invalid email format';
    
    if (!formData.workingHours.trim()) errors.workingHours = 'Working Hours is required';
    if (!formData.emergencyAvailable.trim()) errors.emergencyAvailable = 'Emergency Available selection is required';

    if (!formData.status) errors.status = 'Status is required';

    // Unique checks
    if (records.some(r => r.code === formData.code && r.id !== selectedRecord?.id)) {
      errors.code = 'Branch Code must be unique';
    }
    if (records.some(r => r.name === formData.name && r.hospital === formData.hospital && r.id !== selectedRecord?.id)) {
      errors.name = 'Branch Name must be unique within the selected Hospital';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveForm = (saveAndNew: boolean = false) => {
    if (!validateForm()) return;

    if (selectedRecord) {
      // Update
      setRecords(records.map(r => r.id === selectedRecord.id ? { id: r.id, ...formData } : r));
      if (saveAndNew) {
        handleCreateNew();
      } else {
        setIsFormOpen(false);
      }
    } else {
      // Create
      const newId = Math.max(...records.map(r => r.id), 0) + 1;
      setRecords([...records, { id: newId, ...formData }]);
      if (saveAndNew) {
        handleCreateNew();
      } else {
        setIsFormOpen(false);
      }
    }
  };

  const confirmDelete = () => {
    if (selectedRecord) {
      // Soft Delete simulation
      setRecords(records.map(r => r.id === selectedRecord.id ? { ...r, status: 'Inactive' } : r));
      setIsDeleteOpen(false);
    }
  };

  const filteredRecords = records.filter(r => 
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.hospital?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col relative"
    >
      {!isFormOpen ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Branch Master</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>
            
            <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
              Create New
            </Button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search by Code, Name, Hospital, City, or Status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2.5 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors border border-slate-200">
                  <Filter className="w-5 h-5" />
                </button>
                <button className="p-2.5 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors border border-slate-200" onClick={() => exportToExcel(records, 'BranchMaster')}>
                  <Download className="w-5 h-5" />
                  Export
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 sticky top-0 backdrop-blur-sm z-10">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Branch Code</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Branch Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hospital</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">City</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Working Hours</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRecords.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-600">{row.code}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">{row.name}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-500">{row.hospital}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-500">{row.city}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-500">{row.workingHours}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${row.status === 'Inactive' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 transition-opacity">
                          <Button variant="text" color="primary" icon={Edit2} className="!p-2" aria-label="Edit" onClick={() => handleEdit(row)} />
                          <Button variant="text" color="danger" icon={Trash2} className="!p-2" aria-label="Delete" onClick={() => handleDeleteRequest(row)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && (
                     <tr>
                       <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                         No records found matching "{searchTerm}"
                       </td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-sm">
              <span className="text-slate-500 font-medium">Showing {filteredRecords.length} entries</span>
              <div className="flex gap-1">
                <button className="px-3 py-1 border border-slate-200 rounded-lg text-slate-500 hover:bg-white transition-colors">Prev</button>
                <button className="px-3 py-1 bg-primary text-white rounded-lg font-medium shadow-sm shadow-primary/20">1</button>
                <button className="px-3 py-1 border border-slate-200 rounded-lg text-slate-500 hover:bg-white transition-colors">Next</button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Form Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">{selectedRecord ? 'Edit Branch Master' : 'Create Branch Master'}</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>
            
            <Button variant="outline" color="secondary" onClick={() => setIsFormOpen(false)}>
              Back to List
            </Button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden p-8">
            <div className="flex-1 overflow-y-auto pr-6 custom-scrollbar">
          {/* Basic Information */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch Code <span className="text-danger">*</span></label>
                <input
                  type="text"
                  value={formData.code}
                  disabled={!!selectedRecord}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.code ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all disabled:opacity-50`}
                />
                {formErrors.code && <p className="text-xs text-danger mt-1">{formErrors.code}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.name ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                />
                {formErrors.name && <p className="text-xs text-danger mt-1">{formErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hospital <span className="text-danger">*</span></label>
                <select
                  value={formData.hospital}
                  onChange={(e) => setFormData({...formData, hospital: e.target.value})}
                  className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.hospital ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                >
                  <option value="">Select Hospital</option>
                  {mockHospitals.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                {formErrors.hospital && <p className="text-xs text-danger mt-1">{formErrors.hospital}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch Type <span className="text-danger">*</span></label>
                <select
                  value={formData.branchType}
                  onChange={(e) => setFormData({...formData, branchType: e.target.value})}
                  className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.branchType ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                >
                  <option value="Main">Main</option>
                  <option value="Satellite">Satellite</option>
                </select>
                {formErrors.branchType && <p className="text-xs text-danger mt-1">{formErrors.branchType}</p>}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 1 <span className="text-danger">*</span></label>
                <input
                  type="text"
                  value={formData.address1}
                  onChange={(e) => setFormData({...formData, address1: e.target.value})}
                  className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.address1 ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                />
                {formErrors.address1 && <p className="text-xs text-danger mt-1">{formErrors.address1}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={formData.address2}
                  onChange={(e) => setFormData({...formData, address2: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Country <span className="text-danger">*</span></label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.country ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                />
                {formErrors.country && <p className="text-xs text-danger mt-1">{formErrors.country}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State <span className="text-danger">*</span></label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.state ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                />
                {formErrors.state && <p className="text-xs text-danger mt-1">{formErrors.state}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City <span className="text-danger">*</span></label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.city ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                />
                {formErrors.city && <p className="text-xs text-danger mt-1">{formErrors.city}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Postal Code <span className="text-danger">*</span></label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                  className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.postalCode ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                />
                {formErrors.postalCode && <p className="text-xs text-danger mt-1">{formErrors.postalCode}</p>}
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number <span className="text-danger">*</span></label>
                <input
                  type="text"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
                  className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.contactNumber ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                />
                {formErrors.contactNumber && <p className="text-xs text-danger mt-1">{formErrors.contactNumber}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.email ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                />
                {formErrors.email && <p className="text-xs text-danger mt-1">{formErrors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch Manager</label>
                <input
                  type="text"
                  value={formData.branchManager}
                  onChange={(e) => setFormData({...formData, branchManager: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

          {/* Operations */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Operations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Working Hours <span className="text-danger">*</span></label>
                <input
                  type="text"
                  value={formData.workingHours}
                  placeholder="e.g. 24/7 or 08:00 AM - 08:00 PM"
                  onChange={(e) => setFormData({...formData, workingHours: e.target.value})}
                  className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.workingHours ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                />
                {formErrors.workingHours && <p className="text-xs text-danger mt-1">{formErrors.workingHours}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Available <span className="text-danger">*</span></label>
                <select
                  value={formData.emergencyAvailable}
                  onChange={(e) => setFormData({...formData, emergencyAvailable: e.target.value})}
                  className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.emergencyAvailable ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {formErrors.emergencyAvailable && <p className="text-xs text-danger mt-1">{formErrors.emergencyAvailable}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Number of Floors</label>
                <input
                  type="number"
                  value={formData.numberOfFloors}
                  onChange={(e) => setFormData({...formData, numberOfFloors: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Number of Beds</label>
                <input
                  type="number"
                  value={formData.numberOfBeds}
                  onChange={(e) => setFormData({...formData, numberOfBeds: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

          {/* System */}
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">System</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status <span className="text-danger">*</span></label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.status ? 'border-danger focus:ring-danger/20' : 'border-slate-200 focus:ring-primary/20'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-primary transition-all`}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                {formErrors.status && <p className="text-xs text-danger mt-1">{formErrors.status}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex items-center justify-between pt-6 border-t border-slate-100">
          <Button variant="outline" color="secondary" onClick={() => setFormData(emptyFormData)} icon={RefreshCw}>
            Reset
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" color="secondary" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>

            <Button variant="filled" color="primary" onClick={() => handleSaveForm(false)} icon={Save}>
              {selectedRecord ? 'Update' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Deletion"
        maxWidth="sm"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Record</h3>
          <p className="text-slate-500 text-sm mb-6">
            Are you sure you want to delete <span className="font-semibold text-slate-700">{selectedRecord?.name}</span>? 
            This will soft delete the branch if there are no departments associated.
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

    </motion.div>
  );
};
