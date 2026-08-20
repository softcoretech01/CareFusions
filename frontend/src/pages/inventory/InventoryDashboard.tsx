import { useMemo, useState, useEffect } from 'react';
import { Pagination } from '../../components/ui/Pagination';
import { DateFilter } from '../../components/ui/DateFilter';
import { Package, IndianRupee, PackageX, CalendarClock, ArrowDownToLine, ArrowUpFromLine, X, Search } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { useInventory } from '../../contexts/InventoryContext';

const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;


type DrillCol = { key: string; label: string; mono?: boolean; right?: boolean };
type DrillRow = Record<string, string | number>;

/** Drill-down list for one KPI card, rendered inline under the tiles. */
const DetailsPanel = ({
  label, icon: Icon, cls, cols, rows, note, onClose,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  cls: string;
  cols: DrillCol[];
  rows: DrillRow[];
  note?: string;
  onClose: () => void;
}) => {
  const [q, setQ] = useState('');

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(r => cols.some(c => String(r[c.key] ?? '').toLowerCase().includes(needle)));
  }, [rows, q, cols]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-100">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cls}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800">{label}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {shown.length === rows.length
              ? `${rows.length} record${rows.length === 1 ? '' : 's'}`
              : `${shown.length} of ${rows.length} records`}
            {note ? ` \u00b7 ${note}` : ''}
          </p>
        </div>
        <div className="relative w-56 hidden sm:block">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <button onClick={onClose} title="Close" className="p-2 hover:bg-slate-100 rounded-xl transition-colors shrink-0">
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <div className="overflow-auto max-h-[340px]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2.5 w-12">#</th>
              {cols.map(c => (
                <th key={c.key} className={`px-4 py-2.5 whitespace-nowrap ${c.right ? 'text-right' : ''}`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.length === 0 ? (
              <tr>
                <td colSpan={cols.length + 1} className="text-center py-12 text-slate-400 text-sm">
                  No records to show.
                </td>
              </tr>
            ) : shown.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-2.5 text-xs text-slate-400 tabular-nums">{i + 1}</td>
                {cols.map(c => (
                  <td key={c.key} className={`px-4 py-2.5 text-sm text-slate-700 ${c.right ? 'text-right tabular-nums font-medium' : ''} ${c.mono ? 'font-mono text-xs' : ''}`}>
                    {String(r[c.key] ?? '\u2014')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const InventoryDashboard = () => {
  const { dashboard, stock, ledger, loading } = useInventory();

  // ── Date range ─────────────────────────────────────────────
  // Movement figures follow this range. Stock position (items, value, out of
  // stock, expiry) is always "as of now" - a range cannot change what is on
  // the shelf right now, so those tiles say so rather than pretending.
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayKey = iso(new Date());
  const weekAgoKey = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return iso(d); })();

  const [dateFrom, setDateFrom] = useState(weekAgoKey);
  const [dateTo, setDateTo] = useState(todayKey);
  const [appliedFrom, setAppliedFrom] = useState(weekAgoKey);
  const [appliedTo, setAppliedTo] = useState(todayKey);

  const applyRange = () => { setAppliedFrom(dateFrom); setAppliedTo(dateTo); };
  const resetRange = () => {
    setDateFrom(weekAgoKey); setDateTo(todayKey);
    setAppliedFrom(weekAgoKey); setAppliedTo(todayKey);
  };

  const short = (k: string) =>
    new Date(k).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const rangeLabel =
    appliedFrom === appliedTo
      ? (appliedFrom === todayKey ? 'Today' : short(appliedFrom))
      : `${short(appliedFrom)} \u2013 ${short(appliedTo)}`;

  // Movements inside the range, taken from the ledger the context already
  // holds, so the tiles, the chart and the drill-downs cannot disagree.
  const inRange = useMemo(
    () => ledger.filter(l => {
      const k = String(l.txnDate).slice(0, 10);
      return k >= appliedFrom && k <= appliedTo;
    }),
    [ledger, appliedFrom, appliedTo],
  );

  const inwardQty = inRange.filter(l => l.quantity > 0).reduce((a, l) => a + l.quantity, 0);
  const outwardQty = inRange.filter(l => l.quantity < 0).reduce((a, l) => a - l.quantity, 0);

  const kpis = [
    { key: 'items', label: 'Items in Stock', value: String(dashboard?.totalItems ?? 0), sub: 'as of now', icon: Package, cls: 'text-blue-600 bg-blue-50' },
    { key: 'value', label: 'Stock Value', value: inr(dashboard?.stockValue ?? 0), sub: 'as of now', icon: IndianRupee, cls: 'text-emerald-600 bg-emerald-50' },
    { key: 'inward', label: 'Inward', value: inwardQty.toLocaleString('en-IN'), sub: rangeLabel, icon: ArrowDownToLine, cls: 'text-teal-600 bg-teal-50' },
    { key: 'outward', label: 'Outward', value: outwardQty.toLocaleString('en-IN'), sub: rangeLabel, icon: ArrowUpFromLine, cls: 'text-purple-600 bg-purple-50' },
    { key: 'oos', label: 'Out of Stock', value: String(dashboard?.outOfStock ?? 0), sub: 'as of now', icon: PackageX, cls: 'text-rose-600 bg-rose-50' },
    { key: 'expiring', label: 'Expiring (90d)', value: String(dashboard?.expiringSoon ?? 0), sub: 'as of now', icon: CalendarClock, cls: 'text-amber-600 bg-amber-50' },
  ];

  const [drill, setDrill] = useState<string | null>(null);

  const daysUntil = (d: string) =>
    Math.ceil((new Date(d).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);

  // Every drill-down repeats the filter its KPI query uses, so the list always
  // reconciles with the tile above it.
  const DRILLS: Record<string, { label: string; icon: typeof Package; cls: string; cols: DrillCol[]; rows: DrillRow[]; note?: string }> = {
    items: {
      label: 'Items in Stock', icon: Package, cls: 'text-blue-600 bg-blue-50',
      note: 'distinct items, lots merged',
      cols: [
        { key: 'itemCode', label: 'Code', mono: true },
        { key: 'itemName', label: 'Item' },
        { key: 'category', label: 'Category' },
        { key: 'lots', label: 'Lots', right: true },
        { key: 'qty', label: 'Qty', right: true },
        { key: 'uom', label: 'UOM' },
        { key: 'value', label: 'Value', right: true },
      ],
      rows: Object.values(stock.reduce((acc: Record<string, any>, r) => {
        const k = String(r.itemId);
        acc[k] = acc[k] || { itemCode: r.itemCode, itemName: r.itemName, category: r.category, uom: r.uom, lots: 0, q: 0, v: 0 };
        acc[k].lots += 1; acc[k].q += r.quantity; acc[k].v += r.stockValue;
        return acc;
      }, {})).map((x: any) => ({
        itemCode: x.itemCode, itemName: x.itemName, category: x.category,
        lots: x.lots, qty: x.q, uom: x.uom, value: inr(x.v),
      })),
    },
    value: {
      label: 'Stock Value by Lot', icon: IndianRupee, cls: 'text-emerald-600 bg-emerald-50',
      note: 'highest value first',
      cols: [
        { key: 'itemName', label: 'Item' },
        { key: 'batchNo', label: 'Batch', mono: true },
        { key: 'storeName', label: 'Store' },
        { key: 'quantity', label: 'Qty', right: true },
        { key: 'rate', label: 'Rate', right: true },
        { key: 'value', label: 'Value', right: true },
      ],
      rows: [...stock].sort((a, b) => b.stockValue - a.stockValue).map(r => ({
        itemName: r.itemName, batchNo: r.batchNo, storeName: r.storeName,
        quantity: r.quantity, rate: inr(r.valuationRate), value: inr(r.stockValue),
      })),
    },
    inward: {
      label: `Inward Movements \u00b7 ${rangeLabel}`, icon: ArrowDownToLine, cls: 'text-teal-600 bg-teal-50',
      note: 'the tile shows total quantity, not row count',
      cols: [
        { key: 'docNumber', label: 'Document', mono: true },
        { key: 'itemName', label: 'Item' },
        { key: 'batchNo', label: 'Batch', mono: true },
        { key: 'storeName', label: 'Store' },
        { key: 'movementType', label: 'Type' },
        { key: 'quantity', label: 'Qty In', right: true },
        { key: 'value', label: 'Value', right: true },
      ],
      rows: inRange.filter(l => l.quantity > 0).map(l => ({
        docNumber: l.docNumber, itemName: l.itemName, batchNo: l.batchNo, storeName: l.storeName,
        movementType: l.movementType, quantity: l.quantity, value: inr(l.value),
      })),
    },
    outward: {
      label: `Outward Movements \u00b7 ${rangeLabel}`, icon: ArrowUpFromLine, cls: 'text-purple-600 bg-purple-50',
      note: 'the tile shows total quantity, not row count',
      cols: [
        { key: 'docNumber', label: 'Document', mono: true },
        { key: 'itemName', label: 'Item' },
        { key: 'batchNo', label: 'Batch', mono: true },
        { key: 'storeName', label: 'Store' },
        { key: 'movementType', label: 'Type' },
        { key: 'quantity', label: 'Qty Out', right: true },
        { key: 'value', label: 'Value', right: true },
      ],
      rows: inRange.filter(l => l.quantity < 0).map(l => ({
        docNumber: l.docNumber, itemName: l.itemName, batchNo: l.batchNo, storeName: l.storeName,
        movementType: l.movementType, quantity: Math.abs(l.quantity), value: inr(l.value),
      })),
    },
    oos: {
      label: 'Out of Stock Lots', icon: PackageX, cls: 'text-rose-600 bg-rose-50',
      cols: [
        { key: 'itemCode', label: 'Code', mono: true },
        { key: 'itemName', label: 'Item' },
        { key: 'storeName', label: 'Store' },
        { key: 'batchNo', label: 'Batch', mono: true },
        { key: 'quantity', label: 'Qty', right: true },
        { key: 'reorderLevel', label: 'Reorder At', right: true },
      ],
      rows: stock.filter(r => r.quantity <= 0).map(r => ({
        itemCode: r.itemCode, itemName: r.itemName, storeName: r.storeName,
        batchNo: r.batchNo, quantity: r.quantity, reorderLevel: r.reorderLevel ?? '\u2014',
      })),
    },
    expiring: {
      label: 'Expiring Within 90 Days', icon: CalendarClock, cls: 'text-amber-600 bg-amber-50',
      note: 'soonest first',
      cols: [
        { key: 'itemName', label: 'Item' },
        { key: 'batchNo', label: 'Batch', mono: true },
        { key: 'storeName', label: 'Store' },
        { key: 'expiryDate', label: 'Expires' },
        { key: 'daysLeft', label: 'Days Left', right: true },
        { key: 'quantity', label: 'Qty', right: true },
        { key: 'value', label: 'Value', right: true },
      ],
      rows: stock
        .filter(r => r.expiryDate && r.quantity > 0 && daysUntil(r.expiryDate) <= 90)
        .sort((a, b) => String(a.expiryDate).localeCompare(String(b.expiryDate)))
        .map(r => ({
          itemName: r.itemName, batchNo: r.batchNo, storeName: r.storeName,
          expiryDate: String(r.expiryDate).slice(0, 10), daysLeft: daysUntil(r.expiryDate as string),
          quantity: r.quantity, value: inr(r.stockValue),
        })),
    },
  };

  // Movement trend across the applied range, built from the ledger so the
  // chart, the tiles and the drill-downs are all the same numbers. Days with
  // no movement are filled with zero, otherwise a single busy day renders as
  // one lonely point on an empty canvas.
  const last7 = useMemo(() => {
    const from = new Date(appliedFrom);
    const to = new Date(appliedTo);
    from.setHours(0, 0, 0, 0);
    to.setHours(0, 0, 0, 0);

    const buckets = new Map<string, { inQty: number; outQty: number }>();
    for (const l of inRange) {
      const k = String(l.txnDate).slice(0, 10);
      const b = buckets.get(k) ?? { inQty: 0, outQty: 0 };
      if (l.quantity > 0) b.inQty += l.quantity; else b.outQty -= l.quantity;
      buckets.set(k, b);
    }

    const out: { label: string; inQty: number; outQty: number }[] = [];
    // Guard against a silly range dragging the browser to a halt.
    for (let d = new Date(from), n = 0; d <= to && n < 370; d.setDate(d.getDate() + 1), n++) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const hit = buckets.get(key);
      out.push({
        label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        inQty: hit?.inQty ?? 0,
        outQty: hit?.outQty ?? 0,
      });
    }
    return out;
  }, [inRange, appliedFrom, appliedTo]);

  const hasMovement = last7.some(d => d.inQty > 0 || d.outQty > 0);

  const compact = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n);

  const chartOptions: ApexOptions = {
    chart: {
      type: 'area',
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'Inter',
      parentHeightOffset: 0,
      animations: { enabled: true, speed: 400 },
    },
    stroke: { curve: 'smooth', width: 2.5, lineCap: 'round' },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.28, opacityTo: 0.02, stops: [0, 90, 100] },
    },
    dataLabels: { enabled: false },
    // Markers make a single active day readable instead of invisible.
    markers: { size: 4, strokeWidth: 2, strokeColors: '#fff', hover: { size: 6 } },
    xaxis: {
      categories: last7.map(d => d.label),
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
      labels: { style: { colors: '#94a3b8', fontSize: '11px', fontWeight: 500 } },
    },
    yaxis: {
      labels: {
        formatter: (v: number) => compact(Math.round(v)),
        style: { colors: '#94a3b8', fontSize: '11px', fontWeight: 500 },
      },
    },
    grid: {
      borderColor: '#f1f5f9',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      padding: { left: 8, right: 8, top: 0 },
    },
    colors: ['#10b981', '#f43f5e'],
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      offsetY: -4,
      markers: { size: 6 },
      fontSize: '12px',
      fontWeight: 500,
      labels: { colors: '#64748b' },
    },
    tooltip: {
      theme: 'light',
      shared: true,
      intersect: false,
      y: { formatter: (v: number) => `${(v ?? 0).toLocaleString('en-IN')} units` },
    },
  };
  const chartSeries = [
    { name: 'Inward', data: last7.map(d => d.inQty) },
    { name: 'Outward', data: last7.map(d => d.outQty) },
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Inventory Overview</h1>
          <p className="text-xs text-slate-500">Live stock position and movement activity</p>
        </div>
        <DateFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onSearch={applyRange}
          onReset={resetRange}
          defaultDateFrom={weekAgoKey}
          defaultDateTo={todayKey}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(k => {
          const count = DRILLS[k.key].rows.length;
          return (
            <button
              type="button"
              key={k.label}
              onClick={() => count > 0 && setDrill(drill === k.key ? null : k.key)}
              disabled={count === 0}
              title={count > 0 ? `View ${k.label.toLowerCase()}` : 'Nothing to list'}
              className={`bg-white p-4 rounded-2xl shadow-sm border text-left w-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                drill === k.key ? 'border-primary/40 ring-1 ring-primary/20' : 'border-slate-100'
              } enabled:hover:shadow-md enabled:hover:border-primary/30 enabled:cursor-pointer disabled:cursor-default`}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${k.cls}`}>
                <k.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-slate-800">{k.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{k.sub}</p>
            </button>
          );
        })}
      </div>

      {drill && DRILLS[drill] && (
        <DetailsPanel
          key={drill}
          label={DRILLS[drill].label}
          icon={DRILLS[drill].icon}
          cls={DRILLS[drill].cls}
          cols={DRILLS[drill].cols}
          rows={DRILLS[drill].rows}
          note={DRILLS[drill].note}
          onClose={() => setDrill(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="font-bold text-slate-800">Movement Trend</h3>
            <span className="text-xs font-medium text-slate-400">{rangeLabel}</span>
          </div>
          {hasMovement ? (
            <Chart options={chartOptions} series={chartSeries} type="area" height={260} />
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">
              {loading ? 'Loading…' : 'No movements in this range.'}
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
