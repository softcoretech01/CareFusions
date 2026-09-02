import React, { useState, useEffect } from 'react';
import { Loader, CheckCircle, XCircle, Clock, Activity, ChevronRight, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:8000/api/v1/pro';

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
  { label: 'Release Monitor', value: 'release', icon: Activity },
];

export const ApprovalsRelease = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('pending');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let url = `${API}/orders`;
        if (activeTab === 'pending') url += '?status=PENDING';
        else if (activeTab === 'approved') url += '?status=APPROVED';
        else if (activeTab === 'rejected') url += '?status=REJECTED';
        else url += '?status=APPROVED'; // Release Monitor shows approved orders

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

  const renderPendingTab = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <th className="px-4 py-3 text-left font-semibold">#</th>
            <th className="px-4 py-3 text-left font-semibold">Order No</th>
            <th className="px-4 py-3 text-left font-semibold">Patient</th>
            <th className="px-4 py-3 text-left font-semibold">UHID</th>
            <th className="px-4 py-3 text-left font-semibold">Type</th>
            <th className="px-4 py-3 text-left font-semibold">PRO Status</th>
            <th className="px-4 py-3 text-left font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o: any, idx: number) => (
            <tr key={o.ServiceOrderId} className="border-t border-slate-50 hover:bg-amber-50/30">
              <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-600">{o.OrderNo}</td>
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
            <th className="px-4 py-3 text-left font-semibold">#</th>
            <th className="px-4 py-3 text-left font-semibold">Order No</th>
            <th className="px-4 py-3 text-left font-semibold">Patient</th>
            <th className="px-4 py-3 text-left font-semibold">Type</th>
            <th className="px-4 py-3 text-left font-semibold">PRO Status</th>
            <th className="px-4 py-3 text-left font-semibold">Payment</th>
            <th className="px-4 py-3 text-left font-semibold">Financial</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o: any, idx: number) => (
            <tr key={o.ServiceOrderId} className="border-t border-slate-50 hover:bg-emerald-50/20">
              <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-600">{o.OrderNo}</td>
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
            <th className="px-4 py-3 text-left font-semibold">#</th>
            <th className="px-4 py-3 text-left font-semibold">Order No</th>
            <th className="px-4 py-3 text-left font-semibold">Patient</th>
            <th className="px-4 py-3 text-left font-semibold">Type</th>
            <th className="px-4 py-3 text-left font-semibold">PRO Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o: any, idx: number) => (
            <tr key={o.ServiceOrderId} className="border-t border-slate-50 hover:bg-red-50/20">
              <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-600">{o.OrderNo}</td>
              <td className="px-4 py-3 font-medium text-slate-700">{o.PatientName ?? '—'}</td>
              <td className="px-4 py-3"><span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{o.SourceModule}</span></td>
              <td className="px-4 py-3"><StatusBadge status={o.PROStatus} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderReleaseMonitor = () => (
    <div className="overflow-x-auto">
      <div className="p-4 bg-blue-50 border-b border-blue-100">
        <p className="text-sm text-blue-700 font-medium">
          ℹ️ Service release is fully backend-controlled. Items are only released when PRO Approved + Payment Completed + Financial Cleared.
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <th className="px-4 py-3 text-left font-semibold">#</th>
            <th className="px-4 py-3 text-left font-semibold">Order No</th>
            <th className="px-4 py-3 text-left font-semibold">Patient</th>
            <th className="px-4 py-3 text-left font-semibold">PRO</th>
            <th className="px-4 py-3 text-left font-semibold">Payment</th>
            <th className="px-4 py-3 text-left font-semibold">Financial</th>
            <th className="px-4 py-3 text-left font-semibold">Service Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o: any, idx: number) => (
            <tr key={o.ServiceOrderId} className="border-t border-slate-50 hover:bg-teal-50/20">
              <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-600">{o.OrderNo}</td>
              <td className="px-4 py-3 font-medium text-slate-700">{o.PatientName ?? '—'}</td>
              <td className="px-4 py-3"><StatusBadge status={o.PROStatus} /></td>
              <td className="px-4 py-3"><StatusBadge status={o.PaymentStatus} /></td>
              <td className="px-4 py-3"><StatusBadge status={o.FinancialStatus} /></td>
              <td className="px-4 py-3">
                <StatusBadge status={o.Items?.[0]?.ServiceStatus ?? 'PENDING'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Approvals & Release</h1>
        <p className="text-slate-500 text-sm mt-1">Review pending services, track approvals, rejections, and release monitor</p>
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
            : activeTab === 'rejected' ? renderRejectedTab()
              : renderReleaseMonitor()
        }
      </div>
    </div>
  );
};
