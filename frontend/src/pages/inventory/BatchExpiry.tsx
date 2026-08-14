import { useState, useMemo, useEffect } from 'react';
import { Pagination } from '../../components/ui/Pagination';
import { PageHeader } from '../../components/inventory/PageHeader';
import { StatusBadge } from '../../components/inventory/StatusBadge';
import { Search, Download, CalendarClock, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInventory } from '../../contexts/InventoryContext';
import { exportToExcel } from '../../utils/exportToExcel';

const WINDOWS = ['All', 'Expired', 'Next 30 Days', 'Next 60 Days', 'Next 90 Days'] as const;

const dateOnly = (s: string | null) => (s ? s.slice(0, 10) : '—');

const statusOf = (days: number): { text: string; tone: 'rose' | 'amber' | 'green' } =>
  days < 0 ? { text: 'Expired', tone: 'rose' }
    : days <= 90 ? { text: 'Expiring Soon', tone: 'amber' }
      : { text: 'Valid', tone: 'green' };

export const BatchExpiry = () => {
  const { expiring, stock, loading } = useInventory();
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
        <div className="relative flex-1 min-w-[240px]">
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
          className="h-11 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center gap-2">
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
                      <button onClick={() => toast('Lot details coming soon')}
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
    </div>
  );
};
