import { useState, useMemo, useEffect, type KeyboardEvent } from 'react';
import {
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle,
  Save, ChevronLeft, ChevronRight, Eye, Power, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

const API_BASE = import.meta.env.VITE_API_URL as string;

export interface VendorRecord {
  id: number; vendorCode: string; vendorName: string; contactPerson: string; mobileNumber: string; email: string; gstNumber: string; panNumber: string; drugLicenseNumber: string; address: string; city: string; state: string; country: string; pinCode: string; paymentTerms: string; creditDays: number; status: string; createdBy?: string; createdDate?: string; updatedBy?: string; updatedDate?: string;
}

type VendorForm = Omit<VendorRecord, 'id' | 'vendorCode' | 'createdBy' | 'createdDate' | 'updatedBy' | 'updatedDate'>;

const emptyData: VendorForm = { vendorName: '', contactPerson: '', mobileNumber: '', email: '', gstNumber: '', panNumber: '', drugLicenseNumber: '', address: '', city: '', state: '', country: 'India', pinCode: '', paymentTerms: 'Net 30 Days', creditDays: 30, status: 'Active' };

// NOTE: Retained ONLY for legacy procurement pages (PurchaseOrders, GoodsReceipt,
// etc.) that import it as sample vendor data. The Vendor Master page itself now
// loads from the live API. Those pages should later fetch from /vendors/ instead.
export const mockData: VendorRecord[] = [{"id":1,"vendorCode":"VEN-001","vendorName":"Apollo Distributors","contactPerson":"Ramesh Kumar","mobileNumber":"9876543210","email":"ramesh@apollo.in","gstNumber":"27AAAAA0000A1Z5","panNumber":"ABCDE1234F","drugLicenseNumber":"DL-12345","address":"123 Market St","city":"Mumbai","state":"Maharashtra","country":"India","pinCode":"400001","paymentTerms":"Net 30 Days","creditDays":30,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":2,"vendorCode":"VEN-002","vendorName":"MediTech Supplies","contactPerson":"Suresh Singh","mobileNumber":"9876543211","email":"suresh@meditech.in","gstNumber":"07BBBBB0000B1Z5","panNumber":"BCDEF2345G","drugLicenseNumber":"DL-12346","address":"45 Industrial Area","city":"New Delhi","state":"Delhi","country":"India","pinCode":"110020","paymentTerms":"Net 15 Days","creditDays":15,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":3,"vendorCode":"VEN-003","vendorName":"Surgicals India","contactPerson":"Amit Patel","mobileNumber":"9876543212","email":"amit@surgicals.in","gstNumber":"24CCCCC0000C1Z5","panNumber":"CDEFG3456H","drugLicenseNumber":"DL-12347","address":"78 Pharma Park","city":"Ahmedabad","state":"Gujarat","country":"India","pinCode":"380001","paymentTerms":"Immediate Payment","creditDays":0,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":4,"vendorCode":"VEN-004","vendorName":"LabCare Systems","contactPerson":"Vikram Reddy","mobileNumber":"9876543213","email":"vikram@labcare.in","gstNumber":"36DDDDD0000D1Z5","panNumber":"DEFGH4567I","drugLicenseNumber":"","address":"90 Biotech Zone","city":"Hyderabad","state":"Telangana","country":"India","pinCode":"500001","paymentTerms":"Net 45 Days","creditDays":45,"status":"Active","createdBy":"System","createdDate":"2024-01-01"},
{"id":5,"vendorCode":"VEN-005","vendorName":"Global Med Equipments","contactPerson":"Rahul Sharma","mobileNumber":"9876543214","email":"rahul@globalmed.in","gstNumber":"29EEEEE0000E1Z5","panNumber":"EFGHI5678J","drugLicenseNumber":"","address":"12 Tech Park","city":"Bengaluru","state":"Karnataka","country":"India","pinCode":"560001","paymentTerms":"Net 60 Days","creditDays":60,"status":"Active","createdBy":"System","createdDate":"2024-01-01"}];

// Field limits (aligned with backend schema + DB column sizes)
const LIMITS = {
  vendorName: 150, contactPerson: 100, mobile: 20, email: 150,
  gst: 20, pan: 15, drug: 50, address: 255, location: 100, pin: 20,
  terms: 50, creditMax: 365,
};

// Payment terms → default credit days
const paymentTermsMap: Record<string, number> = {
  'Immediate Payment': 0,
  'Net 15 Days': 15,
  'Net 30 Days': 30,
  'Net 45 Days': 45,
  'Net 60 Days': 60,
};
const paymentTermsOptions = Object.keys(paymentTermsMap);

const blockIntKeys = (e: KeyboardEvent<HTMLInputElement>) => {
  if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
};

const mapApiToRecord = (item: Record<string, unknown>): VendorRecord => ({
  id:                item.id                as number,
  vendorCode:        item.vendorCode        as string,
  vendorName:        item.vendorName        as string,
  contactPerson:     item.contactPerson     as string,
  mobileNumber:      item.mobileNumber      as string,
  email:             item.email             as string,
  gstNumber:         (item.gstNumber        as string) ?? '',
  panNumber:         (item.panNumber        as string) ?? '',
  drugLicenseNumber: (item.drugLicenseNumber as string) ?? '',
  address:           item.address           as string,
  city:              item.city              as string,
  state:             item.state             as string,
  country:           item.country           as string,
  pinCode:           item.pinCode           as string,
  paymentTerms:      (item.paymentTerms     as string) ?? '',
  creditDays:        item.creditDays != null ? Number(item.creditDays) : 0,
  status:            item.status            as string,
  createdBy:         (item.createdBy        as string) ?? undefined,
  createdDate:       item.createdDate ? String(item.createdDate).split('T')[0] : undefined,
  updatedBy:         (item.updatedBy        as string) ?? undefined,
  updatedDate:       item.updatedDate ? String(item.updatedDate).split('T')[0] : undefined,
});

export const VendorMaster = () => {
  const [records, setRecords] = useState<VendorRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [nextCode, setNextCode] = useState('');

  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{key: keyof VendorRecord | null, direction: 'asc'|'desc'}>({ key: null, direction: 'asc' });

  // Filter States
  const [showFilters, setShowFilters] = useState(false);

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<VendorRecord | null>(null);
  const [formData, setFormData] = useState<VendorForm>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Fetch vendors ────────────────────────────────────────────
  const fetchVendors = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/vendors/`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: Record<string, unknown>[] = await res.json();
      setRecords(data.map(mapApiToRecord));
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchVendors(); }, []);

  const fetchNextCode = async () => {
    setNextCode('');
    try {
      const res = await fetch(`${API_BASE}/vendors/next-code`);
      if (res.ok) {
        const data = await res.json();
        setNextCode(data.vendorCode ?? '');
      }
    } catch {
      setNextCode('');
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.vendorName.trim()) newErrors.vendorName = 'Vendor Name is required';
    if (!formData.contactPerson.trim()) newErrors.contactPerson = 'Contact Person is required';

    if (!formData.mobileNumber.trim()) newErrors.mobileNumber = 'Mobile Number is required';
    else if (!/^\d{10,15}$/.test(formData.mobileNumber.replace(/[\s+-]/g, ''))) newErrors.mobileNumber = 'Mobile must be 10-15 digits';

    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Valid Email is required';

    if (formData.panNumber.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(formData.panNumber.trim().toUpperCase()))
      newErrors.panNumber = 'PAN must be in format AAAAA9999A';
    if (formData.gstNumber.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(formData.gstNumber.trim().toUpperCase()))
      newErrors.gstNumber = 'GST must be a valid 15-character GSTIN';

    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.country.trim()) newErrors.country = 'Country is required';
    if (!formData.pinCode.trim()) newErrors.pinCode = 'PIN Code is required';

    if (Number(formData.creditDays) < 0) newErrors.creditDays = 'Cannot be negative';
    else if (Number(formData.creditDays) > LIMITS.creditMax) newErrors.creditDays = `Cannot exceed ${LIMITS.creditMax} days`;

    if (records.some(r => r.vendorName.toLowerCase() === formData.vendorName.trim().toLowerCase() && r.id !== selectedRecord?.id))
      newErrors.vendorName = 'Vendor Name cannot be duplicated';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData(emptyData);
    setErrors({});
    setIsFormOpen(true);
    fetchNextCode();
  };

  const handleEdit = (record: VendorRecord) => {
    setSelectedRecord(record);
    const { id, vendorCode, createdBy, createdDate, updatedBy, updatedDate, ...rest } = record;
    setFormData(rest);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleView = (record: VendorRecord) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };

  const handleToggleStatus = async (record: VendorRecord) => {
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/vendors/${record.id}/toggle-status`, { method: 'PATCH' });
      if (!res.ok) throw new Error(`Toggle failed: ${res.status}`);
      await fetchVendors();
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  const handleDelete = (record: VendorRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/vendors/${selectedRecord.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      await fetchVendors();
      setIsDeleteOpen(false);
      setSelectedRecord(null);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Delete failed');
      setIsDeleteOpen(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    setApiError(null);
    try {
      const body = {
        vendorName:        formData.vendorName.trim(),
        contactPerson:     formData.contactPerson.trim(),
        mobileNumber:      formData.mobileNumber.trim(),
        email:             formData.email.trim(),
        gstNumber:         formData.gstNumber.trim() ? formData.gstNumber.trim().toUpperCase() : null,
        panNumber:         formData.panNumber.trim() ? formData.panNumber.trim().toUpperCase() : null,
        drugLicenseNumber: formData.drugLicenseNumber || null,
        address:           formData.address.trim(),
        city:              formData.city.trim(),
        state:             formData.state.trim(),
        country:           formData.country.trim(),
        pinCode:           formData.pinCode.trim(),
        paymentTerms:      formData.paymentTerms || null,
        creditDays:        formData.creditDays === ('' as unknown as number) ? null : Number(formData.creditDays),
        status:            formData.status,
      };

      let res: Response;
      if (selectedRecord) {
        res = await fetch(`${API_BASE}/vendors/${selectedRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, updatedBy: 'Admin' }),
        });
      } else {
        res = await fetch(`${API_BASE}/vendors/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, createdBy: 'Admin' }),
        });
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const detail = data && typeof data.detail === 'string' ? data.detail : `Save failed: ${res.status}`;
        throw new Error(detail);
      }

      await fetchVendors();
      setIsFormOpen(false);
      setSelectedRecord(null);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
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
    const result = records.filter(record => {
      const matchesSearch = Object.values(record).some(val =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      return matchesSearch;
    });

    if (sortConfig.key) {
      const sortKey = sortConfig.key;
      result.sort((a, b) => {
        const left = a?.[sortKey] as string | number | undefined;
        const right = b?.[sortKey] as string | number | undefined;
        if (left === undefined || right === undefined) return 0;
        if (left < right) return sortConfig.direction === 'asc' ? -1 : 1;
        if (left > right) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [records, searchTerm, sortConfig]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const paginatedData = processedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const inputCls = (err?: string) =>
    `w-full px-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 transition-all ${err ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col"
    >
      {apiError && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{apiError}</span>
          <button onClick={() => setApiError(null)} className="text-red-500 hover:text-red-700 font-medium">Dismiss</button>
        </div>
      )}

      {/* Header & Breadcrumbs */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Vendor</h1>
            <p className="text-slate-500 mt-1"></p>
          </div>

          <div className="flex items-center gap-3">
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
              className={`p-2 border rounded-lg transition-colors ${showFilters ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              title="Advanced Filters"
            >
              <Filter className="w-4 h-4" />
            </button>
            <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors" title="Clear search & filters">
              <X className="w-4 h-4" />
            </button>
            <button onClick={() => exportToExcel(records, 'VendorMaster')} className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors" title="Export to Excel">
              <Download className="w-4 h-4" />
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
                <th className="text-right py-3 px-4 font-medium text-slate-500 text-sm w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-500">Loading vendors...</td></tr>
              ) : paginatedData.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-500">No records found</td></tr>
              ) : paginatedData.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 text-slate-800 font-medium">{record.vendorCode}</td>
                  <td className="py-3 px-4 text-slate-800">{record.vendorName}</td>
                  <td className="py-3 px-4 text-slate-800">{record.contactPerson}<br/><span className="text-xs text-slate-500">{record.mobileNumber}</span></td>
                  <td className="py-3 px-4 text-slate-800">{record.city}</td>
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
            Showing {processedData.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, processedData.length)} of {processedData.length} entries
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
        title={`${selectedRecord ? 'Edit' : 'Add'} Vendor`}
        size="3xl"
      >
        <div className="space-y-4 px-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Code</label>
              <input type="text" value={selectedRecord ? selectedRecord.vendorCode : (nextCode || 'Auto-generating…')} disabled readOnly className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Name <span className="text-red-500">*</span></label>
              <input type="text" maxLength={LIMITS.vendorName} value={formData.vendorName} onChange={(e) => setFormData({...formData, vendorName: e.target.value})} className={inputCls(errors.vendorName)} />
              {errors.vendorName && <p className="text-red-500 text-xs mt-1">{errors.vendorName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person <span className="text-red-500">*</span></label>
              <input type="text" maxLength={LIMITS.contactPerson} value={formData.contactPerson} onChange={(e) => setFormData({...formData, contactPerson: e.target.value})} className={inputCls(errors.contactPerson)} />
              {errors.contactPerson && <p className="text-red-500 text-xs mt-1">{errors.contactPerson}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
              <input type="tel" maxLength={LIMITS.mobile} value={formData.mobileNumber} onChange={(e) => setFormData({...formData, mobileNumber: e.target.value})} className={inputCls(errors.mobileNumber)} />
              {errors.mobileNumber && <p className="text-red-500 text-xs mt-1">{errors.mobileNumber}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
              <input type="email" maxLength={LIMITS.email} value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className={inputCls(errors.email)} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
              <input type="text" maxLength={LIMITS.gst} value={formData.gstNumber} onChange={(e) => setFormData({...formData, gstNumber: e.target.value.toUpperCase()})} className={inputCls(errors.gstNumber)} />
              {errors.gstNumber && <p className="text-red-500 text-xs mt-1">{errors.gstNumber}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PAN Number</label>
              <input type="text" maxLength={LIMITS.pan} value={formData.panNumber} onChange={(e) => setFormData({...formData, panNumber: e.target.value.toUpperCase()})} className={inputCls(errors.panNumber)} />
              {errors.panNumber && <p className="text-red-500 text-xs mt-1">{errors.panNumber}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Drug License Number</label>
              <input type="text" maxLength={LIMITS.drug} value={formData.drugLicenseNumber} onChange={(e) => setFormData({...formData, drugLicenseNumber: e.target.value})} className={inputCls()} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address <span className="text-red-500">*</span></label>
            <input type="text" maxLength={LIMITS.address} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className={inputCls(errors.address)} />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City <span className="text-red-500">*</span></label>
              <input type="text" maxLength={LIMITS.location} value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className={inputCls(errors.city)} />
              {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">State <span className="text-red-500">*</span></label>
              <input type="text" maxLength={LIMITS.location} value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} className={inputCls(errors.state)} />
              {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Country <span className="text-red-500">*</span></label>
              <input type="text" maxLength={LIMITS.location} value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} className={inputCls(errors.country)} />
              {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PIN Code <span className="text-red-500">*</span></label>
              <input type="text" maxLength={LIMITS.pin} value={formData.pinCode} onChange={(e) => setFormData({...formData, pinCode: e.target.value})} className={inputCls(errors.pinCode)} />
              {errors.pinCode && <p className="text-red-500 text-xs mt-1">{errors.pinCode}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
              <select value={formData.paymentTerms} onChange={(e) => setFormData({...formData, paymentTerms: e.target.value, creditDays: paymentTermsMap[e.target.value] ?? formData.creditDays})} className={inputCls()}>
                {paymentTermsOptions.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Credit Days</label>
              <input type="number" min="0" max={LIMITS.creditMax} step="1" onKeyDown={blockIntKeys} value={formData.creditDays} onChange={(e) => setFormData({...formData, creditDays: Number(e.target.value)})} className={inputCls(errors.creditDays)} />
              {errors.creditDays && <p className="text-red-500 text-xs mt-1">{errors.creditDays}</p>}
            </div>
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
          <Button variant="filled" color="primary" onClick={handleSave} icon={Save} disabled={isSaving}>{isSaving ? 'Saving...' : (selectedRecord ? 'Update' : 'Save')}</Button>
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
              <div><span className="text-xs text-slate-400 block">Email</span><span className="text-sm font-medium">{selectedRecord.email}</span></div>
              <div><span className="text-xs text-slate-400 block">GST</span><span className="text-sm font-medium">{selectedRecord.gstNumber || '-'}</span></div>
              <div><span className="text-xs text-slate-400 block">PAN</span><span className="text-sm font-medium">{selectedRecord.panNumber || '-'}</span></div>
              <div><span className="text-xs text-slate-400 block">City</span><span className="text-sm font-medium">{selectedRecord.city}, {selectedRecord.state}</span></div>
              <div><span className="text-xs text-slate-400 block">Payment Terms</span><span className="text-sm font-medium">{selectedRecord.paymentTerms || '-'}</span></div>
              <div><span className="text-xs text-slate-400 block">Credit Days</span><span className="text-sm font-medium">{selectedRecord.creditDays}</span></div>
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
          <p className="text-slate-500 mb-6">Are you sure you want to delete <strong>{selectedRecord?.vendorName}</strong>? This action cannot be undone.</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="filled" className="bg-red-500 hover:bg-red-600 text-white border-transparent" onClick={confirmDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
