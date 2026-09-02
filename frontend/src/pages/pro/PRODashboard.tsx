import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, CheckCircle, XCircle, ShieldAlert, DollarSign,
  ClipboardList, Activity, BarChart2, AlertCircle, Loader
} from 'lucide-react';

const API = 'http://localhost:8000/api/v1/pro';

const StatCard = ({
  title, value, icon: Icon, color, onClick
}: {
  title: string; value: number | string; icon: any; color: string; onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 ${onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
  >
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <p className="text-3xl font-bold text-slate-800">{value ?? 0}</p>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-700',
    UNDER_REVIEW: 'bg-blue-100 text-blue-700',
    RELEASED: 'bg-teal-100 text-teal-700',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

export const PRODashboard = () => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<any>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [kpiRes, ordersRes] = await Promise.all([
          fetch(`${API}/dashboard/kpis`),
          fetch(`${API}/orders/pending`)
        ]);
        if (!kpiRes.ok) throw new Error('Failed to load KPIs');
        setKpis(await kpiRes.json());
        if (ordersRes.ok) setPendingOrders(await ordersRes.json());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader className="w-8 h-8 animate-spin text-emerald-500" />
      <span className="ml-3 text-slate-500 font-medium">Loading dashboard...</span>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-3">
      <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
      <div>
        <p className="font-semibold text-red-700">Failed to load dashboard</p>
        <p className="text-sm text-red-500 mt-1">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">PRO Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Patient Relations Officer — Financial Review & Approval Control</p>
      </div>

      {/* KPI Cards — Row 1: Pending */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Pending Reviews</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard title="Total Pending" value={kpis?.pending_reviews} icon={Clock} color="bg-amber-50 text-amber-600" onClick={() => navigate('/pro/service-orders')} />
          <StatCard title="OPD Pending" value={kpis?.opd_pending} icon={ClipboardList} color="bg-blue-50 text-blue-600" onClick={() => navigate('/pro/service-orders')} />
          <StatCard title="IPD Pending" value={kpis?.ipd_pending} icon={Activity} color="bg-indigo-50 text-indigo-600" onClick={() => navigate('/pro/service-orders')} />
          <StatCard title="Operations Pending" value={kpis?.operations_pending} icon={BarChart2} color="bg-purple-50 text-purple-600" onClick={() => navigate('/pro/service-orders')} />
          <StatCard title="Insurance Pending" value={kpis?.insurance_pending} icon={ShieldAlert} color="bg-orange-50 text-orange-600" onClick={() => navigate('/pro/insurance-payments')} />
        </div>
      </div>

      {/* KPI Cards — Row 2: Status */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Today's Activity</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard title="Approved Today" value={kpis?.approved_today} icon={CheckCircle} color="bg-emerald-50 text-emerald-600" onClick={() => navigate('/pro/approvals')} />
          <StatCard title="Rejected Today" value={kpis?.rejected_today} icon={XCircle} color="bg-red-50 text-red-600" onClick={() => navigate('/pro/approvals')} />
          <StatCard title="Payment Pending" value={kpis?.payment_pending} icon={DollarSign} color="bg-yellow-50 text-yellow-600" onClick={() => navigate('/pro/insurance-payments')} />
          <StatCard title="Services Released" value={kpis?.services_released} icon={CheckCircle} color="bg-teal-50 text-teal-600" onClick={() => navigate('/pro/approvals')} />
          <StatCard title="Awaiting Clearance" value={kpis?.services_awaiting_clearance} icon={Clock} color="bg-slate-100 text-slate-600" onClick={() => navigate('/pro/approvals')} />
        </div>
      </div>

      {/* Pending Reviews Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-700">Pending PRO Reviews</h2>
          <button onClick={() => navigate('/pro/service-orders')} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">View All →</button>
        </div>
        {pendingOrders.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
            <p className="font-medium">No pending reviews</p>
            <p className="text-sm">All service orders have been reviewed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="px-4 py-3 text-left font-semibold">#</th>
                  <th className="px-4 py-3 text-left font-semibold">Order No</th>
                  <th className="px-4 py-3 text-left font-semibold">Patient</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">PRO Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.slice(0, 10).map((order: any, idx: number) => (
                  <tr key={order.ServiceOrderId} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{order.OrderNo}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{order.PatientName ?? order.UHID}</td>
                    <td className="px-4 py-3 text-slate-500">{order.SourceModule}</td>
                    <td className="px-4 py-3"><StatusBadge status={order.PROStatus} /></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate('/pro/service-orders')}
                        className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
