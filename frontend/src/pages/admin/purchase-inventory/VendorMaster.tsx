import { useState, useMemo } from 'react';
import { 
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle, 
  Save, RefreshCw, ChevronLeft, ChevronRight, Eye, Power
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

export interface VendorRecord {
  id: number; vendorCode: string; vendorName: string; contactPerson: string; mobileNumber: string; email: string; gstNumber: string; panNumber: string; drugLicenseNumber: string; address: string; city: string; state: string; country: string; pinCode: string; paymentTerms: string; creditDays: number; status: string; createdBy?: string; createdDate?: string; updatedBy?: string; updatedDate?: string;
}

const emptyData: Omit<VendorRecord, 'id'> = { vendorCode: '', vendorName: '', contactPerson: '', mobileNumber: '', email: '', gstNumber: '', panNumber: '', drugLicenseNumber: '', address: '', city: '', state: '', country: 'India', pinCode: '', paymentTerms: 'Net 30 Days', creditDays: 30, status: 'Active' };

export const mockData: VendorRecord[] = [{"id":1,"vendorCode":"VEN-001","vendorName":"Apollo Distributors","contactPerson":"Ramesh Kumar","mobileNumber":"9876543210","email":"ramesh@apollo.in","gstNumber":"27AAAAA0000A1Z5","panNumber":"ABCDE1234F","drugLicenseNumber":"DL-12345","address":"123 Market St","city":"Mumbai","state":"Maharashtra","country":"India","pinCode":"400001","paymentTerms":"Net 30 Days","creditDays":30,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":2,"vendorCode":"VEN-002","vendorName":"MediTech Supplies","contactPerson":"Suresh Singh","mobileNumber":"9876543211","email":"suresh@meditech.in","gstNumber":"07BBBBB0000B1Z5","panNumber":"BCDEF2345G","drugLicenseNumber":"DL-12346","address":"45 Industrial Area","city":"New Delhi","state":"Delhi","country":"India","pinCode":"110020","paymentTerms":"Net 15 Days","creditDays":15,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":3,"vendorCode":"VEN-003","vendorName":"Surgicals India","contactPerson":"Amit Patel","mobileNumber":"9876543212","email":"amit@surgicals.in","gstNumber":"24CCCCC0000C1Z5","panNumber":"CDEFG3456H","drugLicenseNumber":"DL-12347","address":"78 Pharma Park","city":"Ahmedabad","state":"Gujarat","country":"India","pinCode":"380001","paymentTerms":"Immediate Payment","creditDays":0,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":4,"vendorCode":"VEN-004","vendorName":"LabCare Systems","contactPerson":"Vikram Reddy","mobileNumber":"9876543213","email":"vikram@labcare.in","gstNumber":"36DDDDD0000D1Z5","panNumber":"DEFGH4567I","drugLicenseNumber":"","address":"90 Biotech Zone","city":"Hyderabad","state":"Telangana","country":"India","pinCode":"500001","paymentTerms":"Net 45 Days","creditDays":45,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":5,"vendorCode":"VEN-005","vendorName":"Global Med Equipments","contactPerson":"Rahul Sharma","mobileNumber":"9876543214","email":"rahul@globalmed.in","gstNumber":"29EEEEE0000E1Z5","panNumber":"EFGHI5678J","drugLicenseNumber":"","address":"12 Tech Park","city":"Bengaluru","state":"Karnataka","country":"India","pinCode":"560001","paymentTerms":"Net 60 Days","creditDays":60,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":6,"vendorCode":"VEN-006","vendorName":"Office Supplies Co","contactPerson":"Neha Gupta","mobileNumber":"9876543215","email":"neha@officesupplies.in","gstNumber":"09FFFFF0000F1Z5","panNumber":"FGHIJ6789K","drugLicenseNumber":"","address":"34 Trade Center","city":"Lucknow","state":"Uttar Pradesh","country":"India","pinCode":"226001","paymentTerms":"Net 30 Days","creditDays":30,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":7,"vendorCode":"VEN-007","vendorName":"Hygiene Products Ltd","contactPerson":"Rajiv Verma","mobileNumber":"9876543216","email":"rajiv@hygiene.in","gstNumber":"33GGGGG0000G1Z5","panNumber":"GHIJK7890L","drugLicenseNumber":"","address":"56 Clean Street","city":"Chennai","state":"Tamil Nadu","country":"India","pinCode":"600001","paymentTerms":"Net 30 Days","creditDays":30,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":8,"vendorCode":"VEN-008","vendorName":"LifeCare Pharma","contactPerson":"Sunil Joshi","mobileNumber":"9876543217","email":"sunil@lifecare.in","gstNumber":"27HHHHH0000H1Z5","panNumber":"HIJKL8901M","drugLicenseNumber":"DL-12348","address":"78 Health Avenue","city":"Pune","state":"Maharashtra","country":"India","pinCode":"411001","paymentTerms":"Net 45 Days","creditDays":45,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":9,"vendorCode":"VEN-009","vendorName":"BioMed Diagnostics","contactPerson":"Anil Kumar","mobileNumber":"9876543218","email":"anil@biomed.in","gstNumber":"19IIIII0000I1Z5","panNumber":"IJKLM9012N","drugLicenseNumber":"DL-12349","address":"90 Science City","city":"Kolkata","state":"West Bengal","country":"India","pinCode":"700001","paymentTerms":"Net 60 Days","creditDays":60,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":10,"vendorCode":"VEN-010","vendorName":"TechMed Solutions","contactPerson":"Pooja Singh","mobileNumber":"9876543219","email":"pooja@techmed.in","gstNumber":"08JJJJJ0000J1Z5","panNumber":"JKLMN0123O","drugLicenseNumber":"","address":"12 IT Park","city":"Jaipur","state":"Rajasthan","country":"India","pinCode":"302001","paymentTerms":"Immediate Payment","creditDays":0,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":11,"vendorCode":"VEN-011","vendorName":"Carewell Surgicals","contactPerson":"Manoj Tiwari","mobileNumber":"9876543220","email":"manoj@carewell.in","gstNumber":"23KKKKK0000K1Z5","panNumber":"KLMNO1234P","drugLicenseNumber":"DL-12350","address":"34 Hospital Road","city":"Indore","state":"Madhya Pradesh","country":"India","pinCode":"452001","paymentTerms":"Net 15 Days","creditDays":15,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":12,"vendorCode":"VEN-012","vendorName":"Prime Medicals","contactPerson":"Karan Patel","mobileNumber":"9876543221","email":"karan@primemed.in","gstNumber":"24LLLLL0000L1Z5","panNumber":"LMNOP2345Q","drugLicenseNumber":"DL-12351","address":"56 Pharma Market","city":"Surat","state":"Gujarat","country":"India","pinCode":"395001","paymentTerms":"Net 30 Days","creditDays":30,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":13,"vendorCode":"VEN-013","vendorName":"Apex Instruments","contactPerson":"Deepak Sharma","mobileNumber":"9876543222","email":"deepak@apex.in","gstNumber":"07MMMMM0000M1Z5","panNumber":"MNOPQ3456R","drugLicenseNumber":"","address":"78 Instrument Park","city":"New Delhi","state":"Delhi","country":"India","pinCode":"110021","paymentTerms":"Net 45 Days","creditDays":45,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":14,"vendorCode":"VEN-014","vendorName":"Vital Diagnostics","contactPerson":"Anita Reddy","mobileNumber":"9876543223","email":"anita@vitaldiag.in","gstNumber":"36NNNNN0000N1Z5","panNumber":"NOPQR4567S","drugLicenseNumber":"DL-12352","address":"90 Lab Area","city":"Hyderabad","state":"Telangana","country":"India","pinCode":"500002","paymentTerms":"Net 60 Days","creditDays":60,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":15,"vendorCode":"VEN-015","vendorName":"Reliance Life Sciences","contactPerson":"Sanjay Verma","mobileNumber":"9876543224","email":"sanjay@reliance.in","gstNumber":"27OOOOO0000O1Z5","panNumber":"OPQRS5678T","drugLicenseNumber":"DL-12353","address":"12 Life Science Park","city":"Mumbai","state":"Maharashtra","country":"India","pinCode":"400002","paymentTerms":"Net 30 Days","creditDays":30,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":16,"vendorCode":"VEN-016","vendorName":"Matrix Laboratories","contactPerson":"Ravi Kumar","mobileNumber":"9876543225","email":"ravi@matrix.in","gstNumber":"36PPPPP0000P1Z5","panNumber":"PQRST6789U","drugLicenseNumber":"DL-12354","address":"34 Matrix Zone","city":"Hyderabad","state":"Telangana","country":"India","pinCode":"500003","paymentTerms":"Net 45 Days","creditDays":45,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":17,"vendorCode":"VEN-017","vendorName":"Sun Pharma Distributors","contactPerson":"Mohit Joshi","mobileNumber":"9876543226","email":"mohit@sunpharma.in","gstNumber":"27QQQQQ0000Q1Z5","panNumber":"QRSTU7890V","drugLicenseNumber":"DL-12355","address":"56 Sun Park","city":"Mumbai","state":"Maharashtra","country":"India","pinCode":"400003","paymentTerms":"Net 60 Days","creditDays":60,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":18,"vendorCode":"VEN-018","vendorName":"Cipla Distributors","contactPerson":"Nitin Singh","mobileNumber":"9876543227","email":"nitin@cipla.in","gstNumber":"27RRRRR0000R1Z5","panNumber":"RSTUV8901W","drugLicenseNumber":"DL-12356","address":"78 Cipla Zone","city":"Pune","state":"Maharashtra","country":"India","pinCode":"411002","paymentTerms":"Immediate Payment","creditDays":0,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":19,"vendorCode":"VEN-019","vendorName":"Dr. Reddy's Distributors","contactPerson":"Ashok Kumar","mobileNumber":"9876543228","email":"ashok@drreddys.in","gstNumber":"36SSSSS0000S1Z5","panNumber":"STUVW9012X","drugLicenseNumber":"DL-12357","address":"90 Dr Reddy Park","city":"Hyderabad","state":"Telangana","country":"India","pinCode":"500004","paymentTerms":"Net 15 Days","creditDays":15,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":20,"vendorCode":"VEN-020","vendorName":"Lupin Distributors","contactPerson":"Pramod Tiwari","mobileNumber":"9876543229","email":"pramod@lupin.in","gstNumber":"27TTTTT0000T1Z5","panNumber":"TUVWX0123Y","drugLicenseNumber":"DL-12358","address":"12 Lupin Area","city":"Mumbai","state":"Maharashtra","country":"India","pinCode":"400004","paymentTerms":"Net 30 Days","creditDays":30,"status":"Active","createdBy":"System","createdDate":"2024-01-01"}];

export const VendorMaster = () => {
  const [records, setRecords] = useState<VendorRecord[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{key: keyof VendorRecord | null, direction: 'asc'|'desc'}>({ key: null, direction: 'asc' });

  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<VendorRecord | null>(null);
  const [formData, setFormData] = useState<Omit<VendorRecord, 'id'>>(emptyData);
  const validateForm = () => {
    if (!formData.vendorCode.trim()) return false;
    if (!formData.vendorName.trim()) return false;
    return true;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData(emptyData); // Could add auto-generate logic here
    setIsFormOpen(true);
  };

  const handleEdit = (record: VendorRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setIsFormOpen(true);
  };
  
  const handleView = (record: VendorRecord) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };
  
  const handleToggleStatus = (record: VendorRecord) => {
    setRecords(records.map(r => 
      r.id === record.id ? { ...r, status: r.status === 'Active' ? 'Inactive' : 'Active', updatedBy: 'Admin', updatedDate: new Date().toISOString().split('T')[0] } : r
    ));
  };

  const handleDelete = (record: VendorRecord) => {
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
  
  const handleSort = (key: keyof VendorRecord) => {
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
          <span className="text-primary font-medium">Vendor Master</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Vendor Master</h1>
            <p className="text-slate-500 mt-1">Manage Suppliers</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" icon={Download} onClick={() => exportToExcel(records, 'VendorMaster')}>Export</Button>
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
<th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('vendorCode')}>Code</th>
<th className="text-left py-3 px-4 font-medium text-slate-500 text-sm cursor-pointer" onClick={() => handleSort('vendorName')}>Name</th>
<th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Contact</th>
<th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">City</th>
<th className="text-left py-3 px-4 font-medium text-slate-500 text-sm">Status</th>
<th className="text-right py-3 px-4 font-medium text-slate-500 text-sm w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr><td colSpan={10} className="py-8 text-center text-slate-500">No records found</td></tr>
              ) : paginatedData.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
<td className="py-3 px-4 text-slate-800 font-medium">{record.vendorCode}</td>
<td className="py-3 px-4 text-slate-800">{record.vendorName}</td>
<td className="py-3 px-4 text-slate-800">{record.contactPerson}<br/><span className="text-xs text-slate-500">{record.mobileNumber}</span></td>
<td className="py-3 px-4 text-slate-800">{record.city}</td>
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
        title={`\${selectedRecord ? 'Edit' : 'Add'} Vendor Master`}
        size="3xl"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
<div><label className="block text-sm font-medium text-slate-700 mb-1">Code</label><input type="text" value={formData.vendorCode} onChange={(e) => setFormData({...formData, vendorCode: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"/></div>
<div><label className="block text-sm font-medium text-slate-700 mb-1">Name</label><input type="text" value={formData.vendorName} onChange={(e) => setFormData({...formData, vendorName: e.target.value})} className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"/></div>
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
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title={`View Vendor Master Details`} size="md">
        {selectedRecord && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
<div><span className="text-xs text-slate-400 block">Code</span><span className="text-sm font-medium">{selectedRecord.vendorCode}</span></div>
<div><span className="text-xs text-slate-400 block">Name</span><span className="text-sm font-medium">{selectedRecord.vendorName}</span></div>
<div><span className="text-xs text-slate-400 block">Contact Person</span><span className="text-sm font-medium">{selectedRecord.contactPerson}</span></div>
<div><span className="text-xs text-slate-400 block">Mobile</span><span className="text-sm font-medium">{selectedRecord.mobileNumber}</span></div>
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
