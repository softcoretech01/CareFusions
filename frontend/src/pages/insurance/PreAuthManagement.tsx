import { useState, useEffect, useMemo } from 'react';
import { DateFilter } from '@/components/ui/DateFilter';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { Plus, Search, FileText, CheckCircle, Clock, Ban, X, Edit, Trash2, Shield, AlertCircle, UploadCloud , Eye} from "lucide-react";
import toast from 'react-hot-toast';
import { usePatients } from '../../contexts/PatientContext';
import { useInsurance } from '../../contexts/InsuranceContext';
import { useIPD } from '../../contexts/IPDContext';

const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN')}`;
const TABS = ['All', 'Pending', 'Approved', 'Rejected'] as const;

/** Local calendar day (YYYY-MM-DD) — safe against UTC parsing skew. */
const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const PreAuthManagement = () => {
  const { preAuths, addPreAuth, updatePreAuth, updatePreAuthStatus, deletePreAuth,
          providers, policies, refresh, loading } = useInsurance();
  const { patients } = usePatients();
  const { patients: ipdAdmissions } = useIPD();
  const API_BASE = import.meta.env.VITE_API_URL as string;
  const [ipBills, setIpBills] = useState<any[]>([]);
  const [patientLabOrders, setPatientLabOrders] = useState<any[]>([]);
  const [patientRadOrders, setPatientRadOrders] = useState<any[]>([]);
  const [wardCharges, setWardCharges] = useState<Record<string, number>>({});
  const [wardNames, setWardNames] = useState<Record<string, string>>({});

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
  // Supporting documents are captured client-side; there is no pre-auth document
  // endpoint yet, so they are listed for the user but not persisted on submit.
  const [docs, setDocs] = useState<File[]>([]);

  const [form, setForm] = useState({
    uhid: '', patient: '', providerId: '', insurer: '', diagnosis: '', amount: '',
  });

  
  useEffect(() => {
    fetch(`${API_BASE}/ip-billing/`)
      .then(r => (r.ok ? r.json() : []))
      .then(d => setIpBills(Array.isArray(d) ? d : []))
      .catch(() => setIpBills([]));

    fetch(`${API_BASE}/ward-charges/`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          const prices: Record<string, number> = {};
          const names: Record<string, string> = {};
          d.forEach((r: any) => {
            prices[String(r.Id)] = Number(r.Charge || 0);
            names[String(r.Id)] = r.WardType || `Ward ${r.Id}`;
          });
          setWardCharges(prices);
          setWardNames(names);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const u = form.uhid.trim();
    if (u.length >= 4) {
      fetch(`${API_BASE}/lab/orders?uhid=${encodeURIComponent(u)}`)
        .then(r => (r.ok ? r.json() : []))
        .then(d => setPatientLabOrders(Array.isArray(d) ? d : []))
        .catch(() => setPatientLabOrders([]));
        
      fetch(`${API_BASE}/radiology/orders`)
        .then(r => (r.ok ? r.json() : []))
        .then(d => {
          if (Array.isArray(d)) {
            setPatientRadOrders(d.filter((o: any) => (o.uhid || o.Uhid || '').toLowerCase() === u.toLowerCase()));
          } else setPatientRadOrders([]);
        })
        .catch(() => setPatientRadOrders([]));
    } else {
      setPatientLabOrders([]);
      setPatientRadOrders([]);
    }
  }, [form.uhid]);

  const matchedAdmission = useMemo(() => {
    const u = form.uhid.trim().toLowerCase();
    if (u.length < 4) return null;
    return ipdAdmissions.find(p => p.uhid.toLowerCase() === u
      && (p.status === 'Discharged' || p.status === 'Discharge Requested'
          || p.status === 'Admitted')) || null;
  }, [form.uhid, ipdAdmissions]);

  const ipBill = useMemo(() => {
    const u = form.uhid.trim().toLowerCase();
    if (u.length < 4) return null;
    return ipBills.find(b => b.Uhid?.toLowerCase() === u) || null;
  }, [form.uhid, ipBills]);

  const billItems = useMemo(() => {
    if (!ipBill || !ipBill.ItemDetails) return [];
    try {
      return JSON.parse(ipBill.ItemDetails);
    } catch { return []; }
  }, [ipBill]);

  const displayBillItems = useMemo(() => {
    if (billItems.length > 0) {
      return billItems.map((b: any) => ({
        desc: b.description || b.name,
        qty: Number(b.quantity) || 1,
        unit: Number(b.unitPrice) || 0,
        subtotal: Number(b.total) || 0
      }));
    }

    if (!matchedAdmission) return [];
    
    // Estimate from admission
    const d1 = matchedAdmission.admissionDate ? new Date(matchedAdmission.admissionDate) : new Date();
    const d2 = matchedAdmission.dischargeInfo?.dischargeDate ? new Date(matchedAdmission.dischargeInfo.dischargeDate) : new Date();
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    let stayDays = Math.floor((d2.getTime() - d1.getTime()) / 86400000) + 1;
    if (stayDays < 1) stayDays = 1;
    
    const list: any[] = [];
    const transfers = matchedAdmission.wardTransferHistory || [];
    
    if (transfers.length === 0) {
      const wardId = matchedAdmission.currentWardId;
      const charge = wardCharges[String(wardId)] || 1000;
      const wName = wardNames[String(wardId)] || `Ward ${wardId || 'General'}`;
      list.push({ desc: `Room Rent (${wName})`, qty: stayDays, unit: charge, subtotal: stayDays * charge });
    } else {
      let lastDate = new Date(matchedAdmission.admissionDate);
      lastDate.setHours(0, 0, 0, 0);
      let totalBilledDays = 0;
      
      transfers.forEach((t: any) => {
         const tDate = new Date(t.transferDate);
         tDate.setHours(0, 0, 0, 0);
         let days = Math.floor((tDate.getTime() - lastDate.getTime()) / 86400000);
         if (days < 0) days = 0;
         
         let billedDays = days === 0 ? 1 : days;
         const wardId = t.fromWardId;
         const charge = wardCharges[String(wardId)] || 1000;
         const wName = wardNames[String(wardId)] || `Ward ${wardId}`;
         
         list.push({ desc: `Room Rent (${wName})`, qty: billedDays, unit: charge, subtotal: billedDays * charge });
         totalBilledDays += billedDays;
         lastDate = tDate;
      });
      
      let finalDays = stayDays - totalBilledDays;
      if (finalDays <= 0) finalDays = 1;
      
      const finalWardId = transfers[transfers.length - 1].toWardId;
      const charge = wardCharges[String(finalWardId)] || 1000;
      const wName = wardNames[String(finalWardId)] || `Ward ${finalWardId}`;
      list.push({ desc: `Room Rent (${wName})`, qty: finalDays, unit: charge, subtotal: finalDays * charge });
    }

    list.push({ desc: `Nursing Charges (Per Day)`, qty: stayDays, unit: 500, subtotal: stayDays * 500 });
    list.push({ desc: `Doctor Visit Fee (${matchedAdmission.specialty || 'General'})`, qty: 1, unit: 400, subtotal: 400 });
    if (matchedAdmission.dischargeInfo?.medicines?.length) {
      matchedAdmission.dischargeInfo.medicines.forEach((m: any) => {
        const u = Number(m.price || 0) || 15;
        const q = Number(m.quantity || 1);
        list.push({ desc: `Discharge Med: ${m.medicineName} (${m.dosage})`, qty: q, unit: u, subtotal: q * u });
      });
    }

    if (patientLabOrders && patientLabOrders.length > 0) {
      const completedLabs = patientLabOrders.filter((ord: any) => ord.status === 'Completed' || ord.status === 'Verified');
      completedLabs.forEach((ord: any) => {
        let testNameStr = 'Lab Test';
        if (typeof ord.tests === 'string') testNameStr = ord.tests;
        else if (Array.isArray(ord.tests)) {
          testNameStr = ord.tests.map((t: any) => typeof t === 'string' ? t : t?.name || t?.test_name || t?.testCode).filter(Boolean).join(', ');
        } else if (ord.TestName) testNameStr = ord.TestName;
        else if (ord.category) testNameStr = ord.category;
        
        list.push({ desc: testNameStr || 'Lab Test', qty: 1, unit: 250, subtotal: 250 });
      });
    }

    if (patientRadOrders && patientRadOrders.length > 0) {
      const completedRads = patientRadOrders.filter((ord: any) => ord.status === 'Completed' || ord.status === 'Verified');
      completedRads.forEach((ord: any) => {
        let radNameStr = 'Radiology Test';
        if (Array.isArray(ord.tests)) {
          radNameStr = ord.tests.map((t: any) => {
            if (typeof t === 'string') return t;
            const name = t?.name || t?.test_name || 'X-Ray';
            return (t?.body_part && name.toLowerCase() !== t.body_part.toLowerCase()) ? `${name} for ${t.body_part}` : name;
          }).filter(Boolean).join(', ');
        } else if (ord.test_name) radNameStr = ord.test_name;
        
        list.push({ desc: radNameStr, qty: 1, unit: 500, subtotal: 500 });
      });
    }

    if (matchedAdmission.operations && Array.isArray(matchedAdmission.operations)) {
      const completedOps = matchedAdmission.operations.filter((op: any) => op.result && op.result.trim() !== '');
      completedOps.forEach((op: any) => {
        const price = Number(op.charge || 0);
        if (price > 0) {
          list.push({ desc: `Operation: ${op.name} (${op.type})`, qty: 1, unit: price, subtotal: price });
        }
      });
    }

    return list;
  }, [billItems, matchedAdmission, patientLabOrders, patientRadOrders, wardCharges, wardNames]);

  const calculatedTotal = useMemo(() => {
    return displayBillItems.reduce((s: number, i: any) => s + (i.subtotal || 0), 0);
  }, [displayBillItems]);

  useEffect(() => {
  refresh();
  }, [refresh]);

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
    setDocs([]);
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

  const { page, setPage, pageSize, total, paged } = usePagination(filtered);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Pre-Authorizations</h1>
        </div>
        <button
          onClick={() => { resetForm(); setShowNewModal(true); }}
          className="px-4 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm text-sm w-max"
        >
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by request no, patient or UHID..."
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
                <th className="px-4 py-3 text-right">Sanctioned</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map(req => (
                <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-bold text-primary whitespace-nowrap">{req.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{req.patient}</div>
                    <div className="text-xs text-slate-500">{req.uhid}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{req.insurer}</td>
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
                      {/* Approval is now handled by the PRO Portal */}
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
        <Pagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} />
      </div>

      {/* ── New request ── */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0">
              <h2 className="text-lg font-bold text-slate-800">New Pre-Auth Request</h2>
              <button onClick={() => setShowNewModal(false)} className="p-2 hover:bg-slate-200 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">UHID <span className="text-red-500">*</span></label>
                  <select value={form.uhid}
                    onChange={e => setForm({ ...form, uhid: e.target.value })}
                    className={inputCls('uhid')}>
                    <option value="">Select Eligible Patient...</option>
                    {Array.from(new Map(policies.filter((p: any) => !preAuths.some((req: any) => req.uhid === p.uhid)).map((p: any) => [p.uhid, p])).values()).map((p: any) => (
                      <option key={p.id} value={p.uhid}>{p.patientName} ({p.uhid})</option>
                    ))}
                  </select>
                  {errors.uhid && <p className="text-[11px] text-red-500 mt-1">{errors.uhid}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Patient Name <span className="text-red-500">*</span></label>
                  <input type="text" value={form.patient}
                    onChange={e => setForm({ ...form, patient: e.target.value.replace(/[^A-Za-z\s.'-]/g, '') })}
                    className={inputCls('patient')} placeholder="Enter or auto-fetch name" />
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
                    No policy on record for this UHID — add it under Eligibility & Verification first.
                  </div>
                )
              )}

              {displayBillItems.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-slate-800">Discharge Bill Breakdown & Charge Summary</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5 text-left">Item Description</th>
                          <th className="px-4 py-2.5 text-right">Qty/Days</th>
                          <th className="px-4 py-2.5 text-right">Unit Price (₹)</th>
                          <th className="px-4 py-2.5 text-right">Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayBillItems.map((it: { desc: string; qty: number; unit: number; subtotal: number }, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 text-slate-700 font-medium">{it.desc}</td>
                            <td className="px-4 py-2.5 text-right text-slate-600">{it.qty}</td>
                            <td className="px-4 py-2.5 text-right text-slate-600">{it.unit ? it.unit.toLocaleString('en-IN') : '0'}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-800">{it.subtotal ? it.subtotal.toLocaleString('en-IN') : '0'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-emerald-50/70 border-t border-slate-200">
                        <tr>
                          <td colSpan={3} className="px-4 py-2.5 text-right font-semibold text-emerald-800">Total Estimated Cost</td>
                          <td className="px-4 py-2.5 text-right font-bold text-emerald-700 text-base">{calculatedTotal.toLocaleString('en-IN')}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}


              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Insurance Provider <span className="text-red-500">*</span></label>
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
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estimated Cost (₹) <span className="text-red-500">*</span></label>
                <input type="text" inputMode="numeric" value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value.replace(/\D/g, '') })}
                  className={inputCls('amount')} placeholder="Enter amount" />
                {errors.amount && <p className="text-[11px] text-red-500 mt-1">{errors.amount}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Provisional Diagnosis <span className="text-red-500">*</span></label>
                <textarea value={form.diagnosis} rows={2}
                  onChange={e => setForm({ ...form, diagnosis: e.target.value })}
                  className={inputCls('diagnosis')} placeholder="Clinical indication for the planned treatment" />
                {errors.diagnosis && <p className="text-[11px] text-red-500 mt-1">{errors.diagnosis}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Supporting Documents</label>
                <label
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); setDocs(prev => [...prev, ...Array.from(e.dataTransfer.files || [])]); }}
                  className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-slate-200 rounded-xl px-4 py-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                  <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                    onChange={e => setDocs(prev => [...prev, ...Array.from(e.target.files || [])])} />
                  <UploadCloud className="w-6 h-6 text-slate-400" />
                  <span className="text-sm text-slate-600 font-medium">Click or drag to upload Clinical Notes &amp; Estimates</span>
                  <span className="text-[11px] text-slate-400">PDF, JPG up to 10MB</span>
                </label>
                {docs.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {docs.map((f, i) => (
                      <li key={i} className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                        <span className="truncate text-slate-700 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-slate-400" />{f.name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => window.open(URL.createObjectURL(f), '_blank')}
                            className="text-slate-400 hover:text-primary transition-colors"
                            title="View Document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => setDocs(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
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

      {/* Decision modal removed. Approvals are now done by PRO. */}

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
                Note: Approving or rejecting this pre-auth is handled by the PRO department.
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
