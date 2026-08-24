import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Download, Edit2, Trash2, AlertTriangle, X, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Pagination } from '../../../components/ui/Pagination';
import { usePagination } from '../../../hooks/usePagination';
import { exportToExcel } from '../../../utils/exportToExcel';
import {
  lettersOnly, digitsOnly, freeText, emailChars, isValidEmail, isValidPhone, LIMITS,
} from '../../../utils/inputRules';

export interface HousekeepingRecord {
  id: number;
  housekeepingCode: string;
  name: string;
  gender: string;
  hospital: string;
  branch: string;
  assignedArea: string;
  mobile: string;
  email: string;
  address: string;
  joiningDate: string;
  shift: string;
  experience: string;
  manager: string;
  remarks: string;
  createdBy?: string;
  createdDate?: string;
  modifiedBy?: string;
  modifiedDate?: string;
}

const SHIFTS = ['Morning', 'Afternoon', 'Night', 'General', 'Rotational'];

const emptyData: Omit<HousekeepingRecord, 'id'> = {
  housekeepingCode: '', name: '', gender: '',
  hospital: '', branch: '', assignedArea: '', mobile: '', email: '',
  address: '', joiningDate: '', shift: '', experience: '', manager: '', remarks: '',
};

const API_BASE = import.meta.env.VITE_API_URL as string;

const mapApiToRecord = (item: any): HousekeepingRecord => ({
  id:               item.id,
  housekeepingCode: item.housekeepingCode,
  name:             item.name,
  gender:           item.gender || '',
  hospital:         item.hospital || '',
  branch:           item.branch || '',
  assignedArea:     item.assignedArea,
  mobile:           item.mobile,
  email:            item.email || '',
  address:          item.address || '',
  joiningDate:      item.joiningDate || '',
  shift:            item.shift,
  experience:       item.experience === null || item.experience === undefined ? '' : String(item.experience),
  manager:          item.manager || '',
  remarks:          item.remarks || '',
  createdBy:        item.createdBy,
  createdDate:      item.createdDate,
  modifiedBy:       item.modifiedBy,
  modifiedDate:     item.modifiedDate,
});

const FIELD = 'w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';
const LABEL = 'block text-xs font-semibold text-slate-600 mb-1';

