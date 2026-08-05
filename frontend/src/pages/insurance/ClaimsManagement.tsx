import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, FileText, CheckCircle, Clock, Ban, X, AlertCircle, Edit, Trash2, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInsurance } from '../../contexts/InsuranceContext';
import { useIPD } from '../../contexts/IPDContext';

const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN')}`;
const TABS = ['All', 'Submitted', 'In Process', 'Settled', 'Denied'] as const;

/** Local calendar day (YYYY-MM-DD) — safe against UTC parsing skew. */
const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const ClaimsManagement = () => {
  const { claims, addClaim, updateClaim, deleteClaim, markClaimSettled, markClaimDenied,
          preAuths, providers, refresh, loading } = useInsurance();
  const { patients } = useIPD();

  const [activeTab, setActiveTab] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [showNewModal, setShowNewModal] = useState(false);
  const [viewClaim, setViewClaim] = useState<any>(null);
  const [editingClaim, setEditingClaim] = useState<any>(null);
  const [settling, setSettling] = useState<any>(null);
  const [denying, setDenying] = useState<any>(null);
  const [approvedInput, setApprovedInput] = useState('');
  const [denyReason, setDenyReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    uhid: '', patient: '', providerId: '', insurer: '',
    billedAmount: '', preAuthorizedAmount: '', claimedAmount: '',
  });

  useEffect(() => { refresh(); }, [refresh]);

  // Discharged / discharge-requested inpatients are the claimable population.
  const matchedAdmission = useMemo(() => {
    const u = form.uhid.trim().toLowerCase();
    if (u.length < 4) return null;
    return patients.find(p => p.uhid.toLowerCase() === u
      && (p.status === 'Discharged' || p.status === 'Discharge Requested')) || null;
  }, [form.uhid, patients]);

  // An approved pre-auth for this patient carries the sanctioned amount.
  const relatedPreAuth = useMemo(() => {
    const u = form.uhid.trim().toLowerCase();
    if (!u) return null;
    return preAuths.find(p => p.uhid.toLowerCase() === u && p.status === 'Approved')
        || preAuths.find(p => p.uhid.toLowerCase() === u) || null;
  }, [form.uhid, preAuths]);

  // Pull whatever the admission and pre-auth can tell us. The billed amount is
  // NOT auto-calculated: it comes off the finalised hospital bill and is
  // entered by the biller.
  useEffect(() => {
    if (matchedAdmission) {
      setForm(prev => ({ ...prev, patient: matchedAdmission.patientName }));
    }
    if (relatedPreAuth) {
      const provider = providers.find(p => p.providerName === relatedPreAuth.insurer);
      setForm(prev => ({
        ...prev,
        insurer: prev.insurer || relatedPreAuth.insurer,
        providerId: prev.providerId || (provider ? String(provider.providerId) : ''),
        preAuthorizedAmount: prev.preAuthorizedAmount ||
          (relatedPreAuth.status === 'Approved'
            ? String(relatedPreAuth.approvedAmount ?? relatedPreAuth.amount) : ''),
      }));
    }
  }, [matchedAdmission, relatedPreAuth, providers]);

  const filteredClaims = claims.filter(claim => {
    if (activeTab !== 'All' && claim.status !== activeTab) return false;
    const s = search.trim().toLowerCase();
    if (s && !(claim.patient.toLowerCase().includes(s)
      || claim.id.toLowerCase().includes(s)
      || claim.uhid.toLowerCase().includes(s))) return false;
    if (claim.date) {
      const day = localDay(new Date(claim.date));
      if (fromDate && day < fromDate) return false;
      if (toDate && day > toDate) return false;
    }
    return true;
  });

  const billed = Number(form.billedAmount) || 0;
  const claimed = Number(form.claimedAmount) || 0;
  const patientBalance = Math.max(0, billed - claimed);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.uhid.trim()) e.uhid = 'UHID is required';
    if (!form.patient.trim()) e.patient = 'Patient name is required';
    if (!form.providerId && !form.insurer) e.providerId = 'Select an insurer';
    if (!form.billedAmount || billed <= 0) e.billedAmount = 'Enter the total billed amount';
    if (!form.claimedAmount || claimed <= 0) e.claimedAmount = 'Enter the amount claimed';
    else if (claimed > billed) e.claimedAmount = 'Claimed cannot exceed the billed amount';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setForm({ uhid: '', patient: '', providerId: '', insurer: '', billedAmount: '', preAuthorizedAmount: '', claimedAmount: '' });
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const provider = providers.find(p => String(p.providerId) === form.providerId);
    addClaim({
      id: '',                                   // assigned by the server
      patient: form.patient.trim(),
      uhid: form.uhid.trim(),
      providerId: provider?.providerId,
      insurer: provider?.providerName ?? form.insurer,
      preAuthId: relatedPreAuth?.preAuthId,
      admissionId: matchedAdmission?.id,        // real FK to the IPD stay
      diagnosis: matchedAdmission?.provisionalDiagnosis || 'General Claim',
      amount: billed,
      preAuth: Number(form.preAuthorizedAmount) || 0,
      claimedAmount: claimed,
      balance: patientBalance,
      date: '',
      status: 'Submitted',
    });
    toast.success('Claim submitted');
    setShowNewModal(false);
    resetForm();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClaim) return;
    updateClaim(editingClaim);
    toast.success('Claim updated');
    setEditingClaim(null);
  };

  const confirmSettle = () => {
    const amt = Number(approvedInput);
    if (!amt || amt <= 0) { toast.error('Enter the approved amount'); return; }
    if (amt > settling.amount) { toast.error('Approved amount cannot exceed the billed amount'); return; }
    markClaimSettled(settling.id, amt);
    toast.success('Claim settled — settlement raised');
    setSettling(null); setApprovedInput('');
  };

  const confirmDeny = () => {
    if (!denyReason.trim()) { toast.error('Enter a denial reason'); return; }
    markClaimDenied(denying.id, denyReason.trim());
    toast.success('Claim denied — appeal opened');
    setDenying(null); setDenyReason('');
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      Submitted: 'bg-blue-100 text-blue-700',
      'In Process': 'bg-purple-100 text-purple-700',
      Settled: 'bg-green-100 text-green-700',
      Denied: 'bg-rose-100 text-rose-700',
    };
    const Icon = status === 'Settled' ? CheckCircle : status === 'Denied' ? Ban : Clock;
    return (
      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 w-max ${map[status] || 'bg-slate-100 text-slate-700'}`}>
        <Icon className="w-3 h-3" /> {status}
      </span>
    );
  };

  const inputCls = (f: string) =>
    `w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary ${
      errors[f] ? 'border-red-400' : 'border-slate-200 focus:border-primary'
    }`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Claims Management</h1>
          <p className="text-xs text-slate-500">Submit and track insurance claims for discharged inpatients</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowNewModal(true); }}
          className="px-4 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm text-sm w-max"
        >
          <Plus className="w-4 h-4" /> New Claim
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="Search by claim no, patient or UHID..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600" />
        <span className="text-slate-400 text-sm">to</span>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600" />
        <button
          onClick={() => { setSearch(''); setFromDate(''); setToDate(''); setActiveTab('All'); }}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Status tabs — the prototype declared these but never rendered a control. */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => {
          const count = tab === 'All' ? claims.length : claims.filter(c => c.status === tab).length;
          return (
            <button
              key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${
                activeTab === tab ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab} <span className="opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Claim No</th>
                <th className="px-4 py-3 text-left">Patient</th>
                <th className="px-4 py-3 text-left">Insurer</th>
                <th className="px-4 py-3 text-right">Billed</th>
                <th className="px-4 py-3 text-right">Pre-Auth</th>
                <th className="px-4 py-3 text-right">Claimed</th>
                <th className="px-4 py-3 text-right">Approved</th>
                <th className="px-4 py-3 text-right">Patient Bal.</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClaims.map(claim => (
                <tr key={claim.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-bold text-primary whitespace-nowrap">{claim.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{claim.patient}</div>
                    <div className="text-xs text-slate-500">{claim.uhid}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{claim.insurer}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{inr(claim.amount)}</td>
                  <td className="px-4 py-3 text-right text-slate-500">{inr(claim.preAuth ?? 0)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{inr(claim.claimedAmount ?? 0)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                    {claim.approvedAmount != null ? inr(claim.approvedAmount) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{inr(claim.balance)}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {claim.date ? new Date(claim.date).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="px-4 py-3">{statusBadge(claim.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setViewClaim(claim)} title="View"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <FileText className="w-4 h-4" />
                      </button>
                      {/* Settle / Deny drive the real lifecycle: settling raises the
                          settlement, denying opens the appeal. */}
                      {(claim.status === 'Submitted' || claim.status === 'In Process') && (
                        <>
                          <button onClick={() => { setSettling(claim); setApprovedInput(String(claim.claimedAmount ?? '')); }}
                            title="Settle"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setDenying(claim); setDenyReason(''); }} title="Deny"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors">
                            <Ban className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button onClick={() => setEditingClaim({ ...claim })} title="Edit"
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (window.confirm(`Delete claim ${claim.id}? Its appeal and settlement will also be removed.`)) deleteClaim(claim.id); }}
                        title="Delete"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClaims.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-slate-400">
                    {loading ? 'Loading claims…' : claims.length === 0
                      ? 'No claims yet. Use New Claim to submit one.'
                      : 'No claims match the current filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── New claim ── */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0">
              <h2 className="text-lg font-bold text-slate-800">New Insurance Claim</h2>
              <button onClick={() => setShowNewModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Patient UHID *</label>
                  <input type="text" value={form.uhid}
                    onChange={e => setForm({ ...form, uhid: e.target.value })}
                    className={inputCls('uhid')} placeholder="e.g. UHID-2026-0003" />
                  {errors.uhid && <p className="text-[11px] text-red-500 mt-1">{errors.uhid}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Name *</label>
                  <input type="text" value={form.patient}
                    onChange={e => setForm({ ...form, patient: e.target.value.replace(/[^A-Za-z\s.'-]/g, '') })}
                    className={inputCls('patient')} placeholder="Auto-fills from admission" />
                  {errors.patient && <p className="text-[11px] text-red-500 mt-1">{errors.patient}</p>}
                </div>
              </div>

              {form.uhid.trim().length >= 4 && (
                matchedAdmission ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 space-y-0.5">
                    <p className="font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Linked to admission {matchedAdmission.admissionNumber}
                    </p>
                    <p>
                      {matchedAdmission.status} · {matchedAdmission.specialty || '—'} ·
                      Expected stay {matchedAdmission.expectedStayDays || 0} day(s)
                    </p>
                    <p>Diagnosis: {matchedAdmission.provisionalDiagnosis || '—'}</p>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    No discharged inpatient found for this UHID — the claim will not be linked to an admission.
                  </div>
                )
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Insurer *</label>
                  <select value={form.providerId}
                    onChange={e => setForm({ ...form, providerId: e.target.value })}
                    className={inputCls('providerId')}>
                    <option value="">Select Insurer…</option>
                    {providers.map(p => (
                      <option key={p.providerId} value={p.providerId}>{p.providerName}</option>
                    ))}
                  </select>
                  {errors.providerId && <p className="text-[11px] text-red-500 mt-1">{errors.providerId}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pre-Authorised Amount (₹)</label>
                  <input type="text" inputMode="numeric" value={form.preAuthorizedAmount}
                    onChange={e => setForm({ ...form, preAuthorizedAmount: e.target.value.replace(/\D/g, '') })}
                    className={inputCls('preAuthorizedAmount')} placeholder="0" />
                  {relatedPreAuth?.status === 'Approved' && (
                    <p className="text-[11px] text-emerald-600 mt-1">From approved pre-auth {relatedPreAuth.id}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Billed (₹) *</label>
                  <input type="text" inputMode="numeric" value={form.billedAmount}
                    onChange={e => setForm({ ...form, billedAmount: e.target.value.replace(/\D/g, '') })}
                    className={inputCls('billedAmount')} placeholder="From the final hospital bill" />
                  {errors.billedAmount && <p className="text-[11px] text-red-500 mt-1">{errors.billedAmount}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Claimed from Insurer (₹) *</label>
                  <input type="text" inputMode="numeric" value={form.claimedAmount}
                    onChange={e => setForm({ ...form, claimedAmount: e.target.value.replace(/\D/g, '') })}
                    className={inputCls('claimedAmount')} placeholder="0" />
                  {errors.claimedAmount && <p className="text-[11px] text-red-500 mt-1">{errors.claimedAmount}</p>}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient responsibility</span>
                <span className="font-bold text-slate-800">{inr(patientBalance)}</span>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowNewModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors text-sm">
                  Submit Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Settle ── */}
      {settling && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-3">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-emerald-600" /> Settle {settling.id}
            </h2>
            <p className="text-xs text-slate-500">
              Billed {inr(settling.amount)} · Claimed {inr(settling.claimedAmount ?? 0)}. A settlement record with
              TDS will be raised automatically.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Approved Amount (₹)</label>
              <input type="text" inputMode="numeric" value={approvedInput}
                onChange={e => setApprovedInput(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setSettling(null)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-sm">Cancel</button>
              <button onClick={confirmSettle}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 text-sm">Settle Claim</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deny ── */}
      {denying && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-3">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-600" /> Deny {denying.id}
            </h2>
            <p className="text-xs text-slate-500">An appeal record will be opened automatically for this claim.</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Denial Reason</label>
              <textarea value={denyReason} onChange={e => setDenyReason(e.target.value)} rows={3}
                placeholder="e.g. Non-disclosure of pre-existing condition"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setDenying(null)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-sm">Cancel</button>
              <button onClick={confirmDeny}
                className="flex-1 px-4 py-2 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 text-sm">Deny Claim</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit ── */}
      {editingClaim && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0">
              <h2 className="text-lg font-bold text-slate-800">Edit {editingClaim.id}</h2>
              <button onClick={() => setEditingClaim(null)} className="p-2 hover:bg-slate-200 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Name</label>
                  <input type="text" value={editingClaim.patient}
                    onChange={e => setEditingClaim({ ...editingClaim, patient: e.target.value.replace(/[^A-Za-z\s.'-]/g, '') })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">UHID</label>
                  <input type="text" value={editingClaim.uhid}
                    onChange={e => setEditingClaim({ ...editingClaim, uhid: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Billed (₹)</label>
                  <input type="text" inputMode="numeric" value={editingClaim.amount}
                    onChange={e => {
                      const amount = Number(e.target.value.replace(/\D/g, '')) || 0;
                      setEditingClaim({ ...editingClaim, amount, balance: Math.max(0, amount - (editingClaim.claimedAmount || 0)) });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Claimed (₹)</label>
                  <input type="text" inputMode="numeric" value={editingClaim.claimedAmount ?? 0}
                    onChange={e => {
                      const claimedAmount = Number(e.target.value.replace(/\D/g, '')) || 0;
                      setEditingClaim({ ...editingClaim, claimedAmount, balance: Math.max(0, (editingClaim.amount || 0) - claimedAmount) });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Use the Settle or Deny actions to change status — those raise the settlement or appeal.
              </p>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setEditingClaim(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-sm">Cancel</button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 text-sm">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View ── */}
      {viewClaim && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> {viewClaim.id}
              </h2>
              <button onClick={() => setViewClaim(null)} className="p-2 hover:bg-slate-200 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-slate-500">Patient</p><p className="font-bold text-slate-800">{viewClaim.patient}</p><p className="text-xs text-slate-400">{viewClaim.uhid}</p></div>
              <div><p className="text-xs text-slate-500">Insurer</p><p className="font-bold text-slate-800">{viewClaim.insurer}</p></div>
              <div className="col-span-2"><p className="text-xs text-slate-500">Diagnosis</p><p className="font-medium text-slate-700">{viewClaim.diagnosis || '—'}</p></div>
              <div><p className="text-xs text-slate-500">Total Billed</p><p className="font-bold text-slate-800">{inr(viewClaim.amount)}</p></div>
              <div><p className="text-xs text-slate-500">Pre-Auth</p><p className="font-bold text-slate-800">{inr(viewClaim.preAuth ?? 0)}</p></div>
              <div><p className="text-xs text-slate-500">Claimed</p><p className="font-bold text-slate-800">{inr(viewClaim.claimedAmount ?? 0)}</p></div>
              <div><p className="text-xs text-slate-500">Approved</p><p className="font-bold text-emerald-600">{viewClaim.approvedAmount != null ? inr(viewClaim.approvedAmount) : '—'}</p></div>
              <div><p className="text-xs text-slate-500">Patient Responsibility</p><p className="font-bold text-slate-800">{inr(viewClaim.balance)}</p></div>
              <div><p className="text-xs text-slate-500">Status</p>{statusBadge(viewClaim.status)}</div>
              {viewClaim.denialReason && (
                <div className="col-span-2 bg-rose-50 border border-rose-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-rose-800">Denial reason</p>
                  <p className="text-xs text-rose-700">{viewClaim.denialReason}</p>
                </div>
              )}
            </div>
            <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex justify-end">
              <button onClick={() => setViewClaim(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-bold rounded-xl">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
