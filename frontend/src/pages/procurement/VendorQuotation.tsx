import { API_BASE_URL } from '@/utils/apiBase';
import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Eye, ClipboardList, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { DateFilter } from '../../components/ui/DateFilter';
import type { RFQRecord } from './RequestForQuotation';

const API_BASE = API_BASE_URL;

interface QuotationItem {
  id: string;
  itemId: number;
  /** Owning master, inherited from the upstream document. */
  itemType?: string;
  itemName: string;
  category?: string;
  qty: number;
  quotedRate: number;
  discountPercentage: number;
  gstPercentage: number;
  finalAmount: number;
  remarks: string;
}

export interface QuotationRecord {
  id: number;
  quotationNo: string;
  rfqNo: string;
  vendorId: number;
  vendorName: string;
  quotationDate: string;
  validityDate: string;
  paymentTerms: string;
  deliveryDays: number;
  totalAmount: number;
  items: QuotationItem[];
  status: string; // 'Draft', 'Submitted', 'Evaluated'
}

export const initialQuotations: QuotationRecord[] = [];

export const VendorQuotation = () => {
  const [records, setRecords] = useState<QuotationRecord[]>([]);
  const [allRFQs, setAllRFQs] = useState<RFQRecord[]>([]);
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [paymentTermsList, setPaymentTermsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<QuotationRecord | null>(null);
  useEffect(() => {
    fetchQuotations();
    fetchMasters();
  }, []);

  const fetchQuotations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vendor-quotations`);
      if (res.ok) setRecords(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMasters = async () => {
    try {
      const [rfqRes, vendRes, ptRes] = await Promise.all([
        fetch(`${API_BASE}/rfqs`),
        fetch(`${API_BASE}/vendors`),
        fetch(`${API_BASE}/payment-terms`)
      ]);
      if (rfqRes.ok) setAllRFQs(await rfqRes.json());
      if (vendRes.ok) setVendorsList(await vendRes.json());
      if (ptRes.ok) setPaymentTermsList(await ptRes.json());
    } catch (err) {
      console.error(err);
    }
  };
  
  const availableRFQs = useMemo(() => {
    return allRFQs.filter(rfq => {
      const qtsForRfq = records.filter(r => r.rfqNo === rfq.rfqNo);
      return qtsForRfq.length < (rfq.vendors?.length || 0);
    });
  }, [allRFQs, records]);

  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sortConfig] = useState<{key: keyof QuotationRecord | null, direction: 'asc'|'desc'}>({ key: null, direction: 'asc' });

  // Filter States
  const [filterVendor, setFilterVendor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<QuotationRecord | null>(null);
  
  const emptyForm: Omit<QuotationRecord, 'id' | 'quotationNo'> = {
    rfqNo: '', vendorId: 0, vendorName: '', quotationDate: new Date().toISOString().split('T')[0],
    validityDate: '', paymentTerms: '', deliveryDays: 7, totalAmount: 0, items: [], status: 'Draft'
  };
  const [formData, setFormData] = useState<any>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const availableVendorsForRfq = useMemo(() => {
    if (!formData.rfqNo) return [];
    const rfq = allRFQs.find(r => r.rfqNo === formData.rfqNo);
    if (!rfq || !rfq.vendors) return [];
    
    const existingVendorIds = records
      .filter(r => r.rfqNo === formData.rfqNo && r.id !== selectedRecord?.id)
      .map(r => r.vendorId);
      
      return vendorsList.filter(v => 
        rfq.vendors.includes(v.id) && !existingVendorIds.includes(v.id)
      );
    }, [formData.rfqNo, allRFQs, records, selectedRecord, vendorsList]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.vendorId) newErrors.vendorId = 'Required';
    if (!formData.rfqNo) newErrors.rfqNo = 'Required';
    if (formData.items.length === 0) newErrors.items = 'At least one item is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData({ ...emptyForm, quotationNo: `QTN-${new Date().getFullYear()}-${String(records.length + 1).padStart(3, '0')}` });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: QuotationRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };
  
  const handleView = (record: QuotationRecord) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };

  const handleSave = async (status: string) => {
    if (validateForm()) {
      const payload = { ...formData, status };
      try {
        const url = selectedRecord ? `${API_BASE}/vendor-quotations/${selectedRecord.id}` : `${API_BASE}/vendor-quotations`;
        const method = selectedRecord ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          fetchQuotations();
          setIsFormOpen(false);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDelete = (record: QuotationRecord) => {
    setRecordToDelete(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (recordToDelete) {
      try {
        const res = await fetch(`${API_BASE}/vendor-quotations/${recordToDelete.id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchQuotations();
        }
      } catch (error) {
        console.error('Failed to delete quotation:', error);
      } finally {
        setIsDeleteOpen(false);
        setRecordToDelete(null);
      }
    }
  };

  // Item Grid Handlers


  const calculateItemAmount = (item: QuotationItem) => {
    const base = item.qty * item.quotedRate;
    const afterDiscount = base - (base * (item.discountPercentage / 100));
    const withGst = afterDiscount + (afterDiscount * (item.gstPercentage / 100));
    return withGst;
  };

  const handleItemCalc = (index: number, field: keyof QuotationItem, value: number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    newItems[index].finalAmount = calculateItemAmount(newItems[index]);
    updateTotals(newItems);
  };

  const updateTotals = (items: QuotationItem[]) => {
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.finalAmount) || 0), 0);
    setFormData((prev: any) => ({ ...prev, items, totalAmount }));
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
        const itemDate = new Date(record.quotationDate);
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
      case 'Submitted': return 'bg-blue-100 text-blue-700';
      case 'Evaluated': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center text-sm text-slate-500 mb-2">
          <span>Procurement</span>
          <span className="mx-2">/</span>
          <span className="text-primary font-medium">Vendor Quotation</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Vendor Quotation</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <DateFilter
              dateFrom={fromDate}
              dateTo={toDate}
              onDateFromChange={setFromDate}
              onDateToChange={setToDate}
              onSearch={() => {}}
              onReset={() => { setFromDate(''); setToDate(''); }}
            />
            <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
              Record Quotation
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
                type="text" placeholder="Search QTN No, Vendor..." value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 border rounded-lg transition-colors ${showFilters ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            ><Filter className="w-4 h-4" /></button>
            <button onClick={() => { fetchQuotations(); fetchMasters(); }} className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors" title="Refresh">
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
                  {vendorsList.map(v => <option key={v.id} value={v.vendorName}>{v.vendorName}</option>)}
                </select>
                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none">
                  <option value="">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Evaluated">Evaluated</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Quotation No</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Vendor</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">RFQ No</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">PR No</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Date</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Validity</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 text-sm">Amount (₹)</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Status</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-slate-500">No records found</td></tr>
              ) : paginatedData.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 text-slate-800 font-medium">{record.quotationNo}</td>
                  <td className="py-3 px-4 text-slate-800">{record.vendorName}</td>
                  <td className="py-3 px-4 text-slate-800">{record.rfqNo}</td>
                  <td className="py-3 px-4 text-slate-500 text-sm">{allRFQs.find(r => r.rfqNo === record.rfqNo)?.prNumber || '-'}</td>
                  <td className="py-3 px-4 text-slate-800">{record.quotationDate}</td>
                  <td className="py-3 px-4 text-slate-800">{record.validityDate}</td>
                  <td className="py-3 px-4 text-slate-800 font-medium text-right">{record.totalAmount.toLocaleString()}</td>
                  <td className="py-3 px-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>{record.status}</span></td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleView(record)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="View Details"><Eye className="w-4 h-4" /></button>
                      <button 
                        onClick={() => !(record.status === 'Evaluated' || record.status === 'Approved' || record.status === 'Rejected') && handleEdit(record)} 
                        disabled={record.status === 'Evaluated' || record.status === 'Approved' || record.status === 'Rejected'}
                        className={`p-1.5 rounded-lg transition-colors ${(record.status === 'Evaluated' || record.status === 'Approved' || record.status === 'Rejected') ? 'text-slate-300 cursor-not-allowed opacity-50' : 'text-slate-400 hover:text-primary hover:bg-primary/10'}`} 
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => !(record.status === 'Evaluated' || record.status === 'Approved' || record.status === 'Rejected') && handleDelete(record)} 
                        disabled={record.status === 'Evaluated' || record.status === 'Approved' || record.status === 'Rejected'}
                        className={`p-1.5 rounded-lg transition-colors ${(record.status === 'Evaluated' || record.status === 'Approved' || record.status === 'Rejected') ? 'text-slate-300 cursor-not-allowed opacity-50' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`} 
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

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={`${selectedRecord ? 'Edit' : 'New'} Quotation`} size="7xl">
        <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-4 gap-4">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Quotation No</label><input type="text" value={formData.quotationNo} disabled className="w-full px-3 py-1.5 border border-slate-200 bg-slate-100 rounded-lg text-sm" /></div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">RFQ No*</label>
              <select value={formData.rfqNo} disabled={!!selectedRecord} onChange={(e) => {
                const rfq = allRFQs.find(r => r.rfqNo === e.target.value);
                if (rfq) {
                  const newItems = rfq.items.map(item => ({
                    id: Math.random().toString(),
                    itemId: item.itemId,
                    itemType: item.itemType,
                    itemName: item.itemName,
                    category: item.category,
                    qty: item.requestedQty,
                    quotedRate: item.targetPrice,
                    discountPercentage: 0,
                    gstPercentage: 0,
                    finalAmount: item.requestedQty * item.targetPrice,
                    remarks: ''
                  }));
                  setFormData({...formData, rfqNo: rfq.rfqNo, items: newItems, totalAmount: newItems.reduce((sum, i) => sum + i.finalAmount, 0)});
                } else {
                  setFormData({...formData, rfqNo: e.target.value, items: [], totalAmount: 0});
                }
              }} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary">
                <option value="">Select RFQ</option>
                {(selectedRecord ? [allRFQs.find(r => r.rfqNo === selectedRecord.rfqNo)].filter(Boolean) as RFQRecord[] : availableRFQs).map(rfq => (
                  <option key={rfq.id} value={rfq.rfqNo}>{rfq.rfqNo} (PR: {rfq.prNumber})</option>
                ))}
              </select>
              {errors.rfqNo && <span className="text-xs text-red-500">{errors.rfqNo}</span>}
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Vendor*</label>
              <select value={formData.vendorId} disabled={!formData.rfqNo || !!selectedRecord} onChange={(e) => {
                const vendor = availableVendorsForRfq.find(v => v.id === Number(e.target.value));
                setFormData({...formData, vendorId: vendor?.id || 0, vendorName: vendor?.vendorName || '', paymentTerms: vendor?.paymentTerms || ''});
              }} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary disabled:bg-slate-100 disabled:text-slate-500">
                <option value="">Select Vendor</option>
                {(selectedRecord ? [vendorsList.find(v => v.id === selectedRecord.vendorId)].filter(Boolean) as any[] : availableVendorsForRfq).map(v => (
                  <option key={v.id} value={v.id}>{v.vendorName}</option>
                ))}
              </select>
              {errors.vendorId && <span className="text-xs text-red-500">{errors.vendorId}</span>}
            </div>
            
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Quotation Date</label><input type="date" value={formData.quotationDate} onChange={(e) => setFormData({...formData, quotationDate: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Validity Date</label><input type="date" value={formData.validityDate} onChange={(e) => setFormData({...formData, validityDate: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" /></div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Payment Terms</label>
              <select value={formData.paymentTerms} onChange={(e) => setFormData({...formData, paymentTerms: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
                <option value="">Select Terms</option>
                {paymentTermsList.map(p => <option key={p.id} value={p.paymentTermName}>{p.paymentTermName}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Delivery Days</label><input type="number" value={formData.deliveryDays} onChange={(e) => setFormData({...formData, deliveryDays: Number(e.target.value)})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" /> Item Grid</h3>
            </div>
            {errors.items && <div className="text-xs text-red-500 mb-2">{errors.items}</div>}
            
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Item*</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Category</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-24">Qty*</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-24">Rate (₹)</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-24">Disc (%)</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-24">GST (%)</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-32">Final Amt (₹)</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.items.length === 0 ? (
                    <tr><td colSpan={8} className="py-6 text-center text-slate-400">No items added.</td></tr>
                  ) : formData.items.map((item: QuotationItem, index: number) => (
                    <tr key={item.id} className="bg-white">
                      <td className="py-2 px-3">{item.itemName}</td>
                      <td className="py-2 px-3 text-slate-600">{item.category || '-'}</td>
                      <td className="py-2 px-3"><input type="number" min="1" value={item.qty} onChange={(e) => handleItemCalc(index, 'qty', Number(e.target.value))} className="w-full p-1.5 border rounded-lg text-sm text-right" /></td>
                      <td className="py-2 px-3"><input type="number" value={item.quotedRate} onChange={(e) => handleItemCalc(index, 'quotedRate', Number(e.target.value))} className="w-full p-1.5 border rounded-lg text-sm text-right" /></td>
                      <td className="py-2 px-3"><input type="number" value={item.discountPercentage} onChange={(e) => handleItemCalc(index, 'discountPercentage', Number(e.target.value))} className="w-full p-1.5 border rounded-lg text-sm text-right" /></td>
                      <td className="py-2 px-3"><input type="number" value={item.gstPercentage} onChange={(e) => handleItemCalc(index, 'gstPercentage', Number(e.target.value))} className="w-full p-1.5 border rounded-lg text-sm text-right" /></td>
                      <td className="py-2 px-3 text-right font-medium text-primary">{(item.finalAmount || 0).toLocaleString()}</td>
                      <td className="py-2 px-3"><input type="text" value={item.remarks} onChange={(e) => { const items = [...formData.items]; items[index].remarks = e.target.value; setFormData({...formData, items})}} className="w-full p-1.5 border rounded-lg text-sm" /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200 font-medium text-slate-700">
                  <tr>
                    <td colSpan={6} className="py-3 px-4 text-right">Total Amount:</td>
                    <td className="py-3 px-3 text-right text-primary font-bold">{(formData.totalAmount || 0).toLocaleString()}</td>
                    <td colSpan={1}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-100">
          <div className="text-xs text-slate-500">Fields marked with * are required</div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => handleSave('Draft')}>Save Draft</Button>
            <Button variant="filled" color="primary" onClick={() => handleSave('Submitted')}>Submit Quotation</Button>
          </div>
        </div>
      </Modal>
      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="View Vendor Quotation" size="7xl">
        {selectedRecord && (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-4 gap-4">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Quotation No</label><div className="text-sm font-medium text-slate-800">{selectedRecord.quotationNo}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">RFQ No</label><div className="text-sm font-medium text-slate-800">{selectedRecord.rfqNo}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Vendor</label><div className="text-sm font-medium text-slate-800">{selectedRecord.vendorName}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Status</label><div className="text-sm font-medium text-slate-800">{selectedRecord.status}</div></div>
            </div>
            
            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Vendor Details</h3>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
                {(() => {
                  const v = vendorsList.find(vm => vm.id === selectedRecord.vendorId);
                  return v ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div><span className="text-slate-500">Contact Person:</span> <span className="font-medium">{v.contactPerson}</span></div>
                      <div><span className="text-slate-500">Phone:</span> <span className="font-medium">{v.mobileNumber}</span></div>
                      <div><span className="text-slate-500">Email:</span> <span className="font-medium">{v.email}</span></div>
                      <div><span className="text-slate-500">Address:</span> <span className="font-medium">{v.address}</span></div>
                    </div>
                  ) : <span className="text-slate-500">Vendor details not found</span>;
                })()}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Quoted Items</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Item</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Category</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Qty</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Rate (₹)</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedRecord.items.map((item) => (
                      <tr key={item.id} className="bg-white">
                        <td className="py-2 px-3">{item.itemName}</td>
                        <td className="py-2 px-3 text-slate-600">{item.category || '-'}</td>
                        <td className="py-2 px-3 text-right font-medium">{item.qty}</td>
                        <td className="py-2 px-3 text-right">{item.quotedRate}</td>
                        <td className="py-2 px-3 text-right font-medium">{item.finalAmount}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan={4} className="py-3 px-4 text-right font-bold text-slate-600">Total Amount:</td>
                      <td className="py-3 px-3 text-right text-primary font-bold">
                        {(selectedRecord.totalAmount || 0).toLocaleString()}
                      </td>
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
            Are you sure you want to delete <span className="font-semibold text-slate-700">{recordToDelete?.quotationNo}</span>?
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
