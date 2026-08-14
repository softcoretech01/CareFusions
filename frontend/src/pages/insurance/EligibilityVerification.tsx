import { useState } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { Search, CheckCircle, XCircle, Shield, Plus, X, AlertTriangle, Edit, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePatients } from '../../contexts/PatientContext';
import { useInsurance, type Policy } from '../../contexts/InsuranceContext';
import { alphanumeric, upperCode, digitsOnly, decimalOnly, LIMITS } from '../../utils/inputRules';

const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN')}`;

/** A policy is only usable if it is Active AND has not passed its validity date. */
const isExpired = (p: Policy) =>
  p.status === 'Expired' || (!!p.validUntil && new Date(p.validUntil) < new Date(new Date().toDateString()));

export const EligibilityVerification = () => {
  const { policies, providers, savePolicy, loading } = useInsurance();
  const { patients } = usePatients();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Policy | null>(null);
  const [notFound, setNotFound] = useState(false);
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

  // Table filter — matches name, UHID or policy number.
  const filtered = policies.filter(p => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return p.patientName.toLowerCase().includes(s)
      || p.uhid.toLowerCase().includes(s)
      || p.policyNumber.toLowerCase().includes(s);
  });

  // Verify: exact UHID/policy match wins; otherwise a single fuzzy hit is
  // good enough. Previously only an exact match opened the result and the
  // "not found" banner was computed from the *previous* render's filter.
  const handleSearch = (query?: string) => {
    const term = (typeof query === 'string' ? query : search).trim().toLowerCase();
    if (!term) {
      setSelected(null);
      setNotFound(false);
      return;
    }
    const exact = policies.find(
      p => p.uhid.toLowerCase() === term || p.policyNumber.toLowerCase() === term
    );
    const matches = policies.filter(
      p => p.patientName.toLowerCase().includes(term)
        || p.uhid.toLowerCase().includes(term)
        || p.policyNumber.toLowerCase().includes(term)
    );
    const hit = exact ?? (matches.length === 1 ? matches[0] : null);
    setSelected(hit);
    setNotFound(!hit && matches.length === 0);
  };

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
    if (!form.providerId) e.providerId = 'Select an insurer';
    if (!form.policyNumber.trim()) e.policyNumber = 'Policy number is required';
    if (!form.validUntil) e.validUntil = 'Validity date is required';
    if (!form.sumInsured || Number(form.sumInsured) <= 0) e.sumInsured = 'Enter a positive amount';
    const copay = Number(form.copayPercentage);
    if (isNaN(copay) || copay < 0 || copay > 100) e.copayPercentage = 'Must be 0–100';
    // A deductible above the sum insured would make the payable amount negative.
    if (Number(form.deductible) > Number(form.sumInsured || 0)) e.deductible = 'Cannot exceed sum insured';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const provider = providers.find(p => String(p.providerId) === form.providerId);
    const ok = await savePolicy({
      policyId: form.policyId ?? undefined,
      uhid: form.uhid.trim(),
      patientName: form.name.trim(),
      policyNumber: form.policyNumber.trim(),
      providerId: provider?.providerId ?? null,
      insurerName: provider?.providerName ?? form.insurer,
      // A brand-new policy has its full sum insured still available.
      sumInsured: Number(form.sumInsured),
      balanceAmount: Number(form.sumInsured),
      validUntil: form.validUntil,
      status: new Date(form.validUntil) < new Date(new Date().toDateString()) ? 'Expired' : 'Active',
      networkHospital: true,
      copayPercentage: Number(form.copayPercentage) || 0,
      deductible: Number(form.deductible) || 0,
    });
    setSaving(false);
    if (ok) {
      toast.success('Insurance policy saved');
      setShowAddModal(false);
      setUhidOpen(false);
      setSearch(form.uhid);
      setNotFound(false);
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
    <div className="space-y-4 relative">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Eligibility &amp; Verification</h1>
          <p className="text-xs text-slate-500">Check a patient's policy coverage before admission or billing</p>
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

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex items-center gap-2">
        <div className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by UHID, Patient Name, or Policy Number..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setNotFound(false); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium text-sm"
          />
        </div>
        <button
          onClick={() => handleSearch()}
          className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          Verify
        </button>
        <button
          onClick={() => { setSearch(''); setSelected(null); setNotFound(false); }}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
        >
          Clear
        </button>
      </div>

      {notFound && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <div>
            <h4 className="font-bold text-rose-800 text-sm">No policy found</h4>
            <p className="text-xs text-rose-700">
              Nothing matches "{search}". Check the UHID or policy number, or use Add Insurance to record it.
            </p>
          </div>
        </div>
      )}

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

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Registered Policies</h3>
          <span className="text-xs text-slate-500">{filtered.length} of {policies.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
                        onClick={() => { setSearch(row.policyNumber); setNotFound(false); handleSearch(row.policyNumber); }}
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
                    {loading ? 'Loading policies…'
                      : policies.length === 0 ? 'No policies recorded yet. Use Add Insurance to record one.'
                      : 'No policies match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} />
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">{form.policyId ? 'Edit' : 'Add'} Patient Insurance Details</h2>
              <button onClick={() => { setShowAddModal(false); setUhidOpen(false); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Patient UHID *</label>
                  {/* Searchable picker — only patients without a policy appear. */}
                  <input
                    type="text" value={form.uhid}
                    onChange={(e) => { setForm(prev => ({ ...prev, uhid: alphanumeric(e.target.value, LIMITS.name), name: '' })); setUhidOpen(true); }}
                    onFocus={() => setUhidOpen(true)}
                    onBlur={() => setUhidOpen(false)}
                    autoComplete="off" maxLength={LIMITS.name}
                    className={inputCls('uhid')} placeholder="Search UHID or name…"
                  />
                  {uhidOpen && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                      {uhidMatches.length === 0 ? (
                        <div className="px-3 py-2.5 text-xs text-slate-400">
                          {pickablePatients.length === 0
                            ? 'No patients without a policy — everyone on file is already insured.'
                            : 'No matching patient without a policy.'}
                        </div>
                      ) : uhidMatches.map(p => (
                        <button
                          type="button"
                          key={p.uhid}
                          // onMouseDown fires before the input's onBlur, so the
                          // pick lands before the dropdown closes.
                          onMouseDown={(e) => { e.preventDefault(); selectPatient(p.uhid, p.patientName || ''); }}
                          className="w-full text-left px-3 py-2 hover:bg-primary/5 transition-colors border-b border-slate-50 last:border-0"
                        >
                          <div className="text-sm font-semibold text-slate-800">{p.patientName || 'Unnamed'}</div>
                          <div className="text-[11px] text-slate-500">{p.uhid}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {errors.uhid && <p className="text-[11px] text-red-500 mt-1">{errors.uhid}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Name *</label>
                  {/* Read-only: it always reflects the patient chosen above. */}
                  <input
                    type="text" value={form.name} readOnly
                    className={`${inputCls('name')} bg-slate-100 text-slate-600 cursor-not-allowed`}
                    placeholder="Select a patient above"
                  />
                  {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Insurance Provider *</label>
                  <select
                    value={form.providerId}
                    onChange={(e) => setForm({ ...form, providerId: e.target.value })}
                    className={inputCls('providerId')}
                  >
                    <option value="">Select Insurer…</option>
                    {providers.map(p => (
                      <option key={p.providerId} value={p.providerId}>{p.providerName}</option>
                    ))}
                  </select>
                  {errors.providerId && <p className="text-[11px] text-red-500 mt-1">{errors.providerId}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Policy Number *</label>
                  <input
                    type="text" value={form.policyNumber}
                    onChange={(e) => setForm({ ...form, policyNumber: upperCode(e.target.value, LIMITS.policy) })}
                    maxLength={LIMITS.policy}
                    className={inputCls('policyNumber')} placeholder="e.g. POL-123456"
                  />
                  {errors.policyNumber && <p className="text-[11px] text-red-500 mt-1">{errors.policyNumber}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date *</label>
                  <input
                    type="date" value={form.validUntil}
                    onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                    className={inputCls('validUntil')}
                  />
                  {errors.validUntil && <p className="text-[11px] text-red-500 mt-1">{errors.validUntil}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sum Insured (₹) *</label>
                  <input
                    type="text" inputMode="numeric" value={form.sumInsured}
                    onChange={(e) => setForm({ ...form, sumInsured: digitsOnly(e.target.value, LIMITS.amount) })}
                    maxLength={LIMITS.amount}
                    className={inputCls('sumInsured')} placeholder="500000"
                  />
                  {errors.sumInsured && <p className="text-[11px] text-red-500 mt-1">{errors.sumInsured}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Co-pay (%)</label>
                  <input
                    type="text" inputMode="decimal" value={form.copayPercentage}
                    onChange={(e) => setForm({ ...form, copayPercentage: decimalOnly(e.target.value, LIMITS.percent) })}
                    maxLength={LIMITS.percent}
                    className={inputCls('copayPercentage')} placeholder="10"
                  />
                  {errors.copayPercentage && <p className="text-[11px] text-red-500 mt-1">{errors.copayPercentage}</p>}
                </div>
              </div>
              <div className="pt-3 flex gap-3">
                <button
                  type="button" onClick={() => { setShowAddModal(false); setUhidOpen(false); }}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors text-sm disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save Insurance Details'}
                </button>
              </div>
            </form>
          </div>
        </div>  
      )}
    </div>
  );
};
