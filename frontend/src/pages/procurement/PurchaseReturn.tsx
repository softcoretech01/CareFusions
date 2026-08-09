import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Filter, Edit2, Eye, RotateCcw, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { DateFilter } from '../../components/ui/DateFilter';

import type { GRNRecord } from './GoodsReceipt';

const API_BASE = import.meta.env.VITE_API_URL as string;

interface ReturnItem {
  id: string;
  itemId: number;
  itemName: string;
  receivedQty: number;
  returnQty: number;
  reason: string;
  remarks: string;
}

export interface ReturnRecord {
  id: number;
  returnNo: string;
  grnNo: string;
  vendorId: number;
  vendorName: string;
  store: string;
  returnDate: string;
  reason: string;
  status: string; // 'Draft', 'Approved', 'Shipped'
  items: ReturnItem[];
}

export const PurchaseReturn = () => {
  const [records, setRecords] = useState<ReturnRecord[]>([]);
  const [allGRNs, setAllGRNs] = useState<GRNRecord[]>([]);
  const [itemsMock, setItemsMock] = useState<any[]>([]);
  const [vendorsMock, setVendorsMock] = useState<any[]>([]);
  const [warehousesMock, setWarehousesMock] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<ReturnRecord | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prRes, grnRes, itemRes, venRes, whRes] = await Promise.all([
        fetch(`${API_BASE}/purchase-returns`),
        fetch(`${API_BASE}/grns`),
        fetch(`${API_BASE}/items`),
        fetch(`${API_BASE}/vendors`),
        fetch(`${API_BASE}/stores`)
      ]);
      
      if (prRes.ok) setRecords(await prRes.json());
      if (grnRes.ok) setAllGRNs(await grnRes.json());
      if (itemRes.ok) setItemsMock(await itemRes.json());
      if (venRes.ok) setVendorsMock(await venRes.json());
      if (whRes.ok) setWarehousesMock(await whRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sortConfig] = useState<{key: keyof ReturnRecord | null, direction: 'asc'|'desc'}>({ key: null, direction: 'asc' });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendor, setFilterVendor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ReturnRecord | null>(null);
  
  const emptyForm: Omit<ReturnRecord, 'id' | 'returnNo'> = {
    grnNo: '', vendorId: 0, vendorName: '', store: '', returnDate: new Date().toISOString().split('T')[0],
    reason: '', status: 'Draft', items: []
  };
  const [formData, setFormData] = useState<any>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.grnNo) newErrors.grnNo = 'Required';
    if (!formData.store) newErrors.store = 'Required';
    if (formData.items.length === 0) newErrors.items = 'At least one item is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData({ ...emptyForm, returnNo: `PRN-${new Date().getFullYear()}-${String(records.length + 1).padStart(3, '0')}` });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: ReturnRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };
  
  const handleView = (record: ReturnRecord) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };

  const handleSave = async (status: string) => {
    if (validateForm()) {
      const payload = { ...formData, status };
      try {
        const url = selectedRecord ? `${API_BASE}/purchase-returns/${selectedRecord.id}` : `${API_BASE}/purchase-returns`;
        const method = selectedRecord ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          fetchData();
          setIsFormOpen(false);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDelete = (record: ReturnRecord) => {
    setRecordToDelete(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (recordToDelete) {
      try {
        const res = await fetch(`${API_BASE}/purchase-returns/${recordToDelete.id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchData();
        }
      } catch (error) {
        console.error('Failed to delete Purchase Return:', error);
      } finally {
        setIsDeleteOpen(false);
        setRecordToDelete(null);
      }
    }
  };

  const handleAddItem = () => {
    const newItem: ReturnItem = { id: Math.random().toString(), itemId: 0, itemName: '', receivedQty: 0, returnQty: 0, reason: '', remarks: '' };
    setFormData({ ...formData, items: [...formData.items, newItem] });
  };

  const handleItemChange = (index: number, itemId: number) => {
    const selectedItem = itemsMock.find(i => i.id === itemId);
    if (!selectedItem) return;
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], itemId: selectedItem.id, itemName: selectedItem.itemName };
    setFormData({ ...formData, items: newItems });
  };

  const processedData = useMemo(() => {
    let result = records.filter(record => {
      const matchesSearch = Object.values(record).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesVendor = filterVendor ? record.vendorName === filterVendor : true;
      const matchesStatus = filterStatus ? record.status === filterStatus : true;
      let matchesDate = true;
      if (fromDate && toDate) {
        const itemDate = new Date(record.returnDate);
        const start = new Date(fromDate);
        const end = new Date(toDate);
        matchesDate = itemDate >= start && itemDate <= end;
      }
      return matchesSearch && matchesVendor && matchesStatus && matchesDate;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key!] < b[sortConfig.key!]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key!] > b[sortConfig.key!]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [records, searchTerm, filterVendor, filterStatus, sortConfig, fromDate, toDate]);


  const paginatedData = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Draft': return 'bg-slate-100 text-slate-700';
      case 'Approved': return 'bg-emerald-100 text-emerald-700';
      case 'Shipped': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center text-sm text-slate-500 mb-2">
          <span>Procurement</span>
          <span className="mx-2">/</span>
          <span className="text-primary font-medium">Purchase Return</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 whitespace-nowrap">Purchase Returns</h1>
          </div>
          <div className="flex items-stretch gap-3">
            <DateFilter
              dateFrom={fromDate}
              dateTo={toDate}
              onDateFromChange={setFromDate}
              onDateToChange={setToDate}
              onSearch={() => {}}
              onReset={() => { setFromDate(''); setToDate(''); }}
            />
            <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew} className="h-[38px] !px-3 text-sm whitespace-nowrap h-auto">Create Return</Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" placeholder="Search Return No, GRN No..." value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"
              />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={`p-2 border rounded-lg transition-colors ${showFilters ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              <Filter className="w-4 h-4" />
            </button>
            <button onClick={fetchData} className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-slate-100 bg-slate-50 overflow-hidden">
              <div className="p-4 flex gap-4">
                <select value={filterVendor} onChange={(e) => { setFilterVendor(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none">
                  <option value="">All Vendors</option>
                  {vendorsMock.map(v => <option key={v.id} value={v.vendorName}>{v.vendorName}</option>)}
                </select>
                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none">
                  <option value="">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Approved">Approved</option>
                  <option value="Shipped">Shipped</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Return No</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">GRN No</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Vendor</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Return Date</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Reason</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Status</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-500">No records found</td></tr>
              ) : paginatedData.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 text-slate-800 font-medium">{record.returnNo}</td>
                  <td className="py-3 px-4 text-slate-800">{record.grnNo}</td>
                  <td className="py-3 px-4 text-slate-800">{record.vendorName}</td>
                  <td className="py-3 px-4 text-slate-800">{record.returnDate}</td>
                  <td className="py-3 px-4 text-slate-800">{record.reason}</td>
                  <td className="py-3 px-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>{record.status}</span></td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleView(record)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="View Details"><Eye className="w-4 h-4" /></button>
                      <button 
                        onClick={() => !(record.status === 'Approved' || record.status === 'Shipped') && handleEdit(record)} 
                        disabled={record.status === 'Approved' || record.status === 'Shipped'}
                        className={`p-1.5 rounded-lg transition-colors ${(record.status === 'Approved' || record.status === 'Shipped') ? 'text-slate-300 cursor-not-allowed opacity-50' : 'text-slate-400 hover:text-primary hover:bg-primary/10'}`} 
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => !(record.status === 'Approved' || record.status === 'Shipped') && handleDelete(record)} 
                        disabled={record.status === 'Approved' || record.status === 'Shipped'}
                        className={`p-1.5 rounded-lg transition-colors ${(record.status === 'Approved' || record.status === 'Shipped') ? 'text-slate-300 cursor-not-allowed opacity-50' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`} 
                        title="Delete"
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

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={`${selectedRecord ? 'Edit' : 'New'} Purchase Return`} size="7xl">
        <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-4 gap-4">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Return Number</label><input type="text" value={formData.returnNo} disabled className="w-full px-3 py-1.5 border border-slate-200 bg-slate-100 rounded-lg text-sm" /></div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">GRN Number*</label>
              <select value={formData.grnNo} onChange={(e) => {
                const grn = allGRNs.find(g => g.grnNo === e.target.value);
                if (grn) {
                  const newItems = grn.items.map(item => ({
                    id: Math.random().toString(),
                    itemId: item.itemId,
                    itemName: item.itemName,
                    receivedQty: item.receivedQty,
                    returnQty: item.rejectedQty > 0 ? item.rejectedQty : 0,
                    reason: '',
                    remarks: ''
                  }));
                  setFormData({
                    ...formData,
                    grnNo: grn.grnNo,
                    vendorId: grn.vendorId,
                    vendorName: grn.vendorName,
                    store: grn.store,
                    items: newItems
                  });
                } else {
                  setFormData({...formData, grnNo: e.target.value});
                }
              }} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary">
                <option value="">Select GRN</option>
                {allGRNs.map(grn => <option key={grn.id} value={grn.grnNo}>{grn.grnNo}</option>)}
              </select>
              {errors.grnNo && <span className="text-xs text-red-500">{errors.grnNo}</span>}
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Vendor*</label>
              <select value={formData.vendorId} onChange={(e) => {
                const vendor = vendorsMock.find(v => v.id === Number(e.target.value));
                setFormData({...formData, vendorId: vendor?.id || 0, vendorName: vendor?.vendorName || ''});
              }} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary">
                <option value="">Select Vendor</option>
                {vendorsMock.map(v => <option key={v.id} value={v.id}>{v.vendorName}</option>)}
              </select>
            </div>
            
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Returning Store*</label>
              <select value={formData.store} onChange={(e) => setFormData({...formData, store: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary">
                <option value="">Select Store</option>
                {warehousesMock.map(w => <option key={w.id} value={w.storeName}>{w.storeName}</option>)}
              </select>
              {errors.store && <span className="text-xs text-red-500">{errors.store}</span>}
            </div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Return Date</label><input type="date" value={formData.returnDate} onChange={(e) => setFormData({...formData, returnDate: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" /></div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Overall Reason</label>
              <input type="text" value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><RotateCcw className="w-4 h-4 text-primary" /> Return Items</h3>
              <Button variant="outline" size="sm" icon={Plus} onClick={handleAddItem}>Add Item</Button>
            </div>
            {errors.items && <div className="text-xs text-red-500 mb-2">{errors.items}</div>}
            
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Item*</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-24">Received Qty</th>
                    <th className="text-right py-2 px-3 font-medium text-red-500 w-24">Return Qty*</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Reason</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Remarks</th>
                    <th className="text-center py-2 px-3 font-medium text-slate-600 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.items.map((item: ReturnItem, index: number) => (
                    <tr key={item.id} className="bg-white">
                      <td className="py-2 px-3">
                        <select value={item.itemId || ''} onChange={(e) => handleItemChange(index, Number(e.target.value))} className="w-full p-1.5 border rounded-lg text-sm">
                          <option value="">Select Item</option>
                          {itemsMock.map(i => <option key={i.id} value={i.id}>{i.itemName}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-3"><input type="number" min="0" value={item.receivedQty} onChange={(e) => { const items = [...formData.items]; items[index].receivedQty = Number(e.target.value); setFormData({...formData, items})}} className="w-full p-1.5 border rounded-lg text-sm text-right bg-slate-50" /></td>
                      <td className="py-2 px-3"><input type="number" min="0" value={item.returnQty} onChange={(e) => { const items = [...formData.items]; items[index].returnQty = Number(e.target.value); setFormData({...formData, items})}} className="w-full p-1.5 border rounded-lg text-sm text-right bg-red-50 text-red-600 font-medium" /></td>
                      <td className="py-2 px-3"><input type="text" value={item.reason} onChange={(e) => { const items = [...formData.items]; items[index].reason = e.target.value; setFormData({...formData, items})}} className="w-full p-1.5 border rounded-lg text-sm" /></td>
                      <td className="py-2 px-3"><input type="text" value={item.remarks} onChange={(e) => { const items = [...formData.items]; items[index].remarks = e.target.value; setFormData({...formData, items})}} className="w-full p-1.5 border rounded-lg text-sm" /></td>
                      <td className="py-2 px-3 text-center"><button onClick={() => { const items = [...formData.items]; items.splice(index, 1); setFormData({...formData, items}) }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><RotateCcw className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-100">
          <div className="text-xs text-slate-500">Stock will be adjusted (deducted) automatically</div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => handleSave('Draft')}>Save Draft</Button>
            <Button variant="filled" color="primary" onClick={() => handleSave('Approved')}>Approve Return</Button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="View Purchase Return" size="7xl">
        {selectedRecord && (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-4 gap-4">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Return Number</label><div className="text-sm font-medium text-slate-800">{selectedRecord.returnNo}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">GRN Number</label><div className="text-sm font-medium text-slate-800">{selectedRecord.grnNo}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Vendor</label><div className="text-sm font-medium text-slate-800">{selectedRecord.vendorName}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Status</label><div className="text-sm font-medium text-slate-800">{selectedRecord.status}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Return Date</label><div className="text-sm font-medium text-slate-800">{selectedRecord.returnDate}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Store</label><div className="text-sm font-medium text-slate-800">{selectedRecord.store}</div></div>
              <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Overall Reason</label><div className="text-sm font-medium text-slate-800">{selectedRecord.reason || '-'}</div></div>
            </div>
            
            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Returned Items</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Item</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Received Qty</th>
                      <th className="text-right py-2 px-3 font-medium text-red-600">Returned Qty</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Reason</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedRecord.items.map((item) => (
                      <tr key={item.id} className="bg-white">
                        <td className="py-2 px-3 font-medium">{item.itemName}</td>
                        <td className="py-2 px-3 text-right">{item.receivedQty}</td>
                        <td className="py-2 px-3 text-right font-bold text-red-600">{item.returnQty}</td>
                        <td className="py-2 px-3">{item.reason || '-'}</td>
                        <td className="py-2 px-3">{item.remarks || '-'}</td>
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
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title=""
        size="sm"
      >
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Record</h3>
          <p className="text-slate-500 text-sm mb-6">
            Are you sure you want to delete <span className="font-semibold text-slate-700">{recordToDelete?.returnNo}</span>?
          </p>
          <div className="flex items-center gap-3 w-full">
            <Button variant="outline" color="secondary" className="flex-1" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="filled" color="danger" className="flex-1" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
