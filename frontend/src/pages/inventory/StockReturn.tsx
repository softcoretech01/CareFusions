import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, Eye, FileOutput, ChevronLeft, ChevronRight, Plus, Trash2, Package, Edit2, Info, CornerDownLeft } from 'lucide-react';
import { exportToExcel } from '../../utils/exportToExcel';
import { DateFilter } from '../../components/ui/DateFilter';
import { initialStockReturn, mockStores, mockDepartments } from './mockData';
import { useLocalStorage } from '../../utils/useLocalStorage';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

export const StockReturn = () => {
  const [records, setRecords] = useLocalStorage('inventory_stock_return', initialStockReturn);
  const [stockRecords] = useLocalStorage<any[]>('inventory_stock', []);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('');
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

  // New/Edit Modal State
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editRecordId, setEditRecordId] = useState<string | null>(null);
  
  const emptyForm = {
    source: '',
    returnTo: '',
    returnedBy: '',
    reason: 'Excess',
    status: 'Pending',
    items: [] as any[]
  };
  const [formData, setFormData] = useState(emptyForm);

  // Compute Total Qty for older mock records
  const processedRecords = useMemo(() => {
    return records.map((r: any) => {
      let totalQty = 0;
      if (r.details) {
        totalQty = r.details.reduce((sum: number, item: any) => sum + (Number(item.returnQty) || 0), 0);
      } else {
        totalQty = r.itemsCount * 5; // mock computation for old data
      }
      return { ...r, totalQty };
    });
  }, [records]);

  const filteredRecords = useMemo(() => {
    return processedRecords.filter((record: any) => {
      const matchesSearch = record.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            record.returnedBy.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSource = filterSource ? record.source === filterSource : true;
      
      let matchesDate = true;
      if (appliedFromDate || appliedToDate) {
        const recordDate = record.returnDate;
        if (appliedFromDate && recordDate < appliedFromDate) matchesDate = false;
        if (appliedToDate && recordDate > appliedToDate) matchesDate = false;
      }
      
      return matchesSearch && matchesSource && matchesDate;
    });
  }, [processedRecords, searchTerm, filterSource, appliedFromDate, appliedToDate]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
      source: record.source,
      returnTo: record.returnTo,
      returnedBy: record.returnedBy,
      reason: record.reason,
      status: record.status || 'Pending',
      items: record.details || []
    });
    setIsNewOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this return record?")) {
      setRecords(records.filter((r: any) => r.id !== id));
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { stockId: '', itemName: '', category: '', returnQty: 1, condition: 'Good' }]
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
      returnQty: 1
    };
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = (actionStatus: 'Pending' | 'Received') => {
    if (!formData.source || !formData.returnTo || formData.items.length === 0) {
      alert("Please fill all required fields and add at least one item.");
      return;
    }

    // A complete implementation would increment the central store's stock based on return item mapping.
    // For this mock, we just record the transaction successfully.

    if (isEditMode && editRecordId) {
      setRecords(records.map((r: any) => r.id === editRecordId ? {
        ...r,
        source: formData.source,
        returnTo: formData.returnTo,
        returnedBy: formData.returnedBy,
        reason: formData.reason,
        status: actionStatus,
        itemsCount: formData.items.length,
        details: formData.items
      } : r));
    } else {
      const newRecord = {
        id: `RET-${Date.now()}`,
        returnDate: new Date().toISOString().split('T')[0],
        source: formData.source,
        returnTo: formData.returnTo,
        returnedBy: formData.returnedBy || 'Self',
        reason: formData.reason,
        itemsCount: formData.items.length,
        status: actionStatus,
        details: formData.items
      };
      setRecords([newRecord, ...records]);
    }
    
    setIsNewOpen(false);
    setFormData(emptyForm);
  };

  const handleExport = () => {
    if (filteredRecords.length === 0) return;
    exportToExcel(filteredRecords, `Stock_Return_${new Date().toISOString().split('T')[0]}`);
  };

  // Summary computations
  const totalReturnItems = formData.items.length;
  const totalReturnQty = formData.items.reduce((sum, item) => sum + (Number(item.returnQty) || 0), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center text-sm text-slate-500 mb-2">
            <span>Inventory</span>
            <span className="mx-2">/</span>
            <span className="text-primary font-medium">Stock Return</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Stock Return</h1>
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
            <CornerDownLeft className="w-4 h-4" /> New Return
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
                placeholder="Search by Return No or Person..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary shadow-sm"
              />
            </div>
            
            <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm outline-none focus:border-primary">
              <option value="">All Sources</option>
              <optgroup label="Departments">
                {mockDepartments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </optgroup>
              <optgroup label="Stores">
                {mockStores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </optgroup>
            </select>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={handleExport} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-medium shadow-sm hover:bg-slate-50 flex items-center gap-2">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>

        {/* Data Grid */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-4 px-6 border-b border-slate-100">Return No</th>
                <th className="py-4 px-6 border-b border-slate-100">Date</th>
                <th className="py-4 px-6 border-b border-slate-100">Source (Returned From)</th>
                <th className="py-4 px-6 border-b border-slate-100">Returned By</th>
                <th className="py-4 px-6 border-b border-slate-100">Reason</th>
                <th className="py-4 px-6 border-b border-slate-100 text-right">Items</th>
                <th className="py-4 px-6 border-b border-slate-100 text-right">Total Qty</th>
                <th className="py-4 px-6 border-b border-slate-100 text-center">Status</th>
                <th className="py-4 px-6 border-b border-slate-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length > 0 ? paginatedRecords.map((record: any) => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-3 px-6 font-bold text-slate-800">{record.id}</td>
                  <td className="py-3 px-6 text-slate-600">{record.returnDate}</td>
                  <td className="py-3 px-6 font-medium text-slate-700">{record.source}</td>
                  <td className="py-3 px-6 text-slate-700">{record.returnedBy}</td>
                  <td className="py-3 px-6 text-slate-600">{record.reason}</td>
                  <td className="py-3 px-6 text-right font-bold text-slate-800">{record.itemsCount}</td>
                  <td className="py-3 px-6 text-right font-bold text-primary">{record.totalQty}</td>
                  <td className="py-3 px-6 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      record.status === 'Returned' ? 'bg-emerald-100 text-emerald-700' :
                      record.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-right">
                    <div className="flex justify-end gap-2 transition-opacity">
                      <button onClick={() => handleView(record)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(record)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Return">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(record.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Return">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <FileOutput className="w-12 h-12 mb-4 text-slate-300" />
                      <p className="text-lg font-medium text-slate-600">No stock return records found</p>
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

      {/* New/Edit Return Modal */}
      <Modal isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} title={isEditMode ? "Edit Stock Return" : "New Stock Return"} size="5xl">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source (Return From)</label>
              <select 
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
                disabled={isEditMode}
              >
                <option value="">Select Source</option>
                <optgroup label="Departments">
                  {mockDepartments.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </optgroup>
                <optgroup label="Stores">
                  {mockStores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Return To</label>
              <select 
                value={formData.returnTo}
                onChange={(e) => setFormData({ ...formData, returnTo: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
              >
                <option value="">Select Destination</option>
                {mockStores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Returned By</label>
              <input 
                type="text"
                value={formData.returnedBy}
                onChange={(e) => setFormData({ ...formData, returnedBy: e.target.value })}
                placeholder="Name"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
              <select 
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
              >
                <option value="Excess">Excess Quantity</option>
                <option value="Damaged">Damaged / Defective</option>
                <option value="Expired">Expired</option>
                <option value="Wrong Item">Wrong Item Issued</option>
                <option value="Patient Discharged">Patient Discharged</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-800">Items to Return</h3>
              <Button variant="outline" onClick={handleAddItem} className="py-1.5 text-xs"><Plus className="w-3 h-3 mr-1" /> Add Item</Button>
            </div>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-[30%]">Item Description</th>
                    <th className="py-3 px-4 w-[15%]">Category</th>
                    <th className="py-3 px-4 w-[15%]">Return Qty</th>
                    <th className="py-3 px-4 w-[30%]">Condition / Remarks</th>
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
                          disabled={!formData.source || isEditMode}
                        >
                          <option value="">Select Item from {formData.source || 'Source'}</option>
                          {isEditMode ? (
                            <option value={item.itemName}>{item.itemName}</option>
                          ) : (
                            stockRecords.filter((s: any) => (s.store === formData.source || s.department === formData.source) && s.availableQty > 0).map((s: any) => (
                              <option key={s.id} value={s.id}>{s.itemName} (Batch: {s.batchNo})</option>
                            ))
                          )}
                        </select>
                      </td>
                      <td className="py-2 px-4 text-slate-600">
                        {item.category || '-'}
                      </td>
                      <td className="py-2 px-4">
                        <input 
                          type="number"
                          min="1"
                          value={item.returnQty}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].returnQty = Number(e.target.value);
                            setFormData({ ...formData, items: newItems });
                          }}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input 
                          type="text"
                          placeholder="Note condition..."
                          value={item.condition || ''}
                          onChange={(e) => {
                            const newItems = [...formData.items];
                            newItems[index].condition = e.target.value;
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
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        Please add items to process the return.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Return Summary Block */}
            <div className="mt-4 p-4 bg-primary/5 border border-primary/10 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-medium">
                <Info className="w-5 h-5" />
                <span>Return Summary</span>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Line Items</div>
                  <div className="text-xl font-bold text-slate-800">{totalReturnItems}</div>
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div className="text-center">
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-0.5">Total Quantity</div>
                  <div className="text-xl font-bold text-primary">{totalReturnQty}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsNewOpen(false)}>Cancel</Button>
            {(!isEditMode || formData.status === 'Pending') && (
              <Button variant="outline" onClick={() => handleSubmit('Pending')}>Save</Button>
            )}
            {(!isEditMode || formData.status === 'Pending') && (
              <Button variant="filled" color="primary" onClick={() => handleSubmit('Received')}>Post</Button>
            )}
          </div>
        </div>
      </Modal>

      {/* View Details Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Stock Return Details" size="4xl">
        {selectedRecord && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Return No</p>
                <p className="font-bold text-slate-800">{selectedRecord.id}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Date</p>
                <p className="font-bold text-slate-800">{selectedRecord.returnDate}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Source (From)</p>
                <p className="font-bold text-slate-800">{selectedRecord.source}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Return To</p>
                <p className="font-bold text-slate-800">{selectedRecord.returnTo}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Returned By</p>
                <p className="font-bold text-slate-800">{selectedRecord.returnedBy}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Reason</p>
                <p className="font-bold text-slate-800">{selectedRecord.reason}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Status</p>
                <p className="font-bold text-emerald-600">{selectedRecord.status}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Total Quantity</p>
                <p className="font-bold text-primary">{selectedRecord.totalQty}</p>
              </div>
            </div>

            {selectedRecord.details ? (
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3"><Package className="w-4 h-4 text-primary" /> Returned Items</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 text-right">Qty Returned</th>
                        <th className="py-3 px-4">Condition / Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedRecord.details.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-slate-800">{item.itemName}</td>
                          <td className="py-3 px-4 text-slate-600">{item.category || '-'}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600">{item.returnQty}</td>
                          <td className="py-3 px-4 text-slate-600">{item.condition || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
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
