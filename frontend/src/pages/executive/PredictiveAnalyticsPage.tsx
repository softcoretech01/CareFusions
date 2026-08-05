import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Package, BedDouble, Info } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

const API_BASE = import.meta.env.VITE_API_URL as string;
const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

interface Series {
  history: { period: string; value: number }[];
  forecastPeriods: string[];
  forecast: number[];
  observations: number;
  slope: number;
  r2: number;
  method: string;
  partialPeriod?: string;
}
interface Predictive {
  revenue: Series;
  admissions: Series;
  demandSignal: { itemName: string; issued: number; movements: number }[];
  wardPressure: { ward: string; occupied: number; total: number; utilisation: number }[];
}

const label = (p: string) => {
  const [y, m] = p.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
};

/** How well the fitted line explains the data — measured, not asserted. */
const fitQuality = (r2: number, obs: number) => {
  if (obs < 2) return { text: 'Insufficient history', cls: 'bg-slate-100 text-slate-600' };
  if (obs < 4) return { text: `Low confidence · ${obs} points`, cls: 'bg-amber-100 text-amber-700' };
  if (r2 >= 0.8) return { text: `Strong fit · R² ${r2}`, cls: 'bg-emerald-100 text-emerald-700' };
  if (r2 >= 0.5) return { text: `Moderate fit · R² ${r2}`, cls: 'bg-amber-100 text-amber-700' };
  return { text: `Weak fit · R² ${r2}`, cls: 'bg-rose-100 text-rose-700' };
};

const Trend = ({ slope }: { slope: number }) => {
  if (slope > 0) return <span className="text-emerald-600 flex items-center gap-1 text-xs font-bold"><TrendingUp className="w-3.5 h-3.5" /> Rising</span>;
  if (slope < 0) return <span className="text-rose-600 flex items-center gap-1 text-xs font-bold"><TrendingDown className="w-3.5 h-3.5" /> Falling</span>;
  return <span className="text-slate-500 flex items-center gap-1 text-xs font-bold"><Minus className="w-3.5 h-3.5" /> Flat</span>;
};

const ForecastCard = ({ title, s, format }: { title: string; s?: Series; format: (n: number) => string }) => {
  const q = fitQuality(s?.r2 ?? 0, s?.observations ?? 0);
  const enough = (s?.observations ?? 0) >= 2 && (s?.forecast?.length ?? 0) > 0;

  const options: ApexOptions = {
    chart: { type: 'line', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'Inter' },
    stroke: { curve: 'straight', width: 2, dashArray: [0, 6] },
    markers: { size: 4 },
    dataLabels: { enabled: false },
    xaxis: {
      categories: [
        ...(s?.history ?? []).map(h => h.period === s?.partialPeriod ? `${label(h.period)} (partial)` : label(h.period)),
        ...(s?.forecastPeriods ?? []).map(label),
      ],
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    colors: ['#6366f1', '#f59e0b'],
    legend: { position: 'top' },
  };
  const hist = (s?.history ?? []).map(h => h.value);
  const series = [
    { name: 'Actual', data: [...hist, ...(s?.forecast ?? []).map(() => null)] as any },
    // Join the forecast to the last actual point so the dashed line continues it.
    { name: 'Projected', data: [...hist.slice(0, -1).map(() => null), hist.at(-1) ?? null, ...(s?.forecast ?? [])] as any },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-bold text-slate-800">{title}</h3>
          <p className="text-[11px] text-slate-400">
            {s?.method ?? '—'}
            {s?.partialPeriod && (s?.observations ?? 0) > 0 && ' · current month excluded (incomplete)'}
          </p>
        </div>
        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${q.cls}`}>{q.text}</span>
      </div>

      {enough ? (
        <>
          <div className="flex items-baseline gap-3 mb-2">
            <p className="text-2xl font-bold text-slate-800">{format(s!.forecast[0])}</p>
            <span className="text-xs text-slate-500">next period</span>
            <Trend slope={s!.slope} />
          </div>
          <Chart options={options} series={series} type="line" height={220} />
        </>
      ) : (
        <div className="h-[220px] flex flex-col items-center justify-center text-center px-4">
          <Info className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-600">Not enough history to project</p>
          <p className="text-xs text-slate-400 mt-1">
            {s?.observations ?? 0} month(s) recorded. A trend needs at least two, and is only
            meaningful from about four.
          </p>
        </div>
      )}
    </div>
  );
};

export const PredictiveAnalyticsPage = () => {
  const [d, setD] = useState<Predictive | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/executive/predictive`)
      .then(r => r.json())
      .then(x => { if (!x.detail) setD(x); setLoading(false); })
      .catch(e => { console.error('[Executive] predictive load failed', e); setLoading(false); });
  }, []);

  const pressureCls = (u: number) =>
    u >= 90 ? 'bg-rose-100 text-rose-700' : u >= 75 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Predictive Analytics</h1>
        <p className="text-xs text-slate-500">
          Projections fitted to recorded history — each shows how well the trend actually fits
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-900">
          Forecasts are a least-squares trend over actual data, shown with the number of
          observations and the R² of the fit. The prototype displayed fixed figures with
          "85% Confidence" and "92% Confidence" badges that no model produced.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ForecastCard title="Pharmacy Revenue Forecast" s={d?.revenue} format={inr} />
        <ForecastCard title="Admissions Forecast" s={d?.admissions} format={n => `${Math.round(n)}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
            <BedDouble className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-slate-800">Ward Pressure</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">Ward</th>
                <th className="px-3 py-2 text-right">Beds</th>
                <th className="px-3 py-2 text-right">Utilisation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(d?.wardPressure ?? []).map(w => (
                <tr key={w.ward} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2 font-medium text-slate-800">{w.ward}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{w.occupied}/{w.total}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={`px-2 py-1 text-[11px] font-bold rounded-lg ${pressureCls(w.utilisation)}`}>
                      {w.utilisation}%
                    </span>
                  </td>
                </tr>
              ))}
              {(!d?.wardPressure || d.wardPressure.length === 0) && (
                <tr><td colSpan={3} className="px-3 py-8 text-center text-slate-400">
                  {loading ? 'Loading…' : 'No wards configured.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800">Demand Signal — Most Consumed (90 days)</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-right">Issued</th>
                <th className="px-3 py-2 text-right">Movements</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(d?.demandSignal ?? []).map(i => (
                <tr key={i.itemName} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2 font-medium text-slate-800">{i.itemName}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800">{i.issued}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{i.movements}</td>
                </tr>
              ))}
              {(!d?.demandSignal || d.demandSignal.length === 0) && (
                <tr><td colSpan={3} className="px-3 py-8 text-center text-slate-400">
                  {loading ? 'Loading…' : 'No stock has been issued in the last 90 days.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(d?.wardPressure ?? []).some(w => w.utilisation >= 90) && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-800">
            One or more wards are at or above 90% utilisation — plan capacity before the next admission wave.
          </p>
        </div>
      )}
    </div>
  );
};
