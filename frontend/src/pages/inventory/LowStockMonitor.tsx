import { useState, useMemo, useEffect } from 'react';
import { Pagination } from '../../components/ui/Pagination';
import { PageHeader } from '../../components/inventory/PageHeader';
import { StatusBadge } from '../../components/inventory/StatusBadge';
import { Search, Download, FileText, PackageX } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInventory } from '../../contexts/InventoryContext';
import { exportToExcel } from '../../utils/exportToExcel';

const severity = (qty: number, reorder: number): { text: string; tone: 'rose' | 'orange' | 'amber' } =>
  qty <= 0 ? { text: 'Out of Stock', tone: 'rose' }
    : qty <= reorder / 2 ? { text: 'Critical Low', tone: 'orange' }
      : { text: 'Reorder Required', tone: 'amber' };

export const LowStockMonitor = () => {
  const { lowStock, loading } = useInventory();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const categories = useMemo(() => {
    const set = new Set<string>();
    lowStock.forEach(r => r.category && set.add(r.category));
    return [...set].sort();
  }, [lowStock]);

  // The API computes low stock against each item's own reorder level; the
  // prototype dashboard used a hardcoded threshold of 50 instead, so the two
  // screens disagreed.
  const rows = useMemo(() => lowStock.filter(r => {
    const s = search.trim().toLowerCase();
    if (s && !(r.itemName.toLowerCase().includes(s) || r.itemCode.toLowerCase().includes(s))) return false;
    if (category && r.category !== category) return false;
    return true;
  }), [lowStock, search, category]);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stubPR = () => toast('Purchase requisition — coming soon');

  return (
    <div className="space-y-4">
      <PageHeader crumb="Low Stock Monitor" title="Low Stock Monitor" />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search low stock items..."
            className="w-full h-11 pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:bg-white" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-primary">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          onClick={() => exportToExcel(rows.map(r => ({
            'Item Code': r.itemCode, 'Item Name': r.itemName, Category: r.category,
            'Available Qty': r.quantity, UOM: r.uom, 'Reorder Level': r.reorderLevel, Deficit: r.deficit,
            Status: severity(r.quantity, r.reorderLevel).text,
          })), 'low_stock')}
          className="h-11 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center gap-2">
          <Download className="w-4 h-4" /> Export
        </button>
        <button onClick={stubPR}
          className="h-11 px-4 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
          <FileText className="w-4 h-4" /> Generate Bulk PR
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Item Details</th>
                <th className="px-4 py-3 text-left">Available Qty</th>
                <th className="px-4 py-3 text-left">Reorder Level</th>
                <th className="px-4 py-3 text-left">Deficit</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map(r => {
                const sev = severity(r.quantity, r.reorderLevel);
                return (
                  <tr key={r.itemId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{r.itemName}</div>
                      <div className="text-xs text-slate-400">{r.itemCode} | {r.category || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-rose-600">{r.quantity}</span>
                      <span className="text-xs font-normal text-slate-500"> {r.uom}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{r.reorderLevel} <span className="text-xs font-normal text-slate-500">{r.uom}</span></td>
                    <td className="px-4 py-3 font-bold text-rose-600">{r.deficit} <span className="text-xs font-normal text-slate-400">{r.uom}</span></td>
                    <td className="px-4 py-3"><StatusBadge tone={sev.tone}>{sev.text}</StatusBadge></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={stubPR}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:border-primary hover:text-primary transition-colors">
                        Generate PR
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-slate-400">
                    <PackageX className="w-9 h-9 mx-auto text-slate-200 mb-2" />
                    {loading ? 'Loading…' : 'No items are below their reorder level.'}
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
