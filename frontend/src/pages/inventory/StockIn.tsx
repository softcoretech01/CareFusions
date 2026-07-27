import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, PackageCheck, ChevronLeft, ChevronRight, Plus, Eye, CheckCircle2, AlertTriangle, Package, Barcode, Printer } from 'lucide-react';
import { exportToExcel } from '../../utils/exportToExcel';
import { useLocalStorage } from '../../utils/useLocalStorage';
import { initialStockIn, mockStores } from './mockData';
import { initialGRNs, type GRNRecord } from '../procurement/GoodsReceipt';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { DateFilter } from '../../components/ui/DateFilter';

export const StockIn = () => {
  const [grns, setGrns] = useLocalStorage<GRNRecord[]>('procurement_grns', initialGRNs);
  const [stockInLogs, setStockInLogs] = useLocalStorage('inventory_stock_in', initialStockIn);
  const [stockRecords, setStockRecords] = useLocalStorage<any[]>('inventory_stock', []);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
  const [selectedGrn, setSelectedGrn] = useState<GRNRecord | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [grnToProcess, setGrnToProcess] = useState<GRNRecord | null>(null);

  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [barcodeGrn, setBarcodeGrn] = useState<GRNRecord | null>(null);

  const relevantGRNs = useMemo(() => {
    return grns.filter(g => g.status === 'Accepted' || g.status === 'Stocked');
  }, [grns]);

  const filteredRecords = useMemo(() => {
    return relevantGRNs.filter((record: any) => {
      const matchesSearch = record.grnNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            record.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            record.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStore = filterStore ? record.store === filterStore : true;
      const matchesStatus = filterStatus ? record.status === filterStatus : true;
      
      let matchesDate = true;
      if (appliedFromDate || appliedToDate) {
        const recordDate = record.receivedDate;
        if (appliedFromDate && recordDate < appliedFromDate) matchesDate = false;
        if (appliedToDate && recordDate > appliedToDate) matchesDate = false;
      }
      
      return matchesSearch && matchesStore && matchesStatus && matchesDate;
    });
  }, [relevantGRNs, searchTerm, filterStore, filterStatus, appliedFromDate, appliedToDate]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Accepted': return 'bg-blue-100 text-blue-700'; // Ready to stock
      case 'Stocked': return 'bg-emerald-100 text-emerald-700'; // Already in inventory
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'Accepted': return 'Ready to Stock';
      case 'Stocked': return 'Stocked';
      default: return status;
    }
  };

  const handleView = (record: GRNRecord) => {
    setSelectedGrn(record);
    setIsViewOpen(true);
  };

  const handleOpenBarcodes = (record: GRNRecord) => {
    setBarcodeGrn(record);
    setIsBarcodeOpen(true);
  };

  const initiateAddToInventory = (grn: GRNRecord) => {
    setGrnToProcess(grn);
    setIsConfirmOpen(true);
  };

  const confirmAddToInventory = () => {
    if (!grnToProcess) return;

    // 1. Mark GRN as Stocked
    const updatedGrns = grns.map(g => g.id === grnToProcess.id ? { ...g, status: 'Stocked' } : g);
    setGrns(updatedGrns);

    // 2. Add items to inventory stock
    const newStockItems = grnToProcess.items.map((item, idx) => ({
      id: `STK-${Date.now()}-${idx}`,
      itemName: item.itemName,
      itemCode: `ITM-NEW-${item.itemId}`, // Mock code
      category: item.category || 'Medicines', // Default to Medicines if missing
      manufacturer: grnToProcess.vendorName,
      store: grnToProcess.store,
      department: 'General Store',
      batchNo: item.batchNumber,
      expiryDate: item.expiryDate || '2099-12-31',
      mfgDate: item.manufactureDate || new Date().toISOString().split('T')[0],
      availableQty: item.acceptedQty,
      reservedQty: 0,
      uom: 'Units',
      reorderLevel: 100,
      maxStock: 5000,
      status: 'In Stock'
    }));
    
    setStockRecords([...newStockItems, ...stockRecords]);

    // 3. Log the transaction in inventory_stock_in
    const newLog = {
      id: `SIN-${Date.now()}`,
      grnNo: grnToProcess.grnNo,
      poNo: grnToProcess.poNumber,
      vendor: grnToProcess.vendorName,
      store: grnToProcess.store,
      receivedDate: grnToProcess.receivedDate,
      totalItems: grnToProcess.items.length,
      status: 'Putaway'
    };
    
    setStockInLogs([newLog, ...stockInLogs]);
    
    setIsConfirmOpen(false);
    setGrnToProcess(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center text-sm text-slate-500 mb-2">
            <span>Inventory</span>
            <span className="mx-2">/</span>
            <span className="text-primary font-medium">Stock In</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Process Stock In</h1>
        </div>
        
        <div className="flex items-center gap-3">
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
                placeholder="Search by GRN, PO, or Vendor..." 
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
              <option value="Accepted">Ready to Stock</option>
              <option value="Stocked">Stocked</option>
            </select>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => exportToExcel(filteredRecords, 'Stock_In')} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium shadow-sm hover:bg-slate-50 flex items-center gap-2">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* Data Grid */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-4 px-6 border-b border-slate-100">GRN No</th>
                <th className="py-4 px-6 border-b border-slate-100">PO Number</th>
                <th className="py-4 px-6 border-b border-slate-100">Vendor</th>
                <th className="py-4 px-6 border-b border-slate-100">Target Store</th>
                <th className="py-4 px-6 border-b border-slate-100">Received Date</th>
                <th className="py-4 px-6 border-b border-slate-100">Total Items</th>
                <th className="py-4 px-6 border-b border-slate-100">Status</th>
                <th className="py-4 px-6 border-b border-slate-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length > 0 ? paginatedRecords.map((record: GRNRecord) => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-3 px-6 font-bold text-slate-800">{record.grnNo}</td>
                  <td className="py-3 px-6 font-medium text-slate-700">{record.poNumber}</td>
                  <td className="py-3 px-6 text-slate-700">{record.vendorName}</td>
                  <td className="py-3 px-6 text-slate-700 font-medium">{record.store}</td>
                  <td className="py-3 px-6 text-slate-600">{record.receivedDate}</td>
                  <td className="py-3 px-6 font-bold text-slate-800">{record.items.length} Items</td>
                  <td className="py-3 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${getStatusColor(record.status)}`}>
                      {getStatusLabel(record.status)}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleView(record)}
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="View GRN Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {record.status === 'Accepted' ? (
                        <button 
                          onClick={() => initiateAddToInventory(record)}
                          className="px-3 py-1.5 bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors font-medium text-xs flex items-center gap-1 whitespace-nowrap"
                        >
                          <Plus className="w-3 h-3" /> Add to Inventory
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleOpenBarcodes(record)}
                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Print Barcodes"
                          >
                            <Barcode className="w-4 h-4" />
                          </button>
                          <span className="text-emerald-600 text-xs font-bold px-2 py-1.5 bg-emerald-50 rounded-lg flex items-center gap-1 border border-emerald-200 whitespace-nowrap">
                            <PackageCheck className="w-3 h-3" /> Processed
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <PackageCheck className="w-12 h-12 mb-4 text-slate-300" />
                      <p className="text-lg font-medium text-slate-600">No pending GRNs to stock</p>
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

      {/* Confirmation Modal */}
      <Modal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} title="Confirm Add to Inventory">
        <div className="p-2 text-slate-600">
          <div className="flex items-start gap-4 p-4 bg-amber-50 text-amber-800 rounded-xl mb-6">
            <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-900 mb-1">Are you sure?</h3>
              <p className="text-sm">You are about to add <strong>{grnToProcess?.items?.length} items</strong> from GRN <strong>{grnToProcess?.grnNo}</strong> into the <strong>{grnToProcess?.store}</strong>.</p>
              <p className="text-sm mt-2">This action will immediately update the current stock and cannot be easily undone.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
            <Button variant="filled" color="primary" icon={CheckCircle2} onClick={confirmAddToInventory}>Confirm & Stock In</Button>
          </div>
        </div>
      </Modal>

      {/* View GRN Details Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="GRN Details" size="5xl">
        {selectedGrn && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">GRN Number</p>
                <p className="font-bold text-slate-800">{selectedGrn.grnNo}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">PO Number</p>
                <p className="font-bold text-slate-800">{selectedGrn.poNumber}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Vendor</p>
                <p className="font-bold text-slate-800">{selectedGrn.vendorName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Received Date</p>
                <p className="font-bold text-slate-800">{selectedGrn.receivedDate}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Store</p>
                <p className="font-bold text-slate-800">{selectedGrn.store}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Invoice</p>
                <p className="font-bold text-slate-800">{selectedGrn.invoiceNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Transport Details</p>
                <p className="font-bold text-slate-800">{selectedGrn.transportDetails || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">QC Status</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${selectedGrn.qcStatus.includes('Pass') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{selectedGrn.qcStatus}</span>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3"><Package className="w-4 h-4 text-primary" /> Received Items</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Item Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Ordered</th>
                      <th className="py-3 px-4 text-right">Received</th>
                      <th className="py-3 px-4 text-right">Accepted</th>
                      <th className="py-3 px-4 text-right">Rejected</th>
                      <th className="py-3 px-4">Batch No</th>
                      <th className="py-3 px-4">Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedGrn.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-800">{item.itemName}</td>
                        <td className="py-3 px-4 text-slate-600">{item.category || '-'}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{item.orderedQty}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{item.receivedQty}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">{item.acceptedQty}</td>
                        <td className="py-3 px-4 text-right font-bold text-red-600">{item.rejectedQty}</td>
                        <td className="py-3 px-4 text-slate-600">{item.batchNumber}</td>
                        <td className="py-3 px-4 text-slate-600">{item.expiryDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Print Barcodes Modal */}
      <Modal isOpen={isBarcodeOpen} onClose={() => setIsBarcodeOpen(false)} title="Print Item Barcodes" size="4xl">
        {barcodeGrn && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <p className="text-sm font-bold text-slate-800">GRN: {barcodeGrn.grnNo}</p>
                <p className="text-xs text-slate-500">Generate barcodes for {barcodeGrn.items.length} items</p>
              </div>
              <Button variant="filled" color="primary" onClick={() => window.print()} className="print:hidden">
                <Printer className="w-4 h-4 mr-2" /> Print Labels
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 max-h-[60vh] overflow-auto p-2" id="barcode-print-area">
              <style>{`
                @media print {
                  body * { visibility: hidden; }
                  #barcode-print-area, #barcode-print-area * { visibility: visible; }
                  #barcode-print-area { position: absolute; left: 0; top: 0; width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
                  .print\\:hidden { display: none !important; }
                }
              `}</style>
              
              {barcodeGrn.items.map((item, idx) => {
                const barcodeData = `ITM-${item.itemId}-${item.batchNumber}`;
                const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(barcodeData)}&code=Code128&dpi=96&dataseparator=`;
                return (
                  <div key={idx} className="border border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center bg-white shadow-sm text-center">
                    <p className="text-[11px] font-bold text-slate-800 mb-1 leading-tight line-clamp-2">{item.itemName}</p>
                    <p className="text-[9px] text-slate-500 mb-3">Batch: {item.batchNumber}</p>
                    <img 
                      src={barcodeUrl} 
                      alt={`Barcode for ${item.itemName}`} 
                      className="w-full h-16 object-contain"
                      loading="lazy"
                    />
                    <p className="text-[10px] font-mono text-slate-600 mt-2">{barcodeData}</p>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-100 print:hidden">
              <Button variant="outline" onClick={() => setIsBarcodeOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

    </motion.div>
  );
};
