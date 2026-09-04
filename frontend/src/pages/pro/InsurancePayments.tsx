import { API_BASE_URL } from '@/utils/apiBase';
import React, { useState, useEffect } from 'react';
import { Loader, AlertCircle, ShieldCheck, DollarSign, Search, Calendar, X, CheckCircle, Ban } from 'lucide-react';
import toast from 'react-hot-toast';

const API = API_BASE_URL + '/pro';
const API_BASE = API_BASE_URL;

const StatusBadge = ({ status }: { status?: string }) => {
  if (!status) return null;
  const map: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    PENDING_CLAIM: 'bg-amber-100 text-amber-700',
    SUBMITTED: 'bg-blue-100 text-blue-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    PARTIALLY_APPROVED: 'bg-yellow-100 text-yellow-700',
    REJECTED: 'bg-red-100 text-red-700',
    EXPIRED: 'bg-slate-100 text-slate-500',
    UNPAID: 'bg-orange-100 text-orange-700',
    PAID: 'bg-green-100 text-green-700',
    NOT_REQUIRED: 'bg-slate-100 text-slate-500',
    CLAIMED: 'bg-indigo-100 text-indigo-700',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

const EmptyState = ({ icon: Icon, message }: { icon: any; message: string }) => (
  <div className="text-center py-16 text-slate-400">
    <Icon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
    <p className="font-medium">{message}</p>
    <p className="text-sm mt-1">No records match the current filter.</p>
  </div>
);

import { monthStart, today } from '../../components/ui/DateFilter';

export const InsurancePayments = () => {
  const [activeTab, setActiveTab] = useState<'insurance' | 'payments'>('insurance');
  const [insuranceClaims, setInsuranceClaims] = useState<any[]>([]);
  const [advanceBills, setAdvanceBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());

  const [reviewAuth, setReviewAuth] = useState<any>(null);
  const [approvedAmount, setApprovedAmount] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch insurance claims and pending payments from backend
        const [insuranceRes, paymentsRes] = await Promise.all([
          fetch(`${API}/insurance`),
          fetch(`${API}/payments/pending`)
        ]);
        if (insuranceRes.ok) setInsuranceClaims(await insuranceRes.json());
        if (paymentsRes.ok) setAdvanceBills(await paymentsRes.json());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredClaims = insuranceClaims.filter(c => {
    if (dateFrom && c.CreatedAt < dateFrom) return false;
    if (dateTo && c.CreatedAt > dateTo + 'T23:59:59') return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return c.PreAuthNumber?.toLowerCase().includes(s) || c.UHID?.toLowerCase().includes(s) || String(c.ServiceOrderId).includes(s);
  });

  const filteredBills = advanceBills.filter(b => {
    if (dateFrom && b.CreatedAt < dateFrom) return false;
    if (dateTo && b.CreatedAt > dateTo + 'T23:59:59') return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return b.AdvanceNo?.toLowerCase().includes(s) || b.UHID?.toLowerCase().includes(s) || String(b.ServiceOrderId).includes(s);
  });

  const handleReviewAction = async (status: 'Approved' | 'Rejected') => {
    if (!reviewAuth) return;
    try {
      const res = await fetch(`${API_BASE}/insurance/pre-auths/${reviewAuth.PreAuthId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status,
          approvedAmount: Number(approvedAmount) || 0
        })
      });
      if (!res.ok) throw new Error('Failed to update pre-authorization status');
      
      toast.success(`Pre-Authorization ${status}`);
      setInsuranceClaims(prev => prev.map(c => 
        c.PreAuthId === reviewAuth.PreAuthId 
          ? { ...c, Status: status.toUpperCase(), ApprovedAmount: Number(approvedAmount) || 0 }
          : c
      ));
      setReviewAuth(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Insurance & Payments</h1>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm shrink-0">
          <span className="text-slate-500 text-sm font-medium">From :</span>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <span className="text-slate-500 text-sm font-medium ml-1">to :</span>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          <button className="bg-[#086450] text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-[#075342] transition-colors">
            Search
          </button>
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="bg-slate-100 text-slate-700 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-700 font-medium flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        PRO is a monitoring-only portal for payments. Payment collection is handled by Billing/Finance.
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-2 pt-2">
          {([
            { label: 'Insurance Authorization', value: 'insurance', icon: ShieldCheck },
          ] as any[]).map((tab: any) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl transition-colors ${activeTab === tab.value ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search bar & Filters */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[300px]">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search No, UHID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-full px-3 py-1 text-xs font-semibold">
            {activeTab === 'insurance' ? filteredClaims.length : filteredBills.length} Total
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="w-6 h-6 animate-spin text-emerald-500" />
            <span className="ml-3 text-slate-400 text-sm">Loading...</span>
          </div>
        ) : error ? (
          <div className="m-4 bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">{error}</div>
        ) : activeTab === 'insurance' ? (
          filteredClaims.length === 0 ? (
            <EmptyState icon={ShieldCheck} message="No insurance claims found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-semibold">S.No</th>
                    <th className="px-4 py-3 text-left font-semibold">Auth No</th>
                    <th className="px-4 py-3 text-left font-semibold">UHID</th>
                    <th className="px-4 py-3 text-left font-semibold">Requested</th>
                    <th className="px-4 py-3 text-left font-semibold">Approved</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.map((claim: any, idx: number) => (
                    <tr key={claim.PreAuthId ?? idx} className="border-t border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{claim.PreAuthNumber || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{claim.UHID}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">₹{parseFloat(claim.RequestedAmount ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">₹{parseFloat(claim.ApprovedAmount ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3"><StatusBadge status={claim.Status} /></td>
                      <td className="px-4 py-3 text-center">
                        {claim.Status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setReviewAuth(claim);
                              setApprovedAmount(claim.RequestedAmount?.toString() || '0');
                            }}
                            className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-emerald-100 transition-colors"
                          >
                            Review
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          filteredBills.length === 0 ? (
            <EmptyState icon={DollarSign} message="No pending payments" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-semibold">S.No</th>
                    <th className="px-4 py-3 text-left font-semibold">Advance No</th>
                    <th className="px-4 py-3 text-left font-semibold">UHID</th>
                    <th className="px-4 py-3 text-left font-semibold">Total Amount</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.map((bill: any, idx: number) => (
                    <tr key={bill.AdvanceId ?? idx} className="border-t border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{bill.AdvanceNo}</td>
                      <td className="px-4 py-3 text-slate-600">{bill.UHID}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">₹{parseFloat(bill.TotalAmount ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3"><StatusBadge status={bill.Status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {reviewAuth && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Review Pre-Authorization</h2>
              <button onClick={() => setReviewAuth(null)} className="p-2 hover:bg-slate-200 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3 text-sm grid grid-cols-2 gap-2">
                <div><span className="text-slate-500">Auth No:</span> <span className="font-semibold text-slate-700">{reviewAuth.PreAuthNumber || '—'}</span></div>
                <div><span className="text-slate-500">UHID:</span> <span className="font-semibold text-slate-700">{reviewAuth.UHID}</span></div>
                <div><span className="text-slate-500">Patient:</span> <span className="font-semibold text-slate-700">{reviewAuth.PatientName || '—'}</span></div>
                <div><span className="text-slate-500">Requested:</span> <span className="font-semibold text-emerald-700">₹{parseFloat(reviewAuth.RequestedAmount || 0).toFixed(2)}</span></div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Approved Amount (₹) <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="Enter approved amount"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  onClick={() => handleReviewAction('Rejected')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-colors"
                >
                  <Ban className="w-4 h-4" /> Reject
                </button>
                <button 
                  onClick={() => handleReviewAction('Approved')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
