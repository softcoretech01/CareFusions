import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, FileText, CheckCircle, Clock, Ban, X, Edit, Trash2, Shield, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePatients } from '../../contexts/PatientContext';
import { useInsurance } from '../../contexts/InsuranceContext';

const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN')}`;
const TABS = ['All', 'Pending', 'Approved', 'Rejected'] as const;

/** Local calendar day (YYYY-MM-DD) — safe against UTC parsing skew. */
const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const PreAuthManagement = () => {
  const { preAuths, addPreAuth, updatePreAuth, updatePreAuthStatus, deletePreAuth,
          providers, policies, refresh, loading } = useInsurance();
  const { patients } = usePatients();

  const [activeTab, setActiveTab] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [showNewModal, setShowNewModal] = useState(false);
  const [viewRequest, setViewRequest] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [deciding, setDeciding] = useState<{ req: any; action: 'Approved' | 'Rejected' } | null>(null);
  const [decisionAmount, setDecisionAmount] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    uhid: '', patient: '', providerId: '', insurer: '', diagnosis: '', amount: '',
  });

  useEffect(() => { refresh(); }, [refresh]);

  // The patient's recorded policy drives the insurer and shows live coverage,
  // so the desk isn't guessing which insurer to raise the request against.
  const matchedPolicy = useMemo(() => {
    const u = form.uhid.trim().toLowerCase();
    if (!u) return null;
    return policies.find(p => p.uhid.toLowerCase() === u) || null;
  }, [form.uhid, policies]);

  const selectedProvider = providers.find(p => String(p.providerId) === form.providerId);

  useEffect(() => {
    const u = form.uhid.trim().toLowerCase();
    if (!u) return;
    const registered = patients.find(p => p.uhid.toLowerCase() === u);
    setForm(prev => ({
      ...prev,
      patient: prev.patient || matchedPolicy?.patientName || registered?.patientName || '',
      providerId: prev.providerId || (matchedPolicy?.providerId ? String(matchedPolicy.providerId) : ''),
      insurer: prev.insurer || matchedPolicy?.insurerName || '',
    }));
  }, [form.uhid, matchedPolicy, patients]);

  const filtered = preAuths.filter(req => {
    if (activeTab !== 'All' && req.status !== activeTab) return false;
    const s = search.trim().toLowerCase();
    if (s && !(req.patient.toLowerCase().includes(s)
      || req.id.toLowerCase().includes(s)
      || req.uhid.toLowerCase().includes(s))) return false;
    if (req.date) {
      const day = localDay(new Date(req.date));
      if (fromDate && day < fromDate) return false;
      if (toDate && day > toDate) return false;
    }
    return true;
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.uhid.trim()) e.uhid = 'UHID is required';
    if (!form.patient.trim()) e.patient = 'Patient name is required';
    else if (!/^[A-Za-z\s.'-]+$/.test(form.patient)) e.patient = 'Letters and spaces only';
    if (!form.providerId && !form.insurer) e.providerId = 'Select an insurer';
    if (!form.diagnosis.trim()) e.diagnosis = 'Diagnosis is required';
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Enter the estimated cost';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setForm({ uhid: '', patient: '', providerId: '', insurer: '', diagnosis: '', amount: '' });
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const provider = providers.find(p => String(p.providerId) === form.providerId);
    addPreAuth({
      id: '',                                  // assigned by the server
      uhid: form.uhid.trim(),
      patient: form.patient.trim(),
      providerId: provider?.providerId,
      insurer: provider?.providerName ?? form.insurer,
      diagnosis: form.diagnosis.trim(),
      amount: Number(form.amount),
      date: '',
      status: 'Pending',
    });
    toast.success('Pre-authorisation request raised');
    setShowNewModal(false);
    resetForm();
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    updatePreAuth(editing);
    toast.success('Request updated');
    setEditing(null);
  };

  const confirmDecision = () => {
    if (!deciding) return;
    if (deciding.action === 'Approved') {
      const amt = Number(decisionAmount);
      if (!amt || amt <= 0) { toast.error('Enter the sanctioned amount'); return; }
      updatePreAuthStatus(deciding.req.id, 'Approved', amt, decisionReason.trim() || undefined);
      toast.success('Pre-authorisation approved');
    } else {
      if (!decisionReason.trim()) { toast.error('Enter a rejection reason'); return; }
      updatePreAuthStatus(deciding.req.id, 'Rejected', undefined, decisionReason.trim());
      toast.success('Pre-authorisation rejected');
    }
    setDeciding(null); setDecisionAmount(''); setDecisionReason('');
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      Pending: 'bg-amber-100 text-amber-700',
      Approved: 'bg-green-100 text-green-700',
      Rejected: 'bg-rose-100 text-rose-700',
    };
    const Icon = status === 'Approved' ? CheckCircle : status === 'Rejected' ? Ban : Clock;
    return (
      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 w-max ${map[status] || 'bg-slate-100 text-slate-700'}`}>
        <Icon className="w-3 h-3" /> {status === 'Pending' ? 'Under Review' : status}
      </span>
    );
  };

  const inputCls = (f: string) =>
    `w-full px-3 py-1.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary ${
      errors[f] ? 'border-red-400' : 'border-slate-200 focus:border-primary'
    }`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Pre-Authorizations</h1>
          <p className="text-xs text-slate-500">Request insurer sanction before planned treatment</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowNewModal(true); }}
          className="px-4 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm text-sm w-max"
        >
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by request no, patient or UHID..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600" />
        <span className="text-slate-400 text-sm">to</span>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600" />
        <button
          onClick={() => { setSearch(''); setFromDate(''); setToDate(''); setActiveTab('All'); }}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
        >
          Clear
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => {
          const count = tab === 'All' ? preAuths.length : preAuths.filter(r => r.status === tab).length;
          return (
            <button
              key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${
                activeTab === tab ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab === 'Pending' ? 'Under Review' : tab} <span className="opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Request No</th>
                <th className="px-4 py-3 text-left">Patient</th>
                <th className="px-4 py-3 text-left">Insurer</th>
                <th className="px-4 py-3 text-left">Diagnosis</th>
                <th className="px-4 py-3 text-right">Requested</th>
                <th className="px-4 py-3 text-right">Sanctioned</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(req => (
                <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-bold text-primary whitespace-nowrap">{req.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{req.patient}</div>
                    <div className="text-xs text-slate-500">{req.uhid}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{req.insurer}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={req.diagnosis}>
                    {req.diagnosis || '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{inr(req.amount)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                    {req.approvedAmount != null ? inr(req.approvedAmount) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {req.date ? new Date(req.date).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="px-4 py-3">{statusBadge(req.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setViewRequest(req)} title="View"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <FileText className="w-4 h-4" />
                      </button>
                      {req.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => { setDeciding({ req, action: 'Approved' }); setDecisionAmount(String(req.amount)); setDecisionReason(''); }}
                            title="Approve"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setDeciding({ req, action: 'Rejected' }); setDecisionAmount(''); setDecisionReason(''); }}
                            title="Reject"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors">
                            <Ban className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button onClick={() => setEditing({ ...req })} title="Edit"
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (window.confirm(`Delete request ${req.id}?`)) deletePreAuth(req.id); }}
                        title="Delete"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400">
                    {loading ? 'Loading requests…' : preAuths.length === 0
                      ? 'No pre-authorisation requests yet.'
                      : 'No requests match the current filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── New request ── */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0">
              <h2 className="text-lg font-bold text-slate-800">New Pre-Authorisation Request</h2>
              <button onClick={() => setShowNewModal(false)} className="p-2 hover:bg-slate-200 rounded-full">
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
                    className={inputCls('patient')} placeholder="Auto-fills from policy" />
                  {errors.patient && <p className="text-[11px] text-red-500 mt-1">{errors.patient}</p>}
                </div>
              </div>

              {/* Live coverage context from the patient's recorded policy. */}
              {form.uhid.trim() && (
                matchedPolicy ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 space-y-0.5">
                    <p className="font-bold flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" /> {matchedPolicy.insurerName} · {matchedPolicy.policyNumber}
                    </p>
                    <p>
                      Balance {inr(matchedPolicy.balanceAmount)} of {inr(matchedPolicy.sumInsured)} ·
                      Co-pay {matchedPolicy.copayPercentage}% · Deductible {inr(matchedPolicy.deductible)}
                    </p>
                    {Number(form.amount) > matchedPolicy.balanceAmount && (
                      <p className="font-bold text-amber-700">
                        Requested amount exceeds the available balance.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    No policy on record for this UHID — add it under Eligibility &amp; Verification first.
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
                  {selectedProvider && !selectedProvider.preAuthRequired && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      This insurer does not mandate pre-authorisation.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Cost (₹) *</label>
                  <input type="text" inputMode="numeric" value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value.replace(/\D/g, '') })}
                    className={inputCls('amount')} placeholder="0" />
                  {errors.amount && <p className="text-[11px] text-red-500 mt-1">{errors.amount}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Provisional Diagnosis *</label>
                <textarea value={form.diagnosis} rows={2}
                  onChange={e => setForm({ ...form, diagnosis: e.target.value })}
                  className={inputCls('diagnosis')} placeholder="Clinical indication for the planned treatment" />
                {errors.diagnosis && <p className="text-[11px] text-red-500 mt-1">{errors.diagnosis}</p>}
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowNewModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-sm">Cancel</button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 text-sm">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Approve / Reject ── */}
      {deciding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-3">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {deciding.action === 'Approved'
                ? <><CheckCircle className="w-5 h-5 text-emerald-600" /> Approve {deciding.req.id}</>
                : <><Ban className="w-5 h-5 text-rose-600" /> Reject {deciding.req.id}</>}
            </h2>
            <p className="text-xs text-slate-500">
              {deciding.req.patient} · Requested {inr(deciding.req.amount)}
            </p>
            {deciding.action === 'Approved' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sanctioned Amount (₹)</label>
                <input type="text" inputMode="numeric" value={decisionAmount}
                  onChange={e => setDecisionAmount(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary" />
                <p className="text-[11px] text-slate-500 mt-1">
                  Claims raised for this patient will pick this up as the pre-authorised amount.
                </p>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {deciding.action === 'Approved' ? 'Remarks (optional)' : 'Rejection Reason'}
              </label>
              <textarea value={decisionReason} onChange={e => setDecisionReason(e.target.value)} rows={2}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary" />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setDeciding(null)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-sm">Cancel</button>
              <button onClick={confirmDecision}
                className={`flex-1 px-4 py-2 text-white font-bold rounded-xl text-sm ${
                  deciding.action === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}>
                {deciding.action === 'Approved' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit ── */}
      {editing && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0">
              <h2 className="text-lg font-bold text-slate-800">Edit {editing.id}</h2>
              <button onClick={() => setEditing(null)} className="p-2 hover:bg-slate-200 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Name</label>
                  <input type="text" value={editing.patient}
                    onChange={e => setEditing({ ...editing, patient: e.target.value.replace(/[^A-Za-z\s.'-]/g, '') })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">UHID</label>
                  <input type="text" value={editing.uhid}
                    onChange={e => setEditing({ ...editing, uhid: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Insurer</label>
                  <select value={editing.providerId ?? ''}
                    onChange={e => {
                      const prov = providers.find(p => String(p.providerId) === e.target.value);
                      setEditing({ ...editing, providerId: prov?.providerId, insurer: prov?.providerName ?? editing.insurer });
                    }}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                    <option value="">{editing.insurer || 'Select Insurer…'}</option>
                    {providers.map(p => <option key={p.providerId} value={p.providerId}>{p.providerName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Cost (₹)</label>
                  <input type="text" inputMode="numeric" value={editing.amount}
                    onChange={e => setEditing({ ...editing, amount: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Diagnosis</label>
                <textarea value={editing.diagnosis ?? ''} rows={2}
                  onChange={e => setEditing({ ...editing, diagnosis: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              </div>
              <p className="text-[11px] text-slate-500">
                Use the Approve or Reject actions to decide this request — they record the sanctioned
                amount and the decision reason.
              </p>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setEditing(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-sm">Cancel</button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 text-sm">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View ── */}
      {viewRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> {viewRequest.id}
              </h2>
              <button onClick={() => setViewRequest(null)} className="p-2 hover:bg-slate-200 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-slate-500">Patient</p><p className="font-bold text-slate-800">{viewRequest.patient}</p><p className="text-xs text-slate-400">{viewRequest.uhid}</p></div>
              <div><p className="text-xs text-slate-500">Insurer</p><p className="font-bold text-slate-800">{viewRequest.insurer}</p></div>
              <div className="col-span-2"><p className="text-xs text-slate-500">Diagnosis</p><p className="font-medium text-slate-700">{viewRequest.diagnosis || '—'}</p></div>
              <div><p className="text-xs text-slate-500">Requested</p><p className="font-bold text-slate-800">{inr(viewRequest.amount)}</p></div>
              <div><p className="text-xs text-slate-500">Sanctioned</p><p className="font-bold text-emerald-600">{viewRequest.approvedAmount != null ? inr(viewRequest.approvedAmount) : '—'}</p></div>
              <div><p className="text-xs text-slate-500">Requested On</p><p className="font-medium text-slate-700">{viewRequest.date ? new Date(viewRequest.date).toLocaleString('en-GB') : '—'}</p></div>
              <div><p className="text-xs text-slate-500">Status</p>{statusBadge(viewRequest.status)}</div>
              {viewRequest.decisionReason && (
                <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-slate-700">Decision remarks</p>
                  <p className="text-xs text-slate-600">{viewRequest.decisionReason}</p>
                </div>
              )}
            </div>
            <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex justify-end">
              <button onClick={() => setViewRequest(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-bold rounded-xl">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
