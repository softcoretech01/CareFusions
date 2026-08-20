import { useState, useEffect, useMemo } from 'react';
import { Package, IndianRupee, PackageX, CalendarClock, TrendingDown } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { Pagination } from '../../components/ui/Pagination';

const API_BASE = import.meta.env.VITE_API_URL as string;
const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

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

export const InventoryAnalyticsPage = () => {
  const [valuation, setValuation] = useState<{ category: string; itemCount: number; totalQty: number; totalValue: number }[]>([]);
  const [low, setLow] = useState<any[]>([]);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Every figure comes from the inventory backend. The prototype hardcoded the
  // ₹85.4M total and generated the consumption trend with Math.random().
  useEffect(() => {
    const get = (p: string) => fetch(`${API_BASE}/inventory/${p}`).then(r => r.json());
    Promise.allSettled([
      get('stock/valuation'), get('stock/low'), get('stock/expiring?days=90'),
      get('ledger'), get('dashboard'),
    ]).then(([v, l, e, lg, d]) => {
      if (v.status === 'fulfilled' && Array.isArray(v.value)) setValuation(v.value);
      if (l.status === 'fulfilled' && Array.isArray(l.value)) setLow(l.value);
      if (e.status === 'fulfilled' && Array.isArray(e.value)) setExpiring(e.value);
      if (lg.status === 'fulfilled' && Array.isArray(lg.value)) setLedger(lg.value);
      if (d.status === 'fulfilled' && d.value && !Array.isArray(d.value)) setDash(d.value);
      setLoading(false);
    });
  }, []);

  const totalValue = valuation.reduce((s, v) => s + v.totalValue, 0);
  const expiredValue = expiring.filter(e => e.daysToExpiry < 0).length;

  // Real monthly consumption from issue/write-off movements.
  const consumption = useMemo(() => {
    const acc: Record<string, number> = {};
    ledger.filter(l => l.quantity < 0).forEach(l => {
      const d = new Date(l.txnDate);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      acc[k] = (acc[k] || 0) + Math.abs(l.value);
    });
    return Object.entries(acc).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
      .map(([month, value]) => ({ month, value }));
  }, [ledger]);

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'Inter' },
    labels: valuation.map(v => v.category),
    colors: ['#2563EB', '#8b5cf6', '#F59E0B', '#06B6D4', '#22C55E', '#ef4444'],
    dataLabels: { enabled: false },
    legend: { position: 'bottom' },
    stroke: { width: 0 },
  };

  const consumptionOptions: ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, fontFamily: 'Inter' },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: consumption.map(c => {
        const [y, m] = c.month.split('-');
        return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      }),
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: v => inr(v) } },
    colors: ['#f43f5e'],
  };

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(low.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const paged = low.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Inventory Analytics</h1>
        <p className="text-xs text-slate-500">Stock position and consumption at moving-average cost</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPI title="Total Stock Value" value={inr(totalValue)} icon={IndianRupee} cls="text-emerald-600 bg-emerald-50" />
        <KPI title="Items in Stock" value={dash?.totalItems ?? 0} icon={Package} cls="text-blue-600 bg-blue-50" />
        <KPI title="Below Reorder Level" value={low.length} icon={TrendingDown} cls="text-amber-600 bg-amber-50" />
        <KPI title="Out of Stock" value={dash?.outOfStock ?? 0} icon={PackageX} cls="text-rose-600 bg-rose-50" />
        <KPI title="Expiring / Expired" value={expiring.length}
             sub={`${expiredValue} already expired`} icon={CalendarClock} cls="text-purple-600 bg-purple-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-bold text-slate-800 mb-2">Consumption Value by Month</h3>
          {consumption.length > 0
            ? <Chart options={consumptionOptions} series={[{ name: 'Consumed', data: consumption.map(c => c.value) }]} type="area" height={260} />
            : <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">
                {loading ? 'Loading…' : 'No stock has been issued yet.'}
              </div>}
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-bold text-slate-800 mb-2">Value by Category</h3>
          {valuation.length > 0
            ? <Chart options={donutOptions} series={valuation.map(v => v.totalValue)} type="donut" height={260} />
            : <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">
                {loading ? 'Loading…' : 'No stock to value.'}
              </div>}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Items Below Reorder Level</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-right">On Hand</th>
                <th className="px-3 py-2 text-right">Reorder Level</th>
                <th className="px-3 py-2 text-right">Deficit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map(r => (
                <tr key={r.itemId} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-800">{r.itemName}</div>
                    <div className="text-xs text-slate-500">{r.itemCode}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{r.category || '—'}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{r.quantity} {r.uom}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{r.reorderLevel}</td>
                  <td className="px-3 py-2 text-right font-bold text-rose-600">{r.deficit}</td>
                </tr>
              ))}
              {low.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                  {loading ? 'Loading…' : 'No items are below their reorder level.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} totalItems={low.length} onPageChange={setPage} />
      </div>

    </div>
  );
};
