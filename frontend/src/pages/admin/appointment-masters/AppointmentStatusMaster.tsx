import { useState } from 'react';
import { 
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, 
  Save, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

interface AppointmentStatusRecord {
  id: number;
  statusCode: string;
  statusName: string;
  displayOrder: string;
  description: string;
  isDefault: boolean;
  isFinal: boolean;
  allowReschedule: boolean;
  allowCancellation: boolean;
  status: string;
  remarks: string;
}

const emptyData: Omit<AppointmentStatusRecord, 'id'> = {
  statusCode: '',
  statusName: '',
  displayOrder: '',
  description: '',
  isDefault: false,
  isFinal: false,
  allowReschedule: false,
  allowCancellation: false,
  status: 'Active',
  remarks: ''
};

const mockData: AppointmentStatusRecord[] = [
  { id: 1, statusCode: 'STS-001', statusName: 'Reserved', displayOrder: '1', description: 'Appointment booked', isDefault: true, isFinal: false, allowReschedule: true, allowCancellation: true, status: 'Active', remarks: '' },
  { id: 2, statusCode: 'STS-002', statusName: 'Checked-In', displayOrder: '2', description: 'Patient arrived', isDefault: false, isFinal: false, allowReschedule: false, allowCancellation: true, status: 'Active', remarks: '' },
  { id: 3, statusCode: 'STS-003', statusName: 'Waiting', displayOrder: '3', description: 'Waiting for doctor', isDefault: false, isFinal: false, allowReschedule: false, allowCancellation: false, status: 'Active', remarks: '' },
  { id: 4, statusCode: 'STS-004', statusName: 'Consulting', displayOrder: '4', description: 'Consultation in progress', isDefault: false, isFinal: false, allowReschedule: false, allowCancellation: false, status: 'Active', remarks: '' },
  { id: 5, statusCode: 'STS-005', statusName: 'Completed', displayOrder: '5', description: 'Consultation finished', isDefault: false, isFinal: true, allowReschedule: false, allowCancellation: false, status: 'Active', remarks: '' },
  { id: 6, statusCode: 'STS-006', statusName: 'Cancelled', displayOrder: '6', description: 'Appointment cancelled', isDefault: false, isFinal: true, allowReschedule: false, allowCancellation: false, status: 'Active', remarks: '' },
  { id: 7, statusCode: 'STS-007', statusName: 'No Show', displayOrder: '7', description: 'Patient did not attend', isDefault: false, isFinal: true, allowReschedule: true, allowCancellation: false, status: 'Active', remarks: '' },
  { id: 8, statusCode: 'STS-008', statusName: 'Rescheduled', displayOrder: '8', description: 'Moved to another date', isDefault: false, isFinal: false, allowReschedule: true, allowCancellation: true, status: 'Active', remarks: '' }
];

export const AppointmentStatusMaster = () => {
  const [records, setRecords] = useState<AppointmentStatusRecord[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AppointmentStatusRecord | null>(null);
  const [formData, setFormData] = useState<Omit<AppointmentStatusRecord, 'id'>>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.statusCode.trim()) newErrors.statusCode = 'Status Code is required';
    if (!formData.statusName.trim()) newErrors.statusName = 'Status Name is required';
    if (!formData.displayOrder.trim()) newErrors.displayOrder = 'Display Order is required';

    // Uniqueness checks
    if (records.some(r => r.statusCode.toLowerCase() === formData.statusCode.toLowerCase() && r.id !== selectedRecord?.id)) {
      newErrors.statusCode = 'Status Code must be unique';
    }
    if (records.some(r => r.displayOrder === formData.displayOrder && r.id !== selectedRecord?.id)) {
      newErrors.displayOrder = 'Display Order must be unique';
    }
    
    if (formData.isDefault) {
      if (records.some(r => r.isDefault && r.id !== selectedRecord?.id)) {
        newErrors.isDefault = 'Only one status can be the default status. Uncheck the other first.';
      }
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

  const handleEdit = (record: AppointmentStatusRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: AppointmentStatusRecord) => {
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
      record.statusName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.statusCode.toLowerCase().includes(searchTerm.toLowerCase());
    
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
              <h1 className="text-3xl font-bold text-slate-800">Appointment Status Master</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" icon={Download} onClick={() => exportToExcel(records, 'AppointmentStatusMaster')}>Export</Button>
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
                Add Status
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Status Name or Code..."
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
                    <th className="px-4 py-3 font-medium">Status Code</th>
                    <th className="px-4 py-3 font-medium">Status Name</th>
                    <th className="px-4 py-3 font-medium">Display Order</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.sort((a,b) => Number(a.displayOrder) - Number(b.displayOrder)).map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{record.statusCode}</td>
                      <td className="px-4 py-3 flex items-center gap-2">
                        {record.statusName}
                        {record.isDefault && (
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-[10px] font-bold">DEFAULT</span>
                        )}
                        {record.isFinal && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-bold">FINAL</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{record.displayOrder}</td>
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
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No appointment statuses found matching your criteria.
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
                {selectedRecord ? `Edit Status: ${selectedRecord.statusName}` : 'Add New Status'}
              </h1>
              <p className="text-slate-500 text-sm">Define a new appointment workflow status</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Basic Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status Code <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.statusCode} onChange={e => setFormData({...formData, statusCode: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all ${errors.statusCode ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.statusCode && <p className="text-red-500 text-xs mt-1">{errors.statusCode}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.statusName} onChange={e => setFormData({...formData, statusName: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.statusName ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.statusName && <p className="text-red-500 text-xs mt-1">{errors.statusName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Display Order <span className="text-red-500">*</span></label>
                    <input type="number" min="1" value={formData.displayOrder} onChange={e => setFormData({...formData, displayOrder: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.displayOrder ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.displayOrder && <p className="text-red-500 text-xs mt-1">{errors.displayOrder}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

              {/* Configuration */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="isDefault" checked={formData.isDefault} onChange={e => setFormData({...formData, isDefault: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                      <label htmlFor="isDefault" className="text-sm text-slate-700">Is Default Status</label>
                    </div>
                    {errors.isDefault && <p className="text-red-500 text-xs">{errors.isDefault}</p>}
                    
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="isFinal" checked={formData.isFinal} onChange={e => setFormData({...formData, isFinal: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                      <label htmlFor="isFinal" className="text-sm text-slate-700">Is Final Status (e.g. Completed, Cancelled)</label>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="allowReschedule" checked={formData.allowReschedule} onChange={e => setFormData({...formData, allowReschedule: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                      <label htmlFor="allowReschedule" className="text-sm text-slate-700">Allow Reschedule</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="allowCancellation" checked={formData.allowCancellation} onChange={e => setFormData({...formData, allowCancellation: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                      <label htmlFor="allowCancellation" className="text-sm text-slate-700">Allow Cancellation</label>
                    </div>
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
              Are you sure you want to delete Status <strong>{selectedRecord?.statusName}</strong>? 
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
