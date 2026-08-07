import { useState, useMemo } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { Plus, Search, Filter, Edit2, Eye, Printer, CheckCircle, ShoppingBag, Trash2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { DateFilter } from '../../components/ui/DateFilter';

// Mock Data Imports
import { useCurrencies, useDepartments, usePaymentTerms, useVendors, useWarehouses } from '../../hooks/useMasterOptions';
import { initialQuotations, type QuotationRecord } from './VendorQuotation';
import { initialPRs, type PRRecord } from './PurchaseRequisitions';
import { initialRFQs, type RFQRecord } from './RequestForQuotation';
import { useLocalStorage } from '../../utils/useLocalStorage';
import { exportToExcel } from '../../utils/exportToExcel';

interface POItem {
  id: string;
  itemId: number;
  itemName: string;
  category?: string;
  orderedQty: number;
  uom: string;
  rate: number;
  discount: number;
  gst: number;
  amount: number;
}

export interface PORecord {
  id: number;
  poNumber: string;
  poDate: string;
  prNo?: string;
  quotationNo: string;
  vendorId: number;
  vendorName: string;
  department: string;
  billingAddress: string;
  shippingAddress: string;
  paymentTerms: string;
  deliveryTerms: string;
  expectedDelivery: string;
  currency: string;
  totalAmount: number;
  status: string; // 'Draft', 'Approved', 'Sent', 'Partially Received', 'Closed'
  items: POItem[];
}

export const initialPOs: PORecord[] = [];

export const PurchaseOrders = () => {
  // Live from the admin masters. These used to be hardcoded mockData
  // arrays, so anything added in a master never reached these pickers.
  const { options: vendors } = useVendors();
  const { options: departments } = useDepartments();
  const { options: warehouses } = useWarehouses();
  const { options: currencies } = useCurrencies();
  // Live from Payment Terms Master, so a term added there shows up here.
  const { options: paymentTerms } = usePaymentTerms();
  const [records, setRecords] = useLocalStorage<PORecord[]>('procurement_pos_v2', initialPOs);
  const [allQtns] = useLocalStorage<QuotationRecord[]>('procurement_qtns_v2', initialQuotations);
  const [prs] = useLocalStorage<PRRecord[]>('procurement_prs_v2', initialPRs);
  const [rfqs] = useLocalStorage<RFQRecord[]>('procurement_rfqs_v2', initialRFQs);
  

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sortConfig] = useState<{key: keyof PORecord | null, direction: 'asc'|'desc'}>({ key: null, direction: 'asc' });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterVendor, setFilterVendor] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PORecord | null>(null);

  const availablePRs = useMemo(() => {
    return prs.filter(p => {
      if (p.approvalStatus !== 'Approved') return false;
      
      // Check if PR has an approved quotation
      const rfq = rfqs.find(r => r.prNumber === p.prNo);
      const hasApprovedQtn = rfq ? allQtns.some(q => q.rfqNo === rfq.rfqNo && q.status === 'Approved') : false;
      if (!hasApprovedQtn) return false;

      // Check if PO is already created for this PR
      const hasPO = records.some(r => r.prNo === p.prNo && r.id !== selectedRecord?.id);
      if (hasPO) return false;

      return true;
    });
  }, [prs, rfqs, allQtns, records, selectedRecord]);
  
  const emptyForm: Omit<PORecord, 'id' | 'poNumber'> = {
    poDate: new Date().toISOString().split('T')[0], prNo: '', quotationNo: '', vendorId: 0, vendorName: '', department: '',
    billingAddress: 'CareFusions Hospital, 123 Main St, Mumbai', shippingAddress: '', paymentTerms: '', deliveryTerms: '',
    expectedDelivery: '', currency: 'INR', totalAmount: 0, status: 'Draft', items: []
  };
  const [formData, setFormData] = useState<any>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.vendorId) newErrors.vendorId = 'Required';
    if (!formData.department) newErrors.department = 'Required';
    if (!formData.expectedDelivery) newErrors.expectedDelivery = 'Required';
    if (formData.items.length === 0) newErrors.items = 'At least one item is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData({ ...emptyForm, poNumber: `PO-${new Date().getFullYear()}-${String(records.length + 1).padStart(3, '0')}` });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: PORecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };
  
  const handleView = (record: PORecord) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };

  const handleSave = (status: string) => {
    if (validateForm()) {
      if (selectedRecord) {
        setRecords(records.map(r => r.id === selectedRecord.id ? { ...formData, status, id: r.id } : r));
      } else {
        const newId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
        setRecords([{ ...formData, status, id: newId }, ...records]);
      }
      setIsFormOpen(false);
    }
  };

  const handleAction = (action: string) => {
    if (action === 'Print') {
      window.print();
    } else if (action === 'Approve') {
      setRecords(records.map(r => r.id === selectedRecord?.id ? { ...r, status: 'Approved' } : r));
      setIsViewOpen(false);
    }
  };

  // Item Grid Handlers

  const handleItemCalc = (index: number, field: keyof POItem, value: number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    const base = newItems[index].orderedQty * newItems[index].rate;
    const afterDiscount = base - (base * (newItems[index].discount / 100));
    newItems[index].amount = afterDiscount + (afterDiscount * (newItems[index].gst / 100));
    updateTotals(newItems);
  };

  const updateTotals = (items: POItem[]) => {
    const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
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
        const itemDate = new Date(record.poDate);
        const start = new Date(fromDate);
        const end = new Date(toDate);
        matchesDate = itemDate >= start && itemDate <= end;
      }
      return matchesSearch && matchesVendor && matchesStatus && matchesDate;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        if ((a as any)[sortConfig.key!] < (b as any)[sortConfig.key!]) return sortConfig.direction === 'asc' ? -1 : 1;
        if ((a as any)[sortConfig.key!] > (b as any)[sortConfig.key!]) return sortConfig.direction === 'asc' ? 1 : -1;
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
      case 'Sent': return 'bg-blue-100 text-blue-700';
      case 'Partially Received': return 'bg-orange-100 text-orange-700';
      case 'Closed': return 'bg-slate-200 text-slate-800 font-bold';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const { page, setPage, pageSize, total, paged } = usePagination(availablePRs);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center text-sm text-slate-500 mb-2">
          <span>Procurement</span>
          <span className="mx-2">/</span>
          <span className="text-primary font-medium">Purchase Orders</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Purchase Orders (PO)</h1>
        
        <div className="flex justify-end items-center gap-3">
          <DateFilter
            dateFrom={fromDate}
            dateTo={toDate}
            onDateFromChange={setFromDate}
            onDateToChange={setToDate}
            onSearch={() => {}}
            onReset={() => { setFromDate(''); setToDate(''); }}
          />
          <Button variant="outline" icon={Download} onClick={() => exportToExcel(processedData, 'Purchase_Orders')} className="h-[38px] !px-3 text-sm whitespace-nowrap">
            Export Excel
          </Button>
          <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew} className="h-[38px] !px-3 text-sm whitespace-nowrap">
            Create PO
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" placeholder="Search PO No, Vendor..." value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 border rounded-lg transition-colors ${showFilters ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            ><Filter className="w-4 h-4" /></button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-slate-100 bg-slate-50 overflow-hidden">
              <div className="p-4 flex gap-4">
                <select value={filterVendor} onChange={(e) => { setFilterVendor(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none">
                  <option value="">All Vendors</option>
                  {vendors.map(v => <option key={v.id} value={v.vendorName}>{v.vendorName}</option>)}
                </select>
                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none">
                  <option value="">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Approved">Approved</option>
                  <option value="Sent">Sent</option>
                  <option value="Partially Received">Partially Received</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">PO Number</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">PR No</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">PO Date</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Vendor</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Department</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Exp. Delivery</th>
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
                  <td className="py-3 px-4 text-slate-800 font-medium">{record.poNumber}</td>
                  <td className="py-3 px-4 text-slate-500">{record.prNo || '-'}</td>
                  <td className="py-3 px-4 text-slate-800">{record.poDate}</td>
                  <td className="py-3 px-4 text-slate-800">{record.vendorName}</td>
                  <td className="py-3 px-4 text-slate-800">{record.department}</td>
                  <td className="py-3 px-4 text-slate-800">{record.expectedDelivery}</td>
                  <td className="py-3 px-4 text-slate-800 font-medium text-right">{record.totalAmount.toLocaleString()}</td>
                  <td className="py-3 px-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>{record.status}</span></td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setSelectedRecord(record); setIsViewOpen(true); setTimeout(() => window.print(), 500); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"><Printer className="w-4 h-4" /></button>
                      <button onClick={() => handleView(record)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                      {(record.status === 'Draft' || record.status === 'Pending Approval') && <button onClick={() => handleEdit(record)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>}
                      <button onClick={() => setRecords(records.filter(r => r.id !== record.id))} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} />
      </div>

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={`${selectedRecord ? 'Edit' : 'New'} Purchase Order`} size="7xl">
        <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-4 gap-4">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">PO Number</label><input type="text" value={formData.poNumber} disabled className="w-full px-3 py-1.5 border border-slate-200 bg-slate-100 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">PO Date</label><input type="date" value={formData.poDate} onChange={(e) => setFormData({...formData, poDate: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" /></div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Select PR (Optional)</label>
              <select value={formData.prNo || ''} onChange={(e) => {
                const prNo = e.target.value;
                const pr = prs.find(p => p.prNo === prNo);
                if (pr) {
                  const rfq = rfqs.find(r => r.prNumber === prNo);
                  const qtn = rfq ? allQtns.find(q => q.rfqNo === rfq.rfqNo && q.status === 'Approved') : null;
                  
                  if (qtn) {
                    const newItems = qtn.items.map(item => ({
                      id: Math.random().toString(),
                      itemId: item.itemId,
                      itemName: item.itemName,
                      category: item.category,
                      orderedQty: item.qty,
                      uom: 'Nos',
                      rate: item.quotedRate,
                      discount: item.discountPercentage,
                      gst: item.gstPercentage,
                      amount: item.finalAmount
                    }));
                    setFormData({
                      ...formData,
                      prNo: prNo,
                      quotationNo: qtn.quotationNo,
                      vendorId: qtn.vendorId,
                      vendorName: qtn.vendorName,
                      paymentTerms: qtn.paymentTerms,
                      totalAmount: qtn.totalAmount,
                      department: pr.department,
                      items: newItems
                    });
                  } else {
                    const newItems = pr.items.map(item => ({
                      id: Math.random().toString(),
                      itemId: item.itemId,
                      itemName: item.itemName,
                      category: item.category,
                      orderedQty: item.requestedQty,
                      uom: item.uom,
                      rate: 0,
                      discount: 0,
                      gst: 0,
                      amount: 0
                    }));
                    setFormData({
                      ...formData, 
                      prNo: prNo,
                      department: pr.department,
                      items: newItems
                    });
                  }
                } else {
                  setFormData({...formData, prNo: prNo});
                }
              }} disabled={!!selectedRecord} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
                <option value="">Select PR</option>
                {paged.map(p => <option key={p.id} value={p.prNo}>{p.prNo} - {p.department}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Quotation Ref (Optional)</label>
              <select value={formData.quotationNo} onChange={(e) => {
                const qtn = allQtns.find(q => q.quotationNo === e.target.value);
                if (qtn) {
                  const newItems = qtn.items.map(item => ({
                    id: Math.random().toString(),
                    itemId: item.itemId,
                    itemName: item.itemName,
                    category: item.category,
                    orderedQty: item.qty,
                    uom: 'Nos',
                    rate: item.quotedRate,
                    discount: item.discountPercentage,
                    gst: item.gstPercentage,
                    amount: item.finalAmount
                  }));
                  setFormData({
                    ...formData, 
                    quotationNo: qtn.quotationNo, 
                    vendorId: qtn.vendorId, 
                    vendorName: qtn.vendorName,
                    paymentTerms: qtn.paymentTerms,
                    totalAmount: qtn.totalAmount,
                    items: newItems
                  });
                } else {
                  setFormData({...formData, quotationNo: e.target.value});
                }
              }} disabled={!!selectedRecord} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
                <option value="">Select Quotation</option>
                {allQtns.filter(q => q.status === 'Approved').map(q => <option key={q.id} value={q.quotationNo}>{q.quotationNo} - {q.vendorName}</option>)}
              </select>
            </div>
            
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Vendor*</label>
              <select value={formData.vendorId} onChange={(e) => {
                const vendor = vendors.find(v => v.id === Number(e.target.value));
                setFormData({...formData, vendorId: vendor?.id || 0, vendorName: vendor?.vendorName || '', paymentTerms: vendor?.paymentTerms || ''});
              }} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary">
                <option value="">Select Vendor</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.vendorName}</option>)}
              </select>
              {errors.vendorId && <span className="text-xs text-red-500">{errors.vendorId}</span>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Department*</label>
              <select value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary">
                <option value="">Select Dept</option>
                {departments.map(d => <option key={d.id} value={d.departmentName}>{d.departmentName}</option>)}
              </select>
              {errors.department && <span className="text-xs text-red-500">{errors.department}</span>}
            </div>
            
            <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Shipping Address</label>
              <select value={formData.shippingAddress} onChange={(e) => setFormData({...formData, shippingAddress: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
                <option value="">Select Store</option>
                {warehouses.map(w => <option key={w.id} value={w.storeName}>{w.storeName} - {w.location}</option>)}
              </select>
            </div>
            <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Billing Address</label><input type="text" value={formData.billingAddress} onChange={(e) => setFormData({...formData, billingAddress: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" /></div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Payment Terms</label>
              <select value={formData.paymentTerms} onChange={(e) => setFormData({...formData, paymentTerms: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
                <option value="">Select Terms</option>
                {paymentTerms.map(p => <option key={p.id} value={p.paymentTermName}>{p.paymentTermName}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Delivery Terms</label><input type="text" value={formData.deliveryTerms} onChange={(e) => setFormData({...formData, deliveryTerms: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Expected Delivery*</label><input type="date" value={formData.expectedDelivery} onChange={(e) => setFormData({...formData, expectedDelivery: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" />
              {errors.expectedDelivery && <span className="text-xs text-red-500">{errors.expectedDelivery}</span>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Currency</label>
              <select value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
                {currencies.map(c => <option key={c.id} value={c.currencyCode}>{c.currencyCode}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-primary" /> PO Items</h3>
            </div>
            {errors.items && <div className="text-xs text-red-500 mb-2">{errors.items}</div>}
            
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Item*</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Category</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-24">Qty*</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 w-16">UOM</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-24">Rate</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-24">Disc %</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-24">GST %</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-32">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.items.map((item: POItem, index: number) => (
                    <tr key={item.id} className="bg-white">
                      <td className="py-2 px-3">
                        <div className="text-sm font-medium text-slate-800 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">{item.itemName}</div>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{item.category || '-'}</td>
                      <td className="py-2 px-3"><input type="number" min="1" value={item.orderedQty} onChange={(e) => handleItemCalc(index, 'orderedQty', Number(e.target.value))} className="w-full p-1.5 border rounded-lg text-sm text-right" /></td>
                      <td className="py-2 px-3 text-slate-600">{item.uom}</td>
                      <td className="py-2 px-3"><input type="number" value={item.rate} onChange={(e) => handleItemCalc(index, 'rate', Number(e.target.value))} className="w-full p-1.5 border rounded-lg text-sm text-right" /></td>
                      <td className="py-2 px-3"><input type="number" value={item.discount} onChange={(e) => handleItemCalc(index, 'discount', Number(e.target.value))} className="w-full p-1.5 border rounded-lg text-sm text-right" /></td>
                      <td className="py-2 px-3"><input type="number" value={item.gst} onChange={(e) => handleItemCalc(index, 'gst', Number(e.target.value))} className="w-full p-1.5 border rounded-lg text-sm text-right" /></td>
                      <td className="py-2 px-3 text-right font-medium text-slate-700">{item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200 font-medium text-slate-700">
                  <tr>
                    <td colSpan={6} className="py-3 px-4 text-right">Total Amount:</td>
                    <td className="py-3 px-3 text-right text-primary font-bold">{(formData.totalAmount || 0).toLocaleString()}</td>
                    <td></td>
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
            <Button variant="filled" color="primary" onClick={() => handleSave('Pending Approval')}>Submit for Approval</Button>
          </div>
        </div>
      </Modal>

      {/* View Modal with Actions */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={`View PO Details`} size="4xl">
        {selectedRecord && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{selectedRecord.poNumber}</h2>
                <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(selectedRecord.status)}`}>{selectedRecord.status}</span>
                  <span>•</span>
                  <span>{selectedRecord.poDate}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {selectedRecord.status === 'Draft' && (
                  <Button variant="filled" color="primary" size="sm" icon={CheckCircle} onClick={() => handleAction('Approve')}>Approve</Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div><span className="text-xs text-slate-400 block">PR Number</span><span className="text-sm font-medium">{selectedRecord.prNo || '-'}</span></div>
              <div><span className="text-xs text-slate-400 block">Vendor</span><span className="text-sm font-medium">{selectedRecord.vendorName}</span></div>
              <div><span className="text-xs text-slate-400 block">Department</span><span className="text-sm font-medium">{selectedRecord.department}</span></div>
              <div><span className="text-xs text-slate-400 block">Shipping Address</span><span className="text-sm font-medium">{selectedRecord.shippingAddress || 'N/A'}</span></div>
              <div><span className="text-xs text-slate-400 block">Payment Terms</span><span className="text-sm font-medium">{selectedRecord.paymentTerms}</span></div>
            </div>

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
                      <td className="py-2 px-3 font-medium text-slate-800">{item.itemName}</td>
                      <td className="py-2 px-3 text-slate-600">{item.category || '-'}</td>
                      <td className="py-2 px-3 text-right">{item.orderedQty} {item.uom}</td>
                      <td className="py-2 px-3 text-right">{item.rate}</td>
                      <td className="py-2 px-3 text-right text-slate-700">{item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td colSpan={4} className="py-3 px-3 text-right font-bold text-slate-600">Total</td>
                    <td className="py-3 px-3 text-right font-bold text-primary">{selectedRecord.totalAmount.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
