import { useState, useMemo, useEffect } from 'react';
import { Pagination } from '../../components/ui/Pagination';
import { PageHeader } from '../../components/inventory/PageHeader';
import { StatusBadge } from '../../components/inventory/StatusBadge';
import { Search, Download, CalendarClock, Eye, X } from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';
import type { ExpiringRow } from '../../contexts/InventoryContext';
import { exportToExcel } from '../../utils/exportToExcel';

const WINDOWS = ['All', 'Expired', 'Next 30 Days', 'Next 60 Days', 'Next 90 Days'] as const;

const inr = (n: number) => `\u20b9${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const dateOnly = (s: string | null) => (s ? s.slice(0, 10) : '—');

const statusOf = (days: number): { text: string; tone: 'rose' | 'amber' | 'green' } =>
  days < 0 ? { text: 'Expired', tone: 'rose' }
    : days <= 90 ? { text: 'Expiring Soon', tone: 'amber' }
      : { text: 'Valid', tone: 'green' };

export const BatchExpiry = () => {
  const { expiring, stock, ledger, loading } = useInventory();
  const [lot, setLot] = useState<ExpiringRow | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [window, setWindow] = useState<string>('All');

  const categories = useMemo(() => {
    const set = new Set<string>();
    expiring.forEach(r => r.category && set.add(r.category));
    stock.forEach(r => r.category && set.add(r.category));
    return [...set].sort();
  }, [expiring, stock]);

  // Buckets are one-sided on days-to-expiry. The prototype compared
  // Math.abs(expiry - today), so "Next 30 Days" also matched items that had
  // expired within the last 30 days.
  const inWindow = (days: number) => {
    switch (window) {
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
    if (category && r.category !== category) return false;
    return inWindow(r.daysToExpiry);
  }), [expiring, search, category, window]);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectCls = 'h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-primary';

  return (
    <div className="space-y-4">
      <PageHeader crumb="Batch & Expiry" title="Batch & Expiry Tracking" />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search items or batches..."
            className="w-full h-11 pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:bg-white" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} className={selectCls}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={window} onChange={e => setWindow(e.target.value)} className={selectCls}>
          {WINDOWS.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
        <button
          onClick={() => exportToExcel(rows.map(r => ({
            'Item Code': r.itemCode, 'Item Name': r.itemName, Category: r.category, 'Batch No': r.batchNo,
            Store: r.storeName, Quantity: r.quantity, UOM: r.uom, 'Mfg Date': r.mfgDate || '',
            'Expiry Date': r.expiryDate || '', 'Days To Expiry': r.daysToExpiry,
          })), 'batch_expiry')}
          className="h-11 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center gap-2 ml-auto">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Item Details</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Batch No</th>
                <th className="px-4 py-3 text-left">Store</th>
                <th className="px-4 py-3 text-left">Available Qty</th>
                <th className="px-4 py-3 text-left">Mfg Date</th>
                <th className="px-4 py-3 text-left">Expiry Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map(r => {
                const st = statusOf(r.daysToExpiry);
                return (
                  <tr key={r.stockId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{r.itemName}</div>
                      <div className="text-xs text-slate-400">{r.itemCode}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.category || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.batchNo || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{r.storeName}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {r.quantity} <span className="text-xs font-normal text-slate-500">{r.uom}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{dateOnly(r.mfgDate)}</td>
                    <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{dateOnly(r.expiryDate)}</td>
                    <td className="px-4 py-3"><StatusBadge tone={st.tone}>{st.text}</StatusBadge></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setLot(r)}
                        title="View lot details"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100" aria-label="View lot">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-12 text-center text-slate-400">
                    <CalendarClock className="w-9 h-9 mx-auto text-slate-200 mb-2" />
                    {loading ? 'Loading…' : 'No batch records found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} totalItems={totalRows} onPageChange={setPage} />
      </div>

      {lot && (() => {
        // Enrich the expiry row with the full stock lot (rate, value, reserved)
        // and this batch's movement history from the ledger.
        const full = stock.find(x => x.stockId === lot.stockId);
        const moves = ledger
          .filter(l => l.itemId === lot.itemId && (l.batchNo || '') === (lot.batchNo || ''))
          .sort((a, b) => String(b.txnDate).localeCompare(String(a.txnDate)));
        const st = statusOf(lot.daysToExpiry);
        const expiryNote =
          lot.daysToExpiry < 0
            ? `Expired ${Math.abs(lot.daysToExpiry)} day${Math.abs(lot.daysToExpiry) === 1 ? '' : 's'} ago`
            : `${lot.daysToExpiry} day${lot.daysToExpiry === 1 ? '' : 's'} left`;

        const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{value ?? '\u2014'}</p>
          </div>
        );

        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
               onClick={() => setLot(null)}>
            <div onClick={e => e.stopPropagation()}
                 className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[88vh]">

              <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
                <div className="min-w-0">
                  <h3 className="font-bold text-lg text-slate-800 truncate">{lot.itemName}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {lot.itemCode} · Batch {lot.batchNo || '—'} · {lot.storeName}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge tone={st.tone}>{st.text}</StatusBadge>
                  <button onClick={() => setLot(null)} title="Close"
                          className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-5 overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                  <Field label="Available Qty" value={`${lot.quantity} ${lot.uom}`} />
                  <Field label="Reserved" value={full ? `${full.reservedQty} ${lot.uom}` : null} />
                  <Field label="Valuation Rate" value={full ? inr(full.valuationRate) : null} />
                  <Field label="Stock Value" value={full ? inr(full.stockValue) : null} />

                  <Field label="Category" value={lot.category} />
                  <Field label="Sub-category" value={full?.subCategory} />
                  <Field label="Brand" value={full?.brand} />
                  <Field label="Manufacturer" value={full?.manufacturer} />

                  <Field label="Mfg Date" value={dateOnly(lot.mfgDate)} />
                  <Field label="Expiry Date" value={dateOnly(lot.expiryDate)} />
                  <Field label="Shelf Status" value={expiryNote} />
                  <Field label="Reorder Level" value={full?.reorderLevel ?? null} />
                </div>

                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Movement history for this batch
                  </h4>
                  {moves.length === 0 ? (
                    <p className="text-sm text-slate-400 py-6 text-center border border-slate-100 rounded-xl">
                      No ledger movements recorded for this batch.
                    </p>
                  ) : (
                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                          <tr>
                            <th className="px-4 py-2.5">Date</th>
                            <th className="px-4 py-2.5">Document</th>
                            <th className="px-4 py-2.5">Type</th>
                            <th className="px-4 py-2.5">Store</th>
                            <th className="px-4 py-2.5 text-right">Qty</th>
                            <th className="px-4 py-2.5 text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {moves.map(m => (
                            <tr key={m.ledgerId} className="hover:bg-slate-50/70">
                              <td className="px-4 py-2.5 text-sm text-slate-600 whitespace-nowrap">{dateOnly(m.txnDate)}</td>
                              <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{m.docNumber || '\u2014'}</td>
                              <td className="px-4 py-2.5 text-sm text-slate-600">{m.movementType}</td>
                              <td className="px-4 py-2.5 text-sm text-slate-600">{m.storeName}</td>
                              <td className={`px-4 py-2.5 text-sm text-right font-semibold tabular-nums ${m.quantity < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {m.quantity > 0 ? '+' : ''}{m.quantity}
                              </td>
                              <td className="px-4 py-2.5 text-sm text-right text-slate-600 tabular-nums">{m.balanceQty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex justify-end">
                <button onClick={() => setLot(null)}
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
