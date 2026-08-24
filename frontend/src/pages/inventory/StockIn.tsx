import { useState, useEffect, useMemo } from 'react';
import { DateFilter, monthStart, today } from '@/components/ui/DateFilter';
import { Pagination } from '../../components/ui/Pagination';
import { Search, Download, PackageCheck, Eye, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportToExcel } from '../../utils/exportToExcel';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useInventory } from '../../contexts/InventoryContext';
import { PageHeader } from '../../components/inventory/PageHeader';
import { AutoStatusBadge, StatusBadge } from '../../components/inventory/StatusBadge';

// Stock In no longer creates receipts here. Goods are received in
// Procurement → Goods Receipt (GRN); this screen lists those GRNs, and
// "Accept" posts an accepted GRN into inventory stock (a RECEIPT document),
// which is what makes it show up across Current Stock / Ledger / etc.
const API_BASE = import.meta.env.VITE_API_URL as string;

interface GRNItem {
  id?: string;
  itemId: number;
  itemName: string;
  category?: string;
  orderedQty?: number;
  receivedQty?: number;
  acceptedQty?: number;
  rejectedQty?: number;
  rate?: number;
  totalPrice?: number;
  batchNumber?: string;
  expiryDate?: string;
  manufactureDate?: string;
  remarks?: string;
}
interface GRNRecord {
  id: number;
  grnNo: string;
  poNumber: string;
  vendorName: string;
  store: string;
  receivedDate: string;
  invoiceNumber?: string;
  status: string;
  qcStatus?: string;
  items?: GRNItem[];
}

const dateOnly = (s: string | null | undefined) => (s ? String(s).slice(0, 10) : '—');

