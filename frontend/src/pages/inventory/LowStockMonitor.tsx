import { API_BASE_URL } from '@/utils/apiBase';
import { useState, useMemo, useEffect } from 'react';
import { INVENTORY_TYPES, typeLabel } from '../../utils/inventoryTypes';
import { Pagination } from '../../components/ui/Pagination';
import { PageHeader } from '../../components/inventory/PageHeader';
import { StatusBadge } from '../../components/inventory/StatusBadge';
import { Search, Download, FileText, PackageX } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInventory, type LowStockRow } from '../../contexts/InventoryContext';
import { exportToExcel } from '../../utils/exportToExcel';

const API_BASE = API_BASE_URL;
const today = () => new Date().toISOString().split('T')[0];
const plusDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]; };

const severity = (qty: number, reorder: number): { text: string; tone: 'rose' | 'orange' | 'amber' } =>
  qty <= 0 ? { text: 'Out of Stock', tone: 'rose' }
    : qty <= reorder / 2 ? { text: 'Critical Low', tone: 'orange' }
      : { text: 'Reorder Required', tone: 'amber' };

export const LowStockMonitor = () => {
  const { lowStock, stores, loading } = useInventory();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [itemType, setItemType] = useState('');
  const [generating, setGenerating] = useState(false);

  const categories = useMemo(() => {
    const set = new Set<string>();
    lowStock.forEach(r => r.category && set.add(r.category));
    return [...set].sort();
  }, [lowStock]);

  // The API computes low stock against each item's own reorder level; the
  // prototype dashboard used a hardcoded threshold of 50 instead, so the two
  // screens disagreed.
  const rows = useMemo(() => lowStock.filter(r => {
    if (itemType && r.itemType !== itemType) return false;
    const s = search.trim().toLowerCase();
    if (s && !(r.itemName.toLowerCase().includes(s) || r.itemCode.toLowerCase().includes(s))) return false;
    if (category && r.category !== category) return false;
    return true;
  }), [lowStock, search, category, itemType]);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Raise a real Purchase Requisition (procurement) for the given low-stock
  // items — the requested qty is each item's deficit back up to its reorder
  // level. Posts to the same /purchase-requisitions API the PR screen uses.
  /**
   * Raises purchase requisitions for the given low-stock rows.
   *
   * A requisition covers exactly ONE inventory type, so rows are grouped by
   * type and one PR is raised per group. Medicines are requisitioned into the
   * pharmacy store, everything else into the main store.
   */
  const generatePR = async (items: LowStockRow[], label: string) => {
    if (!items.length) { toast('No low-stock items to requisition'); return; }
    if (generating) return;
    setGenerating(true);
    try {
      const groups = items.reduce((acc: Record<string, LowStockRow[]>, r) => {
        const t = r.itemType || 'MEDICAL_ITEM';
        (acc[t] ||= []).push(r);
        return acc;
      }, {});
      const raised: string[] = [];
      let seqOffset = 0;
      for (const [invType, groupItems] of Object.entries(groups)) {
      const existing = await fetch(`${API_BASE}/purchase-requisitions`)
        .then(r => (r.ok ? r.json() : [])).catch(() => []);
      const seq = (Array.isArray(existing) ? existing.length : 0) + 1 + seqOffset;
      seqOffset += 1;
      const prNo = `PR-${new Date().getFullYear()}-${String(seq).padStart(3, '0')}`;
      const wanted = invType === 'MEDICINE' ? 'Pharmacy Store' : 'Main Store';
      const store = (stores.find(st => st.storeType === wanted)
        ?? stores.find(st => st.storeType === 'Main Store')
        ?? stores[0])?.storeName || '';
      const critical = groupItems.some(r => r.quantity <= 0 || r.quantity <= r.reorderLevel / 2);

      const prItems = groupItems.map(r => ({
        id: `low-${r.itemType}-${r.itemId}`,
        itemId: r.itemId, itemType: r.itemType || invType,
        itemCode: r.itemCode, itemName: r.itemName,
        category: r.category || '', subCategory: '',
        availableStock: r.quantity,
        requestedQty: Math.max(1, r.deficit || (r.reorderLevel - r.quantity)),
        uom: r.uom || '', estimatedPrice: 0, estimatedAmount: 0,
        store, remarks: 'Auto-raised from Low Stock Monitor',
      }));

      const payload = {
        prNo,
        requisitionDate: today(),
        department: store,
        inventoryType: invType,
        requestedBy: 'Inventory',
        priority: critical ? 'High' : 'Normal',
        requiredDate: plusDays(7),
        purpose: 'Replenishment for items below reorder level',
        remarks: '',
        items: prItems,
        totalItems: prItems.length,
        estimatedCost: 0,
        approvalStatus: 'Draft',
        currentStage: 'Draft',
        createdBy: 'Inventory',
      };

      const res = await fetch(`${API_BASE}/purchase-requisitions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (res.ok) {
        raised.push(prNo);
      } else {
        console.error('PR create failed', res.status, await res.text().catch(() => ''));
        toast.error(`Failed to create requisition for ${typeLabel(invType)}`);
      }
      }
      if (raised.length) {
        toast.success(`${label}: ${raised.join(', ')} raised — see Purchase Requisitions`);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to create purchase requisition');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader crumb="Low Stock Monitor" title="Low Stock Monitor" />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search low stock items..."
            className="w-full h-11 pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:bg-white" />
        </div>
        <select value={itemType} onChange={e => setItemType(e.target.value)}
          className="h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-primary">
          <option value="">All Types</option>
          {INVENTORY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
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
          className="h-11 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center gap-2 ml-auto">
          <Download className="w-4 h-4" /> Export
        </button>
        <button onClick={() => generatePR(rows, 'Bulk purchase requisition')} disabled={generating || rows.length === 0}
          className="h-11 px-4 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm disabled:opacity-60">
          <FileText className="w-4 h-4" /> {generating ? 'Generating…' : 'Generate Bulk PR'}
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
                <th className="px-4 py-3 text-right">Action</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map(r => {
                const sev = severity(r.quantity, r.reorderLevel);
                return (
                  <tr key={`${r.itemType}-${r.itemId}`} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        {r.itemName}
                        {r.itemType && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            r.itemType === 'MEDICINE' ? 'bg-emerald-50 text-emerald-700'
                              : r.itemType === 'MEDICAL_ITEM' ? 'bg-sky-50 text-sky-700'
                              : 'bg-slate-100 text-slate-600'}`}>
                            {typeLabel(r.itemType)}
                          </span>
                        )}
                      </div>
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
                      <button onClick={() => generatePR([r], 'Purchase requisition')} disabled={generating}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:border-primary hover:text-primary transition-colors disabled:opacity-60">
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
