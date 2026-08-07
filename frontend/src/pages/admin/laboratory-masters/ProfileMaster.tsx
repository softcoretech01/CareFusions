import { useState } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { Plus, Search, Download, Edit2, Trash2, AlertTriangle, Save, RefreshCw, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

interface ProfileRecord {
  id: number;
  profileCode: string;
  profileName: string;
  department: string;
  tests: string[]; // List of test codes or names
  price: string;
  status: string;
  remarks: string;
}

const emptyData: Omit<ProfileRecord, 'id'> = {
  profileCode: '',
  profileName: '',
  department: '',
  tests: [],
  price: '',
  status: 'Active',
  remarks: ''
};

const mockData: ProfileRecord[] = [
  {
    id: 1,
    profileCode: 'PRF-001',
    profileName: 'Lipid Profile',
    department: 'Biochemistry',
    tests: ['Cholesterol', 'Triglycerides', 'HDL', 'LDL'],
    price: '1200.00',
    status: 'Active',
    remarks: 'Fasting required'
  },
  {
    id: 2,
    profileCode: 'PRF-002',
    profileName: 'Liver Function Test (LFT)',
    department: 'Biochemistry',
    tests: ['Bilirubin Total', 'Bilirubin Direct', 'SGOT', 'SGPT', 'ALP'],
    price: '950.00',
    status: 'Active',
    remarks: ''
  }
];

const availableTests = [
  'Complete Blood Count (CBC)', 'Fasting Blood Sugar (FBS)', 
  'Cholesterol', 'Triglycerides', 'HDL', 'LDL', 
  'Bilirubin Total', 'Bilirubin Direct', 'SGOT', 'SGPT', 'ALP'
];
const departments = ['Pathology', 'Microbiology', 'Biochemistry'];

export const ProfileMaster = () => {
  const [records, setRecords] = useState<ProfileRecord[]>(mockData);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ProfileRecord | null>(null);
  const [formData, setFormData] = useState<Omit<ProfileRecord, 'id'>>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Test selection states
  const [testSearch, setTestSearch] = useState('');

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.profileCode.trim()) newErrors.profileCode = 'Profile Code is required';
    if (!formData.profileName.trim()) newErrors.profileName = 'Profile Name is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (formData.tests.length === 0) newErrors.tests = 'At least one test must be selected';
    if (!formData.price.trim()) newErrors.price = 'Price is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null);
    setFormData(emptyData);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record: ProfileRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: ProfileRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const handleSaveForm = () => {
    if (!validateForm()) return;

    if (selectedRecord) {
      setRecords(records.map(r => r.id === selectedRecord.id ? { ...r, ...formData } : r));
    } else {
      const newId = Math.max(...records.map(r => r.id), 0) + 1;
      setRecords([...records, { id: newId, ...formData }]);
    }
    setIsFormOpen(false);
  };

  const confirmDelete = () => {
    if (selectedRecord) {
      setRecords(records.filter(r => r.id !== selectedRecord.id));
      setIsDeleteOpen(false);
    }
  };

  const toggleTest = (test: string) => {
    setFormData(prev => ({
      ...prev,
      tests: prev.tests.includes(test) 
        ? prev.tests.filter(t => t !== test)
        : [...prev.tests, test]
    }));
  };

  const filteredRecords = records.filter(record => 
    record.profileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.profileCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const _totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const _page = Math.min(currentPage, _totalPages);
  const pagedRecords = filteredRecords.slice((_page - 1) * itemsPerPage, _page * itemsPerPage);

  const { page, setPage, pageSize, total, paged } = usePagination(departments);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col relative">
      {!isFormOpen ? (
        <>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Test Profile Master</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>
            <div className="flex gap-3">
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
                Add Profile
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Profile Name or Code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSearchTerm('')} title="Clear search & filters" className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <button onClick={() => exportToExcel(records, 'ProfileMaster')} title="Export to Excel" className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Profile Code</th>
                    <th className="px-4 py-3 font-medium">Profile Name</th>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium">Included Tests</th>
                    <th className="px-4 py-3 font-medium text-right">Price (₹)</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    pagedRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{record.profileCode}</td>
                        <td className="px-4 py-3 font-bold text-slate-700">{record.profileName}</td>
                        <td className="px-4 py-3 text-slate-600">{record.department}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {record.tests.slice(0, 2).map(t => (
                              <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">{t}</span>
                            ))}
                            {record.tests.length > 2 && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold">+{record.tests.length - 2} more</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">{record.price}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            record.status === 'Active' 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleEdit(record)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteRequest(record)} className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No profiles found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        <Pagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} />
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-100 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <span>Show</span>
                <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>entries</span>
                <span className="text-slate-400">· {filteredRecords.length} total</span>
              </div>
              <div className="flex items-center gap-3">
                <span>Page {_page} of {_totalPages}</span>
                <div className="flex gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={_page <= 1} className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">Prev</button>
                  <button onClick={() => setCurrentPage(p => Math.min(_totalPages, p + 1))} disabled={_page >= _totalPages} className="px-3 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {selectedRecord ? `Edit Profile: ${selectedRecord.profileName}` : 'Add New Profile'}
              </h1>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Profile Code <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.profileCode} onChange={e => setFormData({...formData, profileCode: e.target.value})} maxLength={10} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm ${errors.profileCode ? 'border-red-300' : 'border-slate-200'}`} />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Profile Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.profileName} onChange={e => setFormData({...formData, profileName: e.target.value})} maxLength={50} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm ${errors.profileName ? 'border-red-300' : 'border-slate-200'}`} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department <span className="text-red-500">*</span></label>
                    <select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm ${errors.department ? 'border-red-300' : 'border-slate-200'}`}>
                      <option value="">Select Department</option>
                      {paged.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Price (₹) <span className="text-red-500">*</span></label>
                    <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} maxLength={50} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm ${errors.price ? 'border-red-300' : 'border-slate-200'}`} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                  <h3 className="text-lg font-bold text-slate-800">Included Tests <span className="text-red-500">*</span></h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <input type="text" placeholder="Search tests..." value={testSearch} onChange={e => setTestSearch(e.target.value)} className="w-64 pl-8 pr-3 py-1.5 border rounded-lg text-xs bg-slate-50" />
                  </div>
                </div>
                {errors.tests && <p className="text-red-500 text-xs mb-3 font-bold">{errors.tests}</p>}
                
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {availableTests.filter(t => t.toLowerCase().includes(testSearch.toLowerCase())).map(test => (
                      <label key={test} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${formData.tests.includes(test) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-200'}`}>
                        <input type="checkbox" checked={formData.tests.includes(test)} onChange={() => toggleTest(test)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                        <span className="text-sm font-medium text-slate-700">{test}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {formData.tests.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-500 self-center">Selected:</span>
                    {formData.tests.map(test => (
                      <span key={test} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                        {test} <button onClick={() => toggleTest(test)} className="hover:text-blue-900"><X className="w-3 h-3"/></button>
                      </span>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <Button variant="outline" color="secondary" onClick={() => setFormData(emptyData)} icon={RefreshCw}>
                Reset
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" color="secondary" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button variant="filled" color="primary" onClick={handleSaveForm} icon={Save}>
                  {selectedRecord ? 'Update' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirm Deletion" maxWidth="sm">
        <div className="p-1">
          <div className="flex items-center gap-4 mb-6 text-amber-600 bg-amber-50 p-4 rounded-xl">
            <AlertTriangle className="w-8 h-8 shrink-0" />
            <p className="text-sm font-medium">
              Are you sure you want to delete <strong>{selectedRecord?.profileName}</strong>? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" color="secondary" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="filled" color="danger" onClick={confirmDelete}>Confirm Delete</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};
