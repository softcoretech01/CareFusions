import { useState } from 'react';
import { 
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, 
  Save, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

export interface CurrencyRecord {
  id: number;
  currencyCode: string;
  currencyName: string;
  symbol: string;
  status: string;
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
}

const emptyData: Omit<CurrencyRecord, 'id'> = {
  currencyCode: '',
  currencyName: '',
  symbol: '',
  status: 'Active'
};

export const mockData: CurrencyRecord[] = [
  { id: 1, currencyCode: 'INR', currencyName: 'Indian Rupee', symbol: '₹', status: 'Active' },
  { id: 2, currencyCode: 'USD', currencyName: 'US Dollar', symbol: '$', status: 'Active' }
];

export const CurrencyMaster = () => {
  const [records, setRecords] = useState<CurrencyRecord[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CurrencyRecord | null>(null);
  const [formData, setFormData] = useState<Omit<CurrencyRecord, 'id'>>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.currencyCode.trim()) newErrors.currencyCode = 'Currency Code is required';
    if (!formData.currencyName.trim()) newErrors.currencyName = 'Currency Name is required';
    if (!formData.symbol.trim()) newErrors.symbol = 'Symbol is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData(emptyData);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: CurrencyRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDelete = (record: CurrencyRecord) => {
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
        setRecords([...records, { ...formData, id: newId, createdBy: 'Admin', createdDate: new Date().toISOString().split('T')[0] }]);
      }
      setIsFormOpen(false);
    }
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = Object.values(record).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesStatus = filterStatus ? record.status === filterStatus : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Currency Master</h1>
          <p className="text-slate-500 mt-1">Manage Currencies</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" icon={Download} onClick={() => exportToExcel(records, 'CurrencyMaster')}>Export</Button>
          <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
            Add New
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 border rounded-lg transition-colors ${showFilters ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              <Filter className="w-4 h-4" />
            </button>
            <button className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
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
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="text-left py-4 px-6 font-medium text-slate-500 text-sm">Currency Code</th>
                <th className="text-left py-4 px-6 font-medium text-slate-500 text-sm">Currency Name</th>
                <th className="text-left py-4 px-6 font-medium text-slate-500 text-sm">Symbol</th>
                <th className="text-left py-4 px-6 font-medium text-slate-500 text-sm">Status</th>
                <th className="text-right py-4 px-6 font-medium text-slate-500 text-sm w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 text-slate-800">{record.currencyCode}</td>
                  <td className="py-4 px-6 text-slate-800">{record.currencyName}</td>
                  <td className="py-4 px-6 text-slate-800">{record.symbol}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      record.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(record)}
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(record)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)}
        title={`${selectedRecord ? 'Edit' : 'Add'} Currency`}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Currency Code</label>
            <input 
              type="text" 
              value={formData.currencyCode}
              onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value })}
              className={`w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${errors.currencyCode ? 'border-red-500' : 'border-slate-200'}`}
            />
            {errors.currencyCode && <p className="text-red-500 text-xs mt-1">{errors.currencyCode}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Currency Name</label>
            <input 
              type="text" 
              value={formData.currencyName}
              onChange={(e) => setFormData({ ...formData, currencyName: e.target.value })}
              className={`w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${errors.currencyName ? 'border-red-500' : 'border-slate-200'}`}
            />
            {errors.currencyName && <p className="text-red-500 text-xs mt-1">{errors.currencyName}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Symbol</label>
            <input 
              type="text" 
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              className={`w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all ${errors.symbol ? 'border-red-500' : 'border-slate-200'}`}
            />
            {errors.symbol && <p className="text-red-500 text-xs mt-1">{errors.symbol}</p>}
          </div>
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
            <div>
              <span className="block font-medium text-slate-700 mb-1">Created By</span>
              {selectedRecord.createdBy || 'System'} • {selectedRecord.createdDate || 'N/A'}
            </div>
            <div>
              <span className="block font-medium text-slate-700 mb-1">Last Updated</span>
              {selectedRecord.updatedBy || '-'} • {selectedRecord.updatedDate || '-'}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
          <Button variant="outline" onClick={() => setIsFormOpen(false)}>
            Cancel
          </Button>
          <Button variant="filled" color="primary" onClick={handleSave} icon={Save}>
            {selectedRecord ? 'Update' : 'Save'} Currency
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Record"
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">Delete Currency?</h3>
          <p className="text-slate-500 mb-6">
            Are you sure you want to delete this record? This action cannot be undone.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="filled" 
              className="bg-red-500 hover:bg-red-600 text-white border-transparent" 
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
