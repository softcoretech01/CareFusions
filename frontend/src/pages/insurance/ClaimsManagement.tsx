import { useState, useEffect, useMemo } from 'react';
import { DateFilter } from '@/components/ui/DateFilter';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { Search, Plus, FileText, CheckCircle, Clock, Ban, X, AlertCircle, Edit, Trash2, IndianRupee, UploadCloud , Eye} from "lucide-react";
import toast from 'react-hot-toast';
import { useInsurance } from '../../contexts/InsuranceContext';
import { useIPD } from '../../contexts/IPDContext';

const API_BASE = import.meta.env.VITE_API_URL as string;
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
  // Attached documents are captured client-side; no claim-document endpoint yet.
  const [claimDocs, setClaimDocs] = useState<File[]>([]);
  // Real IP bills (hospital.Ip_Bill) — the discharge breakdown is read from here.
  const [ipBills, setIpBills] = useState<any[]>([]);

  const [form, setForm] = useState({
    uhid: '', patient: '', providerId: '', insurer: '',
    billedAmount: '', preAuthorizedAmount: '', claimedAmount: '',
  });

  useEffect(() => { refresh(); }, [refresh]);

  // Load real IP bills once; the discharge bill for a UHID is matched from these.
  useEffect(() => {
    fetch(`${API_BASE}/ip-billing/`)
      .then(r => (r.ok ? r.json() : []))
      .then(d => setIpBills(Array.isArray(d) ? d : []))
      .catch(() => setIpBills([]));
  }, []);

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

  // The patient's actual IP discharge bill (latest one on file for the UHID).
  const ipBill = useMemo(() => {
    const u = form.uhid.trim().toLowerCase();
    if (u.length < 4) return null;
    const matches = ipBills.filter(b => (b.Uhid || '').toLowerCase() === u);
    return matches.length ? matches.reduce((a, b) => (b.IpBillId > a.IpBillId ? b : a)) : null;
  }, [form.uhid, ipBills]);

  // Real discharge bill line-items straight from IP billing — no hardcoded rates.
  const billItems = useMemo(
    () => (ipBill?.Items || []).map((it: any) => ({
      desc: it.ItemDescription, qty: Number(it.Quantity), unit: Number(it.UnitPrice),
      subtotal: Number(it.Subtotal ?? Number(it.Quantity) * Number(it.UnitPrice)),
    })),
    [ipBill],
  );
  const calculatedTotal = billItems.reduce((s: number, i: { subtotal: number }) => s + i.subtotal, 0);

  // Total Billed and the patient name come from the matched IP bill.
  useEffect(() => {
    if (ipBill) {
      setForm(prev => ({
        ...prev,
        billedAmount: String(Math.round(calculatedTotal)),
        patient: prev.patient || ipBill.PatientName || '',
      }));
    }
  }, [ipBill, calculatedTotal]);

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
    setClaimDocs([]);
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
    `w-full px-3 py-1.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary ${
      errors[f] ? 'border-red-400' : 'border-slate-200 focus:border-primary'
    }`;

  const { page, setPage, pageSize, total, paged } = usePagination(filteredClaims);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Claims Management</h1>
        </div>
        <button
          onClick={() => { resetForm(); setShowNewModal(true); }}
          className="px-4 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm text-sm w-max"
        >
          <Plus className="w-4 h-4" /> New Claim
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="Search by claim no, patient or UHID..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <DateFilter
          dateFrom={fromDate}
          dateTo={toDate}
          onDateFromChange={setFromDate}
          onDateToChange={setToDate}
          onReset={() => {
            setSearch('');
            setFromDate('');
            setToDate('');
            setActiveTab('All');
          }}
        />
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
              {paged.map(claim => (
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
        <Pagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} />
      </div>

      {/* ── New claim ── */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-start bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Submit New Claim</h2>
                <p className="text-xs text-slate-500">Fill in the claim details</p>
              </div>
              <button onClick={() => setShowNewModal(false)}
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm font-medium">
                <X className="w-5 h-5" /> Cancel
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">UHID</label>
                  <input type="text" value={form.uhid}
                    onChange={e => setForm({ ...form, uhid: e.target.value })}
                    className={inputCls('uhid')} placeholder="e.g. UHID-2026-0003" />
                  {errors.uhid && <p className="text-[11px] text-red-500 mt-1">{errors.uhid}</p>}
                  {form.uhid.trim().length >= 4 && ipBill && (
                    <p className="text-[11px] text-emerald-600 mt-1.5 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> IP Patient found and discharge records loaded.
                    </p>
                  )}
                  {form.uhid.trim().length >= 4 && !ipBill && (
                    <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> No IP discharge bill found for this UHID.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Patient Name</label>
                  <input type="text" value={form.patient} readOnly
                    className={`${inputCls('patient')} bg-slate-100 text-slate-600`}
                    placeholder="Enter or auto-fetch name" />
                  {errors.patient && <p className="text-[11px] text-red-500 mt-1">{errors.patient}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Insurance Provider</label>
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

              {billItems.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-slate-800">Discharge Bill Breakdown</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2.5 text-left">Item Description</th>
                          <th className="px-4 py-2.5 text-right">Qty/Days</th>
                          <th className="px-4 py-2.5 text-right">Unit Price</th>
                          <th className="px-4 py-2.5 text-right">Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {billItems.map((it: { desc: string; qty: number; unit: number; subtotal: number }, idx: number) => (
                          <tr key={idx}>
                            <td className="px-4 py-2.5 text-slate-700">{it.desc}</td>
                            <td className="px-4 py-2.5 text-right text-slate-600">{it.qty}</td>
                            <td className="px-4 py-2.5 text-right text-slate-600">{it.unit.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-800">{it.subtotal.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-emerald-50/60 border-t border-slate-100">
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-right font-bold text-slate-700">Calculated Total Bill</td>
                          <td className="px-4 py-3 text-right font-bold text-primary">₹{calculatedTotal.toLocaleString('en-IN')}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Total Billed (₹)</label>
                  <input type="text" value={form.billedAmount} readOnly
                    className={`${inputCls('billedAmount')} bg-slate-100 text-slate-600`} placeholder="0" />
                  {errors.billedAmount && <p className="text-[11px] text-red-500 mt-1">{errors.billedAmount}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Pre-Auth (₹)</label>
                  <input type="text" inputMode="numeric" value={form.preAuthorizedAmount}
                    onChange={e => setForm({ ...form, preAuthorizedAmount: e.target.value.replace(/\D/g, '') })}
                    className={inputCls('preAuthorizedAmount')} placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Claimed (₹)</label>
                  <input type="text" inputMode="numeric" value={form.claimedAmount}
                    onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      const numericVal = Number(val);
                      const billedVal = Number(form.billedAmount) || 0;
                      if (numericVal > billedVal) {
                        val = billedVal.toString();
                      }
                      setForm({ ...form, claimedAmount: val });
                    }}
                    className={inputCls('claimedAmount')} placeholder="0" />
                  {errors.claimedAmount && <p className="text-[11px] text-red-500 mt-1">{errors.claimedAmount}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Balance Amount</label>
                  <div className="w-full px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-sm font-bold text-rose-600">
                    {inr(patientBalance)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Attach Final Bill &amp; Discharge Summary</label>
                <label
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); setClaimDocs(prev => [...prev, ...Array.from(e.dataTransfer.files || [])]); }}
                  className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-slate-200 rounded-xl px-4 py-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                  <input type="file" multiple accept=".pdf" className="hidden"
                    onChange={e => setClaimDocs(prev => [...prev, ...Array.from(e.target.files || [])])} />
                  <UploadCloud className="w-6 h-6 text-slate-400" />
                  <span className="text-sm text-slate-600 font-medium">Click or drag to upload PDFs</span>
                  <span className="text-[11px] text-slate-400">Up to 25MB total</span>
                </label>
                {claimDocs.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {claimDocs.map((f, i) => (
                      <li key={i} className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                        <span className="truncate text-slate-700 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-slate-400" />{f.name}</span>
                        <button type="button" onClick={() => setClaimDocs(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="pt-1 flex justify-end gap-3">
                <button type="button" onClick={() => setShowNewModal(false)}
                  className="px-6 py-2.5 border border-slate-200 bg-white text-slate-700 font-bold rounded-xl hover:bg-slate-50 text-sm">
                  Cancel
                </button>
                <button type="submit"
                  className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 text-sm">
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
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary" />
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
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary" />
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
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">UHID</label>
                  <input type="text" value={editingClaim.uhid}
                    onChange={e => setEditingClaim({ ...editingClaim, uhid: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
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
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Claimed (₹)</label>
                  <input type="text" inputMode="numeric" value={editingClaim.claimedAmount ?? 0}
                    onChange={e => {
                      let claimedAmount = Number(e.target.value.replace(/\D/g, '')) || 0;
                      if (claimedAmount > (editingClaim.amount || 0)) {
                        claimedAmount = editingClaim.amount || 0;
                      }
                      setEditingClaim({ ...editingClaim, claimedAmount, balance: Math.max(0, (editingClaim.amount || 0) - claimedAmount) });
                    }}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
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