export const HousekeepingMaster = () => {
  const [records, setRecords] = useState<HousekeepingRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
    const [filterShift, setFilterShift] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HousekeepingRecord | null>(null);
  const [formData, setFormData] = useState<Omit<HousekeepingRecord, 'id'>>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);


  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/housekeeping/`);
      if (!res.ok) throw new Error('Failed to load housekeeping staff');
      setRecords((await res.json()).map(mapApiToRecord));
    } catch (err: any) {
      setApiError(err.message || 'Failed to load housekeeping staff');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const validateForm = () => {
    const next: Record<string, string> = {};
    if (!formData.name.trim()) next.name = 'Staff Name is required';
    if (!formData.assignedArea.trim()) next.assignedArea = 'Assigned Area is required';
    if (!formData.shift) next.shift = 'Shift is required';

    if (!formData.mobile.trim()) next.mobile = 'Mobile is required';
    else if (!isValidPhone(formData.mobile)) next.mobile = 'Mobile must be exactly 10 digits';

    if (formData.email && !isValidEmail(formData.email)) next.email = 'Enter a valid email address';

    if (formData.experience !== '') {
      const exp = Number(formData.experience);
      if (!(exp >= 0)) next.experience = 'Experience cannot be negative';
      else if (exp > 60) next.experience = 'Experience cannot exceed 60 years';
    }
    // A future joining date would put the person on the roster before they start.


    if (records.some(r => r.mobile === formData.mobile.trim() && r.id !== selectedRecord?.id)) {
      next.mobile = 'Mobile number is already registered';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreateNew = async () => {
    setSelectedRecord(null);
    setErrors({});
    let code = '';
    try {
      const res = await fetch(`${API_BASE}/housekeeping/next-code`);
      if (res.ok) code = (await res.json()).housekeepingCode || '';
    } catch { /* the form works without the preview */ }
    setFormData({ ...emptyData, housekeepingCode: code });
    setIsFormOpen(true);
  };

  const handleEdit = (record: HousekeepingRecord) => {
    setSelectedRecord(record);
    setFormData(record);
    setErrors({});
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: HousekeepingRecord) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedRecord) return;
    setApiError(null);
    try {
      const res = await fetch(`${API_BASE}/housekeeping/${selectedRecord.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed to delete staff member');
      await fetchStaff();
      setIsDeleteOpen(false);
      setSelectedRecord(null);
    } catch (err: any) {
      setIsDeleteOpen(false);
      setApiError(err.message);
    }
  };

  const handleSaveForm = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const payload = {
        name:         formData.name.trim(),
        gender:       formData.gender || null,
        hospital:     formData.hospital || null,
        branch:       formData.branch || null,
        assignedArea: formData.assignedArea.trim(),
        mobile:       formData.mobile.trim(),
        email:        formData.email.trim() || null,
        address:      formData.address.trim() || null,
        joiningDate:  formData.joiningDate || null,
        shift:        formData.shift,
        experience:   formData.experience === '' ? null : Number(formData.experience),
        manager:      formData.manager.trim() || null,
        remarks:      formData.remarks.trim() || null,
        ...(selectedRecord ? { modifiedBy: 'Admin' } : { createdBy: 'Admin' }),
      };
      const res = await fetch(
        selectedRecord ? `${API_BASE}/housekeeping/${selectedRecord.id}` : `${API_BASE}/housekeeping/`,
        { method: selectedRecord ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload) }
      );
      if (!res.ok) {
        const body = await res.json();
        throw new Error(Array.isArray(body.detail)
          ? body.detail.map((d: any) => d.msg).join(', ')
          : body.detail || 'Failed to save staff member');
      }
      await fetchStaff();
      setIsFormOpen(false);
    } catch (err: any) {
      setErrors(prev => ({ ...prev, form: err.message }));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRecords = records.filter(r => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      r.name.toLowerCase().includes(q) ||
      r.housekeepingCode.toLowerCase().includes(q) ||
      r.assignedArea.toLowerCase().includes(q) ||
      r.mobile.includes(q);
    return matchesSearch
      && (!filterShift || r.shift === filterShift);
  });

  const { page, setPage, pageSize, total, paged } = usePagination(filteredRecords);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col relative"
    >
      {!isFormOpen ? (
        <>
          {apiError && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Housekeeping</h1>
              <p className="text-slate-500 text-xs">Housekeeping staff, their shift and assigned area</p>
            </div>
            <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
              Add Staff
            </Button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Name, Code, Area or Mobile..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <select value={filterShift} onChange={(e) => setFilterShift(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">All Shifts</option>
                  {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={() => { setSearchTerm(''); setFilterShift(''); }} title="Clear search & filters" className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <button onClick={() => exportToExcel(records, 'HousekeepingMaster')} title="Export to Excel" className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 sticky top-0 backdrop-blur-sm z-10">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-16">S.No</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-24">Code</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Staff</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Area</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Shift</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paged.map((row, index) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-slate-500">
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-500">{row.housekeepingCode}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-bold text-slate-900">{row.name}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{row.assignedArea}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{row.shift}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-700">{row.mobile}</div>
                        {row.email && <div className="text-xs text-slate-500">{row.email}</div>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(row)} title="Edit" className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteRequest(row)} title="Delete" className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paged.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        {isLoading ? 'Loading housekeeping staff...' : 'No housekeeping staff found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} />
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {selectedRecord ? `Edit Staff: ${selectedRecord.name}` : 'Add Housekeeping Staff'}
              </h1>
              <p className="text-slate-500 text-xs">Fill in the staff details</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 overflow-auto p-5">
            {errors.form && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errors.form}</span>
              </div>
            )}

            <section className="mb-5">
              <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-1.5">Identity</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className={LABEL}>Code</label>
                  {/* Generated by the database on insert, so it is never editable. */}
                  <input type="text" value={formData.housekeepingCode} readOnly placeholder="Auto-generated"
                         className={`${FIELD} bg-slate-100 text-slate-500 border-slate-200`} />
                </div>
                <div>
                  <label className={LABEL}>Staff Name <span className="text-red-500">*</span></label>
                  {/* Letters and spaces only, per the field rules. */}
                  <input type="text" value={formData.name}
                         onChange={e => setFormData({ ...formData, name: lettersOnly(e.target.value, LIMITS.name) })}
                         placeholder="Maria Fernandes"
                         className={`${FIELD} ${errors.name ? 'border-red-300' : 'border-slate-200'}`} />
                  {errors.name && <p className="text-red-500 text-[11px] mt-0.5">{errors.name}</p>}
                </div>
                <div>
                  <label className={LABEL}>Gender</label>
                  <select value={formData.gender}
                          onChange={e => setFormData({ ...formData, gender: e.target.value })}
                          className={`${FIELD} border-slate-200`}>
                    <option value="">Not specified</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="mb-5">
              <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-1.5">Posting</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className={LABEL}>Assigned Area <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.assignedArea}
                         onChange={e => setFormData({ ...formData, assignedArea: freeText(e.target.value, 150) })}
                         placeholder="Ward A - Floor 2"
                         className={`${FIELD} ${errors.assignedArea ? 'border-red-300' : 'border-slate-200'}`} />
                  {errors.assignedArea && <p className="text-red-500 text-[11px] mt-0.5">{errors.assignedArea}</p>}
                </div>
                <div>
                  <label className={LABEL}>Shift <span className="text-red-500">*</span></label>
                  <select value={formData.shift}
                          onChange={e => setFormData({ ...formData, shift: e.target.value })}
                          className={`${FIELD} ${errors.shift ? 'border-red-300' : 'border-slate-200'}`}>
                    <option value="">Select Shift</option>
                    {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.shift && <p className="text-red-500 text-[11px] mt-0.5">{errors.shift}</p>}
                </div>
              </div>
            </section>

            <section className="mb-5">
              <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-1.5">Contact & Service</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className={LABEL}>Mobile <span className="text-red-500">*</span></label>
                  {/* Digits only, capped at 10 so an over-long number cannot be typed. */}
                  <input type="text" inputMode="numeric" value={formData.mobile}
                         onChange={e => setFormData({ ...formData, mobile: digitsOnly(e.target.value, 10) })}
                         placeholder="9876543210"
                         className={`${FIELD} ${errors.mobile ? 'border-red-300' : 'border-slate-200'}`} />
                  {errors.mobile && <p className="text-red-500 text-[11px] mt-0.5">{errors.mobile}</p>}
                </div>
                <div>
                  <label className={LABEL}>Email</label>
                  <input type="text" value={formData.email}
                         onChange={e => setFormData({ ...formData, email: emailChars(e.target.value, LIMITS.email) })}
                         placeholder="name@carefusions.in"
                         className={`${FIELD} ${errors.email ? 'border-red-300' : 'border-slate-200'}`} />
                  {errors.email && <p className="text-red-500 text-[11px] mt-0.5">{errors.email}</p>}
                </div>
                <div>
                  <label className={LABEL}>Experience (years)</label>
                  {/* Digits only: a positive number is the only meaningful value. */}
                  <input type="text" inputMode="numeric" value={formData.experience}
                         onChange={e => setFormData({ ...formData, experience: digitsOnly(e.target.value, 2) })}
                         placeholder="5"
                         className={`${FIELD} ${errors.experience ? 'border-red-300' : 'border-slate-200'}`} />
                  {errors.experience && <p className="text-red-500 text-[11px] mt-0.5">{errors.experience}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className={LABEL}>Address</label>
                  <input type="text" value={formData.address}
                         onChange={e => setFormData({ ...formData, address: freeText(e.target.value, 255) })}
                         className={`${FIELD} border-slate-200`} />
                </div>
                <div>
                  <label className={LABEL}>Reporting Manager</label>
                  <input type="text" value={formData.manager}
                         onChange={e => setFormData({ ...formData, manager: lettersOnly(e.target.value, LIMITS.name) })}
                         className={`${FIELD} border-slate-200`} />
                </div>
                <div className="md:col-span-4">
                  <label className={LABEL}>Remarks</label>
                  <textarea rows={2} value={formData.remarks}
                            onChange={e => setFormData({ ...formData, remarks: freeText(e.target.value, LIMITS.remarks) })}
                            className={`${FIELD} border-slate-200 resize-none`} />
                </div>
              </div>
            </section>

            {selectedRecord && (
              <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs text-slate-500">
                <div>
                  <span className="block font-medium text-slate-700 mb-0.5">Created By</span>
                  {selectedRecord.createdBy || 'System'} • {selectedRecord.createdDate?.slice(0, 10) || 'N/A'}
                </div>
                <div>
                  <span className="block font-medium text-slate-700 mb-0.5">Last Updated</span>
                  {selectedRecord.modifiedBy || '-'} • {selectedRecord.modifiedDate?.slice(0, 10) || '-'}
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" color="secondary" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button variant="filled" color="primary" icon={Save} isLoading={isSaving} onClick={handleSaveForm}>
                {selectedRecord ? 'Save Changes' : 'Create Record'}
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm Deletion"
        maxWidth="sm"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Record</h3>
          <p className="text-slate-500 text-sm mb-6">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-slate-700">{selectedRecord?.name}</span>?
            This action cannot be undone.
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
