import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { exportToExcel } from '../../utils/exportToExcel';
import { Search, Download, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { initialStock, mockStores, mockDepartments } from './mockData';
import { useLocalStorage } from '../../utils/useLocalStorage';
import { mockData as itemMasterMock } from '../admin/purchase-inventory/ItemMaster';

export const CurrentStock = () => {
  const [stockRecords, setStockRecords] = useLocalStorage('inventory_stock', initialStock);

  useEffect(() => {
    let migrated = false;
    const updated = stockRecords.map((r: any) => {
      if (r.category === 'General' || !r.category) {
        migrated = true;
        // Try to find the correct category from item master, default to Medicines
        const masterItem = itemMasterMock.find(item => r.itemName.includes(item.itemName) || item.itemName.includes(r.itemName));
        return { ...r, category: masterItem ? masterItem.category : 'Medicines' };
      }
      return r;
    });
    if (migrated) {
      setStockRecords(updated);
    }
  }, [stockRecords, setStockRecords]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredStock = useMemo(() => {
    return stockRecords.filter((record: any) => {
      const matchesSearch = record.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            record.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            record.batchNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            record.department.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStore = filterStore ? record.store === filterStore : true;
      const matchesDepartment = filterDepartment ? record.department === filterDepartment : true;
      const matchesStatus = filterStatus ? record.status === filterStatus : true;

      return matchesSearch && matchesStore && matchesDepartment && matchesStatus;
    });
  }, [stockRecords, searchTerm, filterStore, filterDepartment, filterStatus]);

  const totalPages = Math.ceil(filteredStock.length / itemsPerPage);
  const paginatedStock = filteredStock.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'In Stock': return 'bg-emerald-100 text-emerald-700';
      case 'Low Stock': return 'bg-orange-100 text-orange-700';
      case 'Out of Stock': return 'bg-red-100 text-red-700';
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
            <span className="text-primary font-medium">Current Stock</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Current Stock</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Date filter removed as per user request */}
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
                placeholder="Search items, codes, batches..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary shadow-sm"
              />
            </div>

            <select value={filterStore} onChange={(e) => setFilterStore(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm outline-none focus:border-primary">
              <option value="">All Stores</option>
              {mockStores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>

            <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm outline-none focus:border-primary">
              <option value="">All Departments</option>
              {mockDepartments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>

            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm outline-none focus:border-primary">
              <option value="">All Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => exportToExcel(filteredStock, 'Current_Stock')} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium shadow-sm hover:bg-slate-50 flex items-center gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* Data Grid */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-4 px-6 border-b border-slate-100 whitespace-nowrap">Item Code</th>
                <th className="py-4 px-6 border-b border-slate-100">Item Details</th>
                <th className="py-4 px-6 border-b border-slate-100">Category</th>
                <th className="py-4 px-6 border-b border-slate-100">Store</th>
                <th className="py-4 px-6 border-b border-slate-100">Department</th>
                <th className="py-4 px-6 border-b border-slate-100">Batch</th>
                <th className="py-4 px-6 border-b border-slate-100">Expire</th>
                <th className="py-4 px-6 border-b border-slate-100 whitespace-nowrap">Available Qty</th>
                <th className="py-4 px-6 border-b border-slate-100">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedStock.length > 0 ? paginatedStock.map((record: any) => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-3 px-6 font-medium text-slate-700">
                    {record.itemCode}
                  </td>
                  <td className="py-3 px-6">
                    <div className="font-bold text-slate-800">{record.itemName}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{record.manufacturer}</div>
                  </td>
                  <td className="py-3 px-6">
                    <div className="font-medium text-slate-700">{record.category}</div>
                  </td>
                  <td className="py-3 px-6">
                    <div className="font-medium text-slate-700">{record.store}</div>
                  </td>
                  <td className="py-3 px-6">
                    <div className="font-medium text-slate-700">{record.department}</div>
                  </td>
                  <td className="py-3 px-6">
                    <div className="font-medium text-slate-700">{record.batchNo}</div>
                  </td>
                  <td className="py-3 px-6">
                    <div className="font-medium text-slate-700">{record.expiryDate}</div>
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex flex-col items-start">
                      <span className="font-bold text-lg text-slate-800">{record.availableQty} <span className="text-sm font-medium text-slate-500">{record.uom}</span></span>
                      <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">Min: {record.reorderLevel} | Max: {record.maxStock}</span>
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Package className="w-12 h-12 mb-4 text-slate-300" />
                      <p className="text-lg font-medium text-slate-600">No stock records found</p>
                      <p className="text-sm mt-1">Try adjusting your search or filters</p>
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
            Showing <span className="text-slate-800">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredStock.length)}</span> to <span className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredStock.length)}</span> of <span className="text-slate-800">{filteredStock.length}</span> entries
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
