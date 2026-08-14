import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Plus, Edit2, Eye, PackageCheck, Trash2, Download, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { DateFilter } from '../../components/ui/DateFilter';

import type { PORecord } from './PurchaseOrders';
import { exportToExcel } from '../../utils/exportToExcel';

const API_BASE = import.meta.env.VITE_API_URL as string;

interface GRNItem {
  id: string;
  itemId: number;
  itemName: string;
  category?: string;
  orderedQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  rate?: number;
  totalPrice?: number;
  batchNumber: string;
  expiryDate: string;
  manufactureDate: string;
  remarks: string;
}

export interface GRNRecord {
  id: number;
  grnNo: string;
  poNumber: string;
  vendorId: number;
  vendorName: string;
  store: string;
  receivedDate: string;
  invoiceNumber: string;
  invoiceDate: string;
  transportDetails: string;
  lrNumber: string;
  vehicleNumber: string;
  status: string; // 'Draft', 'Submitted', 'QC Pending', 'Accepted', 'Rejected'
  qcStatus: string;
  items: GRNItem[];
}

export const initialGRNs: GRNRecord[] = [];

export const GoodsReceipt = () => {
  const [records, setRecords] = useState<GRNRecord[]>([]);
  const [allPOs, setAllPOs] = useState<PORecord[]>([]);
  const [vendorsMock, setVendorsMock] = useState<any[]>([]);
  const [warehousesMock, setWarehousesMock] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<GRNRecord | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [grnsRes, posRes, venRes, whRes] = await Promise.all([
        fetch(`${API_BASE}/grns`),
        fetch(`${API_BASE}/purchase-orders`),
        fetch(`${API_BASE}/vendors`),
        fetch(`${API_BASE}/stores`)
      ]);
      
      if (grnsRes.ok) setRecords(await grnsRes.json());
      if (posRes.ok) setAllPOs(await posRes.json());
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
  const [sortConfig] = useState<{key: keyof GRNRecord | null, direction: 'asc'|'desc'}>({ key: null, direction: 'asc' });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendor, setFilterVendor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<GRNRecord | null>(null);


  const [isFormOpen, setIsFormOpen] = useState(false);
  const emptyForm: Omit<GRNRecord, 'id' | 'grnNo'> = {
    poNumber: '', vendorId: 0, vendorName: '', store: '', receivedDate: new Date().toISOString().split('T')[0],
    invoiceNumber: '', invoiceDate: '', transportDetails: '', lrNumber: '', vehicleNumber: '',
    status: 'Draft', qcStatus: 'Pending', items: []
  };
  const [formData, setFormData] = useState<any>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.poNumber) newErrors.poNumber = 'Required';
    if (!formData.store) newErrors.store = 'Required';
    if (formData.items.length === 0) newErrors.items = 'At least one item is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData({ ...emptyForm, grnNo: `GRN-${new Date().getFullYear()}-${String(records.length + 1).padStart(3, '0')}` });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: GRNRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };
  
  const handleView = (record: GRNRecord) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };

  const handleSave = async (status: string) => {
    if (validateForm()) {
      let qcStatus = formData.qcStatus;
      if (status === 'Accepted') {
        const hasRejections = formData.items.some((i: GRNItem) => i.rejectedQty > 0);
        qcStatus = hasRejections ? 'Partial Pass' : 'Pass';
      }

      const payload = { ...formData, status, qcStatus };
      try {
        const url = selectedRecord ? `${API_BASE}/grns/${selectedRecord.id}` : `${API_BASE}/grns`;
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

  const handleAccept = async (record: GRNRecord) => {
    const hasRejections = (record.items || []).some((i: GRNItem) => i.rejectedQty > 0);
    const qcStatus = hasRejections ? 'Partial Pass' : 'Pass';
    const payload = { ...record, status: 'Accepted', qcStatus };
    try {
      const res = await fetch(`${API_BASE}/grns/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = (record: GRNRecord) => {
    setRecordToDelete(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (recordToDelete) {
      try {
        const res = await fetch(`${API_BASE}/grns/${recordToDelete.id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchData();
        }
      } catch (error) {
        console.error('Failed to delete GRN:', error);
      } finally {
        setIsDeleteOpen(false);
        setRecordToDelete(null);
      }
    }
  };


  const handleQtyCalc = (index: number, field: keyof GRNItem, value: number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    // Auto calculate rejected and total price
    if (field === 'receivedQty' || field === 'acceptedQty') {
      const rec = field === 'receivedQty' ? value : (newItems[index].receivedQty || 0);
      const acc = field === 'acceptedQty' ? value : (newItems[index].acceptedQty || 0);
      newItems[index].rejectedQty = Math.max(0, rec - acc);
      newItems[index].totalPrice = acc * (newItems[index].rate || 0);
    } else if (field === 'rejectedQty') {
      const rec = newItems[index].receivedQty || 0;
      const rej = value;
      const acc = Math.max(0, rec - rej);
      newItems[index].acceptedQty = acc;
      newItems[index].totalPrice = acc * (newItems[index].rate || 0);
    } else if (field === 'rate') {
      const acc = newItems[index].acceptedQty || 0;
      newItems[index].totalPrice = acc * value;
    }
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
        const itemDate = new Date(record.receivedDate);
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
      case 'Accepted': return 'bg-emerald-100 text-emerald-700';
      case 'Rejected': return 'bg-red-100 text-red-700';
      case 'QC Pending': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center text-sm text-slate-500 mb-2">
          <span>Procurement</span>
          <span className="mx-2">/</span>
          <span className="text-primary font-medium">Goods Receipt (GRN)</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 whitespace-nowrap">Goods Receipt Note</h1>
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
          <Button variant="outline" icon={Download} onClick={() => exportToExcel(processedData, 'Goods_Receipt')} className="h-[38px] !px-3 text-sm whitespace-nowrap h-auto">
            Export Excel
          </Button>
          <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew} className="h-[38px] !px-3 text-sm whitespace-nowrap h-auto">
            Create GRN
          </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" placeholder="Search GRN, PO No..." value={searchTerm}
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
                  <option value="Accepted">Accepted</option>
                  <option value="QC Pending">QC Pending</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">GRN No</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">PO Number</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Vendor</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Received Date</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Store</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Status</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-500">No records found</td></tr>
              ) : paginatedData.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 text-slate-800 font-medium">{record.grnNo}</td>
                  <td className="py-3 px-4 text-slate-800">{record.poNumber}</td>
                  <td className="py-3 px-4 text-slate-800">{record.vendorName}</td>
                  <td className="py-3 px-4 text-slate-800">{record.receivedDate}</td>
                  <td className="py-3 px-4 text-slate-800">{record.store}</td>
                  <td className="py-3 px-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>{record.status}</span></td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleView(record)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="View Details"><Eye className="w-4 h-4" /></button>
                      {record.status === 'Draft' && (
                        <>
                          <button 
                            onClick={() => handleAccept(record)} 
                            className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" 
                            title="Accept"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEdit(record)} 
                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" 
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(record)} 
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" 
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={`${selectedRecord ? 'Edit' : 'New'} GRN`} size="7xl">
        <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-4 gap-4">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">GRN Number</label><input type="text" value={formData.grnNo} disabled className="w-full px-3 py-1.5 border border-slate-200 bg-slate-100 rounded-lg text-sm" /></div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Vendor*</label>
              <select value={formData.vendorId} onChange={(e) => {
                const vendor = vendorsMock.find(v => v.id === Number(e.target.value));
                setFormData({...formData, vendorId: vendor?.id || 0, vendorName: vendor?.vendorName || '', poNumber: '', items: []});
              }} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary">
                <option value="">Select Vendor</option>
                {vendorsMock.map(v => <option key={v.id} value={v.id}>{v.vendorName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">PO Number*</label>
              <select value={formData.poNumber} onChange={(e) => {
                const po = allPOs.find(p => p.poNumber === e.target.value);
                if (po) {
                  const newItems = po.items.map(item => ({
                    id: Math.random().toString(),
                    itemId: item.itemId,
                    itemName: item.itemName,
                    category: item.category,
                    orderedQty: item.orderedQty,
                    receivedQty: item.orderedQty,
                    acceptedQty: item.orderedQty,
                    rejectedQty: 0,
                    rate: item.rate,
                    totalPrice: item.rate * item.orderedQty,
                    batchNumber: 'BAT-' + Math.floor(100000 + Math.random() * 900000).toString(),
                    expiryDate: '',
                    manufactureDate: '',
                    remarks: ''
                  }));
                  setFormData({
                    ...formData,
                    poNumber: po.poNumber,
                    store: po.shippingAddress,
                    items: newItems
                  });
                } else {
                  setFormData({...formData, poNumber: e.target.value});
                }
              }} disabled={!formData.vendorId} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary disabled:bg-slate-100 disabled:cursor-not-allowed">
                <option value="">Select PO</option>
                {formData.vendorId ? allPOs
                  .filter(po => 
                    po.vendorId === Number(formData.vendorId) &&
                    ['Approved', 'Sent', 'Partially Received'].includes(po.status) && 
                    !records.some(r => r.poNumber === po.poNumber && r.id !== selectedRecord?.id)
                  )
                  .map(po => <option key={po.id} value={po.poNumber}>{po.poNumber}</option>) : null
                }
              </select>
              {errors.poNumber && <span className="text-xs text-red-500">{errors.poNumber}</span>}
            </div>
            
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Receiving Store*</label>
              <select value={formData.store} onChange={(e) => setFormData({...formData, store: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary">
                <option value="">Select Store</option>
                {warehousesMock.map(w => <option key={w.id} value={w.storeName}>{w.storeName}</option>)}
              </select>
              {errors.store && <span className="text-xs text-red-500">{errors.store}</span>}
            </div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Received Date</label><input type="date" value={formData.receivedDate} onChange={(e) => setFormData({...formData, receivedDate: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Invoice Number</label><input type="text" value={formData.invoiceNumber} onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Invoice Date</label><input type="date" value={formData.invoiceDate} onChange={(e) => setFormData({...formData, invoiceDate: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" /></div>

            <div><label className="block text-xs font-medium text-slate-500 mb-1">Transport Details</label><input type="text" value={formData.transportDetails} onChange={(e) => setFormData({...formData, transportDetails: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">LR Number</label><input type="text" value={formData.lrNumber} onChange={(e) => setFormData({...formData, lrNumber: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Vehicle Number</label><input type="text" value={formData.vehicleNumber} onChange={(e) => setFormData({...formData, vehicleNumber: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><PackageCheck className="w-4 h-4 text-primary" /> Goods Item Details</h3>
            </div>
            {errors.items && <div className="text-xs text-red-500 mb-2">{errors.items}</div>}
            
            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-sm min-w-[1000px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Item*</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Category</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-24">Rate(₹)</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-20">Ordered</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-20">Received</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-20">Accepted</th>
                    <th className="text-right py-2 px-3 font-medium text-red-500 w-20">Rejected</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-24">Total(₹)</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 w-28">Batch No</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 w-32">Expiry Date</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 w-32">Mfg Date</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.items.map((item: GRNItem, index: number) => (
                    <tr key={item.id} className="bg-white">
                      <td className="py-2 px-3">
                        <div className="text-sm font-medium text-slate-800 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">{item.itemName}</div>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{item.category || '-'}</td>
                      <td className="py-2 px-3"><input type="number" min="0" value={item.rate || 0} onChange={(e) => handleQtyCalc(index, 'rate', Number(e.target.value))} className="w-full p-1.5 border rounded-lg text-sm text-right" /></td>
                      <td className="py-2 px-3"><input type="number" min="0" value={item.orderedQty} onChange={(e) => handleQtyCalc(index, 'orderedQty', Number(e.target.value))} className="w-full p-1.5 border rounded-lg text-sm text-right" /></td>
                      <td className="py-2 px-3"><input type="number" min="0" value={item.receivedQty} onChange={(e) => handleQtyCalc(index, 'receivedQty', Number(e.target.value))} className="w-full p-1.5 border rounded-lg text-sm text-right bg-blue-50" /></td>
                      <td className="py-2 px-3"><input type="number" min="0" value={item.acceptedQty} onChange={(e) => handleQtyCalc(index, 'acceptedQty', Number(e.target.value))} className="w-full p-1.5 border rounded-lg text-sm text-right bg-emerald-50" /></td>
                      <td className="py-2 px-3"><input type="number" min="0" value={item.rejectedQty} onChange={(e) => handleQtyCalc(index, 'rejectedQty', Number(e.target.value))} className="w-full p-1.5 border rounded-lg text-sm text-right bg-red-50 text-red-600 font-bold" /></td>
                      <td className="py-2 px-3 text-right font-medium text-slate-800 bg-slate-50 rounded-lg">{(item.totalPrice || 0).toFixed(2)}</td>
                      <td className="py-2 px-3"><input type="text" value={item.batchNumber} onChange={(e) => { const items = [...formData.items]; items[index].batchNumber = e.target.value; setFormData({...formData, items})}} className="w-full p-1.5 border rounded-lg text-sm" /></td>
                      <td className="py-2 px-3"><input type="date" value={item.expiryDate} onChange={(e) => { const items = [...formData.items]; items[index].expiryDate = e.target.value; setFormData({...formData, items})}} className="w-full p-1.5 border rounded-lg text-sm" /></td>
                      <td className="py-2 px-3"><input type="date" value={item.manufactureDate} onChange={(e) => { const items = [...formData.items]; items[index].manufactureDate = e.target.value; setFormData({...formData, items})}} className="w-full p-1.5 border rounded-lg text-sm" /></td>
                      <td className="py-2 px-3"><input type="text" value={item.remarks} onChange={(e) => { const items = [...formData.items]; items[index].remarks = e.target.value; setFormData({...formData, items})}} className="w-full p-1.5 border rounded-lg text-sm" /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td colSpan={7} className="py-3 px-4 text-right font-medium text-slate-700">Grand Total</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-800">₹{formData.items.reduce((sum: number, item: GRNItem) => sum + (item.totalPrice || 0), 0).toFixed(2)}</td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-100">
          <div className="text-xs text-slate-500">Stock will be updated automatically upon acceptance</div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => handleSave('Draft')}>Save Draft</Button>
            <Button variant="filled" color="primary" onClick={() => handleSave('Accepted')}>Accept & Update Stock</Button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="View Goods Receipt Note" size="7xl">
        {selectedRecord && (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-4 gap-4">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">GRN Number</label><div className="text-sm font-medium text-slate-800">{selectedRecord.grnNo}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">PO Number</label><div className="text-sm font-medium text-slate-800">{selectedRecord.poNumber}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Vendor</label><div className="text-sm font-medium text-slate-800">{selectedRecord.vendorName}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Status</label><div className="text-sm font-medium text-slate-800">{selectedRecord.status}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Received Date</label><div className="text-sm font-medium text-slate-800">{selectedRecord.receivedDate}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Store</label><div className="text-sm font-medium text-slate-800">{selectedRecord.store}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Invoice No</label><div className="text-sm font-medium text-slate-800">{selectedRecord.invoiceNumber || '-'}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Vehicle No</label><div className="text-sm font-medium text-slate-800">{selectedRecord.vehicleNumber || '-'}</div></div>
            </div>
            
            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Received Items</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Item</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Category</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Rate(₹)</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Ordered</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Received</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600 text-emerald-600">Accepted</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600 text-red-600">Rejected</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Total(₹)</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Batch No</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedRecord.items || []).map((item) => (
                      <tr key={item.id} className="bg-white">
                        <td className="py-2 px-3 font-medium">{item.itemName}</td>
                        <td className="py-2 px-3 text-slate-600">{item.category || '-'}</td>
                        <td className="py-2 px-3 text-right">{(item.rate || 0).toFixed(2)}</td>
                        <td className="py-2 px-3 text-right">{item.orderedQty}</td>
                        <td className="py-2 px-3 text-right font-medium text-blue-600">{item.receivedQty}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-600">{item.acceptedQty}</td>
                        <td className="py-2 px-3 text-right font-bold text-red-600">{item.rejectedQty}</td>
                        <td className="py-2 px-3 text-right font-medium">{(item.totalPrice || 0).toFixed(2)}</td>
                        <td className="py-2 px-3">{item.batchNumber || '-'}</td>
                        <td className="py-2 px-3">{item.expiryDate || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan={7} className="py-3 px-4 text-right font-medium text-slate-700">Grand Total</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800">₹{(selectedRecord.items || []).reduce((sum: number, item: GRNItem) => sum + (item.totalPrice || 0), 0).toFixed(2)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
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
            Are you sure you want to delete <span className="font-semibold text-slate-700">{recordToDelete?.grnNo}</span>?
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
