import { API_BASE_URL } from '@/utils/apiBase';
import { useState, useEffect } from 'react';
import { IndianRupee, Receipt, ShieldCheck, Package, Clock, TrendingUp } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

const API_BASE = API_BASE_URL;
const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

interface Overview {
  pharmacyRevenueToday: number; pharmacyRevenueMonth: number; salesToday: number;
  insuranceReconciledMonth: number; insuranceOutstanding: number; claimsInProcess: number;
  stockValue: number;
  hospitalBilledMonth: number;
}
interface Series {
  history: { period: string; value: number }[];
  forecastPeriods: string[]; forecast: number[];
  observations: number; r2: number; method: string; partialPeriod?: string;
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

export const FinancialAnalyticsPage = () => {
  const [ov, setOv] = useState<Overview | null>(null);
  const [rev, setRev] = useState<Series | null>(null);
  const [loading, setLoading] = useState(true);

  // Only money the system actually bills is reported: pharmacy retail sales and
  // reconciled insurance settlements. The prototype showed ₹3.45 Cr monthly
  // revenue, ₹86 L net profit, AR/AP ageing and a P&L table, none of which had
  // a source — there is no Billing module.
  useEffect(() => {
    Promise.allSettled([
      fetch(`${API_BASE}/executive/overview`).then(r => r.json()),
      fetch(`${API_BASE}/executive/predictive`).then(r => r.json()),
    ]).then(([o, p]) => {
      if (o.status === 'fulfilled' && o.value && !o.value.detail) setOv(o.value);
      if (p.status === 'fulfilled' && p.value && !p.value.detail) setRev(p.value.revenue);
      setLoading(false);
    });
  }, []);

  const hist = rev?.history ?? [];
  const label = (p: string) => {
    const [y, m] = p.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  };
  // Monthly revenue is a handful of discrete values, often just the current
  // partial month. An area chart needs at least two points to draw anything,
  // so one month rendered as a lone dot on an empty canvas. Columns read
  // correctly at any count, including one.
  const isPartial = (period: string) => period === rev?.partialPeriod;

  // Short money labels keep the axis narrow: 662 -> Rs662, 81050 -> Rs81.1k.
  const compactInr = (v: number) => {
    const n = Math.round(v ?? 0);
    if (Math.abs(n) >= 10000000) return `\u20b9${(n / 10000000).toFixed(1)}Cr`;
    if (Math.abs(n) >= 100000) return `\u20b9${(n / 100000).toFixed(1)}L`;
    if (Math.abs(n) >= 1000) return `\u20b9${(n / 1000).toFixed(1)}k`;
    return `\u20b9${n.toLocaleString('en-IN')}`;
  };

  const trendOptions: ApexOptions = {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      fontFamily: 'Inter',
      parentHeightOffset: 0,
      animations: { enabled: true, speed: 400 },
    },
    plotOptions: {
      bar: {
        // Narrow columns so a single month is a bar, not a wall.
        columnWidth: hist.length <= 2 ? '22%' : hist.length <= 5 ? '40%' : '55%',
        borderRadius: 6,
        borderRadiusApplication: 'end',
        distributed: true,
      },
    },
    // The month still accumulating is muted, so it is not read as a finished
    // month sitting lower than the rest.
    colors: hist.map(h => (isPartial(h.period) ? '#a7f3d0' : '#10b981')),
    states: { hover: { filter: { type: 'darken' } } },
    dataLabels: {
      enabled: true,
      formatter: (v: number) => compactInr(v),
      offsetY: -20,
      style: { fontSize: '11px', fontWeight: 600, colors: ['#475569'] },
    },
    legend: { show: false },
    xaxis: {
      categories: hist.map(h => (isPartial(h.period) ? `${label(h.period)} (partial)` : label(h.period))),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: '#94a3b8', fontSize: '11px', fontWeight: 500 } },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: {
        formatter: (v: number) => compactInr(v),
        style: { colors: '#94a3b8', fontSize: '11px', fontWeight: 500 },
      },
    },
    grid: {
      borderColor: '#f1f5f9',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      padding: { top: 8, left: 4, right: 4 },
    },
    tooltip: {
      theme: 'light',
      y: { formatter: (v: number) => inr(v), title: { formatter: () => 'Revenue' } },
    },
  };

  // OP/IP billing was missing here, so the headline understated what the
  // system actually captured.
  const captured =
    (ov?.hospitalBilledMonth ?? 0) +
    (ov?.pharmacyRevenueMonth ?? 0) +
    (ov?.insuranceReconciledMonth ?? 0);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Financial Analytics</h1>
        <p className="text-xs text-slate-500">Revenue actually billed through the system</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPI title="Pharmacy Revenue Today" value={inr(ov?.pharmacyRevenueToday ?? 0)}
             sub={`${ov?.salesToday ?? 0} bills`} icon={IndianRupee} cls="text-emerald-600 bg-emerald-50" />
        <KPI title="Pharmacy Revenue (Month)" value={inr(ov?.pharmacyRevenueMonth ?? 0)}
             icon={Receipt} cls="text-teal-600 bg-teal-50" />
        <KPI title="Insurance Reconciled (Month)" value={inr(ov?.insuranceReconciledMonth ?? 0)}
             icon={ShieldCheck} cls="text-indigo-600 bg-indigo-50" />
        <KPI title="Total Captured (Month)" value={inr(captured)}
             sub="billing + pharmacy + insurance" icon={TrendingUp} cls="text-blue-600 bg-blue-50" />
        <KPI title="Awaiting Remittance" value={inr(ov?.insuranceOutstanding ?? 0)}
             sub={`${ov?.claimsInProcess ?? 0} claims in process`} icon={Clock} cls="text-amber-600 bg-amber-50" />
        <KPI title="Inventory Value" value={inr(ov?.stockValue ?? 0)}
             sub="at moving-average cost" icon={Package} cls="text-slate-600 bg-slate-100" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-bold text-slate-800">Pharmacy Revenue by Month</h3>
            <p className="text-[11px] text-slate-400">
              {rev?.observations ?? 0} completed month(s) recorded
              {rev?.partialPeriod && ' · current month still accumulating'}
            </p>
          </div>
        </div>
        {hist.length > 0
          ? <Chart options={trendOptions} series={[{ name: 'Revenue', data: hist.map(h => h.value) }]} type="bar" height={260} />
          : <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">
              {loading ? 'Loading…' : 'No paid pharmacy sales recorded yet.'}
            </div>}
      </div>

    </div>
  );
};
