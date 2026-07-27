import { useState } from 'react';
import { 
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, 
  Save, RefreshCw, MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

interface WhatsAppTemplateRecord {
  id: number;
  templateCode: string;
  templateName: string;
  module: string;
  event: string;
  whatsappTemplateId: string;
  language: string;
  templateMessage: string;
  mediaAttachment: string;
  status: string;
  remarks: string;
}

const emptyData: Omit<WhatsAppTemplateRecord, 'id'> = {
  templateCode: '',
  templateName: '',
  module: '',
  event: '',
  whatsappTemplateId: '',
  language: 'en_US',
  templateMessage: '',
  mediaAttachment: '',
  status: 'Active',
  remarks: ''
};

const mockData: WhatsAppTemplateRecord[] = [
  {
    id: 1,
    templateCode: 'WAT-001',
    templateName: 'Appointment Reminder',
    module: 'Appointment',
    event: 'Appointment Reminder',
    whatsappTemplateId: 'appt_reminder_v1',
    language: 'en_US',
    templateMessage: 'Hello {{PatientName}}, this is a reminder for your appointment with {{DoctorName}} on {{AppointmentDate}}.',
    mediaAttachment: 'None',
    status: 'Active',
    remarks: 'Meta Approved'
  }
];

export const WhatsAppTemplateMaster = () => {
  const [records, setRecords] = useState<WhatsAppTemplateRecord[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterModule, setFilterModule] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<WhatsAppTemplateRecord | null>(null);
  const [formData, setFormData] = useState<Omit<WhatsAppTemplateRecord, 'id'>>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.templateCode.trim()) newErrors.templateCode = 'Template Code is required';
    if (!formData.templateName.trim()) newErrors.templateName = 'Template Name is required';
    if (!formData.module.trim()) newErrors.module = 'Module is required';
    if (!formData.event.trim()) newErrors.event = 'Event is required';
    if (!formData.templateMessage.trim()) newErrors.templateMessage = 'Message is required';
    if (!formData.whatsappTemplateId.trim()) newErrors.whatsappTemplateId = 'Template ID is required';

    if (records.some(r => r.templateCode === formData.templateCode && r.id !== selectedRecord?.id)) {
      newErrors.templateCode = 'Template Code must be unique';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    const nextId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
    setFormData({
      ...emptyData,
      templateCode: `WAT-${nextId.toString().padStart(3, '0')}`
    });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: WhatsAppTemplateRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: WhatsAppTemplateRecord) => {
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
      record.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.templateCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModule = !filterModule || record.module === filterModule;
    const matchesEvent = !filterEvent || record.event === filterEvent;
    const matchesStatus = !filterStatus || record.status === filterStatus;

    return matchesSearch && matchesModule && matchesEvent && matchesStatus;
  });

  const uniqueModules = Array.from(new Set(records.map(r => r.module)));
  const uniqueEvents = Array.from(new Set(records.map(r => r.event)));

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
              <h1 className="text-3xl font-bold text-slate-800">WhatsApp Template Master</h1>
              
            </div>
            <div className="flex gap-3">
              <Button variant="outline" icon={Download} onClick={() => exportToExcel(records, 'WhatsAppTemplateMaster')}>Export</Button>
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
                Add Template
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
                      value={filterEvent}
                      onChange={(e) => setFilterEvent(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Events</option>
                      {uniqueEvents.map(e => <option key={e} value={e}>{e}</option>)}
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
                    <th className="px-4 py-3 font-medium">Template Code</th>
                    <th className="px-4 py-3 font-medium">Template Name</th>
                    <th className="px-4 py-3 font-medium">Module</th>
                    <th className="px-4 py-3 font-medium">Trigger Event</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{record.templateCode}</td>
                        <td className="px-4 py-3 font-medium text-emerald-600">{record.templateName}</td>
                        <td className="px-4 py-3 text-slate-600">{record.module}</td>
                        <td className="px-4 py-3 text-slate-600">
                          <span className="inline-flex px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">
                            {record.event}
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
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
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
                        No templates found matching your criteria.
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
                {selectedRecord ? `Edit Template: ${selectedRecord.templateName}` : 'Add WhatsApp Template'}
              </h1>
              <p className="text-slate-500 text-sm">Configure automated WhatsApp messaging rules</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Basic Information */}
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Template Code <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.templateCode} readOnly className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed focus:outline-none" />
                  </div>
                  <div className="lg:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Template Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.templateName} onChange={e => setFormData({...formData, templateName: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.templateName ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
                    {errors.templateName && <p className="text-red-500 text-xs mt-1">{errors.templateName}</p>}
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Module <span className="text-red-500">*</span></label>
                    <select value={formData.module} onChange={e => setFormData({...formData, module: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.module ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Module</option>
                      <option value="Appointment">Appointment</option>
                      <option value="Billing">Billing</option>
                      <option value="Laboratory">Laboratory</option>
                      <option value="Radiology">Radiology</option>
                      <option value="Pharmacy">Pharmacy</option>
                    </select>
                    {errors.module && <p className="text-red-500 text-xs mt-1">{errors.module}</p>}
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Trigger Event <span className="text-red-500">*</span></label>
                    <select value={formData.event} onChange={e => setFormData({...formData, event: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.event ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Event</option>
                      <option value="Appointment Booked">Appointment Booked</option>
                      <option value="Appointment Reminder">Appointment Reminder</option>
                      <option value="Bill Generated">Bill Generated</option>
                      <option value="Prescription Generated">Prescription Generated</option>
                    </select>
                    {errors.event && <p className="text-red-500 text-xs mt-1">{errors.event}</p>}
                  </div>
                </div>
              </section>

              {/* WhatsApp Configuration */}
              <section>
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                  <MessageCircle className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-lg font-bold text-slate-800">WhatsApp Configuration</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp Template ID <span className="text-red-500">*</span></label>
                        <input type="text" value={formData.whatsappTemplateId} onChange={e => setFormData({...formData, whatsappTemplateId: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.whatsappTemplateId ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} placeholder="e.g. appt_reminder_v1" />
                        {errors.whatsappTemplateId && <p className="text-red-500 text-xs mt-1">{errors.whatsappTemplateId}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Language</label>
                        <select value={formData.language} onChange={e => setFormData({...formData, language: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                          <option value="en_US">English (US)</option>
                          <option value="en_GB">English (UK)</option>
                          <option value="hi">Hindi</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Media Attachment</label>
                      <select value={formData.mediaAttachment} onChange={e => setFormData({...formData, mediaAttachment: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="None">None</option>
                        <option value="Image">Image (Header)</option>
                        <option value="Document">Document (PDF)</option>
                      </select>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-slate-700">Template Message <span className="text-red-500">*</span></label>
                      </div>
                      <textarea 
                        rows={5}
                        value={formData.templateMessage} 
                        onChange={e => setFormData({...formData, templateMessage: e.target.value})} 
                        className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none ${errors.templateMessage ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} 
                      />
                      {errors.templateMessage && <p className="text-red-500 text-xs mt-1">{errors.templateMessage}</p>}
                    </div>
                  </div>

                  {/* Variables Helper */}
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Supported Variables</h4>
                    <p className="text-xs text-slate-500 mb-4">Meta approved variables format is usually numbered (e.g. {'{{1}}'}). Substitute below for UI representation.</p>
                    <div className="flex flex-wrap gap-2">
                      {['{{PatientName}}', '{{DoctorName}}', '{{AppointmentDate}}', '{{BillAmount}}'].map((variable) => (
                        <button
                          key={variable}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, templateMessage: prev.templateMessage + variable }));
                          }}
                          className="px-2 py-1 bg-white border border-emerald-200 rounded text-xs font-mono text-emerald-700 hover:bg-emerald-50 transition-colors"
                        >
                          {variable}
                        </button>
                      ))}
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
              Are you sure you want to delete Template <strong>{selectedRecord?.templateCode}</strong>? 
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
