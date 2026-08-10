import { useMemo, useState, useEffect } from 'react';
import { Pagination } from '../../components/ui/Pagination';
import { Package, IndianRupee, PackageX, CalendarClock, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useInventory } from '../../contexts/InventoryContext';

const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const InventoryDashboard = () => {
  const { dashboard, stock, ledger, loading } = useInventory();

  const kpis = [
    { label: 'Items in Stock', value: String(dashboard?.totalItems ?? 0), icon: Package, cls: 'text-blue-600 bg-blue-50' },
    { label: 'Stock Value', value: inr(dashboard?.stockValue ?? 0), icon: IndianRupee, cls: 'text-emerald-600 bg-emerald-50' },
    { label: "Today's Inward", value: String(dashboard?.todayInward ?? 0), icon: ArrowDownToLine, cls: 'text-teal-600 bg-teal-50' },
    { label: "Today's Outward", value: String(dashboard?.todayOutward ?? 0), icon: ArrowUpFromLine, cls: 'text-purple-600 bg-purple-50' },
    { label: 'Out of Stock', value: String(dashboard?.outOfStock ?? 0), icon: PackageX, cls: 'text-rose-600 bg-rose-50' },
    { label: 'Expiring (90d)', value: String(dashboard?.expiringSoon ?? 0), icon: CalendarClock, cls: 'text-amber-600 bg-amber-50' },
  ];

  // Real 7-day movement trend from the ledger. The prototype fabricated this
  // chart with Math.random() whenever a day had no data.
  const trend = dashboard?.trend ?? [];
  const chartOptions: ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'Inter' },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: trend.map(t => new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })),
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    colors: ['#10b981', '#f43f5e'],
    legend: { position: 'top' },
    tooltip: { theme: 'light' },
  };
  const chartSeries = [
    { name: 'Inward', data: trend.map(t => t.inQty) },
    { name: 'Outward', data: trend.map(t => t.outQty) },
  ];

  const recent = useMemo(() => ledger.slice(0, 8), [ledger]);

  // Stock grouped per store, paginated like every other inventory list.
  const byStore = useMemo(() => Object.values(stock.reduce((acc: Record<string, any>, r) => {
    const k = r.storeName;
    acc[k] = acc[k] || { storeName: k, lots: 0, qty: 0, value: 0 };
    acc[k].lots += 1; acc[k].qty += r.quantity; acc[k].value += r.stockValue;
    return acc;
  }, {})) as { storeName: string; lots: number; qty: number; value: number }[], [stock]);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(byStore.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const pagedStores = byStore.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Inventory Overview</h1>
        <p className="text-xs text-slate-500">Live stock position and movement activity</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${k.cls}`}>
              <k.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{k.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-bold text-slate-800 mb-3">Movement Trend — Last 7 Days</h3>
          {trend.length > 0 ? (
            <Chart options={chartOptions} series={chartSeries} type="area" height={260} />
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">
              {loading ? 'Loading…' : 'No movements in the last 7 days.'}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Recent Movements</h3>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[280px] divide-y divide-slate-100">
            {recent.map(r => (
              <div key={r.ledgerId} className="px-4 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{r.itemName}</p>
                  <p className="text-[11px] text-slate-500">{r.docNumber} · {r.storeName}</p>
                </div>
                <span className={`text-sm font-bold shrink-0 ${r.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {r.quantity > 0 ? '+' : ''}{r.quantity}
                </span>
              </div>
            ))}
            {recent.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-slate-400">
                {loading ? 'Loading…' : 'No movements yet.'}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Stock by Store</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">Store</th>
                <th className="px-3 py-2 text-right">Lots</th>
                <th className="px-3 py-2 text-right">Total Qty</th>
                <th className="px-3 py-2 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedStores.map(s => (
                <tr key={s.storeName} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2 font-medium text-slate-800">{s.storeName}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{s.lots}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{s.qty}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800">{inr(s.value)}</td>
                </tr>
              ))}
              {stock.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  {loading ? 'Loading…' : 'No stock on hand.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} totalItems={byStore.length} onPageChange={setPage} />
      </div>
    </div>
  );
};