export const StockIn = () => {
  // documents/stores/postDocument come from the inventory context so that
  // stocking a GRN reuses the real posting engine (moving-average cost + ledger)
  // and the whole module re-syncs afterwards.
  const { documents, stores, postDocument } = useInventory();

  const [records, setRecords] = useState<GRNRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [stockingId, setStockingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(today());
  const [draftFrom, setDraftFrom] = useState(monthStart());
  const [draftTo, setDraftTo] = useState(today());

  const applyDates = () => { setFromDate(draftFrom); setToDate(draftTo); };
  const clearDates = () => { setDraftFrom(''); setDraftTo(''); setFromDate(''); setToDate(''); };
  const [selectedRecord, setSelectedRecord] = useState<GRNRecord | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  // A GRN is "stocked" once an inventory RECEIPT document carries its GRN No as
  // the reference — that link is created on Accept and prevents double-posting.
  const stockedSet = useMemo(
    () => new Set(documents.filter(d => d.docType === 'RECEIPT' && d.referenceNo).map(d => d.referenceNo)),
    [documents],
  );
  const isStocked = (grnNo: string) => stockedSet.has(grnNo);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/grns`);
      const data = res.ok ? await res.json() : [];
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch on mount, so a GRN added in Procurement shows the next time this
  // page is opened — no manual reload.
  useEffect(() => { load(); }, []);

  const handleView = async (record: GRNRecord) => {
    try {
      const res = await fetch(`${API_BASE}/grns/${record.id}`);
      setSelectedRecord(res.ok ? await res.json() : record);
    } catch {
      setSelectedRecord(record);
    }
    setIsViewOpen(true);
  };

  // Accept = move the GRN's accepted goods into inventory stock.
  const handleAccept = async (record: GRNRecord) => {
    if (isStocked(record.grnNo)) { toast('Already stocked into inventory'); return; }
    setStockingId(record.id);
    try {
      const res = await fetch(`${API_BASE}/grns/${record.id}`);
      const grn: GRNRecord = res.ok ? await res.json() : record;

      const store = stores.find(s => s.storeName === grn.store);
      if (!store) { toast.error(`Store "${grn.store}" is not an inventory store`); return; }

      // Only what passed QC (acceptedQty), falling back to receivedQty.
      const items = (grn.items || [])
        .map(it => ({
          itemId: it.itemId,
          batchNo: it.batchNumber || null,
          mfgDate: it.manufactureDate || null,
          expiryDate: it.expiryDate || null,
          quantity: Number(it.acceptedQty ?? it.receivedQty ?? 0),
          rate: Number(it.rate || 0),
          uom: null as string | null,
          remarks: null as string | null,
        }))
        .filter(it => it.itemId && it.quantity > 0);

      if (!items.length) { toast.error('No accepted quantity to stock'); return; }

      const result = await postDocument({
        docType: 'RECEIPT',
        fromStoreId: null,
        toStoreId: store.storeId,
        departmentName: null,
        vendorName: grn.vendorName || null,
        referenceNo: grn.grnNo,
        requestedBy: 'Stock In',
        reason: null,
        remarks: `Stocked from ${grn.grnNo}`,
        items,
      });

      if (result) {
        toast.success(`${grn.grnNo} stocked into inventory (${result.docNumber})`);
      } else {
        toast.error('Failed to stock this GRN');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to stock this GRN');
    } finally {
      setStockingId(null);
    }
  };

  const rows = useMemo(() => records.filter(r => {
    const s = search.trim().toLowerCase();
    if (s && !((r.grnNo || '').toLowerCase().includes(s)
      || (r.poNumber || '').toLowerCase().includes(s)
      || (r.vendorName || '').toLowerCase().includes(s))) return false;
    const day = dateOnly(r.receivedDate);
    if (fromDate && day < fromDate) return false;
    if (toDate && day > toDate) return false;
    return true;
  }), [records, search, fromDate, toDate]);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <PageHeader
        crumb="Stock In"
        title="Stock In (Goods Receipt)"
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

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2.5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by GRN, PO or Vendor..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary" />
        </div>
        <button
          onClick={() => exportToExcel(rows.map(r => ({
            'GRN No': r.grnNo, 'PO Number': r.poNumber, Vendor: r.vendorName, Store: r.store,
            'Received Date': dateOnly(r.receivedDate), 'Total Items': r.items?.length ?? 0,
            Status: r.status, Stocked: isStocked(r.grnNo) ? 'Yes' : 'No',
          })), 'stock_in_grns')}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center gap-2 ml-auto">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">GRN No</th>
                <th className="px-3 py-2 text-left">PO Number</th>
                <th className="px-3 py-2 text-left">Vendor</th>
                <th className="px-3 py-2 text-left">Target Store</th>
                <th className="px-3 py-2 text-left">Received Date</th>
                <th className="px-3 py-2 text-right">Total Items</th>
                <th className="px-3 py-2 text-left">GRN Status</th>
                <th className="px-3 py-2 text-left">Stock Status</th>
                <th className="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map(r => {
                const stocked = isStocked(r.grnNo);
                const busy = stockingId === r.id;
                return (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-3 py-2 font-bold text-primary whitespace-nowrap">{r.grnNo}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.poNumber || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{r.vendorName || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{r.store || '—'}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{dateOnly(r.receivedDate)}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{r.items?.length ?? 0}</td>
                    <td className="px-3 py-2"><AutoStatusBadge status={r.status || '—'} /></td>
                    <td className="px-3 py-2">
                      <StatusBadge tone={stocked ? 'green' : 'amber'}>{stocked ? 'Stocked' : 'Pending'}</StatusBadge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleView(r)} title="View Details"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        {stocked ? (
                          <span title="Already stocked into inventory" className="p-1.5 text-emerald-500">
                            <CheckCircle className="w-4 h-4" />
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAccept(r)}
                            disabled={busy}
                            className="px-2.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg flex items-center gap-1 disabled:opacity-60"
                            title="Accept — post this GRN into inventory stock"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> {busy ? 'Stocking…' : 'Accept'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-slate-400">
                    <PackageCheck className="w-8 h-8 mx-auto text-slate-200 mb-2" />
                    {loading ? 'Loading goods receipts…' : 'No goods receipts found. Add one in Procurement → Goods Receipt.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} totalItems={totalRows} onPageChange={setPage} />
      </div>

      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="View Goods Receipt Note" size="7xl">
        {selectedRecord && (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-4 gap-4">
              <div><label className="block text-xs font-medium text-slate-500 mb-1">GRN Number</label><div className="text-sm font-medium text-slate-800">{selectedRecord.grnNo}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">PO Number</label><div className="text-sm font-medium text-slate-800">{selectedRecord.poNumber}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Vendor</label><div className="text-sm font-medium text-slate-800">{selectedRecord.vendorName}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Status</label><div className="text-sm font-medium text-slate-800">{selectedRecord.status}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Received Date</label><div className="text-sm font-medium text-slate-800">{selectedRecord.receivedDate}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Store</label><div className="text-sm font-medium text-slate-800">{selectedRecord.store}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Invoice No</label><div className="text-sm font-medium text-slate-800">{selectedRecord.invoiceNumber || '-'}</div></div>
              <div><label className="block text-xs font-medium text-slate-500 mb-1">Stock Status</label><div className="text-sm font-medium text-slate-800">{isStocked(selectedRecord.grnNo) ? 'Stocked' : 'Pending'}</div></div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Received Items</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Item</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Category</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Rate(₹)</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Ordered</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Received</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600 text-emerald-600">Accepted</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600 text-red-600">Rejected</th>
                      <th className="text-right py-2 px-3 font-medium text-slate-600">Total(₹)</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Batch No</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedRecord.items || []).map((item, idx) => (
                      <tr key={item.id || idx} className="bg-white">
                        <td className="py-2 px-3 font-medium">{item.itemName}</td>
                        <td className="py-2 px-3 text-slate-600">{item.category || '-'}</td>
                        <td className="py-2 px-3 text-right">{(item.rate || 0).toFixed(2)}</td>
                        <td className="py-2 px-3 text-right">{item.orderedQty || 0}</td>
                        <td className="py-2 px-3 text-right font-medium text-blue-600">{item.receivedQty || 0}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-600">{item.acceptedQty || 0}</td>
                        <td className="py-2 px-3 text-right font-bold text-red-600">{item.rejectedQty || 0}</td>
                        <td className="py-2 px-3 text-right font-medium">{(item.totalPrice || 0).toFixed(2)}</td>
                        <td className="py-2 px-3">{item.batchNumber || '-'}</td>
                        <td className="py-2 px-3">{item.expiryDate || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan={7} className="py-3 px-4 text-right font-medium text-slate-700">Grand Total</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800">₹{(selectedRecord.items || []).reduce((sum: number, item: GRNItem) => sum + (item.totalPrice || 0), 0).toFixed(2)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              {!isStocked(selectedRecord.grnNo) && (
                <Button onClick={() => { handleAccept(selectedRecord); setIsViewOpen(false); }}>Accept &amp; Stock In</Button>
              )}
              <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

