import { useState, useEffect } from 'react';
import { Users, BedDouble, Activity, CalendarCheck, LogOut, Clock } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { Pagination } from '../../components/ui/Pagination';

const API_BASE = import.meta.env.VITE_API_URL as string;

interface Clinical {
  admissionsToday: number;
  dischargesToday: number;
  currentInpatients: number;
  appointmentsToday: number;
  registrationsToday: number;
  avgLengthOfStay: number;
  totalBeds: number;
  occupiedBeds: number;
  bedOccupancyPct: number;
  bedOccupancy: { wardId: number; name: string; total: number; occupied: number }[];
  admissionsTrend: { date: string; ipd: number; opd: number }[];
  bySpecialty: { specialty: string; admissions: number; avgStay: number }[];
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

export const ClinicalAnalyticsPage = () => {
  const [data, setData] = useState<Clinical | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/executive/clinical`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { console.error('[Executive] clinical load failed', e); setLoading(false); });
  }, []);

  const trend = data?.admissionsTrend ?? [];
  const trendOptions: ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'Inter' },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05 } },
    dataLabels: { enabled: false },
    // One category per data point — the prototype filtered the labels to every
    // 5th day while keeping all 30 points, so the axis was misaligned.
    xaxis: {
      categories: trend.map(t => new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })),
      tickAmount: 6, axisBorder: { show: false }, axisTicks: { show: false },
    },
    colors: ['#6366f1', '#10b981'],
    legend: { position: 'top' },
  };
  const trendSeries = [
    { name: 'OPD Appointments', data: trend.map(t => t.opd) },
    { name: 'IPD Admissions', data: trend.map(t => t.ipd) },
  ];

  const beds = data?.bedOccupancy ?? [];
  const bedOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, stacked: true, fontFamily: 'Inter' },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: beds.map(b => b.name) },
    colors: ['#6366f1', '#e2e8f0'],
    legend: { position: 'top' },
  };
  // Occupied vs free, so a 1/2 ICU is not visually dwarfed by a 1/4 ward —
  // the prototype plotted only the occupied count.
  const bedSeries = [
    { name: 'Occupied', data: beds.map(b => b.occupied) },
    { name: 'Available', data: beds.map(b => Math.max(b.total - b.occupied, 0)) },
  ];

  const specialties = data?.bySpecialty ?? [];
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(specialties.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const paged = specialties.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Clinical Analytics</h1>
        <p className="text-xs text-slate-500">Live activity from admissions, appointments and registrations</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPI title="OPD Appointments Today" value={data?.appointmentsToday ?? 0} icon={CalendarCheck} cls="text-blue-600 bg-blue-50" />
        <KPI title="Admissions Today" value={data?.admissionsToday ?? 0} icon={Users} cls="text-indigo-600 bg-indigo-50" />
        <KPI title="Discharges Today" value={data?.dischargesToday ?? 0} icon={LogOut} cls="text-teal-600 bg-teal-50" />
        <KPI title="Current Inpatients" value={data?.currentInpatients ?? 0} icon={Activity} cls="text-purple-600 bg-purple-50" />
        <KPI title="Bed Occupancy"
             value={`${data?.bedOccupancyPct ?? 0}%`}
             sub={`${data?.occupiedBeds ?? 0} of ${data?.totalBeds ?? 0} beds`}
             icon={BedDouble} cls="text-amber-600 bg-amber-50" />
        <KPI title="Avg Length of Stay"
             value={`${data?.avgLengthOfStay ?? 0}d`} sub="last 90 days"
             icon={Clock} cls="text-emerald-600 bg-emerald-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-bold text-slate-800 mb-2">Patient Volume — Last 30 Days</h3>
          {trend.length > 0
            ? <Chart options={trendOptions} series={trendSeries} type="area" height={260} />
            : <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">
                {loading ? 'Loading…' : 'No activity in the last 30 days.'}
              </div>}
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-bold text-slate-800 mb-2">Bed Occupancy by Ward</h3>
          {beds.length > 0
            ? <Chart options={bedOptions} series={bedSeries} type="bar" height={260} />
            : <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">
                {loading ? 'Loading…' : 'No wards configured.'}
              </div>}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Admissions by Specialty</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">Specialty</th>
                <th className="px-3 py-2 text-right">Admissions</th>
                <th className="px-3 py-2 text-right">Avg Stay (days)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map(s => (
                <tr key={s.specialty} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2 font-medium text-slate-800">{s.specialty}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800">{s.admissions}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{s.avgStay || '—'}</td>
                </tr>
              ))}
              {specialties.length === 0 && (
                <tr><td colSpan={3} className="px-3 py-8 text-center text-slate-400">
                  {loading ? 'Loading…' : 'No admissions recorded.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} totalItems={specialties.length} onPageChange={setPage} />
      </div>

    </div>
  );
};
