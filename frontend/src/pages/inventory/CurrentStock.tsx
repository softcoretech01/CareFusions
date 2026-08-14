import { useState, useMemo, useEffect } from 'react';
import { Pagination } from '../../components/ui/Pagination';
import { PageHeader } from '../../components/inventory/PageHeader';
import { AutoStatusBadge } from '../../components/inventory/StatusBadge';
import { Search, Download, Package } from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';
import { exportToExcel } from '../../utils/exportToExcel';

// Status is derived from live quantity against the item master's reorder level.
// The prototype stored a status string at seed time and never recomputed it, so
// a lot issued down to zero still read "In Stock".
const statusOf = (qty: number, reorder: number | null) => {
  if (qty <= 0) return 'Out of Stock';
  if (reorder != null && qty <= reorder) return 'Low Stock';
  return 'In Stock';
};

const dateOnly = (s: string | null) => (s ? s.slice(0, 10) : '—');

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

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  // Filters can shrink the list under the current page — snap back into range.
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectCls = 'h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-primary';

  return (
    <div className="space-y-4">
      <PageHeader crumb="Current Stock" title="Current Stock" />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search items, codes, batches..."
            className="w-full h-11 pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:bg-white" />
        </div>
        <select value={storeId} onChange={e => setStoreId(e.target.value)} className={selectCls}>
          <option value="">All Stores</option>
          {stores.map(s => <option key={s.storeId} value={s.storeId}>{s.storeName}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className={selectCls}>
          <option value="">All Statuses</option>
          <option>In Stock</option><option>Low Stock</option><option>Out of Stock</option>
        </select>
        <button
          onClick={() => exportToExcel(rows.map(r => ({
            'Item Code': r.itemCode, 'Item Name': r.itemName, Manufacturer: r.manufacturer, Category: r.category,
            Store: r.storeName, Batch: r.batchNo, Expiry: r.expiryDate || '',
            Quantity: r.quantity, UOM: r.uom, Min: r.minStock, Max: r.maxStock, Value: r.stockValue,
            Status: statusOf(r.quantity, r.reorderLevel),
          })), 'current_stock')}
          className="h-11 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Item Code</th>
                <th className="px-4 py-3 text-left">Item Details</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Store</th>
                <th className="px-4 py-3 text-left">Batch</th>
                <th className="px-4 py-3 text-left">Expire</th>
                <th className="px-4 py-3 text-left">Available Qty</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map(r => {
                const st = statusOf(r.quantity, r.reorderLevel);
                const hasLimits = r.minStock != null || r.maxStock != null;
                return (
                  <tr key={r.stockId} className="hover:bg-slate-50/70 transition-colors align-top">
                    <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{r.itemCode}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{r.itemName}</div>
                      {r.manufacturer && <div className="text-xs italic text-slate-400 mt-0.5">{r.manufacturer}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.category || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{r.storeName}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.batchNo || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{dateOnly(r.expiryDate)}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">
                        {r.quantity} <span className="text-xs font-medium text-slate-500">{r.uom}</span>
                      </div>
                      {hasLimits && (
                        <div className="text-[11px] font-semibold text-slate-400 mt-0.5">
                          MIN: {r.minStock ?? '—'} | MAX: {r.maxStock ?? '—'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3"><AutoStatusBadge status={st} /></td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center text-slate-400">
                    <Package className="w-9 h-9 mx-auto text-slate-200 mb-2" />
                    {loading ? 'Loading stock…' : stock.length === 0
                      ? 'No stock yet. Receive goods under Stock In to get started.'
                      : 'No stock matches the current filters.'}
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
