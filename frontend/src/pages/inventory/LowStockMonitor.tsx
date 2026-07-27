import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { exportToExcel } from '../../utils/exportToExcel';
import { Search, Download, AlertTriangle, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { initialStock, mockCategories } from './mockData';
import { useLocalStorage } from '../../utils/useLocalStorage';

export const LowStockMonitor = () => {
  const [stockRecords] = useLocalStorage('inventory_stock', initialStock);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter only items where available qty < reorder level
  const filteredRecords = useMemo(() => {
    const lowStockItems = stockRecords.filter((r: any) => r.availableQty <= r.reorderLevel);
    
    return lowStockItems.filter((record: any) => {
      const matchesSearch = record.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            record.itemCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory ? record.category === filterCategory : true;
      
      return matchesSearch && matchesCategory;
    });
  }, [stockRecords, searchTerm, filterCategory]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusColor = (available: number, reorder: number) => {
    if (available === 0) return 'bg-red-100 text-red-700';
    if (available <= reorder / 2) return 'bg-orange-100 text-orange-700';
    return 'bg-amber-100 text-amber-700';
  };

  const getStatusLabel = (available: number, reorder: number) => {
    if (available === 0) return 'Out of Stock';
    if (available <= reorder / 2) return 'Critical Low';
    return 'Reorder Required';
  };

  const handleGeneratePR = (record: any) => {
    alert(`Purchase Requisition generated for ${record.itemName}`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center text-sm text-slate-500 mb-2">
            <span>Inventory</span>
            <span className="mx-2">/</span>
            <span className="text-primary font-medium">Low Stock Monitor</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Low Stock Monitor</h1>
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
                placeholder="Search low stock items..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary shadow-sm"
              />
            </div>
            
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm outline-none focus:border-primary">
              <option value="">All Categories</option>
              {mockCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => exportToExcel(filteredRecords, 'Low_Stock_Monitor')} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium shadow-sm hover:bg-slate-50 flex items-center gap-2">
              <Download className="w-4 h-4" /> Export
            </button>
            <button className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium shadow-sm hover:bg-primary/90 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Generate Bulk PR
            </button>
          </div>
        </div>

        {/* Data Grid */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-4 px-6 border-b border-slate-100">Item Details</th>
                <th className="py-4 px-6 border-b border-slate-100">Store</th>
                <th className="py-4 px-6 border-b border-slate-100">Available Qty</th>
                <th className="py-4 px-6 border-b border-slate-100">Reorder Level</th>
                <th className="py-4 px-6 border-b border-slate-100">Deficit</th>
                <th className="py-4 px-6 border-b border-slate-100">Status</th>
                <th className="py-4 px-6 border-b border-slate-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length > 0 ? paginatedRecords.map((record: any) => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-3 px-6">
                    <div className="font-bold text-slate-800">{record.itemName}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{record.itemCode} | {record.category}</div>
                  </td>
                  <td className="py-3 px-6 text-slate-700 font-medium">{record.store}</td>
                  <td className="py-3 px-6">
                    <span className="font-bold text-red-600 text-lg">{record.availableQty}</span>
                    <span className="text-sm text-slate-500 ml-1">{record.uom}</span>
                  </td>
                  <td className="py-3 px-6 font-bold text-slate-700">{record.reorderLevel} {record.uom}</td>
                  <td className="py-3 px-6 text-red-600 font-bold">{record.reorderLevel - record.availableQty} {record.uom}</td>
                  <td className="py-3 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${getStatusColor(record.availableQty, record.reorderLevel)}`}>
                      {getStatusLabel(record.availableQty, record.reorderLevel)}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-right">
                    <button 
                      onClick={() => handleGeneratePR(record)}
                      className="px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 border border-primary/20 rounded-lg transition-colors"
                    >
                      Generate PR
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <AlertTriangle className="w-12 h-12 mb-4 text-emerald-300" />
                      <p className="text-lg font-medium text-slate-600">No low stock items</p>
                      <p className="text-sm mt-1">All items are adequately stocked</p>
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
    </motion.div>
  );
};
