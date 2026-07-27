import { useState } from 'react';
import { 
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, 
  Save, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

interface PermissionRecord {
  id: number;
  permissionCode: string;
  module: string;
  subModule: string;
  role: string;
  // Matrix
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPrint: boolean;
  canExport: boolean;
  canImport: boolean;
  canApprove: boolean;
  // Advanced
  allowApiAccess: boolean;
  allowDataExport: boolean;
  allowBulkOperations: boolean;
  allowAuditLogAccess: boolean;
  
  status: string;
  remarks: string;
}

const emptyData: Omit<PermissionRecord, 'id'> = {
  permissionCode: '',
  module: '',
  subModule: '',
  role: '',
  canView: true,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canPrint: false,
  canExport: false,
  canImport: false,
  canApprove: false,
  allowApiAccess: false,
  allowDataExport: false,
  allowBulkOperations: false,
  allowAuditLogAccess: false,
  status: 'Active',
  remarks: ''
};

const mockData: PermissionRecord[] = [
  {
    id: 1,
    permissionCode: 'PRM-001',
    module: 'Master Module',
    subModule: 'Purchase & Inventory Masters',
    role: 'Store Manager',
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canPrint: true,
    canExport: true,
    canImport: false,
    canApprove: false,
    allowApiAccess: false,
    allowDataExport: true,
    allowBulkOperations: false,
    allowAuditLogAccess: false,
    status: 'Active',
    remarks: ''
  },
  {
    id: 2,
    permissionCode: 'PRM-002',
    module: 'Master Module',
    subModule: 'Security Masters',
    role: 'Super Admin',
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canPrint: true,
    canExport: true,
    canImport: true,
    canApprove: true,
    allowApiAccess: true,
    allowDataExport: true,
    allowBulkOperations: true,
    allowAuditLogAccess: true,
    status: 'Active',
    remarks: 'Full rights'
  }
];

export const PermissionsMaster = () => {
  const [records, setRecords] = useState<PermissionRecord[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterModule, setFilterModule] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PermissionRecord | null>(null);
  const [formData, setFormData] = useState<Omit<PermissionRecord, 'id'>>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.permissionCode.trim()) newErrors.permissionCode = 'Permission Code is required';
    if (!formData.module.trim()) newErrors.module = 'Module is required';
    if (!formData.role.trim()) newErrors.role = 'Role is required';

    // Uniqueness checks
    if (records.some(r => r.permissionCode === formData.permissionCode && r.id !== selectedRecord?.id)) {
      newErrors.permissionCode = 'Permission Code must be unique';
    }
    // Business rule: Same Module + Role combination should not be duplicated
    if (records.some(r => r.module === formData.module && r.role === formData.role && r.id !== selectedRecord?.id)) {
      newErrors.module = 'Permissions for this Module and Role already exist';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    const nextId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
    setFormData({
      ...emptyData,
      permissionCode: `PRM-${nextId.toString().padStart(3, '0')}`
    });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: PermissionRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: PermissionRecord) => {
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
      record.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.permissionCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModule = !filterModule || record.module === filterModule;
    const matchesRole = !filterRole || record.role === filterRole;
    const matchesStatus = !filterStatus || record.status === filterStatus;

    return matchesSearch && matchesModule && matchesRole && matchesStatus;
  });

  const uniqueModules = Array.from(new Set(records.map(r => r.module)));
  const uniqueRoles = Array.from(new Set(records.map(r => r.role)));

  const toggleAllMatrix = (value: boolean) => {
    setFormData({
      ...formData,
      canView: value,
      canCreate: value,
      canEdit: value,
      canDelete: value,
      canPrint: value,
      canExport: value,
      canImport: value,
      canApprove: value,
    });
  };

  const getPermissionSummary = (r: PermissionRecord) => {
    const active = [];
    if (r.canView) active.push('V');
    if (r.canCreate) active.push('C');
    if (r.canEdit) active.push('E');
    if (r.canDelete) active.push('D');
    return active.join(' • ') || 'None';
  };

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
              <h1 className="text-3xl font-bold text-slate-800">Permission Master</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" icon={Download} onClick={() => exportToExcel(records, 'PermissionsMaster')}>Export</Button>
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
                Add Permission
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Code, Module, or Role..."
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
                      value={filterModule}
                      onChange={(e) => setFilterModule(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Modules</option>
                      {uniqueModules.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Roles</option>
                      {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
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
                    <th className="px-4 py-3 font-medium">Permission Code</th>
                    <th className="px-4 py-3 font-medium">Module</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Core Rights</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{record.permissionCode}</td>
                        <td className="px-4 py-3 font-medium text-primary">
                          {record.module}
                          {record.subModule && <div className="text-[10px] text-slate-400 font-normal">↳ {record.subModule}</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium">{record.role}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs tracking-widest">{getPermissionSummary(record)}</td>
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
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No permissions found matching your criteria.
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
                {selectedRecord ? `Edit Permission: ${selectedRecord.module} - ${selectedRecord.role}` : 'Add New Permission'}
              </h1>
              <p className="text-slate-500 text-sm">Configure role-based access for modules</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Basic Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Permission Code <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.permissionCode} readOnly className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed focus:outline-none" />
                    {errors.permissionCode && <p className="text-red-500 text-xs mt-1">{errors.permissionCode}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Module <span className="text-red-500">*</span></label>
                    <select value={formData.module} onChange={e => setFormData({...formData, module: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.module ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Module</option>
                      <option value="Master Module">Master Module</option>
                      <option value="Billing Module">Billing Module</option>
                      <option value="Inventory Module">Inventory Module</option>
                      <option value="Patient Module">Patient Module</option>
                    </select>
                    {errors.module && <p className="text-red-500 text-xs mt-1">{errors.module}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sub Module</label>
                    <select value={formData.subModule} onChange={e => setFormData({...formData, subModule: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="">All Sub Modules</option>
                      <option value="Financial Masters">Financial Masters</option>
                      <option value="Security Masters">Security Masters</option>
                      <option value="Purchase & Inventory Masters">Purchase & Inventory Masters</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role <span className="text-red-500">*</span></label>
                    <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.role ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Role</option>
                      <option value="Super Admin">Super Admin</option>
                      <option value="Store Manager">Store Manager</option>
                      <option value="Doctor">Doctor</option>
                      <option value="Nurse">Nurse</option>
                    </select>
                    {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
                  </div>
                </div>
              </section>

              {/* Permission Matrix */}
              <section>
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                  <h3 className="text-lg font-bold text-slate-800">Permission Matrix</h3>
                  <div className="flex gap-2 text-sm">
                    <button type="button" onClick={() => toggleAllMatrix(true)} className="text-primary hover:underline">Select All</button>
                    <span className="text-slate-300">|</span>
                    <button type="button" onClick={() => toggleAllMatrix(false)} className="text-slate-500 hover:underline">Clear All</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { id: 'canView', label: 'View' },
                    { id: 'canCreate', label: 'Create' },
                    { id: 'canEdit', label: 'Edit' },
                    { id: 'canDelete', label: 'Delete' },
                    { id: 'canPrint', label: 'Print' },
                    { id: 'canExport', label: 'Export' },
                    { id: 'canImport', label: 'Import' },
                    { id: 'canApprove', label: 'Approve' },
                  ].map((perm) => (
                    <div key={perm.id} className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        id={perm.id} 
                        checked={formData[perm.id as keyof Omit<PermissionRecord, 'id'>] as boolean} 
                        onChange={e => setFormData({...formData, [perm.id]: e.target.checked})} 
                        className="w-5 h-5 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" 
                      />
                      <label htmlFor={perm.id} className="font-medium text-slate-700">{perm.label}</label>
                    </div>
                  ))}
                </div>
              </section>

              {/* Advanced Permissions */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Advanced Permissions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="allowApiAccess" checked={formData.allowApiAccess} onChange={e => setFormData({...formData, allowApiAccess: e.target.checked})} className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                    <label htmlFor="allowApiAccess" className="text-sm font-medium text-slate-700">Allow API Access</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="allowDataExport" checked={formData.allowDataExport} onChange={e => setFormData({...formData, allowDataExport: e.target.checked})} className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                    <label htmlFor="allowDataExport" className="text-sm font-medium text-slate-700">Allow Advanced Data Export</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="allowBulkOperations" checked={formData.allowBulkOperations} onChange={e => setFormData({...formData, allowBulkOperations: e.target.checked})} className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                    <label htmlFor="allowBulkOperations" className="text-sm font-medium text-slate-700">Allow Bulk Operations</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="allowAuditLogAccess" checked={formData.allowAuditLogAccess} onChange={e => setFormData({...formData, allowAuditLogAccess: e.target.checked})} className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                    <label htmlFor="allowAuditLogAccess" className="text-sm font-medium text-slate-700">Allow Audit Log Access</label>
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
              Are you sure you want to delete Permission Record <strong>{selectedRecord?.permissionCode}</strong>? 
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
