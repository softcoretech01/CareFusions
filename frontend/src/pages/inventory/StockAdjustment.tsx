import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { exportToExcel } from '../../utils/exportToExcel';
import { Search, Download, Eye, Settings2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { initialStockAdjustment, mockStores } from './mockData';
import { useLocalStorage } from '../../utils/useLocalStorage';
import { Button } from '../../components/ui/Button';

export const StockAdjustment = () => {
  const [records] = useLocalStorage('inventory_stock_adjustment', initialStockAdjustment);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredRecords = useMemo(() => {
    return records.filter((record: any) => {
      const matchesSearch = record.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            record.reason.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStore = filterStore ? record.store === filterStore : true;
      const matchesStatus = filterStatus ? record.status === filterStatus : true;
      
      return matchesSearch && matchesStore && matchesStatus;
    });
  }, [records, searchTerm, filterStore, filterStatus]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Approved': return 'bg-emerald-100 text-emerald-700';
      case 'Pending Approval': return 'bg-orange-100 text-orange-700';
      case 'Draft': return 'bg-slate-100 text-slate-700';
      case 'Rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center text-sm text-slate-500 mb-2">
            <span>Inventory</span>
            <span className="mx-2">/</span>
            <span className="text-primary font-medium">Stock Adjustment</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Stock Adjustment</h1>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Adjustment
        </Button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3 flex-1 min-w-[300px]">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by Adjustment No or Reason..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary shadow-sm"
              />
            </div>
            
            <select value={filterStore} onChange={(e) => setFilterStore(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm outline-none focus:border-primary">
              <option value="">All Stores</option>
              {mockStores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>

            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm outline-none focus:border-primary">
              <option value="">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Draft">Draft</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => exportToExcel(filteredRecords, 'Stock_Adjustment')} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium shadow-sm hover:bg-slate-50 flex items-center gap-2">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* Data Grid */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-4 px-6 border-b border-slate-100">Adjustment No</th>
                <th className="py-4 px-6 border-b border-slate-100">Date</th>
                <th className="py-4 px-6 border-b border-slate-100">Store</th>
                <th className="py-4 px-6 border-b border-slate-100">Reason</th>
                <th className="py-4 px-6 border-b border-slate-100">Items</th>
                <th className="py-4 px-6 border-b border-slate-100">Approved By</th>
                <th className="py-4 px-6 border-b border-slate-100">Status</th>
                <th className="py-4 px-6 border-b border-slate-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length > 0 ? paginatedRecords.map((record: any) => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-3 px-6 font-bold text-slate-800">{record.id}</td>
                  <td className="py-3 px-6 text-slate-600">{record.adjustmentDate}</td>
                  <td className="py-3 px-6 font-medium text-slate-700">{record.store}</td>
                  <td className="py-3 px-6 text-slate-700">{record.reason}</td>
                  <td className="py-3 px-6 font-bold text-slate-800">{record.itemsCount} Items</td>
                  <td className="py-3 px-6 text-slate-700">{record.approvedBy}</td>
                  <td className="py-3 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-right">
                    <div className="flex justify-end gap-2 transition-opacity">
                      <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Settings2 className="w-12 h-12 mb-4 text-slate-300" />
                      <p className="text-lg font-medium text-slate-600">No stock adjustment records found</p>
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
