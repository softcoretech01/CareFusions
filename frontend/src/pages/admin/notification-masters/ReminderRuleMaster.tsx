import { useState } from 'react';
import { 
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, 
  Save, RefreshCw, CalendarClock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

interface ReminderRuleRecord {
  id: number;
  ruleCode: string;
  ruleName: string;
  module: string;
  event: string;
  triggerBefore: string;
  notificationChannel: string;
  repeatReminder: boolean;
  repeatFrequency: string;
  maxRetryCount: number;
  recipientPatient: boolean;
  recipientDoctor: boolean;
  recipientStaff: boolean;
  recipientAttender: boolean;
  status: string;
  remarks: string;
}

const emptyData: Omit<ReminderRuleRecord, 'id'> = {
  ruleCode: '',
  ruleName: '',
  module: '',
  event: '',
  triggerBefore: '',
  notificationChannel: 'SMS',
  repeatReminder: false,
  repeatFrequency: '',
  maxRetryCount: 1,
  recipientPatient: true,
  recipientDoctor: false,
  recipientStaff: false,
  recipientAttender: false,
  status: 'Active',
  remarks: ''
};

const mockData: ReminderRuleRecord[] = [
  {
    id: 1,
    ruleCode: 'RR-001',
    ruleName: '24H Appointment Reminder',
    module: 'Appointment',
    event: 'Appointment Due',
    triggerBefore: '24 Hours',
    notificationChannel: 'WhatsApp',
    repeatReminder: false,
    repeatFrequency: '',
    maxRetryCount: 1,
    recipientPatient: true,
    recipientDoctor: false,
    recipientStaff: false,
    recipientAttender: false,
    status: 'Active',
    remarks: 'Remind patient 24hrs before appt'
  }
];

export const ReminderRuleMaster = () => {
  const [records, setRecords] = useState<ReminderRuleRecord[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterModule, setFilterModule] = useState('');
  const [filterChannel, setFilterChannel] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ReminderRuleRecord | null>(null);
  const [formData, setFormData] = useState<Omit<ReminderRuleRecord, 'id'>>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.ruleCode.trim()) newErrors.ruleCode = 'Rule Code is required';
    if (!formData.ruleName.trim()) newErrors.ruleName = 'Rule Name is required';
    if (!formData.module.trim()) newErrors.module = 'Module is required';
    if (!formData.event.trim()) newErrors.event = 'Event is required';
    if (!formData.triggerBefore.trim()) newErrors.triggerBefore = 'Trigger time is required';
    if (!formData.notificationChannel.trim()) newErrors.notificationChannel = 'Channel is required';

    if (records.some(r => r.ruleCode === formData.ruleCode && r.id !== selectedRecord?.id)) {
      newErrors.ruleCode = 'Rule Code must be unique';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    const nextId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
    setFormData({
      ...emptyData,
      ruleCode: `RR-${nextId.toString().padStart(3, '0')}`
    });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: ReminderRuleRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: ReminderRuleRecord) => {
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
      setRecords(records.filter(r => r.id !== selectedRecord.id));
      setIsDeleteOpen(false);
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.ruleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.ruleCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModule = !filterModule || record.module === filterModule;
    const matchesChannel = !filterChannel || record.notificationChannel === filterChannel;
    const matchesStatus = !filterStatus || record.status === filterStatus;

    return matchesSearch && matchesModule && matchesChannel && matchesStatus;
  });

  const uniqueModules = Array.from(new Set(records.map(r => r.module)));

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
              <h1 className="text-3xl font-bold text-slate-800">Reminder Rule Master</h1>
              
            </div>
            <div className="flex gap-3">
              <Button variant="outline" icon={Download} onClick={() => exportToExcel(records, 'ReminderRuleMaster')}>Export</Button>
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
                Add Rule
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
                      value={filterChannel}
                      onChange={(e) => setFilterChannel(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Channels</option>
                      <option value="SMS">SMS</option>
                      <option value="Email">Email</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Push">Push</option>
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
                    <th className="px-4 py-3 font-medium">Rule Code</th>
                    <th className="px-4 py-3 font-medium">Rule Name</th>
                    <th className="px-4 py-3 font-medium">Module</th>
                    <th className="px-4 py-3 font-medium">Channel</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{record.ruleCode}</td>
                        <td className="px-4 py-3 font-medium text-primary">{record.ruleName}</td>
                        <td className="px-4 py-3 text-slate-600">{record.module}</td>
                        <td className="px-4 py-3 text-slate-600">
                          <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium border
                            ${record.notificationChannel === 'WhatsApp' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                            ${record.notificationChannel === 'Email' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
                            ${record.notificationChannel === 'SMS' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                            ${record.notificationChannel === 'Push' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                          `}>
                            {record.notificationChannel}
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
                        No rules found matching your criteria.
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
                {selectedRecord ? `Edit Rule: ${selectedRecord.ruleName}` : 'Add Reminder Rule'}
              </h1>
              <p className="text-slate-500 text-sm">Configure automated notification trigger rules</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Basic Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Rule Code <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.ruleCode} readOnly className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed focus:outline-none" />
                  </div>
                  <div className="lg:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Rule Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.ruleName} onChange={e => setFormData({...formData, ruleName: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.ruleName ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.ruleName && <p className="text-red-500 text-xs mt-1">{errors.ruleName}</p>}
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Module <span className="text-red-500">*</span></label>
                    <select value={formData.module} onChange={e => setFormData({...formData, module: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.module ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Module</option>
                      <option value="Appointment">Appointment</option>
                      <option value="Billing">Billing</option>
                      <option value="Pharmacy">Pharmacy</option>
                      <option value="Laboratory">Laboratory</option>
                    </select>
                    {errors.module && <p className="text-red-500 text-xs mt-1">{errors.module}</p>}
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Trigger Event <span className="text-red-500">*</span></label>
                    <select value={formData.event} onChange={e => setFormData({...formData, event: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.event ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Event</option>
                      <option value="Appointment Due">Appointment Due</option>
                      <option value="Bill Overdue">Bill Overdue</option>
                      <option value="Follow-up Due">Follow-up Due</option>
                    </select>
                    {errors.event && <p className="text-red-500 text-xs mt-1">{errors.event}</p>}
                  </div>
                </div>
              </section>

              {/* Reminder Configuration */}
              <section>
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                  <CalendarClock className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-bold text-slate-800">Reminder Configuration</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Trigger Before <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.triggerBefore} onChange={e => setFormData({...formData, triggerBefore: e.target.value})} placeholder="e.g. 24 Hours, 30 Minutes" className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.triggerBefore ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.triggerBefore && <p className="text-red-500 text-xs mt-1">{errors.triggerBefore}</p>}
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notification Channel <span className="text-red-500">*</span></label>
                    <select value={formData.notificationChannel} onChange={e => setFormData({...formData, notificationChannel: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.notificationChannel ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="SMS">SMS</option>
                      <option value="Email">Email</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Push">Push Notification</option>
                    </select>
                  </div>

                  <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" id="repeatReminder" checked={formData.repeatReminder} onChange={e => setFormData({...formData, repeatReminder: e.target.checked})} className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                      <label htmlFor="repeatReminder" className="text-sm font-medium text-slate-700">Repeat Reminder</label>
                    </div>
                    {formData.repeatReminder && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Repeat Frequency</label>
                          <input type="text" value={formData.repeatFrequency} onChange={e => setFormData({...formData, repeatFrequency: e.target.value})} placeholder="e.g. Every 1 Hour" className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Max Retry Count</label>
                          <input type="number" min={1} max={10} value={formData.maxRetryCount} onChange={e => setFormData({...formData, maxRetryCount: parseInt(e.target.value) || 1})} className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>

              {/* Recipient Configuration */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Recipient Configuration</h3>
                <div className="flex flex-wrap gap-8">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="recipientPatient" checked={formData.recipientPatient} onChange={e => setFormData({...formData, recipientPatient: e.target.checked})} className="w-5 h-5 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                    <label htmlFor="recipientPatient" className="text-sm font-medium text-slate-700">Patient</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="recipientDoctor" checked={formData.recipientDoctor} onChange={e => setFormData({...formData, recipientDoctor: e.target.checked})} className="w-5 h-5 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                    <label htmlFor="recipientDoctor" className="text-sm font-medium text-slate-700">Doctor</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="recipientStaff" checked={formData.recipientStaff} onChange={e => setFormData({...formData, recipientStaff: e.target.checked})} className="w-5 h-5 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                    <label htmlFor="recipientStaff" className="text-sm font-medium text-slate-700">Staff</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="recipientAttender" checked={formData.recipientAttender} onChange={e => setFormData({...formData, recipientAttender: e.target.checked})} className="w-5 h-5 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                    <label htmlFor="recipientAttender" className="text-sm font-medium text-slate-700">Attender</label>
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
              Are you sure you want to delete Rule <strong>{selectedRecord?.ruleCode}</strong>? 
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
