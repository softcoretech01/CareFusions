import { useState, useMemo } from 'react';
import { Layers, Search } from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';

const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const CategoryLedger = () => {
  const { valuation, stock, loading } = useInventory();
  const [active, setActive] = useState<string>('');
  const [search, setSearch] = useState('');

  // Valuation comes from the lot's moving-average rate. The prototype derived a
  // "unit price" from the digits in the item code (ITM-101 -> ₹1010), so every
  // figure on this screen was meaningless.
  const rows = useMemo(() => stock.filter(r => {
    if (active && (r.category || 'Uncategorised') !== active) return false;
    const s = search.trim().toLowerCase();
    return !s || r.itemName.toLowerCase().includes(s) || r.itemCode.toLowerCase().includes(s);
  }), [stock, active, search]);

  const grandTotal = valuation.reduce((s, v) => s + v.totalValue, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Category Ledger</h1>
          <p className="text-xs text-slate-500">Stock value by category, at moving-average cost</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl px-4 py-2 shadow-sm">
          <span className="text-xs text-slate-500">Total Inventory Value </span>
          <span className="font-bold text-slate-800">{inr(grandTotal)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {valuation.map(v => (
          <button key={v.category} onClick={() => setActive(active === v.category ? '' : v.category)}
            className={`text-left p-4 rounded-2xl border shadow-sm transition-colors ${
              active === v.category ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'bg-white border-slate-100 hover:border-primary/30'
            }`}>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
              <Layers className="w-4 h-4" />
            </div>
            <p className="text-sm font-bold text-slate-800 truncate" title={v.category}>{v.category}</p>
            <p className="text-lg font-bold text-slate-900 mt-1">{inr(v.totalValue)}</p>
            <p className="text-[11px] text-slate-500">{v.itemCount} item(s) · {v.totalQty} units</p>
          </button>
        ))}
        {valuation.length === 0 && (
          <p className="col-span-full text-center text-sm text-slate-400 py-8">
            {loading ? 'Loading…' : 'No stock to value yet.'}
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-slate-800">
            {active ? `Items in ${active}` : 'All Stock Items'}
          </h3>
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search item..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Store</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => (
                <tr key={r.stockId} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{r.itemName}</div>
                    <div className="text-xs text-slate-500">{r.itemCode} · {r.batchNo}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.category || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{r.storeName}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{r.quantity} {r.uom}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{inr(r.valuationRate)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{inr(r.stockValue)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  {loading ? 'Loading…' : 'No items to show.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
