import { API_BASE_URL } from '@/utils/apiBase';
import { useState, useEffect } from 'react';
import { CalendarCheck, Clock, FlaskConical, Pill, XCircle, Hourglass } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

const API_BASE = API_BASE_URL;

interface Operational {
  appointmentsToday: number; cancelledToday: number; waitingToday: number;
  labTatMinutes: number; labPending: number; dispensesToday: number;
  byHour: { hour: string; count: number }[];
  byStatus: { status: string; count: number }[];
}

const KPI = ({ title, value, sub, icon: Icon, cls }: any) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${cls}`}>
      <Icon className="w-5 h-5" />
    </div>
    <p className="text-2xl font-bold text-slate-800">{value}</p>
    <p className="text-xs text-slate-500 mt-0.5">{title}</p>
    {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

export const OperationalAnalyticsPage = () => {
  const [d, setD] = useState<Operational | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/executive/operational`)
      .then(r => r.json())
      .then(x => { if (!x.detail) setD(x); setLoading(false); })
      .catch(e => { console.error('[Executive] operational load failed', e); setLoading(false); });
  }, []);

  const byHour = d?.byHour ?? [];
  const hourOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter' },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: byHour.map(h => h.hour), axisBorder: { show: false }, axisTicks: { show: false } },
    colors: ['#6366f1'],
  };

  const byStatus = d?.byStatus ?? [];
  const statusOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'Inter' },
    labels: byStatus.map(s => s.status),
    colors: ['#10b981', '#6366f1', '#f59e0b', '#f43f5e', '#06b6d4'],
    dataLabels: { enabled: false },
    legend: { position: 'bottom' },
    stroke: { width: 0 },
  };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Operational Analytics</h1>
        <p className="text-xs text-slate-500">Throughput and turnaround from appointments, lab and pharmacy</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPI title="Appointments Today" value={d?.appointmentsToday ?? 0} icon={CalendarCheck} cls="text-blue-600 bg-blue-50" />
        <KPI title="Awaiting Consultation" value={d?.waitingToday ?? 0} icon={Hourglass} cls="text-amber-600 bg-amber-50" />
        <KPI title="Cancelled Today" value={d?.cancelledToday ?? 0} icon={XCircle} cls="text-rose-600 bg-rose-50" />
        <KPI title="Lab Turnaround" value={`${d?.labTatMinutes ?? 0}m`} sub="collection to result" icon={Clock} cls="text-teal-600 bg-teal-50" />
        <KPI title="Lab Tests Pending" value={d?.labPending ?? 0} icon={FlaskConical} cls="text-cyan-600 bg-cyan-50" />
        <KPI title="Pharmacy Dispenses" value={d?.dispensesToday ?? 0} sub="today" icon={Pill} cls="text-emerald-600 bg-emerald-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-bold text-slate-800 mb-2">Booking Volume by Hour — Last 30 Days</h3>
          {byHour.length > 0
            ? <Chart options={hourOptions} series={[{ name: 'Appointments', data: byHour.map(h => h.count) }]} type="bar" height={260} />
            : <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">
                {loading ? 'Loading…' : 'No appointments in the last 30 days.'}
              </div>}
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-bold text-slate-800 mb-2">Appointment Outcomes</h3>
          {byStatus.length > 0
            ? <Chart options={statusOptions} series={byStatus.map(s => s.count)} type="donut" height={260} />
            : <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">
                {loading ? 'Loading…' : 'No appointment data.'}
              </div>}
        </div>
      </div>

    </div>
  );
};
