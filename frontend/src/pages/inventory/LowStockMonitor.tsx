import { useState, useMemo, useEffect } from 'react';
import { Pagination } from '../../components/ui/Pagination';
import { Search, TrendingDown, PackageX } from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';

export const LowStockMonitor = () => {
  const { lowStock, stores, loading } = useInventory();
  const [search, setSearch] = useState('');
  const [storeId, setStoreId] = useState('');

  // The API computes low stock against each item's own reorder level; the
  // prototype dashboard used a hardcoded threshold of 50 instead, so the two
  // screens disagreed.
  const rows = useMemo(() => lowStock.filter(r => {
    const s = search.trim().toLowerCase();
    return !s || r.itemName.toLowerCase().includes(s) || r.itemCode.toLowerCase().includes(s);
  }), [lowStock, search]);

  const severity = (qty: number, reorder: number) => qty <= 0
    ? { text: 'Out of Stock', cls: 'bg-rose-100 text-rose-700' }
    : qty <= reorder / 2
      ? { text: 'Critical Low', cls: 'bg-orange-100 text-orange-700' }
      : { text: 'Reorder Required', cls: 'bg-amber-100 text-amber-700' };

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  // Filters can shrink the list under the current page — snap back into range.
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Low Stock Monitor</h1>
        <p className="text-xs text-slate-500">Items at or below their reorder level</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2.5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search item or code..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary" />
        </div>
        <select value={storeId} onChange={e => setStoreId(e.target.value)} disabled
          title="Low stock is evaluated across all stores"
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-400">
          <option value="">All Stores</option>
          {stores.map(s => <option key={s.storeId} value={s.storeId}>{s.storeName}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-right">On Hand</th>
                <th className="px-3 py-2 text-right">Reorder Level</th>
                <th className="px-3 py-2 text-right">Deficit</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map(r => {
                const sev = severity(r.quantity, r.reorderLevel);
                return (
                  <tr key={r.itemId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-3 py-2">
                      <div className="font-bold text-slate-800">{r.itemName}</div>
                      <div className="text-xs text-slate-500">{r.itemCode}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{r.category || '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800">
                      {r.quantity} <span className="text-xs font-normal text-slate-500">{r.uom}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">{r.reorderLevel}</td>
                    <td className="px-3 py-2 text-right font-bold text-rose-600">{r.deficit}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg w-max block ${sev.cls}`}>{sev.text}</span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                    {loading ? 'Loading…' : (
                      <>
                        <PackageX className="w-8 h-8 mx-auto text-slate-200 mb-2" />
                        No items are below their reorder level.
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} totalItems={totalRows} onPageChange={setPage} />
      </div>

      {rows.length > 0 && (
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <TrendingDown className="w-3.5 h-3.5" />
          {rows.length} item(s) need replenishment. Raise a purchase requisition in Procurement.
        </p>
      )}
    </div>
  );
};
