import { useState, useMemo, useEffect } from 'react';
import { Pagination } from '../../components/ui/Pagination';
import { PageHeader } from '../../components/inventory/PageHeader';
import { DateFilter, monthStart, today } from '@/components/ui/DateFilter';
import { StatusBadge } from '../../components/inventory/StatusBadge';
import { Search, Download, ScrollText, Eye, X } from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';
import { exportToExcel } from '../../utils/exportToExcel';
import { inr } from '../../utils/inr';

const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// The reference ledger shows one row per document (with an item count and a
// running cumulative value), whereas the API returns one entry per item-lot
// line. We group the filtered lines by document and compute the running
// balance/value client-side.
interface LedgerGroup {
  key: string;
  date: string;
  docNumber: string;
  subRef: string;
  direction: 'in' | 'out';
  items: number;
  storeName: string;
  qty: number;
  value: number;
  balanceQty: number;
  cumulativeValue: number;
}

export const StockLedger = () => {
  const { ledger, stock, stores, loading } = useInventory();
  const [entry, setEntry] = useState<LedgerGroup | null>(null);
  const [search, setSearch] = useState('');
  const [storeId, setStoreId] = useState('');
  const [inout, setInout] = useState<'in' | 'out'>('in');
  // Draft vs applied date range so the header Search/Cancel buttons do real work.
  const [draftFrom, setDraftFrom] = useState(monthStart());
  const [draftTo, setDraftTo] = useState(today());
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(today());

  // Summary cards — live on-hand totals from the stock table.
  const totalInStock = useMemo(() => stock.reduce((s, r) => s + r.quantity, 0), [stock]);
  const stockValue = useMemo(() => stock.reduce((s, r) => s + r.stockValue, 0), [stock]);

  const groups = useMemo<LedgerGroup[]>(() => {
    const s = search.trim().toLowerCase();
    const lines = ledger.filter(r => {
      const dir = r.quantity >= 0 ? 'in' : 'out';
      if (dir !== inout) return false;
      if (s && !(r.itemName.toLowerCase().includes(s) || (r.docNumber || '').toLowerCase().includes(s)
        || r.batchNo.toLowerCase().includes(s))) return false;
      if (storeId && String(r.storeId) !== storeId) return false;
      if (r.txnDate) {
        const day = localDay(new Date(r.txnDate));
        if (fromDate && day < fromDate) return false;
        if (toDate && day > toDate) return false;
      }
      return true;
    });

    // Group by document.
    const map = new Map<string, LedgerGroup>();
    for (const r of lines) {
      const key = String(r.docId ?? r.docNumber ?? r.ledgerId);
      const g = map.get(key);
      const absVal = Math.abs(r.value);
      const signedVal = inout === 'in' ? absVal : -absVal;
      if (g) {
        g.items += 1;
        g.qty += r.quantity;
        g.value += signedVal;
        if (g.storeName !== r.storeName) g.storeName = 'Multiple';
      } else {
        map.set(key, {
          key, date: r.txnDate, docNumber: r.docNumber || `LED-${r.ledgerId}`,
          subRef: `#${r.docId ?? r.ledgerId}`, direction: inout, items: 1,
          storeName: r.storeName, qty: r.quantity, value: signedVal,
          balanceQty: 0, cumulativeValue: 0,
        });
      }
    }

    // Running balance + cumulative value, computed oldest→newest.
    const asc = [...map.values()].sort((a, b) => +new Date(a.date) - +new Date(b.date));
    let runQty = 0, runVal = 0;
    for (const g of asc) { runQty += g.qty; runVal += g.value; g.balanceQty = runQty; g.cumulativeValue = runVal; }
    // Display newest first.
    return asc.reverse();
  }, [ledger, search, storeId, inout, fromDate, toDate]);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalRows = groups.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const paged = groups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const applyDates = () => { setFromDate(draftFrom); setToDate(draftTo); };
  const clearDates = () => { setDraftFrom(''); setDraftTo(''); setFromDate(''); setToDate(''); };

  const dateInput = 'h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-primary';

  return (
    <div className="space-y-4">
      <PageHeader
        crumb="Stock Ledger"
        title="Stock Ledger"
        right={
          <DateFilter
            dateFrom={draftFrom}
            dateTo={draftTo}
            onDateFromChange={setDraftFrom}
            onDateToChange={setDraftTo}
            onSearch={applyDates}
            onReset={clearDates}
          />
        }
      />

      {/* Summary cards */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-5 py-3">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Total in Stock</div>
          <div className="text-2xl font-bold text-slate-800">{totalInStock.toLocaleString('en-IN')} <span className="text-sm font-medium text-slate-500">items</span></div>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm px-5 py-3">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Stock Value</div>
          <div className="text-2xl font-bold text-primary">{inr(stockValue)}</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by ID, Item, or Reference..."
            className="w-full h-11 pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:bg-white" />
        </div>
        <div className="flex rounded-xl border border-slate-200 overflow-hidden">
          <button onClick={() => setInout('in')}
            className={`h-11 px-5 text-sm font-bold transition-colors ${inout === 'in' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>In Stock</button>
          <button onClick={() => setInout('out')}
            className={`h-11 px-5 text-sm font-bold transition-colors ${inout === 'out' ? 'bg-rose-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>Out Stock</button>
        </div>
        <select value={storeId} onChange={e => setStoreId(e.target.value)}
          className="h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-primary">
          <option value="">All Stores</option>
          {stores.map(s => <option key={s.storeId} value={s.storeId}>{s.storeName}</option>)}
        </select>
        <button
          onClick={() => exportToExcel(groups.map(g => ({
            Date: g.date, 'Transaction ID': g.docNumber, Type: g.direction === 'in' ? 'STOCK IN' : 'STOCK OUT',
            Items: g.items, Store: g.storeName, Qty: g.qty, 'Stock Value': g.value,
            'Balance Qty': g.balanceQty, 'Cumulative Value': g.cumulativeValue,
          })), 'stock_ledger')}
          className="h-11 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center gap-2 ml-auto">
          <Download className="w-4 h-4" /> Export Ledger
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Transaction ID</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Items</th>
                <th className="px-4 py-3 text-left">Store</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Stock Value (₹)</th>
                <th className="px-4 py-3 text-right">Balance Qty</th>
                <th className="px-4 py-3 text-right">Cumulative Value (₹)</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map(g => (
                <tr key={g.key} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{localDay(new Date(g.date))}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-primary">{g.docNumber}</div>
                    <div className="text-[11px] text-slate-400">{g.subRef}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={g.direction === 'in' ? 'green' : 'rose'}>
                      {g.direction === 'in' ? 'Stock In' : 'Stock Out'}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{g.items} {g.items === 1 ? 'item' : 'items'}</td>
                  <td className="px-4 py-3 text-slate-600">{g.storeName}</td>
                  <td className={`px-4 py-3 text-right font-bold ${g.direction === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {g.qty > 0 ? '+' : ''}{g.qty}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${g.direction === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {g.value >= 0 ? '+' : ''}{inr(g.value)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{g.balanceQty}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{inr(g.cumulativeValue)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEntry(g)}
                      title="View ledger entry"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100" aria-label="View entry">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-12 text-center text-slate-400">
                    <ScrollText className="w-9 h-9 mx-auto text-slate-200 mb-2" />
                    {loading ? 'Loading ledger…' : ledger.length === 0
                      ? 'No movements recorded yet.'
                      : 'No movements match the current filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} totalItems={totalRows} onPageChange={setPage} />
      </div>

      {entry && (() => {
        // A row is one document; these are the individual ledger lines behind
        // it, keyed exactly the way the grouping above keys them.
        const lines = ledger.filter(
          r => String(r.docId ?? r.docNumber ?? r.ledgerId) === entry.key,
        );
        const isIn = entry.direction === 'in';

        const Field = ({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) => (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
            <p className={`text-sm font-semibold mt-0.5 ${tone ?? 'text-slate-800'}`}>{value}</p>
          </div>
        );

        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
               onClick={() => setEntry(null)}>
            <div onClick={e => e.stopPropagation()}
                 className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[88vh]">

              <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
                <div className="min-w-0">
                  <h3 className="font-bold text-lg text-slate-800 truncate">{entry.docNumber}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {entry.subRef} · {localDay(new Date(entry.date))} · {entry.storeName}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isIn ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                    {isIn ? 'STOCK IN' : 'STOCK OUT'}
                  </span>
                  <button onClick={() => setEntry(null)} title="Close"
                          className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-5 overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-5">
                  <Field label="Items" value={entry.items} />
                  <Field label="Total Qty" value={`${entry.qty > 0 ? '+' : ''}${entry.qty}`}
                         tone={isIn ? 'text-emerald-600' : 'text-rose-600'} />
                  <Field label="Value" value={`${entry.value >= 0 ? '+' : ''}${inr(entry.value)}`}
                         tone={isIn ? 'text-emerald-600' : 'text-rose-600'} />
                  <Field label="Balance Qty" value={entry.balanceQty} />
                  <Field label="Cumulative Value" value={inr(entry.cumulativeValue)} />
                </div>

                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Lines in this document
                  </h4>
                  {lines.length === 0 ? (
                    <p className="text-sm text-slate-400 py-6 text-center border border-slate-100 rounded-xl">
                      No ledger lines found for this document.
                    </p>
                  ) : (
                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                          <tr>
                            <th className="px-4 py-2.5">Item</th>
                            <th className="px-4 py-2.5">Batch</th>
                            <th className="px-4 py-2.5">Store</th>
                            <th className="px-4 py-2.5">Type</th>
                            <th className="px-4 py-2.5 text-right">Qty</th>
                            <th className="px-4 py-2.5 text-right">Rate</th>
                            <th className="px-4 py-2.5 text-right">Value</th>
                            <th className="px-4 py-2.5 text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {lines.map(l => (
                            <tr key={l.ledgerId} className="hover:bg-slate-50/70">
                              <td className="px-4 py-2.5 text-sm font-medium text-slate-800">{l.itemName}</td>
                              <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{l.batchNo || '—'}</td>
                              <td className="px-4 py-2.5 text-sm text-slate-600">{l.storeName}</td>
                              <td className="px-4 py-2.5 text-sm text-slate-600">{l.movementType}</td>
                              <td className={`px-4 py-2.5 text-sm text-right font-semibold tabular-nums ${l.quantity < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {l.quantity > 0 ? '+' : ''}{l.quantity}
                              </td>
                              <td className="px-4 py-2.5 text-sm text-right text-slate-600 tabular-nums">{inr(l.rate)}</td>
                              <td className="px-4 py-2.5 text-sm text-right text-slate-700 tabular-nums">{inr(l.value)}</td>
                              <td className="px-4 py-2.5 text-sm text-right text-slate-600 tabular-nums">{l.balanceQty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {lines.some(l => l.remarks) && (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Remarks</h4>
                    <p className="text-sm text-slate-600 border-l-2 border-slate-200 pl-4">
                      {lines.map(l => l.remarks).filter(Boolean).join(' / ')}
                    </p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Posted by {lines[0]?.user || 'unknown'}
                </span>
                <button onClick={() => setEntry(null)}
                        className="px-5 py-2 border border-slate-200 bg-white text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-100 transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
