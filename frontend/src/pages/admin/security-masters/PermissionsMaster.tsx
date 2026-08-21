import { useState, useEffect } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import {
  Plus, Search, Filter, Download, Edit2, Trash2, AlertTriangle,
  Save, RefreshCw, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

const API_BASE = import.meta.env.VITE_API_URL as string;

// Module catalog — must match the Module keys gated in the sidebar/routes.
const MODULES = [
  'Dashboard', 'Organization', 'Doctor', 'Employee', 'Patient',
  'Appointment', 'Pharmacy', 'Laboratory', 'Radiology', 'Billing', 'Insurance',
  'Purchase & Inventory', 'Financial', 'Security', 'Notification', 'AI Config',
  'Audit Trail', 'Appointments',
];

interface PermissionRecord {
  id: number;
  permissionCode: string;
  role: string;
  module: string;
  subModule: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPrint: boolean;
  canExport: boolean;
  canImport: boolean;
  canApprove: boolean;
  allowApiAccess: boolean;
  allowDataExport: boolean;
  allowBulkOperations: boolean;
  allowAuditLogAccess: boolean;
  status: string;
  remarks: string;
}

type PermForm = Omit<PermissionRecord, 'id' | 'permissionCode'>;

const emptyData: PermForm = {
  role: '', module: '', subModule: '',
  canView: true, canCreate: false, canEdit: false, canDelete: false,
  canPrint: false, canExport: false, canImport: false, canApprove: false,
  allowApiAccess: false, allowDataExport: false, allowBulkOperations: false, allowAuditLogAccess: false,
  status: 'Active', remarks: '',
};

const MATRIX: { id: keyof PermForm; label: string }[] = [
  { id: 'canView', label: 'View' }, { id: 'canCreate', label: 'Create' },
  { id: 'canEdit', label: 'Edit' }, { id: 'canDelete', label: 'Delete' },
  { id: 'canPrint', label: 'Print' }, { id: 'canExport', label: 'Export' },
  { id: 'canImport', label: 'Import' }, { id: 'canApprove', label: 'Approve' },
];

const b = (v: unknown) => Boolean(v);
const mapApi = (x: Record<string, unknown>): PermissionRecord => ({
  id: x.id as number,
  permissionCode: x.permissionCode as string,
  role: x.role as string,
  module: x.module as string,
  subModule: (x.subModule as string) ?? '',
  canView: b(x.canView), canCreate: b(x.canCreate), canEdit: b(x.canEdit), canDelete: b(x.canDelete),
  canPrint: b(x.canPrint), canExport: b(x.canExport), canImport: b(x.canImport), canApprove: b(x.canApprove),
  allowApiAccess: b(x.allowApiAccess), allowDataExport: b(x.allowDataExport),
  allowBulkOperations: b(x.allowBulkOperations), allowAuditLogAccess: b(x.allowAuditLogAccess),
  status: x.status as string, remarks: (x.remarks as string) ?? '',
});

export const PermissionsMaster = () => {
  const [records, setRecords] = useState<PermissionRecord[]>([]);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [nextCode, setNextCode] = useState('');

  const [showFilters, setShowFilters] = useState(false);
  const [filterModule, setFilterModule] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PermissionRecord | null>(null);
  const [formData, setFormData] = useState<PermForm>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchPermissions = async () => {
    setIsLoading(true); setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/permissions/`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: Record<string, unknown>[] = await res.json();
      setRecords(data.map(mapApi));
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally { setIsLoading(false); }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API_BASE}/roles/`);
      if (res.ok) {
        const data = await res.json();
        setRoleOptions((Array.isArray(data) ? data : []).filter((r: Record<string, unknown>) => r.status === 'Active').map((r: Record<string, unknown>) => r.roleName as string));
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchPermissions(); fetchRoles(); }, []);

  const fetchNextCode = async () => {
    setNextCode('');
    try {
      const res = await fetch(`${API_BASE}/permissions/next-code`);
      if (res.ok) setNextCode((await res.json()).permissionCode ?? '');
    } catch { setNextCode(''); }
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!formData.role.trim()) e.role = 'Role is required';
    if (!formData.module.trim()) e.module = 'Module is required';
    if (records.some(r => r.role === formData.role && r.module === formData.module && r.id !== selectedRecord?.id))
      e.module = 'Permissions for this Role and Module already exist';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreateNew = () => {
    setSelectedRecord(null); setFormData(emptyData); setErrors({});
    setIsFormOpen(true); fetchNextCode(); fetchRoles();
  };

  const handleEdit = (record: PermissionRecord) => {
    setSelectedRecord(record);
    const { id, permissionCode, ...rest } = record;
    setFormData(rest); setErrors({}); setIsFormOpen(true); fetchRoles();
  };

  const handleDeleteRequest = (record: PermissionRecord) => { setSelectedRecord(record); setIsDeleteOpen(true); };

  const handleSaveForm = async () => {
    if (!validateForm()) return;
    setIsSaving(true); setApiError(null);
    try {
      const body = { ...formData, subModule: formData.subModule || null, remarks: formData.remarks || null };
      const res = selectedRecord
        ? await fetch(`${API_BASE}/permissions/${selectedRecord.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, updatedBy: 'Admin' }) })
        : await fetch(`${API_BASE}/permissions/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, createdBy: 'Admin' }) });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data && typeof data.detail === 'string' ? data.detail : `Save failed: ${res.status}`);
      }
      await fetchPermissions();
      setIsFormOpen(false); setSelectedRecord(null);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Save failed');
    } finally { setIsSaving(false); }
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/permissions/${selectedRecord.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      await fetchPermissions(); setIsDeleteOpen(false); setSelectedRecord(null);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Delete failed'); setIsDeleteOpen(false);
    }
  };

  const toggleAllMatrix = (value: boolean) => setFormData(prev => ({
    ...prev, canView: value, canCreate: value, canEdit: value, canDelete: value,
    canPrint: value, canExport: value, canImport: value, canApprove: value,
  }));

  const getSummary = (r: PermissionRecord) => {
    const a: string[] = [];
    if (r.canView) a.push('V'); if (r.canCreate) a.push('C'); if (r.canEdit) a.push('E'); if (r.canDelete) a.push('D');
    return a.join(' • ') || 'None';
  };

  const filteredRecords = records.filter(r => {
    const s = searchTerm.toLowerCase();
    const matchSearch = r.module.toLowerCase().includes(s) || r.role.toLowerCase().includes(s) || r.permissionCode.toLowerCase().includes(s);
    return matchSearch && (!filterModule || r.module === filterModule) && (!filterRole || r.role === filterRole);
  });

  const allRoles = Array.from(new Set([...roleOptions, ...records.map(r => r.role)].filter(Boolean)));

  const _totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const _page = Math.min(currentPage, _totalPages);
  const pagedRecords = filteredRecords.slice((_page - 1) * itemsPerPage, _page * itemsPerPage);

  const { page, setPage, pageSize, total, paged } = usePagination(allRoles);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col relative">
      {apiError && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{apiError}</span>
          <button onClick={() => setApiError(null)} className="text-red-500 hover:text-red-700 font-medium">Dismiss</button>
        </div>
      )}

      {!isFormOpen ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Permission</h1>
              <p className="text-slate-500 mt-1"></p>
            </div>
            <div className="flex gap-3">
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>Add Permission</Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Search by Code, Module, or Role..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm" />
              </div>
              <div className="flex items-center gap-2">
              <button onClick={() => setShowFilters(!showFilters)} title="Filters" className={showFilters ? "p-2 border rounded-lg transition-colors border-primary bg-primary/5 text-primary" : "p-2 border rounded-lg transition-colors border-slate-200 text-slate-500 hover:bg-slate-50"}>
                <Filter className="w-4 h-4" />
              </button>
              <button onClick={() => { setSearchTerm(''); setFilterModule(''); setFilterRole(''); }} title="Clear search & filters" className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
              <button onClick={() => exportToExcel(records, 'PermissionsMaster')} title="Export to Excel" className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
                <Download className="w-4 h-4" />
              </button>
            </div>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-b border-slate-200 bg-slate-50/50 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="">All Modules</option>
                      {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      <option value="">All Roles</option>
                      {paged.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Module</th>
                    <th className="px-4 py-3 font-medium">Core Rights</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading permissions…</td></tr>
                  ) : filteredRecords.length > 0 ? (
                    pagedRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{record.permissionCode}</td>
                        <td className="px-4 py-3 text-slate-700 font-medium">{record.role}</td>
                        <td className="px-4 py-3 font-medium text-primary">
                          {record.module}
                          {record.subModule && <div className="text-[10px] text-slate-400 font-normal">↳ {record.subModule}</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs tracking-widest">{getSummary(record)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleEdit(record)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteRequest(record)} className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No permissions found. Click "Add Permission" to grant a role access.</td></tr>
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
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{selectedRecord ? `Edit Permission: ${selectedRecord.role} · ${selectedRecord.module}` : 'Add New Permission'}</h1>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Permission Code</label>
                    <input type="text" value={selectedRecord ? selectedRecord.permissionCode : (nextCode || 'Auto-generated')} readOnly className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Role <span className="text-red-500">*</span></label>
                    <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.role ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Role</option>
                      {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Module <span className="text-red-500">*</span></label>
                    <select value={formData.module} onChange={e => setFormData({ ...formData, module: e.target.value })} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.module ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                      <option value="">Select Module</option>
                      {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    {errors.module && <p className="text-red-500 text-xs mt-1">{errors.module}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sub Module</label>
                    <input type="text" maxLength={100} value={formData.subModule} onChange={e => setFormData({ ...formData, subModule: e.target.value })} placeholder="Optional" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>

              <section>
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                  <h3 className="text-lg font-bold text-slate-800">Permission Matrix</h3>
                  <div className="flex gap-2 text-sm">
                    <button type="button" onClick={() => toggleAllMatrix(true)} className="text-primary hover:underline">Select All</button>
                    <span className="text-slate-300">|</span>
                    <button type="button" onClick={() => toggleAllMatrix(false)} className="text-slate-500 hover:underline">Clear All</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {MATRIX.map((perm) => (
                    <div key={perm.id} className="flex items-center gap-3">
                      <input type="checkbox" id={perm.id} checked={formData[perm.id] as boolean} onChange={e => setFormData({ ...formData, [perm.id]: e.target.checked })} className="w-5 h-5 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                      <label htmlFor={perm.id} className="font-medium text-slate-700">{perm.label}</label>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Advanced Permissions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  {([
                    { id: 'allowApiAccess', label: 'Allow API Access' },
                    { id: 'allowDataExport', label: 'Allow Advanced Data Export' },
                    { id: 'allowBulkOperations', label: 'Allow Bulk Operations' },
                    { id: 'allowAuditLogAccess', label: 'Allow Audit Log Access' },
                  ] as { id: keyof PermForm; label: string }[]).map(a => (
                    <div key={a.id} className="flex items-center gap-3">
                      <input type="checkbox" id={a.id} checked={formData[a.id] as boolean} onChange={e => setFormData({ ...formData, [a.id]: e.target.checked })} className="w-4 h-4 text-primary bg-slate-100 border-slate-300 rounded focus:ring-primary" />
                      <label htmlFor={a.id} className="text-sm font-medium text-slate-700">{a.label}</label>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">System Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                    <input type="text" maxLength={500} value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </section>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <Button variant="outline" color="secondary" onClick={() => setFormData(emptyData)} icon={RefreshCw}>Reset</Button>
              <div className="flex gap-3">
                <Button variant="outline" color="secondary" onClick={() => { setIsFormOpen(false); setSelectedRecord(null); }}>Cancel</Button>
                <Button variant="filled" color="primary" onClick={handleSaveForm} icon={Save} disabled={isSaving}>{isSaving ? 'Saving…' : selectedRecord ? 'Update' : 'Save'}</Button>
              </div>
            </div>
          </div>
        </>
      )}

      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirm Deletion" maxWidth="sm">
        <div className="p-1">
          <div className="flex items-center gap-4 mb-6 text-amber-600 bg-amber-50 p-4 rounded-xl">
            <AlertTriangle className="w-8 h-8 shrink-0" />
            <p className="text-sm font-medium">Delete permission <strong>{selectedRecord?.permissionCode}</strong> ({selectedRecord?.role} · {selectedRecord?.module})? This action cannot be undone.</p>
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


