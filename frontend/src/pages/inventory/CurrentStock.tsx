import { useState, useMemo } from 'react';
import { Search, Download, Package } from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';
import { exportToExcel } from '../../utils/exportToExcel';

const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// Status is derived from live quantity against the item master's reorder level.
// The prototype stored a status string at seed time and never recomputed it, so
// a lot issued down to zero still read "In Stock".
const statusOf = (qty: number, reorder: number | null) => {
  if (qty <= 0) return 'Out of Stock';
  if (reorder != null && qty <= reorder) return 'Low Stock';
  return 'In Stock';
};

const badge = (st: string) => st === 'Out of Stock'
  ? 'bg-rose-100 text-rose-700'
  : st === 'Low Stock' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';

export const CurrentStock = () => {
  const { stock, stores, loading } = useInventory();
  const [search, setSearch] = useState('');
  const [storeId, setStoreId] = useState('');
  const [status, setStatus] = useState('');

  const rows = useMemo(() => stock.filter(r => {
    const s = search.trim().toLowerCase();
    if (s && !(r.itemName.toLowerCase().includes(s) || r.itemCode.toLowerCase().includes(s)
      || r.batchNo.toLowerCase().includes(s) || (r.category || '').toLowerCase().includes(s))) return false;
    if (storeId && String(r.storeId) !== storeId) return false;
    if (status && statusOf(r.quantity, r.reorderLevel) !== status) return false;
    return true;
  }), [stock, search, storeId, status]);

  const totalValue = rows.reduce((s, r) => s + r.stockValue, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Current Stock</h1>
          <p className="text-xs text-slate-500">Live lot balances valued at moving-average cost</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-100 rounded-xl px-4 py-2 shadow-sm">
            <span className="text-xs text-slate-500">Stock Value </span>
            <span className="font-bold text-slate-800">{inr(totalValue)}</span>
          </div>
          <button
            onClick={() => exportToExcel(rows.map(r => ({
              'Item Code': r.itemCode, 'Item Name': r.itemName, Category: r.category,
              Store: r.storeName, Batch: r.batchNo, Expiry: r.expiryDate || '',
              Quantity: r.quantity, UOM: r.uom, Rate: r.valuationRate, Value: r.stockValue,
              Status: statusOf(r.quantity, r.reorderLevel),
            })), 'current_stock')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center gap-2">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2.5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search item, code, batch or category..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary" />
        </div>
        <select value={storeId} onChange={e => setStoreId(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">
          <option value="">All Stores</option>
          {stores.map(s => <option key={s.storeId} value={s.storeId}>{s.storeName}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">
          <option value="">All Status</option>
          <option>In Stock</option><option>Low Stock</option><option>Out of Stock</option>
        </select>
        <button onClick={() => { setSearch(''); setStoreId(''); setStatus(''); }}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200">Clear</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Store</th>
                <th className="px-3 py-2 text-left">Batch / Expiry</th>
                <th className="px-3 py-2 text-right">Quantity</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2 text-right">Value</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => {
                const st = statusOf(r.quantity, r.reorderLevel);
                return (
                  <tr key={r.stockId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-3 py-2">
                      <div className="font-bold text-slate-800">{r.itemName}</div>
                      <div className="text-xs text-slate-500">{r.itemCode}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{r.category || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{r.storeName}</td>
                    <td className="px-3 py-2">
                      <div className="text-slate-700">{r.batchNo}</div>
                      <div className="text-xs text-slate-500">
                        {r.expiryDate ? new Date(r.expiryDate).toLocaleDateString('en-GB') : 'No expiry'}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800">
                      {r.quantity} <span className="text-xs font-normal text-slate-500">{r.uom}</span>
                      {r.reorderLevel != null && (
                        <div className="text-[11px] text-slate-400">Reorder: {r.reorderLevel}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">{inr(r.valuationRate)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800">{inr(r.stockValue)}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg w-max block ${badge(st)}`}>{st}</span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-200 mb-2" />
                    {loading ? 'Loading stock…' : stock.length === 0
                      ? 'No stock yet. Receive goods under Stock In to get started.'
                      : 'No stock matches the current filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
