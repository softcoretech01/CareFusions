import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Eye, Send, FileSignature, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { DateFilter } from '../../components/ui/DateFilter';
import type { PRRecord } from './PurchaseRequisitions';

const API_BASE = import.meta.env.VITE_API_URL as string;

interface RFQItem {
  id: string;
  itemId: number;
  itemCode: string;
  itemName: string;
  category?: string;
  requestedQty: number;
  uom: string;
  targetPrice: number;
  expectedDeliveryDays: number;
  remarks: string;
}

export interface RFQRecord {
  id: number;
  rfqNo: string;
  rfqDate: string;
  prNumber: string;
  department: string;
  requiredDate: string;
  dueDate: string;
  deliveryLocation: string;
  terms: string;
  vendors: number[]; // Array of vendor IDs
  vendorCount: number;
  items: RFQItem[];
  status: string; // 'Draft', 'Sent to Vendors', 'Closed'
  createdBy: string;
}

export const initialRFQs: RFQRecord[] = [];

// Mock PRs for dropdowns
// We will use initialPRs imported from PurchaseRequisitions

export const RequestForQuotation = () => {
  const [records, setRecords] = useState<RFQRecord[]>([]);
  const [allPRs, setAllPRs] = useState<PRRecord[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [warehousesList, setWarehousesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchRFQs();
    fetchMasters();
  }, []);

  const fetchRFQs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/rfqs`);
      if (res.ok) setRecords(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMasters = async () => {
    try {
      const [prsRes, deptRes, vendRes, storeRes] = await Promise.all([
        fetch(`${API_BASE}/purchase-requisitions`),
        fetch(`${API_BASE}/departments`),
        fetch(`${API_BASE}/vendors`),
        fetch(`${API_BASE}/stores`)
      ]);
      if (prsRes.ok) setAllPRs(await prsRes.json());
      if (deptRes.ok) setDepartmentsList(await deptRes.json());
      if (vendRes.ok) setVendorsList(await vendRes.json());
      if (storeRes.ok) setWarehousesList(await storeRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  // Filter only Approved PRs that don't already have an RFQ
  const availablePRs = useMemo(() => {
    return allPRs.filter(pr => 
      pr.approvalStatus === 'Approved' && 
      !records.some(rfq => rfq.prNumber === pr.prNo)
    );
  }, [allPRs, records]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sortConfig] = useState<{key: keyof RFQRecord | null, direction: 'asc'|'desc'}>({ key: null, direction: 'asc' });

  // Filter States
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RFQRecord | null>(null);
  
  const emptyForm: Omit<RFQRecord, 'id' | 'rfqNo'> = {
    rfqDate: new Date().toISOString().split('T')[0],
    prNumber: '', department: '', requiredDate: '', dueDate: '',
    deliveryLocation: '', terms: '', vendors: [], vendorCount: 0, items: [], status: 'Draft', createdBy: 'Admin'
  };
  const [formData, setFormData] = useState<any>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.prNumber) newErrors.prNumber = 'Required';
    if (!formData.dueDate) newErrors.dueDate = 'Required';
    if (formData.vendors.length === 0) newErrors.vendors = 'Select at least one vendor';
    if (formData.items.length === 0) newErrors.items = 'At least one item is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData({ ...emptyForm, rfqNo: `RFQ-${new Date().getFullYear()}-${String(records.length + 1).padStart(3, '0')}` });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: RFQRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };
  
  const handleView = (record: RFQRecord) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };

  const handleSave = async (status: string) => {
    if (validateForm()) {
      const payload = { ...formData, status, vendorCount: formData.vendors.length };
      try {
        const url = selectedRecord ? `${API_BASE}/rfqs/${selectedRecord.id}` : `${API_BASE}/rfqs`;
        const method = selectedRecord ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          fetchRFQs();
          setIsFormOpen(false);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDelete = async (record: RFQRecord) => {
    if (window.confirm(`Are you sure you want to delete ${record.rfqNo}?`)) {
      try {
        const res = await fetch(`${API_BASE}/rfqs/${record.id}`, { method: 'DELETE' });
        if (res.ok) fetchRFQs();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Vendor Multi-select Logic
  const handleVendorSelect = (vendorId: number) => {
    const newVendors = formData.vendors.includes(vendorId)
      ? formData.vendors.filter((id: number) => id !== vendorId)
      : [...formData.vendors, vendorId];
    setFormData({ ...formData, vendors: newVendors });
  };



  // Process data (Filter -> Sort -> Paginate)
  const processedData = useMemo(() => {
    let result = records.filter(record => {
      const matchesSearch = Object.values(record).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesDept = filterDepartment ? record.department === filterDepartment : true;
      const matchesStatus = filterStatus ? record.status === filterStatus : true;
      let matchesDate = true;
      if (fromDate && toDate) {
        const itemDate = new Date(record.rfqDate);
        const start = new Date(fromDate);
        const end = new Date(toDate);
        matchesDate = itemDate >= start && itemDate <= end;
      }
      return matchesSearch && matchesDept && matchesStatus && matchesDate;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key!] < b[sortConfig.key!]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key!] > b[sortConfig.key!]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [records, searchTerm, filterDepartment, filterStatus, sortConfig, fromDate, toDate]);


  const paginatedData = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Draft': return 'bg-slate-100 text-slate-700';
      case 'Sent to Vendors': return 'bg-blue-100 text-blue-700';
      case 'Closed': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center text-sm text-slate-500 mb-2">
          <span>Procurement</span>
          <span className="mx-2">/</span>
          <span className="text-primary font-medium">Request For Quotation</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Request For Quotation (RFQ)</h1>
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
              Create RFQ
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" placeholder="Search RFQ No, PR No..." value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 border rounded-lg transition-colors ${showFilters ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            ><Filter className="w-4 h-4" /></button>
            <button onClick={() => { fetchRFQs(); fetchMasters(); }} className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-slate-100 bg-slate-50 overflow-hidden">
              <div className="p-4 flex gap-4">
                <select value={filterDepartment} onChange={(e) => { setFilterDepartment(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none">
                  <option value="">All Departments</option>
                  {departmentsList.map(d => <option key={d.id} value={d.departmentName}>{d.departmentName}</option>)}
                </select>
                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none">
                  <option value="">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Sent to Vendors">Sent to Vendors</option>
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
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">RFQ No</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Date</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">PR Number</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Department</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Due Date</th>
                <th className="text-center py-3 px-4 font-medium text-slate-500 text-sm">Vendors Sent</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Status</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 text-sm">Target Total</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-slate-500">No records found</td></tr>
              ) : paginatedData.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 text-slate-800 font-medium">{record.rfqNo}</td>
                  <td className="py-3 px-4 text-slate-800">{record.rfqDate}</td>
                  <td className="py-3 px-4 text-slate-800">{record.prNumber}</td>
                  <td className="py-3 px-4 text-slate-800">{record.department}</td>
                  <td className="py-3 px-4 text-slate-800">{record.dueDate}</td>
                  <td className="py-3 px-4 text-center"><span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded font-medium">{record.vendorCount}</span></td>
                  <td className="py-3 px-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>{record.status}</span></td>
                  <td className="py-3 px-4 text-right font-medium text-slate-800">
                    ₹{record.items.reduce((sum, item) => sum + ((item.targetPrice || 0) * (item.requestedQty || 0)), 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleView(record)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                      {record.status !== 'Closed' && <button onClick={() => handleEdit(record)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>}
                      <button onClick={() => handleDelete(record)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={`${selectedRecord ? 'Edit' : 'New'} Request for Quotation`} size="7xl">
        <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">RFQ Number</label><input type="text" value={formData.rfqNo} disabled className="w-full px-3 py-1.5 border border-slate-200 bg-slate-100 rounded-lg text-sm" /></div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">PR Number*</label>
              <select value={formData.prNumber} onChange={(e) => {
                const pr = availablePRs.find(p => p.prNo === e.target.value);
                if (pr) {
                   const newItems = pr.items.map((item) => ({
                    id: Math.random().toString(),
                    itemId: item.itemId,
                    itemCode: item.itemCode,
                    itemName: item.itemName,
                    category: item.category,
                    requestedQty: item.requestedQty,
                    uom: item.uom,
                    targetPrice: item.estimatedPrice,
                    expectedDeliveryDays: 7,
                    remarks: item.remarks || ''
                  }));
                  setFormData({...formData, prNumber: pr.prNo, department: pr.department, requiredDate: pr.requiredDate, items: newItems});
                } else {
                  setFormData({...formData, prNumber: e.target.value, department: '', items: []});
                }
              }} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:border-primary">
                <option value="">Select PR</option>
                {availablePRs.map(pr => <option key={pr.id} value={pr.prNo}>{pr.prNo} - {pr.department}</option>)}
              </select>
              {errors.prNumber && <span className="text-xs text-red-500">{errors.prNumber}</span>}
            </div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Department</label><input type="text" value={formData.department || ''} disabled className="w-full px-3 py-1.5 border border-slate-200 bg-slate-100 rounded-lg text-sm" /></div>
            
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Required Date</label><input type="date" value={formData.requiredDate || ''} onChange={(e) => setFormData({...formData, requiredDate: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Quotation Due Date*</label><input type="date" value={formData.dueDate || ''} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" />
              {errors.dueDate && <span className="text-xs text-red-500">{errors.dueDate}</span>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Delivery Location</label>
              <select value={formData.deliveryLocation || ''} onChange={(e) => setFormData({...formData, deliveryLocation: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm">
                <option value="">Select Location</option>
                {warehousesList.map(w => <option key={w.id} value={w.storeName}>{w.storeName}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">Vendor Selection</h3>
              {errors.vendors && <div className="text-xs text-red-500 mb-2">{errors.vendors}</div>}
              <div className="border border-slate-200 rounded-xl overflow-y-auto h-48 bg-white p-2">
                {vendorsList.map(vendor => (
                  <label key={vendor.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={formData.vendors.includes(vendor.id)} onChange={() => handleVendorSelect(vendor.id)} className="w-4 h-4 text-primary rounded border-slate-300" />
                    <div>
                      <div className="text-sm font-medium text-slate-800">{vendor.vendorName}</div>
                      <div className="text-xs text-slate-500">GST: {vendor.gstNumber} | {vendor.city}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-800 mb-3">Terms & Conditions</label>
              <textarea value={formData.terms || ''} onChange={(e) => setFormData({...formData, terms: e.target.value})} className="w-full h-48 p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary resize-none" placeholder="Enter terms and conditions for vendors..." />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><FileSignature className="w-4 h-4 text-primary" /> Item Grid</h3>
            </div>
            {errors.items && <div className="text-xs text-red-500 mb-2">{errors.items}</div>}
            
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Item*</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 w-32">Category</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-24">Qty*</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 w-20">UOM</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-32">Target Price (₹)</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-32">Delivery Days</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.items.length === 0 ? (
                    <tr><td colSpan={7} className="py-6 text-center text-slate-400">No items added.</td></tr>
                  ) : formData.items.map((item: RFQItem, index: number) => (
                    <tr key={item.id} className="bg-white">
                      <td className="py-2 px-3">
                        <span className="text-xs text-slate-500">{item.itemCode}</span><br />
                        {item.itemName}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{item.category || '-'}</td>
                      <td className="py-2 px-3"><input type="number" value={item.requestedQty || ''} onChange={(e) => { const items = [...formData.items]; items[index].requestedQty = Number(e.target.value); setFormData({...formData, items})}} className="w-full p-1.5 border rounded-lg text-sm text-right" /></td>
                      <td className="py-2 px-3 text-slate-600">{item.uom || '-'}</td>
                      <td className="py-2 px-3"><input type="number" value={item.targetPrice || ''} onChange={(e) => { const items = [...formData.items]; items[index].targetPrice = Number(e.target.value); setFormData({...formData, items})}} placeholder="Target Price" className="w-full p-1.5 border rounded-lg text-sm text-right" /></td>
                      <td className="py-2 px-3"><input type="number" value={item.expectedDeliveryDays || ''} onChange={(e) => { const items = [...formData.items]; items[index].expectedDeliveryDays = Number(e.target.value); setFormData({...formData, items})}} className="w-full p-1.5 border rounded-lg text-sm text-right" /></td>
                      <td className="py-2 px-3"><input type="text" value={item.remarks || ''} onChange={(e) => { const items = [...formData.items]; items[index].remarks = e.target.value; setFormData({...formData, items})}} className="w-full p-1.5 border rounded-lg text-sm" /></td>
                    </tr>
                  ))}
                </tbody>
                {formData.items.length > 0 && (
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="py-3 px-4 text-right font-bold text-slate-600">Total Estimated Amount:</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">
                        {formData.items.reduce((sum: number, item: RFQItem) => sum + ((item.targetPrice || 0) * (item.requestedQty || 0)), 0).toLocaleString()}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-100">
          <div className="text-xs text-slate-500">Fields marked with * are required</div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => handleSave('Draft')}>Save Draft</Button>
            <Button variant="filled" color="primary" onClick={() => handleSave('Sent to Vendors')} icon={Send}>Send RFQ to Vendors</Button>
          </div>
        </div>
      </Modal>
      
      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="View Request for Quotation" size="7xl">
        {selectedRecord && (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-4 gap-4">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">RFQ Number</label><div className="text-sm font-medium text-slate-800">{selectedRecord.rfqNo}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">RFQ Date</label><div className="text-sm font-medium text-slate-800">{selectedRecord.rfqDate}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">PR Number</label><div className="text-sm font-medium text-slate-800">{selectedRecord.prNumber}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Department</label><div className="text-sm font-medium text-slate-800">{selectedRecord.department}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Required Date</label><div className="text-sm font-medium text-slate-800">{selectedRecord.requiredDate}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Due Date</label><div className="text-sm font-medium text-slate-800">{selectedRecord.dueDate}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Delivery Location</label><div className="text-sm font-medium text-slate-800">{selectedRecord.deliveryLocation || '-'}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Status</label><div className="text-sm font-medium text-slate-800">{selectedRecord.status}</div></div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Requested Vendors</h3>
              <div className="flex flex-wrap gap-2">
                {selectedRecord.vendors && selectedRecord.vendors.length > 0 ? selectedRecord.vendors.map(vId => {
                  const v = vendorsList.find(vm => vm.id === vId);
                  return v ? <span key={vId} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">{v.vendorName}</span> : null;
                }) : <span className="text-sm text-slate-500">No vendors selected</span>}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Item Details</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Item</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Category</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Qty</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">UOM</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Target Price (₹)</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Total (₹)</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedRecord.items.map((item) => (
                      <tr key={item.id} className="bg-white">
                        <td className="py-2 px-3"><span className="text-xs text-slate-500">{item.itemCode}</span><br/>{item.itemName}</td>
                        <td className="py-2 px-3 text-slate-600">{item.category || '-'}</td>
                        <td className="py-2 px-3 text-right font-medium">{item.requestedQty}</td>
                        <td className="py-2 px-3 text-slate-600">{item.uom || '-'}</td>
                        <td className="py-2 px-3 text-right">{item.targetPrice}</td>
                        <td className="py-2 px-3 text-right">{((item.targetPrice || 0) * (item.requestedQty || 0)).toLocaleString()}</td>
                        <td className="py-2 px-3 text-slate-600">{item.remarks || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan={5} className="py-3 px-4 text-right font-bold text-slate-600">Total Estimated Amount:</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">
                        {selectedRecord.items.reduce((sum: number, item: RFQItem) => sum + ((item.targetPrice || 0) * (item.requestedQty || 0)), 0).toLocaleString()}
                      </td>
                      <td></td>
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
    </motion.div>
  );
};
