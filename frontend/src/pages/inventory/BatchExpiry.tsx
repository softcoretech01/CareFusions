import { useState, useMemo } from 'react';
import { Search, AlertTriangle, CalendarClock } from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';

const BUCKETS = ['All', 'Expired', 'Next 30 Days', 'Next 60 Days', 'Next 90 Days'] as const;

export const BatchExpiry = () => {
  const { expiring, stores, loading } = useInventory();
  const [search, setSearch] = useState('');
  const [storeName, setStoreName] = useState('');
  const [bucket, setBucket] = useState<string>('All');

  // Buckets are one-sided on days-to-expiry. The prototype compared
  // Math.abs(expiry - today), so "Next 30 Days" also matched items that had
  // expired within the last 30 days.
  const inBucket = (days: number) => {
    switch (bucket) {
      case 'Expired': return days < 0;
      case 'Next 30 Days': return days >= 0 && days <= 30;
      case 'Next 60 Days': return days >= 0 && days <= 60;
      case 'Next 90 Days': return days >= 0 && days <= 90;
      default: return true;
    }
  };

  const rows = useMemo(() => expiring.filter(r => {
    const s = search.trim().toLowerCase();
    if (s && !(r.itemName.toLowerCase().includes(s) || r.batchNo.toLowerCase().includes(s))) return false;
    if (storeName && r.storeName !== storeName) return false;
    return inBucket(r.daysToExpiry);
  }), [expiring, search, storeName, bucket]);

  const label = (days: number) => days < 0
    ? { text: `Expired ${Math.abs(days)}d ago`, cls: 'bg-rose-100 text-rose-700' }
    : days <= 30 ? { text: `${days}d left`, cls: 'bg-rose-50 text-rose-600' }
    : days <= 90 ? { text: `${days}d left`, cls: 'bg-amber-100 text-amber-700' }
    : { text: `${days}d left`, cls: 'bg-emerald-100 text-emerald-700' };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Batch &amp; Expiry</h1>
        <p className="text-xs text-slate-500">Lots approaching or past their expiry date</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">
          To remove expired stock, post a <b>Stock Adjustment</b> with a negative quantity and reason
          "Expiry". That records a write-off in the ledger — the prototype silently zeroed the lot
          with no audit trail.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search item or batch..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary" />
        </div>
        <select value={storeName} onChange={e => setStoreName(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">
          <option value="">All Stores</option>
          {stores.map(s => <option key={s.storeId} value={s.storeName}>{s.storeName}</option>)}
        </select>
        <div className="flex gap-1">
          {BUCKETS.map(b => (
            <button key={b} onClick={() => setBucket(b)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                bucket === b ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>{b}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Store</th>
                <th className="px-4 py-3 text-left">Batch</th>
                <th className="px-4 py-3 text-left">Mfg</th>
                <th className="px-4 py-3 text-left">Expiry</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => {
                const l = label(r.daysToExpiry);
                return (
                  <tr key={r.stockId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{r.itemName}</div>
                      <div className="text-xs text-slate-500">{r.itemCode}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.category || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{r.storeName}</td>
                    <td className="px-4 py-3 text-slate-700">{r.batchNo}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.mfgDate ? new Date(r.mfgDate).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {r.expiryDate ? new Date(r.expiryDate).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {r.quantity} <span className="text-xs font-normal text-slate-500">{r.uom}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg w-max block ${l.cls}`}>{l.text}</span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <CalendarClock className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                    {loading ? 'Loading…' : 'No lots in this expiry window.'}
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
