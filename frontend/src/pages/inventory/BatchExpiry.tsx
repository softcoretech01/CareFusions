import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { exportToExcel } from '../../utils/exportToExcel';
import { Search, Download, CalendarClock, ChevronLeft, ChevronRight, AlertTriangle, Trash2 } from 'lucide-react';
import { initialStock, mockCategories } from './mockData';
import { useLocalStorage } from '../../utils/useLocalStorage';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export const BatchExpiry = () => {
  const [stockRecords, setStockRecords] = useLocalStorage('inventory_stock', initialStock);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterExpiry, setFilterExpiry] = useState('Expired');
  const [currentPage, setCurrentPage] = useState(1);
  const [dischargeItem, setDischargeItem] = useState<any>(null);
  const itemsPerPage = 10;

  const handleDischarge = () => {
    if (!dischargeItem) return;
    
    const newStock = stockRecords.map((r: any) => 
      r.id === dischargeItem.id ? { ...r, availableQty: 0 } : r
    );
    setStockRecords(newStock);
    setDischargeItem(null);
  };

  const filteredRecords = useMemo(() => {
    return stockRecords.filter((record: any) => {
      const matchesSearch = record.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            record.batchNo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory ? record.category === filterCategory : true;
      
      let matchesExpiry = true;
      if (filterExpiry) {
        const today = new Date();
        const expDate = new Date(record.expiryDate);
        const diffTime = Math.abs(expDate.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (filterExpiry === '30') matchesExpiry = diffDays <= 30;
        if (filterExpiry === '60') matchesExpiry = diffDays <= 60;
        if (filterExpiry === '90') matchesExpiry = diffDays <= 90;
        if (filterExpiry === 'Expired') matchesExpiry = expDate < today;
      }
      
      return matchesSearch && matchesCategory && matchesExpiry;
    });
  }, [stockRecords, searchTerm, filterCategory, filterExpiry]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getExpiryStatusColor = (expiryDate: string) => {
    const today = new Date();
    const expDate = new Date(expiryDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'bg-red-100 text-red-700'; // Expired
    if (diffDays <= 30) return 'bg-orange-100 text-orange-700'; // Critical
    if (diffDays <= 90) return 'bg-amber-100 text-amber-700'; // Warning
    return 'bg-emerald-100 text-emerald-700'; // Safe
  };

  const getExpiryLabel = (expiryDate: string) => {
    const today = new Date();
    const expDate = new Date(expiryDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Expired';
    if (diffDays <= 30) return 'Expires < 30 Days';
    if (diffDays <= 90) return 'Expires < 90 Days';
    return 'Safe';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center text-sm text-slate-500 mb-2">
            <span>Inventory</span>
            <span className="mx-2">/</span>
            <span className="text-primary font-medium">Batch & Expiry</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Batch & Expiry Tracking</h1>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3 flex-1 min-w-[300px]">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search items or batches..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary shadow-sm"
              />
            </div>
            
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm outline-none focus:border-primary">
              <option value="">All Categories</option>
              {mockCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>

            <select value={filterExpiry} onChange={(e) => setFilterExpiry(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm outline-none focus:border-primary">
              <option value="">All Dates</option>
              <option value="30">Next 30 Days</option>
              <option value="60">Next 60 Days</option>
              <option value="90">Next 90 Days</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => exportToExcel(filteredRecords, 'Batch_Expiry_Report')} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium shadow-sm hover:bg-slate-50 flex items-center gap-2">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* Data Grid */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-4 px-6 border-b border-slate-100">Item Details</th>
                <th className="py-4 px-6 border-b border-slate-100">Category</th>
                <th className="py-4 px-6 border-b border-slate-100">Batch No</th>
                <th className="py-4 px-6 border-b border-slate-100">Store</th>
                <th className="py-4 px-6 border-b border-slate-100">Available Qty</th>
                <th className="py-4 px-6 border-b border-slate-100">Mfg Date</th>
                <th className="py-4 px-6 border-b border-slate-100">Expiry Date</th>
                <th className="py-4 px-6 border-b border-slate-100">Status</th>
                <th className="py-4 px-6 border-b border-slate-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length > 0 ? paginatedRecords.map((record: any) => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-3 px-6">
                    <div className="font-bold text-slate-800">{record.itemName}</div>
                  </td>
                  <td className="py-3 px-6">
                    <div className="font-medium text-slate-700">{record.category}</div>
                  </td>
                  <td className="py-3 px-6 font-medium text-slate-700">{record.batchNo}</td>
                  <td className="py-3 px-6 text-slate-700">{record.store}</td>
                  <td className="py-3 px-6 font-bold text-slate-800">{record.availableQty} <span className="text-sm font-medium text-slate-500">{record.uom}</span></td>
                  <td className="py-3 px-6 text-slate-600">{record.mfgDate}</td>
                  <td className="py-3 px-6 font-bold text-slate-700">{record.expiryDate}</td>
                  <td className="py-3 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${getExpiryStatusColor(record.expiryDate)}`}>
                      {getExpiryLabel(record.expiryDate)}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-right">
                    <div className="flex justify-end gap-2 transition-opacity">
                      {(getExpiryLabel(record.expiryDate) === 'Expired' || getExpiryLabel(record.expiryDate).includes('<')) && record.availableQty > 0 && (
                        <button 
                          onClick={() => setDischargeItem(record)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors" 
                          title="Discharge / Throw Out"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <CalendarClock className="w-12 h-12 mb-4 text-slate-300" />
                      <p className="text-lg font-medium text-slate-600">No batch records found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-sm text-slate-500 font-medium">
            Showing <span className="text-slate-800">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredRecords.length)}</span> to <span className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredRecords.length)}</span> of <span className="text-slate-800">{filteredRecords.length}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent bg-white shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-sm font-medium text-slate-700 px-2">
              Page {currentPage} of {totalPages || 1}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent bg-white shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <Modal isOpen={!!dischargeItem} onClose={() => setDischargeItem(null)} title="Discharge Expired Batch">
        {dischargeItem && (
          <div className="p-6 flex flex-col gap-4">
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-700 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold">Warning: Discharging Expired Stock</h4>
                <p className="text-sm mt-1">You are about to discard <b>{dischargeItem.availableQty} {dischargeItem.uom}</b> of <b>{dischargeItem.itemName}</b> (Batch: {dischargeItem.batchNo}). This action will permanently zero out this stock in your inventory.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setDischargeItem(null)}>Cancel</Button>
              <Button color="primary" variant="filled" className="!bg-red-600 hover:!bg-red-700 !border-red-600" onClick={handleDischarge}>Confirm Discharge</Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
