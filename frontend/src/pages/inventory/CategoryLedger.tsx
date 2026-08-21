import { useState, useMemo, useEffect } from 'react';
import { INVENTORY_TYPES } from '../../utils/inventoryTypes';
import { Pagination } from '../../components/ui/Pagination';
import { PageHeader } from '../../components/inventory/PageHeader';
import { AutoStatusBadge } from '../../components/inventory/StatusBadge';
import { Layers, Search, Boxes } from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';
import { inr } from '../../utils/inr';

const statusOf = (qty: number, reorder: number | null) => {
  if (qty <= 0) return 'Out of Stock';
  if (reorder != null && qty <= reorder) return 'Low Stock';
  return 'In Stock';
};

// A rotating palette so each category card reads as its own colour, matching
// the reference dashboard. Full class strings are kept literal so Tailwind's
// scanner picks them up.
const PALETTE = [
  { card: 'bg-blue-50/70 border-blue-200', icon: 'bg-blue-100 text-blue-600', code: 'bg-blue-100 text-blue-700', value: 'text-blue-700', ring: 'ring-blue-400 border-blue-400' },
  { card: 'bg-emerald-50/70 border-emerald-200', icon: 'bg-emerald-100 text-emerald-600', code: 'bg-emerald-100 text-emerald-700', value: 'text-emerald-700', ring: 'ring-emerald-400 border-emerald-400' },
  { card: 'bg-purple-50/70 border-purple-200', icon: 'bg-purple-100 text-purple-600', code: 'bg-purple-100 text-purple-700', value: 'text-purple-700', ring: 'ring-purple-400 border-purple-400' },
  { card: 'bg-amber-50/70 border-amber-200', icon: 'bg-amber-100 text-amber-600', code: 'bg-amber-100 text-amber-700', value: 'text-amber-700', ring: 'ring-amber-400 border-amber-400' },
  { card: 'bg-rose-50/70 border-rose-200', icon: 'bg-rose-100 text-rose-600', code: 'bg-rose-100 text-rose-700', value: 'text-rose-700', ring: 'ring-rose-400 border-rose-400' },
  { card: 'bg-cyan-50/70 border-cyan-200', icon: 'bg-cyan-100 text-cyan-600', code: 'bg-cyan-100 text-cyan-700', value: 'text-cyan-700', ring: 'ring-cyan-400 border-cyan-400' },
];

export const CategoryLedger = () => {
  const { valuation, stock, loading } = useInventory();
  const [active, setActive] = useState<string>('');
  const [search, setSearch] = useState('');
  const [itemType, setItemType] = useState('');

  // Default to the first category so the dashboard opens with a selection, like
  // the reference (Medicines highlighted).
  useEffect(() => {
    if (!active && valuation.length) setActive(valuation[0].category);
  }, [valuation, active]);

  const rows = useMemo(() => stock.filter(r => {
    if (itemType && r.itemType !== itemType) return false;
    if (active && (r.category || 'Uncategorised') !== active) return false;
    const s = search.trim().toLowerCase();
    return !s || r.itemName.toLowerCase().includes(s) || r.itemCode.toLowerCase().includes(s);
  }), [stock, active, search, itemType]);

  const categoryCount = useMemo(
    () => stock.filter(r => (r.category || 'Uncategorised') === active).length,
    [stock, active],
  );

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <PageHeader crumb="Category Ledger" title="Category Ledger Dashboard" />

      {/* Category cards */}
      {valuation.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-10 text-center text-sm text-slate-400">
          {loading ? 'Loading…' : 'No stock to value yet.'}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2">
          {valuation.map((v, i) => {
            const p = PALETTE[i % PALETTE.length];
            const code = `CAT-${String(i + 1).padStart(3, '0')}`;
            const selected = active === v.category;
            return (
              <button key={v.category} onClick={() => setActive(v.category)}
                className={`shrink-0 w-[260px] text-left p-4 rounded-2xl border shadow-sm transition-all ${p.card} ${selected ? `ring-2 ${p.ring}` : 'hover:shadow-md'}`}>
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.icon}`}>
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${p.code}`}>{code}</span>
                </div>
                <p className="text-lg font-bold text-slate-800 mt-3 truncate" title={v.category}>{v.category}</p>
                <div className="flex items-end justify-between mt-3 pt-3 border-t border-slate-200/60">
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Total Qty</div>
                    <div className="text-base font-bold text-slate-700">{v.totalQty.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Total Value</div>
                    <div className={`text-base font-bold ${p.value}`}>{inr(v.totalValue, 0)}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Items table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Boxes className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-slate-800">{active || 'All'} Items</h3>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs font-semibold">{categoryCount} records</span>
          </div>
          <div className="relative w-72 max-w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select value={itemType} onChange={e => setItemType(e.target.value)}
              className="h-11 px-3 mr-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-primary">
              <option value="">All Types</option>
              {INVENTORY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search items..."
              className="w-full h-10 pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:bg-white" />
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Item Code</th>
                <th className="px-4 py-3 text-left">Item Name</th>
                <th className="px-4 py-3 text-left">Brand/Mfr</th>
                <th className="px-4 py-3 text-left">Store</th>
                <th className="px-4 py-3 text-left">Available Qty</th>
                <th className="px-4 py-3 text-right">Unit Price (Est)</th>
                <th className="px-4 py-3 text-right">Total Value</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map(r => (
                <tr key={r.stockId} className="hover:bg-slate-50/70 transition-colors align-top">
                  <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{r.itemCode}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{r.itemName}</div>
                    {r.subCategory && <div className="text-xs text-slate-400 mt-0.5">{r.subCategory}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-700">{r.brand || '—'}</div>
                    {r.manufacturer && <div className="text-xs text-slate-400">{r.manufacturer}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.storeName}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {r.quantity} <span className="text-xs font-normal text-slate-500">{r.uom}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{inr(r.valuationRate)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">{inr(r.stockValue)}</td>
                  <td className="px-4 py-3"><AutoStatusBadge status={statusOf(r.quantity, r.reorderLevel)} /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-12 text-center text-slate-400">
                  {loading ? 'Loading…' : 'No items to show.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} totalItems={totalRows} onPageChange={setPage} />
      </div>
    </div>
  );
};
