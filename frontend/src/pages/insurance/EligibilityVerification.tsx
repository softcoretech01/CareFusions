import { useState } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { Search, CheckCircle, XCircle, Shield, Plus, X, AlertTriangle, Edit, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePatients } from '../../contexts/PatientContext';
import { useInsurance, type Policy } from '../../contexts/InsuranceContext';
import { alphanumeric, upperCode, digitsOnly, decimalOnly, LIMITS } from '../../utils/inputRules';
import { DateFilter } from '../../components/ui/DateFilter';

const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN')}`;

/** A policy is only usable if it is Active AND has not passed its validity date. */
const isExpired = (p: Policy) =>
  p.status === 'Expired' || (!!p.validUntil && new Date(p.validUntil) < new Date(new Date().toDateString()));

export const EligibilityVerification = () => {
  const { policies, providers, savePolicy, loading } = useInsurance();
  const { patients } = usePatients();

  const today = new Date().toISOString().split('T')[0];
  const firstDay = `${today.split('-')[0]}-${today.split('-')[1]}-01`;

  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  
  const [dateFrom, setDateFrom] = useState(firstDay);
  const [dateTo, setDateTo] = useState(today);
  const [appliedDateFrom, setAppliedDateFrom] = useState(firstDay);
  const [appliedDateTo, setAppliedDateTo] = useState(today);

  const [selected, setSelected] = useState<Policy | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Controls the UHID patient-picker dropdown in the Add-Insurance modal.
  const [uhidOpen, setUhidOpen] = useState(false);
  const [form, setForm] = useState({
    policyId: null as number | null,
    uhid: '', name: '', providerId: '', insurer: '',
    policyNumber: '', validUntil: '', sumInsured: '',
    copayPercentage: '10', deductible: '0',
  });

  const handleSearch = () => {
    setAppliedSearch(search);
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
  };

  const handleReset = () => {
    setDateFrom(firstDay);
    setDateTo(today);
    setSearch('');
    setAppliedSearch('');
    setAppliedDateFrom(firstDay);
    setAppliedDateTo(today);
  };

  // Table filter — matches name, UHID or policy number, and optionally validUntil date
  const filtered = policies.filter(p => {
    const s = appliedSearch.trim().toLowerCase();
    const matchesSearch = !s || p.patientName.toLowerCase().includes(s)
      || p.uhid.toLowerCase().includes(s)
      || p.policyNumber.toLowerCase().includes(s);
      
    let matchesDate = true;
    if (appliedDateFrom && appliedDateTo && p.validUntil) {
      const pDate = p.validUntil.substring(0, 10);
      matchesDate = pDate >= appliedDateFrom && pDate <= appliedDateTo;
    }

    return matchesSearch && matchesDate;
  });

  // The Add-Insurance UHID field is a picker, not a free-text box: it lists
  // registered patients who do NOT already have a policy on file, so you can
  // pick a patient to insure but can't add a duplicate policy to an insured one.
  const insuredUhids = new Set(policies.map(p => p.uhid.toLowerCase()));
  const pickablePatients = patients.filter(p => p.uhid && !insuredUhids.has(p.uhid.toLowerCase()));

  // Picking a patient fills both UHID and name; the name field is read-only
  // because it always comes from the selected patient's registration record.
  const selectPatient = (uhid: string, name: string) => {
    const patient = patients.find(p => p.uhid === uhid);
    let autoProviderId = '';
    if (patient?.insuranceProviderId) {
      const provider = providers.find(p => p.providerId.toString() === patient.insuranceProviderId?.toString() || p.providerName === patient.insuranceProviderId);
      if (provider) {
        autoProviderId = provider.providerId.toString();
      }
    }
    
    setForm(prev => ({ 
      ...prev, 
      uhid, 
      name,
      providerId: autoProviderId || prev.providerId,
      policyNumber: patient?.policyNumber || prev.policyNumber
    }));
    setErrors(prev => ({ ...prev, uhid: '', name: '' }));
    setUhidOpen(false);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.uhid.trim()) e.uhid = 'UHID is required';
    if (!form.name.trim()) e.name = 'Patient name is required';
    else if (!/^[A-Za-z\s.'-]+$/.test(form.name)) e.name = 'Letters and spaces only';
    if (!form.providerId) e.providerId = 'Insurance Provider is required';
    if (!form.policyNumber.trim()) e.policyNumber = 'Policy Number is required';
    else if (!/^[A-Za-z0-9-]+$/.test(form.policyNumber)) e.policyNumber = 'Alphanumeric and hyphens only';
    if (!form.sumInsured.trim()) e.sumInsured = 'Sum Insured is required';
    else if (isNaN(Number(form.sumInsured)) || Number(form.sumInsured) <= 0) e.sumInsured = 'Must be > 0';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSavePolicy = async () => {
    if (!validate()) return;
    setSaving(true);
    
    // Find the provider name based on the selected ID
    const selectedProvider = providers.find(p => p.providerId.toString() === form.providerId);
    
    const policyPayload = {
      ...form,
      insurer: selectedProvider?.providerName || form.insurer,
      providerId: parseInt(form.providerId),
      sumInsured: parseFloat(form.sumInsured),
      copayPercentage: parseFloat(form.copayPercentage || '0'),
      deductible: parseFloat(form.deductible || '0')
    };
    
    const success = await savePolicy(policyPayload);
    setSaving(false);
    
    if (success) {
      toast.success(form.policyId ? 'Policy updated successfully' : 'Policy saved successfully');
      setShowAddModal(false);
      setForm({ policyId: null, uhid: '', name: '', providerId: '', insurer: '', policyNumber: '', validUntil: '', sumInsured: '', copayPercentage: '10', deductible: '0' });
    } else {
      toast.error('Failed to save policy. The policy number may already exist.');
    }
  };

  const inputCls = (field: string) =>
    `w-full px-3 py-1.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary ${
      errors[field] ? 'border-red-400' : 'border-slate-200 focus:border-primary'
    }`;

  const { page, setPage, pageSize, total, paged } = usePagination(filtered);

  // Patients matching what's typed in the UHID picker (by UHID or name).
  const uhidQuery = form.uhid.trim().toLowerCase();
  const uhidMatches = pickablePatients
    .filter(p =>
      !uhidQuery ||
      p.uhid.toLowerCase().includes(uhidQuery) ||
      (p.patientName || '').toLowerCase().includes(uhidQuery))
    .slice(0, 50);

  return (
    <div className="space-y-4 relative h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Eligibility &amp; Verification</h1>
        </div>
        <button
          onClick={() => {
            setForm({ policyId: null, uhid: '', name: '', providerId: '', insurer: '', policyNumber: '', validUntil: '', sumInsured: '', copayPercentage: '10', deductible: '0' });
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm text-sm w-max"
        >
          <Plus className="w-4 h-4" />
          Add Insurance
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col flex-1">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Policy..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <DateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onSearch={handleSearch}
            onReset={handleReset}
          />
        </div>

        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-slate-800">Registered Policies</h3>
          <span className="text-xs text-slate-500">{filtered.length} of {policies.length}</span>
        </div>
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 z-10 shadow-sm border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left">Patient</th>
                <th className="px-5 py-3 text-left">Insurer</th>
                <th className="px-5 py-3 text-left">Policy Number</th>
                <th className="px-5 py-3 text-right">Balance</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map(row => (
                <tr key={row.policyId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-bold text-slate-800">{row.patientName}</div>
                    <div className="text-xs text-slate-500">{row.uhid}</div>
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-600">{row.insurerName}</td>
                  <td className="px-5 py-3 text-slate-600">{row.policyNumber}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-800">{inr(row.balanceAmount)}</td>
                  <td className="px-5 py-3">
                    {isExpired(row) ? (
                      <span className="px-2.5 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-lg flex items-center gap-1 w-max">
                        <XCircle className="w-3 h-3" /> Expired
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg flex items-center gap-1 w-max">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setForm({
                            policyId: row.policyId,
                            uhid: row.uhid,
                            name: row.patientName,
                            providerId: String(row.providerId || ''),
                            insurer: row.insurerName,
                            policyNumber: row.policyNumber,
                            validUntil: row.validUntil ? row.validUntil.split('T')[0] : '',
                            sumInsured: String(row.sumInsured),
                            copayPercentage: String(row.copayPercentage),
                            deductible: String(row.deductible),
                          });
                          setShowAddModal(true);
                        }}
                        className="text-slate-400 hover:text-blue-600 transition-colors"
                        title="Edit Policy"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelected(row)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    {loading ? 'Loading policies...'
                      : policies.length === 0 ? 'No policies recorded yet. Use Add Insurance to record one.'
                      : 'No policies match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="shrink-0">
          <Pagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} />
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 p-2 hover:bg-slate-100 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center pr-14">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{selected.insurerName}</h2>
                  <p className="text-xs font-medium text-slate-500">{selected.planName || 'Standard Plan'}</p>
                </div>
              </div>
              <span className={`px-3 py-1 text-sm font-bold rounded-lg flex items-center gap-1 ${
                isExpired(selected) ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-700'
              }`}>
                {isExpired(selected) ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                {isExpired(selected) ? 'Expired' : 'Active'} Policy
              </span>
            </div>

            {isExpired(selected) && (
              <div className="mx-5 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs font-medium text-amber-800">
                  This policy is not valid for cashless treatment. Collect payment or seek fresh authorisation.
                </p>
              </div>
            )}

            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-0.5">Patient Name</p>
                <p className="font-bold text-slate-800">{selected.patientName}</p>
                <p className="text-xs text-slate-400 mt-0.5">{selected.uhid}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-0.5">Policy Number</p>
                <p className="font-bold text-slate-800">{selected.policyNumber}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-0.5">Valid Until</p>
                <p className="font-bold text-slate-800">
                  {selected.validUntil ? new Date(selected.validUntil).toLocaleDateString('en-GB') : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-0.5">Network Status</p>
                <p className={`font-bold flex items-center gap-1 ${selected.networkHospital ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {selected.networkHospital
                    ? <><CheckCircle className="w-4 h-4" /> Network Hospital</>
                    : <><XCircle className="w-4 h-4" /> Non-Network</>}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-0.5">Total Sum Insured</p>
                <p className="font-bold text-slate-800">{inr(selected.sumInsured)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-0.5">Available Balance</p>
                <p className="font-bold text-primary text-lg">{inr(selected.balanceAmount)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-0.5">Co-pay</p>
                <p className="font-bold text-slate-800">{selected.copayPercentage}%</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-0.5">Deductible</p>
                <p className="font-bold text-slate-800">{inr(selected.deductible)}</p>
              </div>
            </div>

            {/* What the hospital can actually expect to recover on this policy. */}
            <div className="px-5 pb-5">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Estimated payable (after co-pay &amp; deductible)
                </span>
                <span className="font-bold text-slate-800">
                  {inr(Math.max(
                    (selected.balanceAmount - selected.deductible) * (1 - (selected.copayPercentage || 0) / 100),
                    0
                  ))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Policy Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                {form.policyId ? 'Edit Policy Details' : 'Register New Policy'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    UHID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.uhid}
                    onChange={(e) => {
                      const v = upperCode(e.target.value);
                      setForm({ ...form, uhid: v, name: '' });
                      setUhidOpen(true);
                      setErrors({ ...errors, uhid: '' });
                    }}
                    onFocus={() => setUhidOpen(true)}
                    onBlur={() => setTimeout(() => setUhidOpen(false), 200)}
                    disabled={!!form.policyId}
                    placeholder="Search UHID or Name"
                    className={inputCls('uhid')}
                    maxLength={LIMITS.UHID}
                  />
                  {errors.uhid && <span className="text-xs text-red-500 mt-1">{errors.uhid}</span>}
                  
                  {uhidOpen && !form.policyId && uhidMatches.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                      {uhidMatches.map(p => (
                        <div
                          key={p.uhid}
                          className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                          onClick={() => selectPatient(p.uhid, p.patientName)}
                        >
                          <div className="font-bold text-sm text-slate-800">{p.patientName}</div>
                          <div className="text-xs text-slate-500">{p.uhid}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {uhidOpen && !form.policyId && uhidMatches.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-3 text-sm text-slate-500 text-center">
                      {pickablePatients.length === 0 
                        ? 'All patients already have policies.'
                        : 'No matching uninsured patients found.'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    Patient Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    disabled
                    className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                    placeholder="Auto-filled from UHID"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    Insurance Provider / TPA <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.providerId}
                    onChange={(e) => {
                      setForm({ ...form, providerId: e.target.value });
                      setErrors({ ...errors, providerId: '' });
                    }}
                    className={inputCls('providerId')}
                  >
                    <option value="">Select Provider...</option>
                    {providers.map(p => (
                      <option key={p.providerId} value={p.providerId}>
                        {p.providerName} {p.cashlessFacility ? '(Cashless)' : '(Reimbursement)'}
                      </option>
                    ))}
                  </select>
                  {errors.providerId && <span className="text-xs text-red-500 mt-1">{errors.providerId}</span>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    Policy Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.policyNumber}
                    onChange={(e) => {
                      const v = alphanumeric(upperCode(e.target.value));
                      setForm({ ...form, policyNumber: v });
                      setErrors({ ...errors, policyNumber: '' });
                    }}
                    className={inputCls('policyNumber')}
                    maxLength={LIMITS.POLICY_NO}
                  />
                  {errors.policyNumber && <span className="text-xs text-red-500 mt-1">{errors.policyNumber}</span>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={form.validUntil}
                    onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                    className={inputCls('validUntil')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    Sum Insured (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.sumInsured}
                    onChange={(e) => {
                      const v = decimalOnly(e.target.value);
                      setForm({ ...form, sumInsured: v });
                      setErrors({ ...errors, sumInsured: '' });
                    }}
                    className={inputCls('sumInsured')}
                    maxLength={LIMITS.AMOUNT}
                  />
                  {errors.sumInsured && <span className="text-xs text-red-500 mt-1">{errors.sumInsured}</span>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    Co-pay %
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.copayPercentage}
                      onChange={(e) => {
                        let v = digitsOnly(e.target.value);
                        if (parseInt(v) > 100) v = '100';
                        setForm({ ...form, copayPercentage: v });
                      }}
                      className={inputCls('copayPercentage')}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    Deductible (₹)
                  </label>
                  <input
                    type="text"
                    value={form.deductible}
                    onChange={(e) => setForm({ ...form, deductible: decimalOnly(e.target.value) })}
                    className={inputCls('deductible')}
                    maxLength={LIMITS.AMOUNT}
                  />
                  <p className="text-xs text-slate-500 mt-1">Amount the patient must pay before insurance applies.</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePolicy}
                disabled={saving}
                className="px-5 py-2 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    {form.policyId ? 'Update Policy' : 'Save Policy'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
