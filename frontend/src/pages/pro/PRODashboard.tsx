import { API_BASE_URL } from '@/utils/apiBase';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, CheckCircle, XCircle, ShieldAlert, DollarSign,
  ClipboardList, Activity, BarChart2, AlertCircle, Loader,
  Calendar, Search, X
} from 'lucide-react';
import { monthStart, today } from '../../components/ui/DateFilter';

const API = API_BASE_URL + '/pro';

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
  const [dashboardOrders, setDashboardOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL_PENDING');

  const getTableTitle = () => {
    switch (activeFilter) {
      case 'ALL_PENDING': return 'Pending PRO Reviews';
      case 'OPD_PENDING': return 'OPD Pending Reviews';
      case 'IPD_PENDING': return 'IPD Pending Reviews';
      case 'OPERATIONS_PENDING': return 'Operations Pending Reviews';
      case 'INSURANCE_PENDING': return 'Insurance Pending Orders';
      case 'APPROVED': return 'Approved Orders';
      case 'REJECTED': return 'Rejected Orders';
      case 'PAYMENT_PENDING': return 'Payment Pending Orders';
      case 'SERVICES_RELEASED': return 'Released Services';
      case 'AWAITING_CLEARANCE': return 'Awaiting Clearance';
      default: return 'PRO Reviews';
    }
  };



  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = `date_from=${dateFrom}&date_to=${dateTo}`;
      const [kpiRes, ordersRes] = await Promise.all([
        fetch(`${API}/dashboard/kpis?${qs}`),
        fetch(`${API}/orders?${qs}`)
      ]);
      if (!kpiRes.ok) throw new Error('Failed to load KPIs');
      setKpis(await kpiRes.json());
      if (ordersRes.ok) setDashboardOrders(await ordersRes.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredOrders = dashboardOrders.filter(o => {
    if (dateFrom && o.OrderDate < dateFrom) return false;
    if (dateTo && o.OrderDate > dateTo + 'T23:59:59') return false;
    
    switch (activeFilter) {
      case 'ALL_PENDING': if (o.PROStatus !== 'PENDING' && o.PROStatus !== 'UNDER_REVIEW') return false; break;
      case 'OPD_PENDING': if (o.SourceModule !== 'OPD' || (o.PROStatus !== 'PENDING' && o.PROStatus !== 'UNDER_REVIEW')) return false; break;
      case 'IPD_PENDING': if (o.SourceModule !== 'IPD' || (o.PROStatus !== 'PENDING' && o.PROStatus !== 'UNDER_REVIEW')) return false; break;
      case 'OPERATIONS_PENDING': if (o.OrderType !== 'OPERATION' || (o.PROStatus !== 'PENDING' && o.PROStatus !== 'UNDER_REVIEW')) return false; break;
      case 'INSURANCE_PENDING': if (o.AuthorizationStatus !== 'PENDING') return false; break;
      case 'APPROVED': if (o.PROStatus !== 'APPROVED') return false; break;
      case 'REJECTED': if (o.PROStatus !== 'REJECTED') return false; break;
      case 'PAYMENT_PENDING': if (o.PaymentStatus !== 'UNPAID' || o.PROStatus !== 'APPROVED' || o.ServiceStatus === 'CANCELLED') return false; break;
      case 'SERVICES_RELEASED': if (o.ServiceStatus !== 'RELEASED') return false; break;
      case 'AWAITING_CLEARANCE': if (o.ServiceStatus !== 'NOT_RELEASED' || o.PROStatus !== 'APPROVED' || o.PaymentStatus !== 'UNPAID') return false; break;
    }

    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.OrderNo?.toLowerCase().includes(s) ||
      o.UHID?.toLowerCase().includes(s) ||
      o.PatientName?.toLowerCase().includes(s)
    );
  });

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">PRO Dashboard</h1>

        {/* Date Filter */}
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
          <button onClick={loadData} className="bg-[#086450] text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-[#075342] transition-colors">
            Search
          </button>
          <button
            onClick={() => { setDateFrom(monthStart()); setDateTo(today()); }}
            className="bg-slate-100 text-slate-700 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* KPI Cards — Row 1: Pending */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Pending Reviews</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard title="Total Pending" value={kpis?.pending_reviews} icon={Clock} color={activeFilter === 'ALL_PENDING' ? "bg-amber-100 text-amber-700 ring-2 ring-amber-400" : "bg-amber-50 text-amber-600"} onClick={() => setActiveFilter('ALL_PENDING')} />
          <StatCard title="OPD Pending" value={kpis?.opd_pending} icon={ClipboardList} color={activeFilter === 'OPD_PENDING' ? "bg-blue-100 text-blue-700 ring-2 ring-blue-400" : "bg-blue-50 text-blue-600"} onClick={() => setActiveFilter('OPD_PENDING')} />
          <StatCard title="IPD Pending" value={kpis?.ipd_pending} icon={Activity} color={activeFilter === 'IPD_PENDING' ? "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-400" : "bg-indigo-50 text-indigo-600"} onClick={() => setActiveFilter('IPD_PENDING')} />
          <StatCard title="Operations Pending" value={kpis?.operations_pending} icon={BarChart2} color={activeFilter === 'OPERATIONS_PENDING' ? "bg-purple-100 text-purple-700 ring-2 ring-purple-400" : "bg-purple-50 text-purple-600"} onClick={() => setActiveFilter('OPERATIONS_PENDING')} />
          <StatCard title="Insurance Pending" value={kpis?.insurance_pending} icon={ShieldAlert} color={activeFilter === 'INSURANCE_PENDING' ? "bg-orange-100 text-orange-700 ring-2 ring-orange-400" : "bg-orange-50 text-orange-600"} onClick={() => setActiveFilter('INSURANCE_PENDING')} />
        </div>
      </div>

      {/* KPI Cards — Row 2: Status */}
      <div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard title="Approved" value={kpis?.approved_today} icon={CheckCircle} color={activeFilter === 'APPROVED' ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400" : "bg-emerald-50 text-emerald-600"} onClick={() => setActiveFilter('APPROVED')} />
          <StatCard title="Rejected" value={kpis?.rejected_today} icon={XCircle} color={activeFilter === 'REJECTED' ? "bg-red-100 text-red-700 ring-2 ring-red-400" : "bg-red-50 text-red-600"} onClick={() => setActiveFilter('REJECTED')} />
          <StatCard title="Payment Pending" value={kpis?.payment_pending} icon={DollarSign} color={activeFilter === 'PAYMENT_PENDING' ? "bg-yellow-100 text-yellow-700 ring-2 ring-yellow-400" : "bg-yellow-50 text-yellow-600"} onClick={() => setActiveFilter('PAYMENT_PENDING')} />
          <StatCard title="Services Released" value={kpis?.services_released} icon={CheckCircle} color={activeFilter === 'SERVICES_RELEASED' ? "bg-teal-100 text-teal-700 ring-2 ring-teal-400" : "bg-teal-50 text-teal-600"} onClick={() => setActiveFilter('SERVICES_RELEASED')} />
          <StatCard title="Awaiting Clearance" value={kpis?.services_awaiting_clearance} icon={Clock} color={activeFilter === 'AWAITING_CLEARANCE' ? "bg-slate-200 text-slate-700 ring-2 ring-slate-400" : "bg-slate-100 text-slate-600"} onClick={() => setActiveFilter('AWAITING_CLEARANCE')} />
        </div>
      </div>

      {/* Pending Reviews Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <h2 className="font-bold text-slate-700">{getTableTitle()}</h2>
          <div className="relative flex-1 max-w-sm ml-auto">
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
          <button 
            onClick={() => {
              if (activeFilter === 'IPD_PENDING') navigate('/pro/service-orders/ipd');
              else if (activeFilter === 'OPERATIONS_PENDING') navigate('/pro/service-orders/operations');
              else navigate('/pro/service-orders/opd');
            }} 
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 shrink-0"
          >
            View All →
          </button>
        </div>
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
            <p className="font-medium">No pending reviews</p>
            <p className="text-sm">All service orders have been reviewed or none match the criteria.</p>
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
                {filteredOrders.slice(0, 10).map((order: any, idx: number) => (
                  <tr key={order.ServiceOrderId} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{order.OrderNo}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{order.PatientName ?? order.UHID}</td>
                    <td className="px-4 py-3 text-slate-500">{order.SourceModule}</td>
                    <td className="px-4 py-3"><StatusBadge status={order.PROStatus} /></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          if (order.OrderType === 'OPERATION') navigate('/pro/service-orders/operations');
                          else if (order.SourceModule === 'IPD') navigate('/pro/service-orders/ipd');
                          else navigate('/pro/service-orders/opd');
                        }}
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
