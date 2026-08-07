import { useState, useMemo } from 'react';
import { Plus, Search, Filter, Download, Edit2, Trash2, Save, RefreshCw, ChevronLeft, ChevronRight, Eye, Send, FileText, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { DateFilter } from '../../components/ui/DateFilter';

// Mock Data Imports
import { useLocalStorage } from '../../utils/useLocalStorage';
import { exportToExcel } from '../../utils/exportToExcel';
import { useDepartments, useItems, useWarehouses } from '../../hooks/useMasterOptions';

export interface PRItem {
  id: string;
  itemId: number;
  itemCode: string;
  itemName: string;
  category: string;
  subCategory: string;
  availableStock: number;
  requestedQty: number;
  uom: string;
  estimatedPrice: number;
  estimatedAmount: number;
  store: string;
  remarks: string;
}

export interface PRRecord {
  id: number;
  prNo: string;
  requisitionDate: string;
  department: string;
  requestedBy: string;
  priority: string;
  requiredDate: string;
  purpose: string;
  remarks: string;
  items: PRItem[];
  totalItems: number;
  estimatedCost: number;
  approvalStatus: string; // Draft, Submitted, Department Approval, Purchase Approval, PO Created
  currentStage: string;
  createdBy: string;
}

export const initialPRs: PRRecord[] = [];

export const PurchaseRequisitions = () => {
  // Live from the admin masters. These used to be hardcoded mockData
  // arrays, so anything added in a master never reached these pickers.
  const { options: items } = useItems();
  const { options: departments } = useDepartments();
  const { options: warehouses } = useWarehouses();
  const [records, setRecords] = useLocalStorage<PRRecord[]>('procurement_prs_v2', initialPRs);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{key: keyof PRRecord | null, direction: 'asc'|'desc'}>({ key: null, direction: 'asc' });

  // Filter States
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PRRecord | null>(null);
  
  const emptyForm: Omit<PRRecord, 'id' | 'prNo'> = {
    requisitionDate: new Date().toISOString().split('T')[0],
    department: '', requestedBy: '', priority: 'Normal', requiredDate: '',
    purpose: '', remarks: '', items: [], totalItems: 0, estimatedCost: 0,
    approvalStatus: 'Draft', currentStage: 'Draft', createdBy: 'Admin'
  };
  const [formData, setFormData] = useState<any>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.department) newErrors.department = 'Required';
    if (!formData.requestedBy) newErrors.requestedBy = 'Required';
    if (!formData.requiredDate) newErrors.requiredDate = 'Required';
    if (formData.items.length === 0) newErrors.items = 'At least one item is required';
    
    // Validate items
    formData.items.forEach((item: PRItem, index: number) => {
      if (!item.itemId) newErrors[`item_${index}`] = 'Item required';
      if (!item.requestedQty || item.requestedQty <= 0) newErrors[`qty_${index}`] = 'Valid qty required';
      if (!item.store) newErrors[`store_${index}`] = 'Store required';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData({ ...emptyForm, prNo: `PR-${new Date().getFullYear()}-${String(records.length + 1).padStart(3, '0')}` });
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: PRRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };
  
  const handleView = (record: PRRecord) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };

  const handleDelete = (record: PRRecord) => {
    if (window.confirm(`Are you sure you want to delete ${record.prNo}?`)) {
      setRecords(records.filter(r => r.id !== record.id));
    }
  };

  const handleSave = (status: string) => {
    if (validateForm()) {
      const currentStage = status === 'Submitted' ? 'Pending Department Approval' : 'Draft';
      
      if (selectedRecord) {
        setRecords(records.map(r => r.id === selectedRecord.id ? { ...formData, approvalStatus: status, currentStage, id: r.id } : r));
      } else {
        const newId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
        setRecords([{ ...formData, approvalStatus: status, currentStage, id: newId }, ...records]);
      }
      setIsFormOpen(false);
    }
  };

  // Item Grid Handlers
  const handleAddItem = () => {
    const newItem: PRItem = {
      id: Math.random().toString(), itemId: 0, itemCode: '', itemName: '', category: '', subCategory: '',
      availableStock: 0, requestedQty: 1, uom: '', estimatedPrice: 0, estimatedAmount: 0, store: '', remarks: ''
    };
    setFormData({ ...formData, items: [...formData.items, newItem] });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    updateTotals(newItems);
  };

  const handleItemChange = (index: number, itemId: number) => {
    const selectedItem = items.find(i => i.id === itemId);
    if (!selectedItem) return;

    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      itemId: selectedItem.id,
      itemCode: selectedItem.itemCode,
      itemName: selectedItem.itemName,
      category: selectedItem.category,
      subCategory: selectedItem.subCategory,
      uom: selectedItem.uom,
      availableStock: Math.floor(Math.random() * 100), // Mock stock
      estimatedPrice: 100, // Mock price
      estimatedAmount: 100 * newItems[index].requestedQty
    };
    updateTotals(newItems);
  };

  const handleQtyChange = (index: number, qty: number) => {
    const newItems = [...formData.items];
    newItems[index].requestedQty = qty;
    newItems[index].estimatedAmount = newItems[index].estimatedPrice * qty;
    updateTotals(newItems);
  };

  const handleItemFieldChange = (index: number, field: keyof PRItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    updateTotals(newItems);
  };

  const updateTotals = (items: PRItem[]) => {
    const totalItems = items.reduce((sum, item) => sum + (Number(item.requestedQty) || 0), 0);
    const estimatedCost = items.reduce((sum, item) => sum + (Number(item.estimatedAmount) || 0), 0);
    setFormData((prev: any) => ({ ...prev, items, totalItems, estimatedCost }));
  };
  
  const handleSort = (key: keyof PRRecord) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // Process data (Filter -> Sort -> Paginate)
  const processedData = useMemo(() => {
    let result = records.filter(record => {
      const matchesSearch = Object.values(record).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesDept = filterDepartment ? record.department === filterDepartment : true;
      const matchesPriority = filterPriority ? record.priority === filterPriority : true;
      const matchesStatus = filterStatus ? record.approvalStatus === filterStatus : true;
      let matchesDate = true;
      if (fromDate && toDate) {
        const itemDate = new Date(record.requisitionDate);
        const start = new Date(fromDate);
        const end = new Date(toDate);
        matchesDate = itemDate >= start && itemDate <= end;
      }
      return matchesSearch && matchesDept && matchesPriority && matchesStatus && matchesDate;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key!] < b[sortConfig.key!]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key!] > b[sortConfig.key!]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [records, searchTerm, filterDepartment, filterPriority, filterStatus, sortConfig, fromDate, toDate]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedData = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Draft': return 'bg-slate-100 text-slate-700';
      case 'Submitted': return 'bg-blue-100 text-blue-700';
      case 'Department Approval': return 'bg-orange-100 text-orange-700';
      case 'Purchase Approval': return 'bg-purple-100 text-purple-700';
      case 'PO Created': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'Low': return 'text-slate-500 bg-slate-50';
      case 'Normal': return 'text-blue-600 bg-blue-50';
      case 'High': return 'text-orange-600 bg-orange-50';
      case 'Urgent': return 'text-red-600 bg-red-50 font-bold';
      default: return '';
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
      {/* Header & Breadcrumbs */}
      <div className="mb-6">
        <div className="flex items-center text-sm text-slate-500 mb-2">
          <span>Procurement</span>
          <span className="mx-2">/</span>
          <span className="text-primary font-medium">Purchase Requisitions</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Purchase Requisitions (PR)</h1>
        
        <div className="flex justify-end items-center gap-3">
          <DateFilter
            dateFrom={fromDate}
            dateTo={toDate}
            onDateFromChange={setFromDate}
            onDateToChange={setToDate}
            onSearch={() => {}}
            onReset={() => { setFromDate(''); setToDate(''); }}
          />
          <Button variant="outline" icon={Download} onClick={() => exportToExcel(processedData, 'Purchase_Requisitions')} className="h-[38px] !px-3 text-sm whitespace-nowrap">
            Export Excel
          </Button>
          <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew} className="h-[38px] !px-3 text-sm whitespace-nowrap">
            Create PR
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search PR No, Dept..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 border rounded-lg transition-colors ${showFilters ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              title="Advanced Filters"
            >
              <Filter className="w-4 h-4" />
            </button>
            <button className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Show</span>
            <select 
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="border border-slate-200 rounded-lg px-2 py-1 outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-slate-100 bg-slate-50 overflow-hidden"
            >
              <div className="p-4 flex gap-4">
                <select value={filterDepartment} onChange={(e) => { setFilterDepartment(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d.id} value={d.departmentName}>{d.departmentName}</option>)}
                </select>
                <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                  <option value="">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                  <option value="">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Department Approval">Department Approval</option>
                  <option value="Purchase Approval">Purchase Approval</option>
                  <option value="PO Created">PO Created</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('prNo')}>PR No</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('requisitionDate')}>Req. Date</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('department')}>Department</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('requestedBy')}>Requested By</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('priority')}>Priority</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Items</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 text-sm">Qty</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Est. Cost (₹)</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Status</th>
                <th className="text-right py-3 px-4 font-medium text-slate-500 text-sm w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr><td colSpan={11} className="py-8 text-center text-slate-500">No requisitions found</td></tr>
              ) : paginatedData.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 text-slate-800 font-medium">{record.prNo}</td>
                  <td className="py-3 px-4 text-slate-800">{record.requisitionDate}</td>
                  <td className="py-3 px-4 text-slate-800">{record.department}</td>
                  <td className="py-3 px-4 text-slate-800 text-sm">{record.requestedBy}</td>
                  <td className="py-3 px-4"><span className={`px-2 py-1 rounded text-xs ${getPriorityColor(record.priority)}`}>{record.priority}</span></td>
                  <td className="py-3 px-4 text-slate-800">{record.items.length} Items</td>
                  <td className="py-3 px-4 text-right text-slate-800">{record.totalItems}</td>
                  <td className="py-3 px-4 text-slate-800 font-medium">{record.estimatedCost.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(record.approvalStatus)}`}>
                      {record.approvalStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleView(record)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="View Details">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(record)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(record)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="text-sm text-slate-500">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, processedData.length)} of {processedData.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-slate-200 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-600 px-2">Page {currentPage} of {totalPages || 1}</span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1 rounded border border-slate-200 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <Modal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)}
        title={`${selectedRecord ? 'Edit' : 'New'} Purchase Requisition`}
        size="7xl"
      >
        <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1">
          {/* Header Info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-4 gap-4">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">PR Number</label><input type="text" value={formData.prNo} disabled className="w-full px-3 py-1.5 border border-slate-200 bg-slate-100 rounded-lg text-sm outline-none" /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Requisition Date</label><input type="date" value={formData.requisitionDate} onChange={(e) => setFormData({...formData, requisitionDate: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" /></div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Department*</label>
              <select value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary">
                <option value="">Select Dept</option>
                {departments.map(d => <option key={d.id} value={d.departmentName}>{d.departmentName}</option>)}
              </select>
              {errors.department && <span className="text-xs text-red-500">{errors.department}</span>}
            </div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Requested By*</label><input type="text" value={formData.requestedBy} onChange={(e) => setFormData({...formData, requestedBy: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
             {errors.requestedBy && <span className="text-xs text-red-500">{errors.requestedBy}</span>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Priority</label>
              <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary">
                <option value="Low">Low</option><option value="Normal">Normal</option><option value="High">High</option><option value="Urgent">Urgent</option>
              </select>
            </div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Required Date*</label><input type="date" value={formData.requiredDate} onChange={(e) => setFormData({...formData, requiredDate: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
              {errors.requiredDate && <span className="text-xs text-red-500">{errors.requiredDate}</span>}
            </div>
            <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Purpose</label><input type="text" value={formData.purpose} onChange={(e) => setFormData({...formData, purpose: e.target.value})} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" /></div>
          </div>

          {/* Item Details Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Item Details</h3>
              <Button variant="outline" size="sm" icon={Plus} onClick={handleAddItem}>Add Item</Button>
            </div>
            {errors.items && <div className="text-sm text-red-500 mb-2">{errors.items}</div>}
            
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-slate-600">Item*</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 w-24">Cat/Sub</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-20">Stock</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-24">Req Qty*</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 w-20">UOM</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-24">Unit Price (₹)</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 w-24">Total Price (₹)</th>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 w-32">Store*</th>
                    <th className="text-center py-2 px-3 font-medium text-slate-600 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.items.length === 0 ? (
                    <tr><td colSpan={9} className="py-6 text-center text-slate-400">No items added. Click "Add Item" to begin.</td></tr>
                  ) : formData.items.map((item: PRItem, index: number) => (
                    <tr key={item.id} className="bg-white">
                      <td className="py-2 px-3">
                        <select 
                          value={item.itemId || ''} 
                          onChange={(e) => handleItemChange(index, Number(e.target.value))}
                          className={`w-full p-1.5 border rounded-lg text-sm outline-none ${errors[`item_${index}`] ? 'border-red-300' : 'border-slate-200 focus:border-primary'}`}
                        >
                          <option value="">Select Item</option>
                          {items.map(i => <option key={i.id} value={i.id}>{i.itemCode} - {i.itemName}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-500 leading-tight">
                        <div className="truncate w-20" title={item.category}>{item.category || '-'}</div>
                        <div className="truncate w-20" title={item.subCategory}>{item.subCategory || '-'}</div>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-xs ${item.availableStock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {item.availableStock || 0}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <input 
                          type="number" min="1" value={item.requestedQty} 
                          onChange={(e) => handleQtyChange(index, Number(e.target.value))}
                          className={`w-full p-1.5 border rounded-lg text-sm text-right outline-none ${errors[`qty_${index}`] ? 'border-red-300' : 'border-slate-200 focus:border-primary'}`}
                        />
                      </td>
                      <td className="py-2 px-3 text-slate-600">{item.uom || '-'}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{item.estimatedPrice || 0}</td>
                      <td className="py-2 px-3 text-right font-medium text-slate-700">{(item.estimatedAmount || 0).toLocaleString()}</td>
                      <td className="py-2 px-3">
                        <select 
                          value={item.store} 
                          onChange={(e) => handleItemFieldChange(index, 'store', e.target.value)}
                          className={`w-full p-1.5 border rounded-lg text-sm outline-none ${errors[`store_${index}`] ? 'border-red-300' : 'border-slate-200 focus:border-primary'}`}
                        >
                          <option value="">Select Store</option>
                          {warehouses.map(w => <option key={w.id} value={w.storeName}>{w.storeName}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button onClick={() => handleRemoveItem(index)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200 font-medium text-slate-700">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 text-right">Total:</td>
                    <td className="py-3 px-3 text-right">{formData.totalItems}</td>
                    <td colSpan={2}></td>
                    <td className="py-3 px-3 text-right text-primary font-bold">{(formData.estimatedCost || 0).toLocaleString()}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Overall Remarks</label>
            <textarea value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"></textarea>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-100">
          <div className="text-xs text-slate-500">Fields marked with * are required</div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => handleSave('Draft')} icon={Save}>Save Draft</Button>
            <Button variant="filled" color="primary" onClick={() => handleSave('Submitted')} icon={Send}>Submit Requisition</Button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={`View PR Details`} size="4xl">
        {selectedRecord && (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{selectedRecord.prNo}</h2>
                <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-emerald-500"/> {selectedRecord.approvalStatus}</span>
                  <span>•</span>
                  <span>{selectedRecord.department}</span>
                  <span>•</span>
                  <span>{selectedRecord.requisitionDate}</span>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPriorityColor(selectedRecord.priority)}`}>
                {selectedRecord.priority} Priority
              </span>
            </div>

            <div className="grid grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div><span className="text-xs text-slate-400 block">Requested By</span><span className="text-sm font-medium">{selectedRecord.requestedBy}</span></div>
              <div><span className="text-xs text-slate-400 block">Required Date</span><span className="text-sm font-medium">{selectedRecord.requiredDate}</span></div>
              <div><span className="text-xs text-slate-400 block">Total Items</span><span className="text-sm font-medium">{selectedRecord.totalItems}</span></div>
              <div><span className="text-xs text-slate-400 block">Total Cost (₹)</span><span className="text-sm font-medium text-primary">{selectedRecord.estimatedCost.toLocaleString()}</span></div>
              <div className="col-span-4"><span className="text-xs text-slate-400 block">Purpose</span><span className="text-sm font-medium">{selectedRecord.purpose || '-'}</span></div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Requested Items</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Item</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Qty</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">UOM</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Store</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Unit Price (₹)</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Total Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedRecord.items.map((item) => (
                      <tr key={item.id} className="bg-white">
                        <td className="py-2 px-3">
                          <div className="font-medium text-slate-800">{item.itemName}</div>
                          <div className="text-xs text-slate-500">{item.itemCode} | {item.category}</div>
                        </td>
                        <td className="py-2 px-3 text-right font-medium">{item.requestedQty}</td>
                        <td className="py-2 px-3 text-slate-600">{item.uom}</td>
                        <td className="py-2 px-3 text-slate-600">{item.store}</td>
                        <td className="py-2 px-3 text-right text-slate-700">{item.estimatedPrice.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-slate-700">{item.estimatedAmount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>Created By: {selectedRecord.createdBy} on {selectedRecord.requisitionDate}</div>
              <div>Current Stage: <span className="font-medium text-slate-700">{selectedRecord.currentStage}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};
