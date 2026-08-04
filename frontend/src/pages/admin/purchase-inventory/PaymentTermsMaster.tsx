import { useState, useMemo } from 'react';
import { 
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, 
  Save, ChevronLeft, ChevronRight, Eye, Power, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

export interface PaymentTermsRecord {
  id: number;
  termCode: string;
  termName: string;
  creditDays: number;
  description: string;
  status: string;
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
}

const emptyData: Omit<PaymentTermsRecord, 'id'> = { termCode: '', termName: '', creditDays: 0, description: '', status: 'Active' };

export const mockData: PaymentTermsRecord[] = [{"id":1,"termCode":"PT-001","termName":"Immediate Payment","creditDays":0,"description":"Payment on delivery","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":2,"termCode":"PT-002","termName":"Net 7 Days","creditDays":7,"description":"Payment within 7 days of invoice","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":3,"termCode":"PT-003","termName":"Net 15 Days","creditDays":15,"description":"Payment within 15 days of invoice","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":4,"termCode":"PT-004","termName":"Net 30 Days","creditDays":30,"description":"Payment within 30 days of invoice","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":5,"termCode":"PT-005","termName":"Net 45 Days","creditDays":45,"description":"Payment within 45 days of invoice","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":6,"termCode":"PT-006","termName":"Net 60 Days","creditDays":60,"description":"Payment within 60 days of invoice","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":7,"termCode":"PT-007","termName":"Net 90 Days","creditDays":90,"description":"Payment within 90 days of invoice","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":8,"termCode":"PT-008","termName":"50% Advance","creditDays":0,"description":"50% on order, 50% on delivery","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":9,"termCode":"PT-009","termName":"100% Advance","creditDays":0,"description":"Full payment before delivery","status":"Active","createdBy":"System","createdDate":"2024-01-01"}];

export const PaymentTermsMaster = () => {
  const [records, setRecords] = useState<PaymentTermsRecord[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{key: keyof PaymentTermsRecord | null, direction: 'asc'|'desc'}>({ key: null, direction: 'asc' });

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PaymentTermsRecord | null>(null);
  const [formData, setFormData] = useState<Omit<PaymentTermsRecord, 'id'>>(emptyData);
  const validateForm = () => {
    if (!formData.termCode.trim()) return false;
    if (!formData.termName.trim()) return false;
    return true;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData(emptyData); // Could add auto-generate logic here
    setIsFormOpen(true);
  };

  const handleEdit = (record: PaymentTermsRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setIsFormOpen(true);
  };
  
  const handleView = (record: PaymentTermsRecord) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };
  
  const handleToggleStatus = (record: PaymentTermsRecord) => {
    setRecords(records.map(r => 
      r.id === record.id ? { ...r, status: r.status === 'Active' ? 'Inactive' : 'Active', updatedBy: 'Admin', updatedDate: new Date().toISOString().split('T')[0] } : r
    ));
  };

  const handleDelete = (record: PaymentTermsRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedRecord) {
      setRecords(records.filter(r => r.id !== selectedRecord.id));
      setIsDeleteOpen(false);
      setSelectedRecord(null);
    }
  };

  const handleSave = () => {
    if (validateForm()) {
      if (selectedRecord) {
        setRecords(records.map(r => r.id === selectedRecord.id ? { ...formData, id: r.id, updatedBy: 'Admin', updatedDate: new Date().toISOString().split('T')[0] } : r));
      } else {
        const newId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
        setRecords([{ ...formData, id: newId, createdBy: 'Admin', createdDate: new Date().toISOString().split('T')[0] }, ...records]);
      }
      setIsFormOpen(false);
    }
  };
  
  const handleSort = (key: keyof PaymentTermsRecord) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Process data (Filter -> Sort -> Paginate)
  const processedData = useMemo(() => {
    let result = records.filter(record => {
      const matchesSearch = Object.values(record).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesStatus = filterStatus ? record.status === filterStatus : true;
      return matchesSearch && matchesStatus;
    });

    if (sortConfig.key) {
      const sortKey = sortConfig.key;
      result.sort((a, b) => {
        const left = a?.[sortKey] as any;
        const right = b?.[sortKey] as any;
        if (left === undefined || right === undefined) return 0;
        if (left < right) return sortConfig.direction === 'asc' ? -1 : 1;
        if (left > right) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [records, searchTerm, filterStatus, sortConfig]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedData = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col"
    >
      {/* Header & Breadcrumbs */}
      <div className="mb-6">
        <div className="flex items-center text-sm text-slate-500 mb-2">
          <span>Masters</span>
          <span className="mx-2">/</span>
          <span className="text-primary font-medium">Payment Terms Master</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Payment Terms Master</h1>
            <p className="text-slate-500 mt-1"></p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
              Add New
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 border rounded-lg transition-colors \${showFilters ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              title="Advanced Filters"
            >
              <Filter className="w-4 h-4" />
            </button>
            <button onClick={() => { setSearchTerm(''); setFilterStatus(''); setCurrentPage(1); }} className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors" title="Clear search & filters">
              <X className="w-4 h-4" />
            </button>
            <button onClick={() => exportToExcel(records, 'PaymentTermsMaster')} className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors" title="Export to Excel">
              <Download className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Show</span>
            <select 
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="border border-slate-200 rounded-lg px-2 py-1 outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-slate-100 bg-slate-50 overflow-hidden"
            >
              <div className="p-4 flex gap-4">
                <select 
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                {/* Additional advanced filters can go here */}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <tr>
<th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('termCode')}>Code</th>
<th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('termName')}>Term Name</th>
<th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('creditDays')}>Credit Days</th>
<th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Status</th>
<th className="text-right py-3 px-4 font-medium text-slate-500 text-sm w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr><td colSpan={10} className="py-8 text-center text-slate-500">No records found</td></tr>
              ) : paginatedData.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
<td className="py-3 px-4 text-slate-800 font-medium">{record.termCode}</td>
<td className="py-3 px-4 text-slate-800">{record.termName}</td>
<td className="py-3 px-4 text-slate-800">{record.creditDays}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium \${
                      record.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleView(record)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(record)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggleStatus(record)} className={`p-1.5 rounded-lg transition-colors \${record.status === 'Active' ? 'text-slate-400 hover:text-orange-500 hover:bg-orange-50' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'}`} title={record.status === 'Active' ? 'Deactivate' : 'Activate'}>
                        <Power className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(record)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-sm text-slate-500">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, processedData.length)} of {processedData.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-slate-200 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-600 px-2">Page {currentPage} of {totalPages || 1}</span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1 rounded border border-slate-200 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <Modal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)}
        title={`\${selectedRecord ? 'Edit' : 'Add'} Payment Terms Master`}
        size="3xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
<div><label className="block text-sm font-medium text-slate-700 mb-1">Code</label><input type="text" value={formData.termCode} onChange={(e) => setFormData({...formData, termCode: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"/></div>
<div><label className="block text-sm font-medium text-slate-700 mb-1">Name</label><input type="text" value={formData.termName} onChange={(e) => setFormData({...formData, termName: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"/></div>
<div><label className="block text-sm font-medium text-slate-700 mb-1">Credit Days</label><input type="number" value={formData.creditDays} onChange={(e) => setFormData({...formData, creditDays: Number(e.target.value)})} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"/></div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select 
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {selectedRecord && (
          <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs text-slate-500">
            <div><span className="block font-medium text-slate-700 mb-1">Created By</span>{selectedRecord.createdBy || 'System'} • {selectedRecord.createdDate || 'N/A'}</div>
            <div><span className="block font-medium text-slate-700 mb-1">Last Updated</span>{selectedRecord.updatedBy || '-'} • {selectedRecord.updatedDate || '-'}</div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
          <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
          <Button variant="filled" color="primary" onClick={handleSave} icon={Save}>{selectedRecord ? 'Update' : 'Save'}</Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={`View Payment Terms Master Details`} size="md">
        {selectedRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
<div><span className="text-xs text-slate-400 block">Code</span><span className="text-sm font-medium">{selectedRecord.termCode}</span></div>
<div><span className="text-xs text-slate-400 block">Name</span><span className="text-sm font-medium">{selectedRecord.termName}</span></div>
<div><span className="text-xs text-slate-400 block">Credit Days</span><span className="text-sm font-medium">{selectedRecord.creditDays}</span></div>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-400 block mb-1">Status</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium \${
                selectedRecord.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
              }`}>
                {selectedRecord.status}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Record" size="sm">
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">Delete Record?</h3>
          <p className="text-slate-500 mb-6">Are you sure you want to delete this record? This action cannot be undone.</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="filled" className="bg-red-500 hover:bg-red-600 text-white border-transparent" onClick={confirmDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
