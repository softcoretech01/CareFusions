import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { exportToExcel } from '../../utils/exportToExcel';
import { Search, Download, ArrowRightLeft, ChevronLeft, ChevronRight, Plus, Package } from 'lucide-react';
import { initialStockTransfer, mockStores } from './mockData';
import { useLocalStorage } from '../../utils/useLocalStorage';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Eye, Edit2, Trash2, Info } from 'lucide-react';
import { DateFilter } from '../../components/ui/DateFilter';

export const StockTransfer = () => {
  const [records, setRecords] = useLocalStorage('inventory_stock_transfer', initialStockTransfer);
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

  // View Modal State
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  // New/Edit Transfer Modal State
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editRecordId, setEditRecordId] = useState<string | null>(null);

  const emptyForm = {
    fromStore: '',
    toStore: '',
    requestedBy: '',
    remarks: '',
    items: [] as any[]
  };
  const [formData, setFormData] = useState(emptyForm);

  // Compute Total Qty for older mock records
  const processedRecords = useMemo(() => {
    return records.map((r: any) => {
      let totalQty = 0;
      if (r.details) {
        totalQty = r.details.reduce((sum: number, item: any) => sum + (Number(item.transferQty) || 0), 0);
      } else {
        totalQty = r.itemsCount * 5; // mock computation for old data
      }
      return { ...r, totalQty };
    });
  }, [records]);

  const filteredRecords = useMemo(() => {
    return processedRecords.filter((record: any) => {
      const matchesSearch = record.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            record.requestedBy.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStore = filterStore ? (record.fromStore === filterStore || record.toStore === filterStore) : true;
      const matchesStatus = filterStatus ? record.status === filterStatus : true;
      
      let matchesDate = true;
      if (appliedFromDate || appliedToDate) {
        const recordDate = record.transferDate;
        if (appliedFromDate && recordDate < appliedFromDate) matchesDate = false;
        if (appliedToDate && recordDate > appliedToDate) matchesDate = false;
      }
      
      return matchesSearch && matchesStore && matchesStatus && matchesDate;
    });
  }, [processedRecords, searchTerm, filterStore, filterStatus, appliedFromDate, appliedToDate]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Completed': return 'bg-emerald-100 text-emerald-700';
      case 'In Transit': return 'bg-blue-100 text-blue-700';
      case 'Pending': return 'bg-orange-100 text-orange-700';
      case 'Rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const handleView = (record: any) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };

  const handleCreateNew = () => {
    setIsEditMode(false);
    setEditRecordId(null);
    setFormData(emptyForm);
    setIsNewOpen(true);
  };

  const handleEdit = (record: any) => {
    setIsEditMode(true);
    setEditRecordId(record.id);
    setFormData({
      fromStore: record.fromStore,
      toStore: record.toStore,
      requestedBy: record.requestedBy,
      remarks: record.remarks || '',
      items: record.details || []
    });
    setIsNewOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this transfer record?")) {
      setRecords(records.filter((r: any) => r.id !== id));
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { stockId: '', itemName: '', category: '', availableQty: 0, transferQty: 1, remarks: '' }]
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemSelect = (index: number, stockId: string) => {
    const stockItem = stockRecords.find((s: any) => s.id === stockId);
    if (!stockItem) return;

    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      stockId,
      itemName: stockItem.itemName,
      category: stockItem.category,
      availableQty: stockItem.availableQty,
      transferQty: 1
    };
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = () => {
    if (!formData.fromStore || !formData.toStore || formData.items.length === 0) {
      alert("Please select both stores and add at least one item to transfer.");
      return;
    }
    if (formData.fromStore === formData.toStore) {
      alert("Source and destination stores cannot be the same.");
      return;
    }

    const updatedStock = [...stockRecords];
    let hasError = false;

    if (!isEditMode) {
      // 1. Deduct from source store
      formData.items.forEach(transferItem => {
        const sourceIndex = updatedStock.findIndex((s: any) => s.id === transferItem.stockId);
        if (sourceIndex > -1) {
          if (updatedStock[sourceIndex].availableQty >= transferItem.transferQty) {
            updatedStock[sourceIndex].availableQty -= transferItem.transferQty;
          } else {
            alert(`Insufficient stock for ${transferItem.itemName} in Source Store`);
            hasError = true;
          }
        }
      });

      if (hasError) return;

      // 2. Add to destination store (create a new batch/record for the destination if we assume no merging for simplicity, or merge if identical)
      formData.items.forEach(transferItem => {
        const sourceItem = updatedStock.find((s: any) => s.id === transferItem.stockId);
        if (sourceItem) {
          const destIndex = updatedStock.findIndex((s: any) => s.itemName === sourceItem.itemName && s.store === formData.toStore && s.batchNo === sourceItem.batchNo);
          if (destIndex > -1) {
            updatedStock[destIndex].availableQty += transferItem.transferQty;
          } else {
            updatedStock.push({
              ...sourceItem,
              id: `STK-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              store: formData.toStore,
              department: 'General Store', // fallback
              availableQty: transferItem.transferQty
            });
          }
        }
      });

      setStockRecords(updatedStock);
    }

    if (isEditMode && editRecordId) {
      setRecords(records.map((r: any) => r.id === editRecordId ? {
        ...r,
        fromStore: formData.fromStore,
        toStore: formData.toStore,
        requestedBy: formData.requestedBy,
        remarks: formData.remarks,
        itemsCount: formData.items.length,
        details: formData.items
      } : r));
    } else {
      const newRecord = {
        id: `TRF-${Date.now()}`,
        transferDate: new Date().toISOString().split('T')[0],
        fromStore: formData.fromStore,
        toStore: formData.toStore,
        requestedBy: formData.requestedBy || 'Self',
        remarks: formData.remarks,
        itemsCount: formData.items.length,
        status: 'Completed', // auto-complete for mock simplicity
        details: formData.items
      };
      setRecords([newRecord, ...records]);
    }
    
    setIsNewOpen(false);
    setFormData(emptyForm);
  };

  const totalTransferItems = formData.items.length;
  const totalTransferQty = formData.items.reduce((sum, item) => sum + (Number(item.transferQty) || 0), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center text-sm text-slate-500 mb-2">
            <span>Inventory</span>
            <span className="mx-2">/</span>
            <span className="text-primary font-medium">Stock Transfer</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Stock Transfer</h1>
        </div>
        <div className="flex items-center gap-4">
          <DateFilter
            dateFrom={fromDate}
            dateTo={toDate}
            onDateFromChange={setFromDate}
            onDateToChange={setToDate}
            onSearch={handleSearch}
            onReset={handleCancel}
          />
          <Button className="flex items-center gap-2" onClick={handleCreateNew}>
            <Plus className="w-4 h-4" /> Initiate Transfer
          </Button>
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
                placeholder="Search by Transfer No or Requester..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary shadow-sm"
              />
            </div>
            
            <select value={filterStore} onChange={(e) => setFilterStore(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm outline-none focus:border-primary">
              <option value="">Any Store</option>
              {mockStores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>

            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm outline-none focus:border-primary">
              <option value="">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="In Transit">In Transit</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => exportToExcel(filteredRecords, 'Stock_Transfer')} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium shadow-sm hover:bg-slate-50 flex items-center gap-2">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* Data Grid */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-4 px-6 border-b border-slate-100">Transfer No</th>
                <th className="py-4 px-6 border-b border-slate-100">Date</th>
                <th className="py-4 px-6 border-b border-slate-100">Source Store</th>
                <th className="py-4 px-6 border-b border-slate-100">Destination Store</th>
                <th className="py-4 px-6 border-b border-slate-100">Total Items</th>
                <th className="py-4 px-6 border-b border-slate-100">Total Qty</th>
                <th className="py-4 px-6 border-b border-slate-100">Status</th>
                <th className="py-4 px-6 border-b border-slate-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length > 0 ? paginatedRecords.map((record: any) => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-3 px-6 font-bold text-slate-800">
                    <div>{record.id}</div>
                    <div className="text-[10px] text-slate-400 font-normal uppercase tracking-wider mt-0.5">By: {record.requestedBy}</div>
                  </td>
                  <td className="py-3 px-6 text-slate-600">{record.transferDate}</td>
                  <td className="py-3 px-6 font-medium text-slate-700">{record.fromStore}</td>
                  <td className="py-3 px-6 font-medium text-slate-700">{record.toStore}</td>
                  <td className="py-3 px-6 font-bold text-slate-800">{record.itemsCount}</td>
                  <td className="py-3 px-6 font-bold text-primary">{record.totalQty}</td>
                  <td className="py-3 px-6">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-right">
                    <div className="flex justify-end gap-2 transition-opacity">
                      <button onClick={() => handleView(record)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(record)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Transfer">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(record.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Transfer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <ArrowRightLeft className="w-12 h-12 mb-4 text-slate-300" />
                      <p className="text-lg font-medium text-slate-600">No stock transfer records found</p>
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

      {/* New/Edit Transfer Modal */}
      <Modal isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} title={isEditMode ? "Edit Stock Transfer" : "Initiate Stock Transfer"} size="5xl">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source Store</label>
              <select 
                value={formData.fromStore}
                onChange={(e) => setFormData({ ...formData, fromStore: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
                disabled={isEditMode}
              >
                <option value="">Select Source</option>
                {mockStores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Destination Store</label>
              <select 
                value={formData.toStore}
                onChange={(e) => setFormData({ ...formData, toStore: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
              >
                <option value="">Select Destination</option>
                {mockStores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Requested By</label>
              <input 
                type="text"
                value={formData.requestedBy}
                onChange={(e) => setFormData({ ...formData, requestedBy: e.target.value })}
                placeholder="Name"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reason / Remarks</label>
              <input 
                type="text"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Optional"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-800">Items to Transfer</h3>
              <Button variant="outline" onClick={handleAddItem} className="py-1.5 text-xs"><Plus className="w-3 h-3 mr-1" /> Add Item</Button>
            </div>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-[25%]">Select Item</th>
                    <th className="py-3 px-4 w-[15%]">Category</th>
                    <th className="py-3 px-4 w-[15%]">Available Qty</th>
                    <th className="py-3 px-4 w-[15%]">Transfer Qty</th>
                    <th className="py-3 px-4 w-[20%]">Remarks</th>
                    <th className="py-3 px-4 text-center w-[10%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="py-2 px-4">
                        <select 
                          value={item.stockId || item.itemName}
                          onChange={(e) => {
                            if (!isEditMode) handleItemSelect(index, e.target.value);
                          }}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
                          disabled={!formData.fromStore || isEditMode}
                        >
                          <option value="">Select Item from {formData.fromStore || 'Source Store'}</option>
                          {isEditMode ? (
                            <option value={item.itemName}>{item.itemName}</option>
                          ) : (
                            stockRecords.filter((s: any) => s.store === formData.fromStore && s.availableQty > 0).map((s: any) => (
                              <option key={s.id} value={s.id}>{s.itemName} (Batch: {s.batchNo})</option>
                            ))
                          )}
                        </select>
                      </td>
                      <td className="py-2 px-4 text-slate-600">
                        {item.category || '-'}
                      </td>
                      <td className="py-2 px-4 font-bold text-slate-700">
                        {isEditMode ? '-' : item.availableQty}
                      </td>
                      <td className="py-2 px-4">
                        <input 
                          type="number"
                          min="1"
                          max={isEditMode ? undefined : item.availableQty}
                          value={item.transferQty}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].transferQty = Number(e.target.value);
                            setFormData({ ...formData, items: newItems });
                          }}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input 
                          type="text"
                          placeholder="Note..."
                          value={item.remarks || ''}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].remarks = e.target.value;
                            setFormData({ ...formData, items: newItems });
                          }}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                        />
                      </td>
                      <td className="py-2 px-4 text-center">
                        <button onClick={() => handleRemoveItem(index)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {formData.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Please select a source store and add items to transfer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Transfer Summary Block */}
            <div className="mt-4 p-4 bg-primary/5 border border-primary/10 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-medium">
                <Info className="w-5 h-5" />
                <span>Transfer Summary</span>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Line Items</div>
                  <div className="text-xl font-bold text-slate-800">{totalTransferItems}</div>
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div className="text-center">
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Total Quantity</div>
                  <div className="text-xl font-bold text-primary">{totalTransferQty}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsNewOpen(false)}>Cancel</Button>
            <Button variant="filled" color="primary" onClick={handleSubmit}>{isEditMode ? 'Save Changes' : 'Execute Transfer'}</Button>
          </div>
        </div>
      </Modal>

      {/* View Details Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Transfer Details" size="4xl">
        {selectedRecord && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Transfer No</p>
                <p className="font-bold text-slate-800">{selectedRecord.id}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Date</p>
                <p className="font-bold text-slate-800">{selectedRecord.transferDate}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Source Store</p>
                <p className="font-bold text-slate-800">{selectedRecord.fromStore}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Destination Store</p>
                <p className="font-bold text-slate-800">{selectedRecord.toStore}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Requested By</p>
                <p className="font-bold text-slate-800">{selectedRecord.requestedBy}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-500 font-medium mb-1">Remarks</p>
                <p className="font-bold text-slate-800">{selectedRecord.remarks || 'None'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Status</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(selectedRecord.status)}`}>{selectedRecord.status}</span>
              </div>
            </div>

            {selectedRecord.details ? (
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3"><Package className="w-4 h-4 text-primary" /> Transferred Items</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 text-right">Transfer Qty</th>
                        <th className="py-3 px-4">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedRecord.details.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-slate-800">{item.itemName}</td>
                          <td className="py-3 px-4 text-slate-600">{item.category || '-'}</td>
                          <td className="py-3 px-4 text-right font-bold text-blue-600">{item.transferQty}</td>
                          <td className="py-3 px-4 text-slate-600">{item.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                      <tr>
                        <td className="py-3 px-4 text-right text-slate-600">Total:</td>
                        <td className="py-3 px-4 text-right text-primary">{selectedRecord.totalQty}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Detailed items are not available for this mock record.</p>
            )}
            
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

    </motion.div>
  );
};
