import React, { useState, useEffect } from 'react';
import { Loader, CheckCircle, XCircle, Clock, ChevronRight, Eye, Search, Calendar, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = (import.meta.env.VITE_API_URL as string || 'http://localhost:8000/api/v1') + '/pro';

const StatusBadge = ({ status }: { status?: string }) => {
  if (!status) return null;
  const map: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-700',
    UNDER_REVIEW: 'bg-blue-100 text-blue-700',
    RELEASED: 'bg-teal-100 text-teal-700',
    UNPAID: 'bg-orange-100 text-orange-700',
    PAID: 'bg-green-100 text-green-700',
    CLEARED: 'bg-emerald-100 text-emerald-700',
    NOT_REQUIRED: 'bg-slate-100 text-slate-500',
    NOT_RELEASED: 'bg-red-50 text-red-400',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

const TABS = [
  { label: 'Pending Approval', value: 'pending', icon: Clock },
  { label: 'Approved', value: 'approved', icon: CheckCircle },
  { label: 'Rejected', value: 'rejected', icon: XCircle },
];

export const ApprovalsRelease = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const currentDate = now.toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(currentMonthStart);
  const [dateTo, setDateTo] = useState(currentDate);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let url = `${API}/orders`;
        if (activeTab === 'pending') url += '?status=PENDING';
        else if (activeTab === 'approved') url += '?status=APPROVED';
        else if (activeTab === 'rejected') url += '?status=REJECTED';

        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load');
        setOrders(await res.json());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeTab]);

  const filtered = orders.filter(o => {
    if (dateFrom && o.OrderDate < dateFrom) return false;
    if (dateTo && o.OrderDate > dateTo + 'T23:59:59') return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.OrderNo?.toLowerCase().includes(s) ||
      o.UHID?.toLowerCase().includes(s) ||
      o.PatientName?.toLowerCase().includes(s)
    );
  });

  const renderPendingTab = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <th className="px-4 py-3 text-left font-semibold">S.No</th>
            <th className="px-4 py-3 text-left font-semibold">Patient</th>
            <th className="px-4 py-3 text-left font-semibold">UHID</th>
            <th className="px-4 py-3 text-left font-semibold">Type</th>
            <th className="px-4 py-3 text-left font-semibold">PRO Status</th>
            <th className="px-4 py-3 text-left font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((o: any, idx: number) => (
            <tr key={o.ServiceOrderId} className="border-t border-slate-50 hover:bg-amber-50/30">
              <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
              <td className="px-4 py-3 font-medium text-slate-700">{o.PatientName ?? '—'}</td>
              <td className="px-4 py-3 text-slate-500">{o.UHID}</td>
              <td className="px-4 py-3"><span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{o.SourceModule}</span></td>
              <td className="px-4 py-3"><StatusBadge status={o.PROStatus} /></td>
              <td className="px-4 py-3">
                <button
                  onClick={() => navigate('/pro/service-orders')}
                  className="flex items-center gap-1 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                >
                  <ChevronRight className="w-3 h-3" /> Review
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderApprovedTab = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <th className="px-4 py-3 text-left font-semibold">S.No</th>
            <th className="px-4 py-3 text-left font-semibold">Patient</th>
            <th className="px-4 py-3 text-left font-semibold">Type</th>
            <th className="px-4 py-3 text-left font-semibold">PRO Status</th>
            <th className="px-4 py-3 text-left font-semibold">Payment</th>
            <th className="px-4 py-3 text-left font-semibold">Financial</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((o: any, idx: number) => (
            <tr key={o.ServiceOrderId} className="border-t border-slate-50 hover:bg-emerald-50/20">
              <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
              <td className="px-4 py-3 font-medium text-slate-700">{o.PatientName ?? '—'}</td>
              <td className="px-4 py-3"><span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{o.SourceModule}</span></td>
              <td className="px-4 py-3"><StatusBadge status={o.PROStatus} /></td>
              <td className="px-4 py-3"><StatusBadge status={o.PaymentStatus} /></td>
              <td className="px-4 py-3"><StatusBadge status={o.FinancialStatus} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderRejectedTab = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <th className="px-4 py-3 text-left font-semibold">S.No</th>
            <th className="px-4 py-3 text-left font-semibold">Patient</th>
            <th className="px-4 py-3 text-left font-semibold">Type</th>
            <th className="px-4 py-3 text-left font-semibold">PRO Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((o: any, idx: number) => (
            <tr key={o.ServiceOrderId} className="border-t border-slate-50 hover:bg-red-50/20">
              <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
              <td className="px-4 py-3 font-medium text-slate-700">{o.PatientName ?? '—'}</td>
              <td className="px-4 py-3"><span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{o.SourceModule}</span></td>
              <td className="px-4 py-3"><StatusBadge status={o.PROStatus} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );



  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Approvals & Release</h1>
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

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-2 pt-2 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl whitespace-nowrap transition-colors ${activeTab === tab.value ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
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
                placeholder="Search Order No, UHID, Patient..."
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
            {filtered.length} Total
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="w-6 h-6 animate-spin text-emerald-500" />
            <span className="ml-3 text-slate-400 text-sm">Loading...</span>
          </div>
        ) : error ? (
          <div className="m-4 bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">{error}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No records</p>
          </div>
        ) : activeTab === 'pending' ? renderPendingTab()
          : activeTab === 'approved' ? renderApprovedTab()
            : renderRejectedTab()
        }
      </div>
    </div>
  );
};
