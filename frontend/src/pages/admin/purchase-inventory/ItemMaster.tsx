import { useState, useMemo } from 'react';
import { useLocalStorage } from '../../../utils/useLocalStorage';
import { initialCategories, type ItemCategoryRecord } from './ItemCategoryMaster';
import { 
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, 
  Save, RefreshCw, ChevronLeft, ChevronRight, Eye, Power
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

export interface ItemRecord {
  id: number; itemCode: string; itemName: string; category: string; subCategory: string; department: string; brand: string; manufacturer: string; vendor: string; uom: string; hsnCode: string; gstPercentage: number; reorderLevel: number; minStock: number; maxStock: number; shelfLife: number; batchRequired: boolean; expiryRequired: boolean; barcode: string; itemDescription: string; status: string; createdBy?: string; createdDate?: string; updatedBy?: string; updatedDate?: string;
}

const emptyData: Omit<ItemRecord, 'id'> = { itemCode: '', itemName: '', category: 'Medicines', subCategory: 'Antibiotics', department: 'Pharmacy', brand: 'B Braun', manufacturer: 'B Braun India', vendor: 'Medisupplies', uom: 'Strip', hsnCode: '', gstPercentage: 12, reorderLevel: 0, minStock: 0, maxStock: 0, shelfLife: 365, batchRequired: true, expiryRequired: true, barcode: '', itemDescription: '', status: 'Active' };

export const mockData: ItemRecord[] = [{"id":1,"itemCode":"ITM-001","itemName":"Paracetamol 500 mg Tablet","category":"Medicines","subCategory":"Analgesics","department":"Pharmacy","brand":"GSK","manufacturer":"GSK","vendor":"Apollo Distributors","uom":"Strip","hsnCode":"30049099","gstPercentage":12,"reorderLevel":100,"minStock":50,"maxStock":500,"shelfLife":730,"batchRequired":true,"expiryRequired":true,"barcode":"8901234567890","itemDescription":"Fever and pain relief","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":2,"itemCode":"ITM-002","itemName":"Amoxicillin 500 mg Capsule","category":"Medicines","subCategory":"Antibiotics","department":"Pharmacy","brand":"Cipla","manufacturer":"Cipla Ltd","vendor":"Apollo Distributors","uom":"Strip","hsnCode":"30041010","gstPercentage":12,"reorderLevel":50,"minStock":25,"maxStock":200,"shelfLife":730,"batchRequired":true,"expiryRequired":true,"barcode":"8901234567891","itemDescription":"Antibiotic","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":3,"itemCode":"ITM-003","itemName":"Disposable Syringe 5 ml","category":"Medical Consumables","subCategory":"Syringes","department":"Central Store","brand":"BD","manufacturer":"Becton Dickinson India","vendor":"MediTech Supplies","uom":"Box","hsnCode":"90183100","gstPercentage":12,"reorderLevel":20,"minStock":10,"maxStock":100,"shelfLife":1825,"batchRequired":true,"expiryRequired":true,"barcode":"8901234567892","itemDescription":"With needle","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":4,"itemCode":"ITM-004","itemName":"N95 Face Mask","category":"Medical Consumables","subCategory":"Face Masks","department":"Central Store","brand":"3M","manufacturer":"3M India","vendor":"MediTech Supplies","uom":"Box","hsnCode":"63079090","gstPercentage":5,"reorderLevel":50,"minStock":20,"maxStock":200,"shelfLife":1825,"batchRequired":false,"expiryRequired":false,"barcode":"8901234567893","itemDescription":"Respirator","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":5,"itemCode":"ITM-005","itemName":"Examination Gloves Medium","category":"Medical Consumables","subCategory":"Gloves","department":"Central Store","brand":"Romsons","manufacturer":"Romsons Scientific","vendor":"Surgicals India","uom":"Box","hsnCode":"40151100","gstPercentage":12,"reorderLevel":100,"minStock":50,"maxStock":500,"shelfLife":1825,"batchRequired":true,"expiryRequired":true,"barcode":"8901234567894","itemDescription":"Latex examination gloves","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":6,"itemCode":"ITM-006","itemName":"ECG Electrodes","category":"Medical Consumables","subCategory":"Accessories","department":"Cardiology","brand":"3M","manufacturer":"3M India","vendor":"MediTech Supplies","uom":"Pack","hsnCode":"90181100","gstPercentage":12,"reorderLevel":10,"minStock":5,"maxStock":50,"shelfLife":730,"batchRequired":true,"expiryRequired":true,"barcode":"8901234567895","itemDescription":"Adult ECG electrodes","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":7,"itemCode":"ITM-007","itemName":"IV Cannula 20G","category":"Medical Consumables","subCategory":"IV Cannulas","department":"Central Store","brand":"PolyMed","manufacturer":"Poly Medicure","vendor":"Surgicals India","uom":"Box","hsnCode":"90183990","gstPercentage":12,"reorderLevel":50,"minStock":25,"maxStock":200,"shelfLife":1825,"batchRequired":true,"expiryRequired":true,"barcode":"8901234567896","itemDescription":"Pink IV Cannula","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":8,"itemCode":"ITM-008","itemName":"Blood Collection Tube EDTA","category":"Laboratory Supplies","subCategory":"Blood Collection Tubes","department":"Laboratory","brand":"BD","manufacturer":"Becton Dickinson India","vendor":"LabCare Systems","uom":"Box","hsnCode":"90183990","gstPercentage":12,"reorderLevel":20,"minStock":10,"maxStock":100,"shelfLife":730,"batchRequired":true,"expiryRequired":true,"barcode":"8901234567897","itemDescription":"Purple top tube","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":9,"itemCode":"ITM-009","itemName":"Digital Thermometer","category":"Medical Equipment","subCategory":"Patient Monitors","department":"OPD","brand":"Omron","manufacturer":"Omron Healthcare","vendor":"MediTech Supplies","uom":"Each","hsnCode":"90251910","gstPercentage":18,"reorderLevel":5,"minStock":2,"maxStock":20,"shelfLife":0,"batchRequired":false,"expiryRequired":false,"barcode":"8901234567898","itemDescription":"Clinical thermometer","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":10,"itemCode":"ITM-010","itemName":"Patient Monitor","category":"Medical Equipment","subCategory":"Patient Monitors","department":"ICU","brand":"Philips","manufacturer":"Philips Healthcare India","vendor":"Global Med Equipments","uom":"Each","hsnCode":"90181990","gstPercentage":18,"reorderLevel":1,"minStock":1,"maxStock":5,"shelfLife":0,"batchRequired":false,"expiryRequired":false,"barcode":"8901234567899","itemDescription":"Multipara monitor","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":11,"itemCode":"ITM-011","itemName":"Pulse Oximeter","category":"Medical Equipment","subCategory":"Patient Monitors","department":"Emergency","brand":"BPL","manufacturer":"BPL Medical Technologies","vendor":"MediTech Supplies","uom":"Each","hsnCode":"90181990","gstPercentage":18,"reorderLevel":10,"minStock":5,"maxStock":30,"shelfLife":0,"batchRequired":false,"expiryRequired":false,"barcode":"8901234567900","itemDescription":"Fingertip pulse oximeter","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":12,"itemCode":"ITM-012","itemName":"Surgical Blade No.11","category":"Surgical Items","subCategory":"Blades","department":"Operation Theatre","brand":"Paramount","manufacturer":"Paramount Surgimed","vendor":"Surgicals India","uom":"Box","hsnCode":"90189099","gstPercentage":12,"reorderLevel":20,"minStock":10,"maxStock":100,"shelfLife":1825,"batchRequired":true,"expiryRequired":true,"barcode":"8901234567901","itemDescription":"Sterile carbon steel blade","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":13,"itemCode":"ITM-013","itemName":"Suture Vicryl 2-0","category":"Surgical Items","subCategory":"Sutures","department":"Operation Theatre","brand":"Ethicon","manufacturer":"Johnson & Johnson Medical","vendor":"Apollo Distributors","uom":"Box","hsnCode":"30061010","gstPercentage":12,"reorderLevel":15,"minStock":5,"maxStock":50,"shelfLife":1825,"batchRequired":true,"expiryRequired":true,"barcode":"8901234567902","itemDescription":"Absorbable suture","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":14,"itemCode":"ITM-014","itemName":"IV Fluid Normal Saline 500 ml","category":"Medicines","subCategory":"IV Fluids","department":"Pharmacy","brand":"NS","manufacturer":"Fresenius Kabi India","vendor":"Apollo Distributors","uom":"Bottle","hsnCode":"30049099","gstPercentage":12,"reorderLevel":200,"minStock":100,"maxStock":1000,"shelfLife":730,"batchRequired":true,"expiryRequired":true,"barcode":"8901234567903","itemDescription":"0.9% NaCl","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":15,"itemCode":"ITM-015","itemName":"Cotton Roll 500g","category":"Medical Consumables","subCategory":"Cotton & Gauze","department":"Central Store","brand":"Bengal Cotton","manufacturer":"Bengal Cotton","vendor":"Surgicals India","uom":"Roll","hsnCode":"30059040","gstPercentage":5,"reorderLevel":50,"minStock":25,"maxStock":200,"shelfLife":1825,"batchRequired":true,"expiryRequired":true,"barcode":"8901234567904","itemDescription":"Absorbent cotton","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":16,"itemCode":"ITM-016","itemName":"Adhesive Bandage","category":"Medical Consumables","subCategory":"Bandages","department":"Central Store","brand":"Band-Aid","manufacturer":"Johnson & Johnson Medical","vendor":"Apollo Distributors","uom":"Pack","hsnCode":"30051090","gstPercentage":12,"reorderLevel":30,"minStock":15,"maxStock":150,"shelfLife":1095,"batchRequired":true,"expiryRequired":true,"barcode":"8901234567905","itemDescription":"Standard size","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":17,"itemCode":"ITM-017","itemName":"Urine Container 30ml","category":"Laboratory Supplies","subCategory":"Containers","department":"Laboratory","brand":"Tarsons","manufacturer":"Tarsons Products","vendor":"LabCare Systems","uom":"Box","hsnCode":"39269099","gstPercentage":18,"reorderLevel":10,"minStock":5,"maxStock":50,"shelfLife":0,"batchRequired":false,"expiryRequired":false,"barcode":"8901234567906","itemDescription":"Sterile non-vacuum","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":18,"itemCode":"ITM-018","itemName":"Hand Sanitizer 500ml","category":"Housekeeping Materials","subCategory":"Sanitizers","department":"Housekeeping","brand":"Purell","manufacturer":"Gojo Industries","vendor":"MediTech Supplies","uom":"Bottle","hsnCode":"38089400","gstPercentage":18,"reorderLevel":50,"minStock":20,"maxStock":200,"shelfLife":730,"batchRequired":true,"expiryRequired":true,"barcode":"8901234567907","itemDescription":"Alcohol based","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":19,"itemCode":"ITM-019","itemName":"Surgical Gown","category":"Linen & Laundry","subCategory":"Gowns","department":"Operation Theatre","brand":"3M","manufacturer":"3M India","vendor":"Surgicals India","uom":"Each","hsnCode":"62101000","gstPercentage":5,"reorderLevel":100,"minStock":50,"maxStock":300,"shelfLife":1825,"batchRequired":true,"expiryRequired":true,"barcode":"8901234567908","itemDescription":"Disposable, sterile","status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":20,"itemCode":"ITM-020","itemName":"Printer Paper A4","category":"Office Stationery","subCategory":"Paper","department":"Administration","brand":"JK Copier","manufacturer":"JK Paper","vendor":"Office Supplies Co","uom":"Pack","hsnCode":"48025690","gstPercentage":12,"reorderLevel":20,"minStock":10,"maxStock":100,"shelfLife":0,"batchRequired":false,"expiryRequired":false,"barcode":"8901234567909","itemDescription":"75 GSM","status":"Active","createdBy":"System","createdDate":"2024-01-01"}];

export const ItemMaster = () => {
  const [categories] = useLocalStorage<ItemCategoryRecord[]>('procurement_item_categories', initialCategories);
  const [records, setRecords] = useState<ItemRecord[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{key: keyof ItemRecord | null, direction: 'asc'|'desc'}>({ key: null, direction: 'asc' });

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ItemRecord | null>(null);
  const [formData, setFormData] = useState<Omit<ItemRecord, 'id'>>(emptyData);
  const validateForm = () => {
    if (!formData.itemCode.trim()) return false;
    if (!formData.itemName.trim()) return false;
    return true;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData(emptyData); // Could add auto-generate logic here
    setIsFormOpen(true);
  };

  const handleEdit = (record: ItemRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setIsFormOpen(true);
  };
  
  const handleView = (record: ItemRecord) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };
  
  const handleToggleStatus = (record: ItemRecord) => {
    setRecords(records.map(r => 
      r.id === record.id ? { ...r, status: r.status === 'Active' ? 'Inactive' : 'Active', updatedBy: 'Admin', updatedDate: new Date().toISOString().split('T')[0] } : r
    ));
  };

  const handleDelete = (record: ItemRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedRecord) {
      setRecords(records.filter(r => r.id !== selectedRecord.id));
      setIsDeleteOpen(false);
      setSelectedRecord(null);
    }
  };

  const handleSave = () => {
    if (validateForm()) {
      if (selectedRecord) {
        setRecords(records.map(r => r.id === selectedRecord.id ? { ...formData, id: r.id, updatedBy: 'Admin', updatedDate: new Date().toISOString().split('T')[0] } : r));
      } else {
        const newId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
        setRecords([{ ...formData, id: newId, createdBy: 'Admin', createdDate: new Date().toISOString().split('T')[0] }, ...records]);
      }
      setIsFormOpen(false);
    }
  };
  
  const handleSort = (key: keyof ItemRecord) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Process data (Filter -> Sort -> Paginate)
  const processedData = useMemo(() => {
    let result = records.filter(record => {
      const matchesSearch = Object.values(record).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesStatus = filterStatus ? record.status === filterStatus : true;
      return matchesSearch && matchesStatus;
    });

    if (sortConfig.key) {
      const sortKey = sortConfig.key;
      result.sort((a, b) => {
        const left = a?.[sortKey] as any;
        const right = b?.[sortKey] as any;
        if (left === undefined || right === undefined) return 0;
        if (left < right) return sortConfig.direction === 'asc' ? -1 : 1;
        if (left > right) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [records, searchTerm, filterStatus, sortConfig]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedData = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col"
    >
      {/* Header & Breadcrumbs */}
      <div className="mb-6">
        <div className="flex items-center text-sm text-slate-500 mb-2">
          <span>Masters</span>
          <span className="mx-2">/</span>
          <span className="text-primary font-medium">Item Master</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Item Master</h1>
            <p className="text-slate-500 mt-1">Manage Hospital Items</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" icon={Download} onClick={() => exportToExcel(records, 'ItemMaster')}>Export</Button>
            <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
              Add New
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
                type="text" 
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
            </div>
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 border rounded-lg transition-colors \${showFilters ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
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
                <select 
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                {/* Additional advanced filters can go here */}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
              <tr>
<th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('itemCode')}>Code</th>
<th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('itemName')}>Name</th>
<th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Category</th>
<th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Stock Limits</th>
<th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Status</th>
<th className="text-right py-3 px-4 font-medium text-slate-500 text-sm w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr><td colSpan={10} className="py-8 text-center text-slate-500">No records found</td></tr>
              ) : paginatedData.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
<td className="py-3 px-4 text-slate-800 font-medium">{record.itemCode}</td>
<td className="py-3 px-4 text-slate-800">{record.itemName}</td>
<td className="py-3 px-4 text-slate-800 text-sm">{record.category}</td>
<td className="py-3 px-4 text-slate-500 text-sm">Min: {record.minStock} | Max: {record.maxStock}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium \${
                      record.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {record.status}
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
                      <button onClick={() => handleToggleStatus(record)} className={`p-1.5 rounded-lg transition-colors \${record.status === 'Active' ? 'text-slate-400 hover:text-orange-500 hover:bg-orange-50' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'}`} title={record.status === 'Active' ? 'Deactivate' : 'Activate'}>
                        <Power className="w-4 h-4" />
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
        title={`\${selectedRecord ? 'Edit' : 'Add'} Item Master`}
        size="3xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
<div className="grid grid-cols-2 gap-4">
<div><label className="block text-sm font-medium text-slate-700 mb-1">Item Code</label><input type="text" value={formData.itemCode} onChange={(e) => setFormData({...formData, itemCode: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"/></div>
<div><label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label><input type="text" value={formData.itemName} onChange={(e) => setFormData({...formData, itemName: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"/></div>
</div>
<div className="grid grid-cols-3 gap-4">
<div><label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
<select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary">
  {categories.filter(c => c.status === 'Active').map(cat => (
    <option key={cat.id} value={cat.categoryName}>{cat.categoryName}</option>
  ))}
</select></div>
<div><label className="block text-sm font-medium text-slate-700 mb-1">Sub Category</label>
<select value={formData.subCategory} onChange={(e) => setFormData({...formData, subCategory: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary">
  <option value="Analgesics">Analgesics</option>
  <option value="Antibiotics">Antibiotics</option>
  <option value="Syringes">Syringes</option>
  <option value="Face Masks">Face Masks</option>
  <option value="Gloves">Gloves</option>
  <option value="Accessories">Accessories</option>
  <option value="IV Cannulas">IV Cannulas</option>
  <option value="Blood Collection Tubes">Blood Collection Tubes</option>
  <option value="Patient Monitors">Patient Monitors</option>
  <option value="Blades">Blades</option>
  <option value="Sutures">Sutures</option>
  <option value="IV Fluids">IV Fluids</option>
  <option value="Cotton & Gauze">Cotton & Gauze</option>
  <option value="Bandages">Bandages</option>
  <option value="Containers">Containers</option>
  <option value="Sanitizers">Sanitizers</option>
  <option value="Gowns">Gowns</option>
  <option value="Paper">Paper</option>
</select></div>
<div><label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
<select value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary">
  <option value="Pharmacy">Pharmacy</option>
  <option value="Central Store">Central Store</option>
  <option value="Cardiology">Cardiology</option>
  <option value="Laboratory">Laboratory</option>
  <option value="OPD">OPD</option>
  <option value="ICU">ICU</option>
  <option value="Emergency">Emergency</option>
  <option value="Operation Theatre">Operation Theatre</option>
  <option value="Housekeeping">Housekeeping</option>
  <option value="Administration">Administration</option>
</select></div>
</div>
<div className="grid grid-cols-3 gap-4">
<div><label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
<select value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary">
  <option value="B Braun">B Braun</option>
  <option value="BD">BD</option>
  <option value="3M">3M</option>
  <option value="Romsons">Romsons</option>
  <option value="Johnson & Johnson">Johnson & Johnson</option>
  <option value="Omron">Omron</option>
  <option value="Philips">Philips</option>
  <option value="Cipla">Cipla</option>
  <option value="GSK">GSK</option>
  <option value="PolyMed">PolyMed</option>
  <option value="BPL">BPL</option>
  <option value="Paramount">Paramount</option>
  <option value="Ethicon">Ethicon</option>
  <option value="NS">NS</option>
  <option value="Bengal Cotton">Bengal Cotton</option>
  <option value="Band-Aid">Band-Aid</option>
  <option value="Tarsons">Tarsons</option>
  <option value="Purell">Purell</option>
  <option value="JK Copier">JK Copier</option>
</select></div>
<div><label className="block text-sm font-medium text-slate-700 mb-1">Manufacturer</label>
<select value={formData.manufacturer} onChange={(e) => setFormData({...formData, manufacturer: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary">
  <option value="B Braun India">B Braun India</option>
  <option value="Becton Dickinson India">Becton Dickinson India</option>
  <option value="Johnson & Johnson Medical">Johnson & Johnson Medical</option>
  <option value="Fresenius Kabi India">Fresenius Kabi India</option>
  <option value="Philips Healthcare India">Philips Healthcare India</option>
  <option value="Romsons Scientific">Romsons Scientific</option>
  <option value="3M India">3M India</option>
  <option value="Poly Medicure">Poly Medicure</option>
  <option value="Cipla Ltd">Cipla Ltd</option>
  <option value="GSK">GSK</option>
  <option value="Omron Healthcare">Omron Healthcare</option>
  <option value="BPL Medical Technologies">BPL Medical Technologies</option>
  <option value="Paramount Surgimed">Paramount Surgimed</option>
  <option value="Bengal Cotton">Bengal Cotton</option>
  <option value="Tarsons Products">Tarsons Products</option>
  <option value="Gojo Industries">Gojo Industries</option>
  <option value="JK Paper">JK Paper</option>
</select></div>
<div><label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
<select value={formData.vendor} onChange={(e) => setFormData({...formData, vendor: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary">
  <option value="Apollo Distributors">Apollo Distributors</option>
  <option value="MediTech Supplies">MediTech Supplies</option>
  <option value="Surgicals India">Surgicals India</option>
  <option value="LabCare Systems">LabCare Systems</option>
  <option value="Global Med Equipments">Global Med Equipments</option>
  <option value="Office Supplies Co">Office Supplies Co</option>
</select></div>
</div>
<div className="grid grid-cols-2 gap-4">
<div><label className="block text-sm font-medium text-slate-700 mb-1">UOM</label>
<select value={formData.uom} onChange={(e) => setFormData({...formData, uom: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary">
  <option value="Each">Each</option>
  <option value="Box">Box</option>
  <option value="Bottle">Bottle</option>
  <option value="Pack">Pack</option>
  <option value="Pair">Pair</option>
  <option value="Roll">Roll</option>
  <option value="Strip">Strip</option>
  <option value="Kit">Kit</option>
  <option value="Set">Set</option>
</select></div>
<div><label className="block text-sm font-medium text-slate-700 mb-1">Tax (GST)</label>
<select value={formData.gstPercentage} onChange={(e) => setFormData({...formData, gstPercentage: Number(e.target.value)})} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary">
  <option value={0}>0%</option>
  <option value={5}>5%</option>
  <option value={12}>12%</option>
  <option value={18}>18%</option>
  <option value={28}>28%</option>
</select></div>
</div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select 
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {selectedRecord && (
          <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs text-slate-500">
            <div><span className="block font-medium text-slate-700 mb-1">Created By</span>{selectedRecord.createdBy || 'System'} • {selectedRecord.createdDate || 'N/A'}</div>
            <div><span className="block font-medium text-slate-700 mb-1">Last Updated</span>{selectedRecord.updatedBy || '-'} • {selectedRecord.updatedDate || '-'}</div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
          <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
          <Button variant="filled" color="primary" onClick={handleSave} icon={Save}>{selectedRecord ? 'Update' : 'Save'}</Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={`View Item Master Details`} size="md">
        {selectedRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
<div><span className="text-xs text-slate-400 block">Code</span><span className="text-sm font-medium">{selectedRecord.itemCode}</span></div>
<div><span className="text-xs text-slate-400 block">Name</span><span className="text-sm font-medium">{selectedRecord.itemName}</span></div>
<div><span className="text-xs text-slate-400 block">Category</span><span className="text-sm font-medium">{selectedRecord.category}</span></div>
<div><span className="text-xs text-slate-400 block">Brand</span><span className="text-sm font-medium">{selectedRecord.brand}</span></div>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-400 block mb-1">Status</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium \${
                selectedRecord.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
              }`}>
                {selectedRecord.status}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Delete Record" size="sm">
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">Delete Record?</h3>
          <p className="text-slate-500 mb-6">Are you sure you want to delete this record? This action cannot be undone.</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="filled" className="bg-red-500 hover:bg-red-600 text-white border-transparent" onClick={confirmDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
