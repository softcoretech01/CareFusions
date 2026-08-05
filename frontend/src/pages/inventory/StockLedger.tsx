import { useState, useMemo } from 'react';
import { Search, Download, ScrollText } from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';
import { exportToExcel } from '../../utils/exportToExcel';

const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const TYPES = ['All', 'RECEIPT', 'ISSUE', 'TRANSFER_OUT', 'TRANSFER_IN', 'RETURN', 'ADJUSTMENT', 'WRITEOFF'];

const typeCls = (t: string) =>
  t === 'RECEIPT' || t === 'RETURN' || t === 'TRANSFER_IN' || t === 'ADJUSTMENT'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-rose-100 text-rose-700';

export const StockLedger = () => {
  const { ledger, stores, loading } = useInventory();
  const [search, setSearch] = useState('');
  const [storeId, setStoreId] = useState('');
  const [type, setType] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const rows = useMemo(() => ledger.filter(r => {
    const s = search.trim().toLowerCase();
    if (s && !(r.itemName.toLowerCase().includes(s) || (r.docNumber || '').toLowerCase().includes(s)
      || r.batchNo.toLowerCase().includes(s))) return false;
    if (storeId && String(r.storeId) !== storeId) return false;
    if (type !== 'All' && r.movementType !== type) return false;
    if (r.txnDate) {
      const day = localDay(new Date(r.txnDate));
      if (fromDate && day < fromDate) return false;
      if (toDate && day > toDate) return false;
    }
    return true;
  }), [ledger, search, storeId, type, fromDate, toDate]);

  const inQty = rows.filter(r => r.quantity > 0).reduce((s, r) => s + r.quantity, 0);
  const outQty = rows.filter(r => r.quantity < 0).reduce((s, r) => s - r.quantity, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Stock Ledger</h1>
          <p className="text-xs text-slate-500">Every stock movement, in posting order</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white border border-slate-100 rounded-xl px-3 py-2 shadow-sm text-sm">
            <span className="text-xs text-slate-500">In </span><b className="text-emerald-600">{inQty}</b>
            <span className="text-slate-300 mx-2">|</span>
            <span className="text-xs text-slate-500">Out </span><b className="text-rose-600">{outQty}</b>
          </div>
          <button
            onClick={() => exportToExcel(rows.map(r => ({
              Date: r.txnDate, Document: r.docNumber, Type: r.movementType, Item: r.itemName,
              Batch: r.batchNo, Store: r.storeName, Qty: r.quantity, Rate: r.rate,
              Value: r.value, Balance: r.balanceQty, User: r.user,
            })), 'stock_ledger')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center gap-2">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search item, document or batch..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary" />
        </div>
        <select value={storeId} onChange={e => setStoreId(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">
          <option value="">All Stores</option>
          {stores.map(s => <option key={s.storeId} value={s.storeId}>{s.storeName}</option>)}
        </select>
        <select value={type} onChange={e => setType(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">
          {TYPES.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600" />
        <span className="text-slate-400 text-sm">to</span>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600" />
        <button onClick={() => { setSearch(''); setStoreId(''); setType('All'); setFromDate(''); setToDate(''); }}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200">Clear</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Document</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Item / Batch</th>
                <th className="px-4 py-3 text-left">Store</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-left">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(r => (
                <tr key={r.ledgerId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {new Date(r.txnDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 font-bold text-primary whitespace-nowrap">{r.docNumber || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-[11px] font-bold rounded-lg w-max block ${typeCls(r.movementType)}`}>
                      {r.movementType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{r.itemName}</div>
                    <div className="text-xs text-slate-500">{r.batchNo}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.storeName}</td>
                  <td className={`px-4 py-3 text-right font-bold ${r.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {r.quantity > 0 ? '+' : ''}{r.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{inr(r.rate)}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{inr(r.value)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{r.balanceQty}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{r.user || '—'}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    <ScrollText className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                    {loading ? 'Loading ledger…' : ledger.length === 0
                      ? 'No movements recorded yet.'
                      : 'No movements match the current filters.'}
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
