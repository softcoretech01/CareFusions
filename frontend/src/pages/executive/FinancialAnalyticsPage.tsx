import { useState, useEffect } from 'react';
import { IndianRupee, Receipt, ShieldCheck, Package, Clock, TrendingUp } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { NoDataNotice } from '../../components/ui/NoDataNotice';

const API_BASE = import.meta.env.VITE_API_URL as string;
const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

interface Overview {
  pharmacyRevenueToday: number; pharmacyRevenueMonth: number; salesToday: number;
  insuranceReconciledMonth: number; insuranceOutstanding: number; claimsInProcess: number;
  stockValue: number;
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
  const trendOptions: ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, fontFamily: 'Inter' },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: hist.map(h => h.period === rev?.partialPeriod ? `${label(h.period)} (partial)` : label(h.period)),
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: v => inr(v) } },
    colors: ['#10b981'],
  };

  const captured = (ov?.pharmacyRevenueMonth ?? 0) + (ov?.insuranceReconciledMonth ?? 0);

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
             sub="pharmacy + insurance" icon={TrendingUp} cls="text-blue-600 bg-blue-50" />
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
          ? <Chart options={trendOptions} series={[{ name: 'Revenue', data: hist.map(h => h.value) }]} type="area" height={260} />
          : <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">
              {loading ? 'Loading…' : 'No paid pharmacy sales recorded yet.'}
            </div>}
      </div>

      <NoDataNotice
        title="P&L, expenses, cash flow, AR/AP ageing and margins"
        needs="Billing / General Ledger"
        detail="Consultation, procedure, room and investigation charges are not billed through the system, so total hospital revenue and profit cannot be derived. The figures above are the money that genuinely passes through Pharmacy and Insurance."
      />
    </div>
  );
};
