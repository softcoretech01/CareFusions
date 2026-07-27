import { useState } from 'react';
import { 
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, 
  Save, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

interface RoleRecord {
  id: number;
  roleCode: string;
  roleName: string;
  description: string;
  numberOfUsers: number;
  defaultRole: boolean;
  canCreateUsers: boolean;
  canAssignPermissions: boolean;
  status: string;
  remarks: string;
}

const emptyData: Omit<RoleRecord, 'id' | 'numberOfUsers'> = {
  roleCode: '',
  roleName: '',
  description: '',
  defaultRole: false,
  canCreateUsers: false,
  canAssignPermissions: false,
  status: 'Active',
  remarks: ''
};

const mockData: RoleRecord[] = [
  {
    id: 1,
    roleCode: 'ROL-001',
    roleName: 'Super Admin',
    description: 'Full system access',
    numberOfUsers: 2,
    defaultRole: false,
    canCreateUsers: true,
    canAssignPermissions: true,
    status: 'Active',
    remarks: 'System administrator role'
  },
  {
    id: 2,
    roleCode: 'ROL-002',
    roleName: 'Doctor',
    description: 'Clinical staff access',
    numberOfUsers: 45,
    defaultRole: true,
    canCreateUsers: false,
    canAssignPermissions: false,
    status: 'Active',
    remarks: 'Default for new doctors'
  }
];

export const RolesMaster = () => {
  const [records, setRecords] = useState<RoleRecord[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RoleRecord | null>(null);
  const [formData, setFormData] = useState<Omit<RoleRecord, 'id' | 'numberOfUsers'>>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.roleCode.trim()) newErrors.roleCode = 'Role Code is required';
    if (!formData.roleName.trim()) newErrors.roleName = 'Role Name is required';

    // Uniqueness checks
    if (records.some(r => r.roleCode === formData.roleCode && r.id !== selectedRecord?.id)) {
      newErrors.roleCode = 'Role Code must be unique';
    }
    if (records.some(r => r.roleName.toLowerCase() === formData.roleName.toLowerCase() && r.id !== selectedRecord?.id)) {
      newErrors.roleName = 'Role Name must be unique';
    }

    // Business rule: Only one Super Admin role
    if (formData.roleName.toLowerCase() === 'super admin' && records.some(r => r.roleName.toLowerCase() === 'super admin' && r.id !== selectedRecord?.id)) {
      newErrors.roleName = 'Only one Super Admin role can exist';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    const nextId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
    setFormData({
      ...emptyData,
      roleCode: `ROL-${nextId.toString().padStart(3, '0')}`
    });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: RoleRecord) => {
    setSelectedRecord(record);
    const { id, numberOfUsers, ...rest } = record;
    setFormData(rest);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: RoleRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const handleSaveForm = () => {
    if (!validateForm()) return;

    let updatedRecords = [...records];
    
    // Handle Default Role toggling
    if (formData.defaultRole) {
      updatedRecords = updatedRecords.map(r => ({ ...r, defaultRole: false }));
    }

    if (selectedRecord) {
      setRecords(updatedRecords.map(r => r.id === selectedRecord.id ? { ...r, ...formData } : r));
    } else {
      const newId = Math.max(...updatedRecords.map(r => r.id), 0) + 1;
      setRecords([...updatedRecords, { id: newId, numberOfUsers: 0, ...formData }]);
    }
    setIsFormOpen(false);
  };

  const confirmDelete = () => {
    if (selectedRecord) {
      // Business Rule: Roles assigned to active users cannot be deleted.
      if (selectedRecord.numberOfUsers > 0) {
        alert("Cannot delete role: There are users assigned to this role.");
        setIsDeleteOpen(false);
        return;
      }
      
      // Soft Delete
      setRecords(records.filter(r => r.id !== selectedRecord.id));
      setIsDeleteOpen(false);
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.roleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.roleCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !filterStatus || record.status === filterStatus;

    return matchesSearch && matchesStatus;
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
              <h1 className="text-3xl font-bold text-slate-800">Role Master</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" icon={Download} onClick={() => exportToExcel(records, 'RolesMaster')}>Export</Button>
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
                Add Role
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <th className="px-4 py-3 font-medium">Role Code</th>
                    <th className="px-4 py-3 font-medium">Role Name</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium text-center">No. of Users</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {record.roleCode}
                        </td>
                        <td className="px-4 py-3 font-medium text-primary">{record.roleName}</td>
                        <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]" title={record.description}>
                          {record.description}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 font-medium px-2.5 py-1 rounded-full text-xs min-w-[2rem]">
                            {record.numberOfUsers}
                          </span>
                        </td>
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
                        No roles found matching your criteria.
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
                {selectedRecord ? `Edit Role: ${selectedRecord.roleName}` : 'Add New Role'}
              </h1>
              <p className="text-slate-500 text-sm">Configure role access and assignments</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Basic Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role Code <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.roleCode} readOnly className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed focus:outline-none" />
                    {errors.roleCode && <p className="text-red-500 text-xs mt-1">{errors.roleCode}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.roleName} onChange={e => setFormData({...formData, roleName: e.target.value})} placeholder="e.g. Doctor, Nurse, Admin" className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.roleName ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.roleName && <p className="text-red-500 text-xs mt-1">{errors.roleName}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

              {/* Access Configuration */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Access Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="defaultRole" checked={formData.defaultRole} onChange={e => setFormData({...formData, defaultRole: e.target.checked})} className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                    <label htmlFor="defaultRole" className="text-sm font-medium text-slate-700">Default Role</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="canCreateUsers" checked={formData.canCreateUsers} onChange={e => setFormData({...formData, canCreateUsers: e.target.checked})} className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                    <label htmlFor="canCreateUsers" className="text-sm font-medium text-slate-700">Can Create Users</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="canAssignPermissions" checked={formData.canAssignPermissions} onChange={e => setFormData({...formData, canAssignPermissions: e.target.checked})} className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                    <label htmlFor="canAssignPermissions" className="text-sm font-medium text-slate-700">Can Assign Permissions</label>
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
              Are you sure you want to delete Role <strong>{selectedRecord?.roleName}</strong>? 
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
