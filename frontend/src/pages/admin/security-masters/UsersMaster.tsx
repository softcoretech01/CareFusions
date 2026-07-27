import { useState } from 'react';
import { 
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, 
  Save, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

interface UserRecord {
  id: number;
  userId: string;
  employee: string;
  username: string;
  password?: string; // used for form
  confirmPassword?: string; // used for form
  role: string;
  department: string;
  hospital: string;
  branch: string;
  email: string;
  mobileNumber: string;
  forcePasswordChange: boolean;
  passwordExpiry: string;
  twoFactorAuth: boolean;
  loginAllowedFrom: string;
  loginAllowedTo: string;
  status: string;
  remarks: string;
}

const emptyData: Omit<UserRecord, 'id'> = {
  userId: '',
  employee: '',
  username: '',
  password: '',
  confirmPassword: '',
  role: '',
  department: '',
  hospital: 'City General Hospital',
  branch: 'Main Campus',
  email: '',
  mobileNumber: '',
  forcePasswordChange: true,
  passwordExpiry: '90',
  twoFactorAuth: false,
  loginAllowedFrom: '00:00',
  loginAllowedTo: '23:59',
  status: 'Active',
  remarks: ''
};

const mockData: UserRecord[] = [
  {
    id: 1,
    userId: 'USR-001',
    employee: 'Dr. Sarah Patel',
    username: 'spatel',
    role: 'Doctor',
    department: 'Cardiology',
    hospital: 'City General Hospital',
    branch: 'Main Campus',
    email: 'sarah.patel@carefusions.com',
    mobileNumber: '+1 234 567 8900',
    forcePasswordChange: false,
    passwordExpiry: '90',
    twoFactorAuth: true,
    loginAllowedFrom: '00:00',
    loginAllowedTo: '23:59',
    status: 'Active',
    remarks: 'Head of Cardiology'
  },
  {
    id: 2,
    userId: 'USR-002',
    employee: 'John Smith',
    username: 'jsmith',
    role: 'Receptionist',
    department: 'Front Desk',
    hospital: 'City General Hospital',
    branch: 'Main Campus',
    email: 'john.smith@carefusions.com',
    mobileNumber: '+1 987 654 3210',
    forcePasswordChange: true,
    passwordExpiry: '30',
    twoFactorAuth: false,
    loginAllowedFrom: '08:00',
    loginAllowedTo: '20:00',
    status: 'Inactive',
    remarks: 'On leave'
  }
];

export const UsersMaster = () => {
  const [records, setRecords] = useState<UserRecord[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterRole, setFilterRole] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<UserRecord | null>(null);
  const [formData, setFormData] = useState<Omit<UserRecord, 'id'>>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.employee.trim()) newErrors.employee = 'Employee Name is required';
    if (!formData.userId.trim()) newErrors.userId = 'User ID is required';
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.role.trim()) newErrors.role = 'Role is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    
    // Password checks on new records
    if (!selectedRecord) {
      if (!formData.password) newErrors.password = 'Password is required';
      if (formData.password && formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }

    // Uniqueness checks
    if (records.some(r => r.userId === formData.userId && r.id !== selectedRecord?.id)) {
      newErrors.userId = 'User ID must be unique';
    }
    if (records.some(r => r.username.toLowerCase() === formData.username.toLowerCase() && r.id !== selectedRecord?.id)) {
      newErrors.username = 'Username must be unique';
    }
    if (records.some(r => r.email.toLowerCase() === formData.email.toLowerCase() && r.id !== selectedRecord?.id)) {
      newErrors.email = 'Email must be unique';
    }
    // Business rule: One Employee can have only one active User Account
    if (records.some(r => r.employee.toLowerCase() === formData.employee.toLowerCase() && r.status === 'Active' && r.id !== selectedRecord?.id && formData.status === 'Active')) {
      newErrors.employee = 'Employee already has an active User Account';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    const nextId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
    setFormData({
      ...emptyData,
      userId: `USR-${nextId.toString().padStart(3, '0')}`
    });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: UserRecord) => {
    setSelectedRecord(record);
    setFormData({ ...record, password: '', confirmPassword: '' });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: UserRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const handleSaveForm = () => {
    if (!validateForm()) return;

    if (selectedRecord) {
      // Don't save empty passwords on edit
      const updateData = { ...formData };
      if (!updateData.password) {
        delete updateData.password;
        delete updateData.confirmPassword;
      }
      setRecords(records.map(r => r.id === selectedRecord.id ? { ...r, ...updateData } : r));
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
      record.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !filterRole || record.role === filterRole;
    const matchesDepartment = !filterDepartment || record.department === filterDepartment;
    const matchesStatus = !filterStatus || record.status === filterStatus;

    return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
  });

  const uniqueRoles = Array.from(new Set(records.map(r => r.role)));
  const uniqueDepartments = Array.from(new Set(records.map(r => r.department)));

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
              <h1 className="text-3xl font-bold text-slate-800">User Master</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" icon={Download} onClick={() => exportToExcel(records, 'UsersMaster')}>Export</Button>
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
                Add User
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by ID, Name, or Username..."
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
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Roles</option>
                      {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select
                      value={filterDepartment}
                      onChange={(e) => setFilterDepartment(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Departments</option>
                      {uniqueDepartments.map(d => <option key={d} value={d}>{d}</option>)}
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
                    <th className="px-4 py-3 font-medium">User ID</th>
                    <th className="px-4 py-3 font-medium">Employee Name</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{record.userId}</td>
                        <td className="px-4 py-3 font-medium text-primary">
                          {record.employee}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{record.role}</td>
                        <td className="px-4 py-3 text-slate-600">{record.department}</td>
                        <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]">{record.email}</td>
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
                        No users found matching your criteria.
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
                {selectedRecord ? `Edit User: ${selectedRecord.employee}` : 'Add New User'}
              </h1>
              <p className="text-slate-500 text-sm">Configure login account and security settings</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Employee Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Employee Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">User ID <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.userId} readOnly className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed focus:outline-none" />
                    {errors.userId && <p className="text-red-500 text-xs mt-1">{errors.userId}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Employee Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.employee} onChange={e => setFormData({...formData, employee: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.employee ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.employee && <p className="text-red-500 text-xs mt-1">{errors.employee}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Username <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.username ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password {selectedRecord ? '' : <span className="text-red-500">*</span>}</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={selectedRecord ? "Leave blank to keep unchanged" : ""} className={`w-full px-4 py-2 pr-10 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.password ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password {selectedRecord ? '' : <span className="text-red-500">*</span>}</label>
                    <input type={showPassword ? "text" : "password"} value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.confirmPassword ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                  </div>
                </div>
              </section>

              {/* Role Assignment */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Role Assignment</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role <span className="text-red-500">*</span></label>
                    <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.role ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Role</option>
                      <option value="Super Admin">Super Admin</option>
                      <option value="Doctor">Doctor</option>
                      <option value="Nurse">Nurse</option>
                      <option value="Receptionist">Receptionist</option>
                    </select>
                    {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                    <select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="">None</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Front Desk">Front Desk</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hospital</label>
                    <select value={formData.hospital} onChange={e => setFormData({...formData, hospital: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="City General Hospital">City General Hospital</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                    <select value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="Main Campus">Main Campus</option>
                      <option value="South Wing">South Wing</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Contact Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.email ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
                    <input type="text" value={formData.mobileNumber} onChange={e => setFormData({...formData, mobileNumber: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

              {/* Security Settings */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Security Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="flex items-center gap-3 mt-1 lg:mt-7">
                    <input type="checkbox" id="forcePassword" checked={formData.forcePasswordChange} onChange={e => setFormData({...formData, forcePasswordChange: e.target.checked})} className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                    <label htmlFor="forcePassword" className="text-sm font-medium text-slate-700">Force Password Change</label>
                  </div>
                  <div className="flex items-center gap-3 mt-1 lg:mt-7">
                    <input type="checkbox" id="twoFactorAuth" checked={formData.twoFactorAuth} onChange={e => setFormData({...formData, twoFactorAuth: e.target.checked})} className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                    <label htmlFor="twoFactorAuth" className="text-sm font-medium text-slate-700">Two-Factor Auth</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password Expiry (Days)</label>
                    <input type="number" min="0" value={formData.passwordExpiry} onChange={e => setFormData({...formData, passwordExpiry: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Login Allowed Hours</label>
                    <div className="flex items-center gap-2">
                      <input type="time" value={formData.loginAllowedFrom} onChange={e => setFormData({...formData, loginAllowedFrom: e.target.value})} className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <span className="text-slate-400">to</span>
                      <input type="time" value={formData.loginAllowedTo} onChange={e => setFormData({...formData, loginAllowedTo: e.target.value})} className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    </div>
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
              Are you sure you want to delete User <strong>{selectedRecord?.employee}</strong>? 
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
