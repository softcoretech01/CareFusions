import { useEffect, useState } from 'react';
import { ClipboardList, FileText, PackageCheck, IndianRupee } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

const API_BASE = import.meta.env.VITE_API_URL as string;
const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

interface Dashboard {
  totalPRs: number;
  totalPOs: number;
  totalGRNs: number;
  totalSpend: number;
  spendByCategory: { label: string; value: number }[];
  topVendors: { name: string; po: number; fulfill: number; qs: number }[];
  trendSeries: { month: string; pos: number; grns: number }[];
}

// Same tile as the other executive analytics pages, so this screen keeps the
// look it already had on Financial and Operational.
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

/**
 * Procurement Analytics
 *
 * Reads /procurement-dashboard, the same endpoint the Procurement module's own
 * dashboard uses, so the two screens cannot disagree. This page used to render
 * a "no data source yet" notice, which was true when it was written; the
 * endpoint exists now and returns real PR/PO/GRN activity.
 */
export const ProcurementAnalyticsPage = () => {
  const [d, setD] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/procurement-dashboard`)
      .then(r => r.json())
      .then(v => { if (v && !v.detail) setD(v); })
      .catch(e => console.error('[Executive] procurement load failed', e))
      .finally(() => setLoading(false));
  }, []);

  const categories = d?.spendByCategory ?? [];
  const vendors = d?.topVendors ?? [];
  const trend = d?.trendSeries ?? [];

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'Inter' },
    labels: categories.map(c => c.label),
    colors: ['#2563EB', '#8b5cf6', '#F59E0B', '#06B6D4', '#22C55E'],
    dataLabels: { enabled: false },
    legend: { position: 'bottom', fontSize: '12px' },
    stroke: { width: 0 },
    tooltip: { y: { formatter: (v: number) => inr(v) } },
  };

  const barOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter' },
    colors: ['#2563EB', '#22C55E'],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '45%' } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: {
      categories: trend.map(t => t.month),
      axisBorder: { show: false }, axisTicks: { show: false },
      labels: { style: { colors: '#94a3b8', fontSize: '11px', fontWeight: 500 } },
    },
    yaxis: { labels: { style: { colors: '#94a3b8', fontSize: '11px', fontWeight: 500 } } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4, xaxis: { lines: { show: false } } },
    legend: { position: 'top', horizontalAlign: 'right', fontSize: '12px' },
    tooltip: { theme: 'light' },
  };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Procurement Analytics</h1>
        <p className="text-xs text-slate-500">Purchase requisitions, orders, vendor performance and spend</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI title="Purchase Requisitions" value={d?.totalPRs ?? 0} icon={ClipboardList} cls="text-blue-600 bg-blue-50" />
        <KPI title="Purchase Orders" value={d?.totalPOs ?? 0} icon={FileText} cls="text-violet-600 bg-violet-50" />
        <KPI title="Goods Receipts" value={d?.totalGRNs ?? 0} icon={PackageCheck} cls="text-emerald-600 bg-emerald-50" />
        <KPI title="Total Spend" value={inr(d?.totalSpend ?? 0)} sub="across received goods"
             icon={IndianRupee} cls="text-amber-600 bg-amber-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-bold text-slate-800 mb-3">Purchase Orders vs Goods Receipts</h3>
          {trend.length > 0 ? (
            <Chart
              options={barOptions}
              series={[
                { name: 'Purchase Orders', data: trend.map(t => t.pos) },
                { name: 'Goods Receipts', data: trend.map(t => t.grns) },
              ]}
              type="bar"
              height={260}
            />
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">
              {loading ? 'Loading…' : 'No procurement activity recorded.'}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-bold text-slate-800 mb-3">Spend by Category</h3>
          {categories.length > 0 ? (
            <Chart options={donutOptions} series={categories.map(c => c.value)} type="donut" height={260} />
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-slate-400 text-center px-4">
              {loading ? 'Loading…' : 'No categorised spend yet.'}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Top Vendors</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-2.5">Vendor</th>
                <th className="px-4 py-2.5 text-right">Purchase Orders</th>
                <th className="px-4 py-2.5 text-right">Fulfilment</th>
                <th className="px-4 py-2.5 text-right">Quality Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendors.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                    {loading ? 'Loading…' : 'No vendor activity recorded.'}
                  </td>
                </tr>
              ) : vendors.map(v => (
                <tr key={v.name} className="hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 text-sm font-medium text-slate-800">{v.name}</td>
                  <td className="px-4 py-2.5 text-sm text-right text-slate-600 tabular-nums">{v.po}</td>
                  <td className="px-4 py-2.5 text-sm text-right tabular-nums">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      v.fulfill >= 90 ? 'bg-green-100 text-green-700'
                        : v.fulfill >= 70 ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-600'
                    }`}>
                      {v.fulfill}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-right text-slate-600 tabular-nums">{v.qs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
