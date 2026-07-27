import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { exportToExcel } from '../../utils/exportToExcel';
import { Search, Download, ChevronLeft, ChevronRight, BookOpen, Eye } from 'lucide-react';
import { initialStockLedger, mockStores } from './mockData';
import { useLocalStorage } from '../../utils/useLocalStorage';
import { DateFilter } from '../../components/ui/DateFilter';
import { Modal } from '../../components/ui/Modal';

export const StockLedger = () => {
  const [records] = useLocalStorage('inventory_stock_ledger', initialStockLedger);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [filterType, setFilterType] = useState('IN');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const handleSearch = () => {
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
  };

  const handleCancel = () => {
    setFromDate('');
    setToDate('');
    setAppliedFromDate('');
    setAppliedToDate('');
  };

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  const filteredRecords = useMemo(() => {
    return records.filter((record: any) => {
      const matchesSearch = record.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            record.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            record.referenceNo.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStore = filterStore ? record.store === filterStore : true;
      const matchesType = filterType ? record.transactionType === filterType : true;
      
      let matchesDate = true;
      if (appliedFromDate || appliedToDate) {
        const recordDate = record.date.split(' ')[0];
        if (appliedFromDate && recordDate < appliedFromDate) matchesDate = false;
        if (appliedToDate && recordDate > appliedToDate) matchesDate = false;
      }
      
      return matchesSearch && matchesStore && matchesType && matchesDate;
    });
  }, [records, searchTerm, filterStore, filterType, appliedFromDate, appliedToDate]);

  const displayRecords = useMemo(() => {
    let runningCumulative = 0;
    const result = [...filteredRecords].reverse();
    for (let i = 0; i < result.length; i++) {
       runningCumulative += result[i].stockValue || 0;
        (result[i] as any).dynamicCumulative = runningCumulative;
    }
    return result.reverse();
  }, [filteredRecords]);

  const totalPages = Math.ceil(displayRecords.length / itemsPerPage);
  const paginatedRecords = displayRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const currentTotalQty = useMemo(() => displayRecords.reduce((sum: number, r: any) => sum + Math.abs(r.qty || 0), 0), [displayRecords]);
  const currentTotalValue = useMemo(() => displayRecords.reduce((sum: number, r: any) => sum + Math.abs(r.stockValue || 0), 0), [displayRecords]);

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'IN': return 'bg-emerald-100 text-emerald-700';
      case 'OUT': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'IN': return 'Stock In';
      case 'OUT': return 'Stock Out';
      default: return type;
    }
  };

  const handleView = (record: any) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };

  const getUniqueItemCount = (record: any) => {
    if (!record) return 1;
    const pseudoCount = (record.id.charCodeAt(record.id.length - 1) % 5) + 1;
    return Math.min(pseudoCount, Math.abs(record.qty) || 1);
  };

  const handleExport = () => {
    if (filteredRecords.length === 0) return;
    exportToExcel(filteredRecords, `Stock_Ledger_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center text-sm text-slate-500 mb-2">
            <span>Inventory</span>
            <span className="mx-2">/</span>
            <span className="text-primary font-medium">Stock Ledger</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Stock Ledger</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-6 mr-4 bg-primary/5 border border-primary/10 rounded-xl px-4 py-2">
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">
                {filterType === 'IN' ? 'Total In Stock' : 'Total Out Stock'}
              </p>
              <p className={`text-lg font-bold ${filterType === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                {currentTotalQty} {currentTotalQty === 1 ? 'item' : 'items'}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">
                Stock Value
              </p>
              <p className={`text-lg font-bold ${filterType === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                ₹{currentTotalValue.toFixed(2)}
              </p>
            </div>
          </div>
          <DateFilter
            dateFrom={fromDate}
            dateTo={toDate}
            onDateFromChange={setFromDate}
            onDateToChange={setToDate}
            onSearch={handleSearch}
            onReset={handleCancel}
          />
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
                placeholder="Search by ID, Item, or Reference..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary shadow-sm"
              />
            </div>
            
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl mr-2">
              <button 
                onClick={() => setFilterType('IN')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${filterType === 'IN' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600 hover:text-emerald-600'}`}
              >In Stock</button>
              <button 
                onClick={() => setFilterType('OUT')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${filterType === 'OUT' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-600 hover:text-red-600'}`}
              >Out Stock</button>
            </div>
            <select value={filterStore} onChange={(e) => setFilterStore(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm outline-none focus:border-primary">
              <option value="">All Stores</option>
              {mockStores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={handleExport} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium shadow-sm hover:bg-slate-50 flex items-center gap-2">
              <Download className="w-4 h-4" /> Export Ledger
            </button>
          </div>
        </div>

        {/* Data Grid */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-4 px-3 border-b border-slate-100 whitespace-nowrap">Date</th>
                <th className="py-4 px-3 border-b border-slate-100 whitespace-nowrap">Transaction ID</th>
                <th className="py-4 px-3 border-b border-slate-100 whitespace-nowrap">Type</th>
                <th className="py-4 px-3 border-b border-slate-100 whitespace-nowrap">Items</th>
                <th className="py-4 px-3 border-b border-slate-100 whitespace-nowrap">Store</th>
                <th className="py-4 px-3 border-b border-slate-100 text-right whitespace-nowrap">Qty</th>
                <th className="py-4 px-3 border-b border-slate-100 text-right whitespace-nowrap">Stock Value (₹)</th>
                <th className="py-4 px-3 border-b border-slate-100 text-right whitespace-nowrap">Balance Qty</th>
                <th className="py-4 px-3 border-b border-slate-100 text-right whitespace-nowrap">Cumulative Value (₹)</th>
                <th className="py-4 px-3 border-b border-slate-100 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length > 0 ? paginatedRecords.map((record: any) => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{record.date}</td>
                  <td className="py-3 px-3 font-bold text-slate-800 whitespace-nowrap">
                    <div>{record.id}</div>
                    <div className="text-[10px] text-slate-400 font-normal uppercase tracking-wider">{record.referenceNo}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap inline-block ${getTypeColor(record.transactionType)}`}>
                      {getTypeLabel(record.transactionType)}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-700 whitespace-nowrap">
                    {getUniqueItemCount(record)} {getUniqueItemCount(record) === 1 ? 'item' : 'items'}
                  </td>
                  <td className="py-3 px-3 text-slate-600">{record.store}</td>
                  <td className={`py-3 px-3 text-right font-bold text-lg whitespace-nowrap ${record.qty > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {record.qty > 0 ? `+${record.qty}` : record.qty}
                  </td>
                  <td className={`py-3 px-3 text-right font-bold whitespace-nowrap ${record.stockValue > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {record.stockValue > 0 ? `+${record.stockValue.toFixed(2)}` : record.stockValue < 0 ? `-${Math.abs(record.stockValue).toFixed(2)}` : '0.00'}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-800 whitespace-nowrap">{record.balanceQty}</td>
                  <td className="py-3 px-3 text-right font-bold text-primary whitespace-nowrap">{(record.dynamicCumulative || 0).toFixed(2)}</td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex justify-end gap-2 transition-opacity">
                      <button onClick={() => handleView(record)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="View Transaction Details">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <BookOpen className="w-12 h-12 mb-4 text-slate-300" />
                      <p className="text-lg font-medium text-slate-600">No ledger entries found</p>
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

      {/* View Details Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Ledger Transaction Details" size="4xl">
        {selectedRecord && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Transaction ID</p>
                <p className="font-bold text-slate-800">{selectedRecord.id}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Date & Time</p>
                <p className="font-bold text-slate-800">{selectedRecord.date}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Reference No</p>
                <p className="font-bold text-slate-800">{selectedRecord.referenceNo}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Transaction Type</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getTypeColor(selectedRecord.transactionType)}`}>{getTypeLabel(selectedRecord.transactionType)}</span>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500 font-medium mb-1">Store / Location</p>
                <p className="font-bold text-slate-800">{selectedRecord.store}</p>
              </div>
              <div className="col-span-2 mt-2">
                <p className="text-xs text-slate-500 font-medium mb-2">Items</p>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4 text-right">Qty</th>
                        <th className="py-3 px-4 text-right">Unit Price (₹)</th>
                        <th className="py-3 px-4 text-right">Total Price (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Array.from({ length: getUniqueItemCount(selectedRecord) }).map((_, i, arr) => {
                        const totalQty = Math.abs(selectedRecord.qty);
                        const count = arr.length;
                        const baseQty = Math.floor(totalQty / count) || 1;
                        const itemQty = i === count - 1 ? totalQty - (baseQty * (count - 1)) : baseQty;
                        const unitPrice = Math.abs(selectedRecord.stockValue) / (totalQty || 1);
                        const totalPrice = itemQty * unitPrice;

                        return (
                          <tr key={i}>
                            <td className="py-3 px-4 font-bold text-slate-700">
                              {i === 0 ? selectedRecord.itemName : `${selectedRecord.itemName.split(' ')[0]} - Assorted Part ${i}`}
                            </td>
                            <td className="py-3 px-4 text-right font-medium">{itemQty}</td>
                            <td className="py-3 px-4 text-right text-slate-600">{unitPrice.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-800">{totalPrice.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                        <td colSpan={3} className="py-3 px-4 text-right font-bold text-slate-700 uppercase tracking-wider text-xs">Grand Total</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 text-lg">₹{Math.abs(selectedRecord.stockValue).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Balance Quantity</p>
                <p className="font-bold text-xl text-slate-800">{selectedRecord.balanceQty}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Cumulative Value</p>
                <p className="font-bold text-xl text-primary">{(selectedRecord.dynamicCumulative || 0).toFixed(2)}</p>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium shadow-sm hover:bg-slate-50" onClick={() => setIsViewOpen(false)}>Close</button>
            </div>
          </div>
        )}
      </Modal>

    </motion.div>
  );
};
