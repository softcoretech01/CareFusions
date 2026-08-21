import { useState, useMemo, useEffect } from 'react';
import { DateFilter, monthStart, today } from '../../components/ui/DateFilter';
import { Pagination } from '../../components/ui/Pagination';
import {
  IndianRupee, TrendingUp, CalendarClock, Activity, Download, X, FileBarChart, Lock,
} from 'lucide-react';
import { useInventory } from '../../contexts/InventoryContext';
import { exportToExcel } from '../../utils/exportToExcel';

const inr = (n: number) => `â‚¹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type ReportKey = 'valuation' | 'consumption' | 'expiry' | 'movement';

interface Column { key: string; label: string; align?: 'right' }

export const InventoryReports = () => {
  const { stock, valuation, expiring, documents, ledger, stores, loading } = useInventory();
  const [open, setOpen] = useState<ReportKey | null>(null);
  const [storeId, setStoreId] = useState('');
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(today());
  const [draftFrom, setDraftFrom] = useState(monthStart());
  const [draftTo, setDraftTo] = useState(today());

  const applyDates = () => { setFromDate(draftFrom); setToDate(draftTo); };
  const clearDates = () => { setDraftFrom(''); setDraftTo(''); setFromDate(''); setToDate(''); };

  const inRange = (iso?: string | null) => {
    if (!iso) return true;
    const day = localDay(new Date(iso));
    if (fromDate && day < fromDate) return false;
    if (toDate && day > toDate) return false;
    return true;
  };

  const storeFilter = (id: number) => !storeId || String(id) === storeId;

  // â”€â”€ Stock valuation: category totals at moving-average cost â”€â”€
  const valuationRows = useMemo(() => {
    if (storeId) {
      const acc: Record<string, { category: string; itemCount: number; totalQty: number; totalValue: number }> = {};
      stock.filter(s => storeFilter(s.storeId)).forEach(s => {
        const k = s.category || 'Uncategorised';
        acc[k] = acc[k] || { category: k, itemCount: 0, totalQty: 0, totalValue: 0 };
        acc[k].itemCount += 1;
        acc[k].totalQty += s.quantity;
        acc[k].totalValue += s.stockValue;
      });
      return Object.values(acc);
    }
    return valuation;
  }, [valuation, stock, storeId]);

  // â”€â”€ Consumption: what departments took, valued at the rate actually posted â”€â”€
  const consumptionRows = useMemo(() => {
    const rateFor = (docNumber: string, itemId: number) =>
      ledger.find(l => l.docNumber === docNumber && l.itemId === itemId)?.rate ?? 0;
    const acc: Record<string, { department: string; issues: number; quantity: number; value: number }> = {};
    documents
      .filter(d => d.docType === 'ISSUE' && d.departmentName && inRange(d.docDate))
      .forEach(d => {
        const k = d.departmentName;
        acc[k] = acc[k] || { department: k, issues: 0, quantity: 0, value: 0 };
        acc[k].issues += 1;
        d.items.forEach(it => {
          acc[k].quantity += Math.abs(it.quantity);
          acc[k].value += Math.abs(it.quantity) * rateFor(d.docNumber, it.itemId);
        });
      });
    return Object.values(acc).sort((a, b) => b.value - a.value);
  }, [documents, ledger, fromDate, toDate]);

  // â”€â”€ Expiry tracker â”€â”€
  const expiryRows = useMemo(() => expiring.map(e => ({
    itemCode: e.itemCode, itemName: e.itemName, store: e.storeName, batchNo: e.batchNo,
    expiryDate: e.expiryDate ? new Date(e.expiryDate).toLocaleDateString('en-GB') : 'â€”',
    daysToExpiry: e.daysToExpiry, quantity: e.quantity,
  })), [expiring]);

  // â”€â”€ Fast / slow moving: ranked by quantity issued â”€â”€
  const movementRows = useMemo(() => {
    const acc: Record<number, { itemName: string; movements: number; issued: number; received: number; onHand: number }> = {};
    ledger.filter(l => storeFilter(l.storeId) && inRange(l.txnDate)).forEach(l => {
      acc[l.itemId] = acc[l.itemId] || { itemName: l.itemName, movements: 0, issued: 0, received: 0, onHand: 0 };
      acc[l.itemId].movements += 1;
      if (l.quantity < 0) acc[l.itemId].issued += -l.quantity;
      else acc[l.itemId].received += l.quantity;
    });
    stock.filter(s => storeFilter(s.storeId)).forEach(s => {
      if (acc[s.itemId]) acc[s.itemId].onHand += s.quantity;
    });
    return Object.values(acc)
      .map(r => ({ ...r, velocity: r.issued === 0 ? 'No movement' : r.issued >= 50 ? 'Fast moving' : 'Slow moving' }))
      .sort((a, b) => b.issued - a.issued);
  }, [ledger, stock, storeId, fromDate, toDate]);

  const REPORTS: Record<ReportKey, {
    title: string; description: string; icon: any; cls: string;
    rows: any[]; columns: Column[]; summary: string;
  }> = {
    valuation: {
      title: 'Stock Valuation', description: 'Closing stock value by category at moving-average cost',
      icon: IndianRupee, cls: 'text-emerald-600 bg-emerald-50', rows: valuationRows,
      columns: [
        { key: 'category', label: 'Category' },
        { key: 'itemCount', label: 'Lots', align: 'right' },
        { key: 'totalQty', label: 'Quantity', align: 'right' },
        { key: 'totalValue', label: 'Value', align: 'right' },
      ],
      summary: inr(valuationRows.reduce((s, r) => s + r.totalValue, 0)),
    },
    consumption: {
      title: 'Consumption Analysis', description: 'Stock consumed per department, valued at issue cost',
      icon: TrendingUp, cls: 'text-purple-600 bg-purple-50', rows: consumptionRows,
      columns: [
        { key: 'department', label: 'Department' },
        { key: 'issues', label: 'Issues', align: 'right' },
        { key: 'quantity', label: 'Quantity', align: 'right' },
        { key: 'value', label: 'Value', align: 'right' },
      ],
      summary: inr(consumptionRows.reduce((s, r) => s + r.value, 0)),
    },
    expiry: {
      title: 'Expiry Tracker', description: 'Lots expiring within 90 days, or already expired',
      icon: CalendarClock, cls: 'text-amber-600 bg-amber-50', rows: expiryRows,
      columns: [
        { key: 'itemName', label: 'Item' },
        { key: 'store', label: 'Store' },
        { key: 'batchNo', label: 'Batch' },
        { key: 'expiryDate', label: 'Expiry' },
        { key: 'daysToExpiry', label: 'Days', align: 'right' },
        { key: 'quantity', label: 'Qty', align: 'right' },
      ],
      summary: `${expiryRows.length} lot(s)`,
    },
    movement: {
      title: 'Fast & Slow Moving', description: 'Items ranked by quantity issued in the period',
      icon: Activity, cls: 'text-blue-600 bg-blue-50', rows: movementRows,
      columns: [
        { key: 'itemName', label: 'Item' },
        { key: 'movements', label: 'Movements', align: 'right' },
        { key: 'received', label: 'Received', align: 'right' },
        { key: 'issued', label: 'Issued', align: 'right' },
        { key: 'onHand', label: 'On Hand', align: 'right' },
        { key: 'velocity', label: 'Velocity' },
      ],
      summary: `${movementRows.length} item(s)`,
    },
  };

  // These two need Procurement data (GRN vs PO, vendor lead times), which has no
  // backend yet â€” shown as unavailable rather than faked with placeholder numbers.
  const BLOCKED = [
    { title: 'Stock Reconciliation', description: 'Physical count vs system stock â€” needs Procurement GRN data' },
    { title: 'Vendor Performance', description: 'Lead time and fill rate â€” needs Procurement purchase orders' },
  ];

  const active = open ? REPORTS[open] : null;

  // Report tables paginate too, and reset whenever a different report is opened
  // or the filters change the row count.
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const activeRows = active?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil(activeRows.length / PAGE_SIZE));
  useEffect(() => { setPage(1); }, [open]);
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const pagedRows = activeRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const cell = (row: any, col: Column) => {
    const v = row[col.key];
    if (typeof v === 'number' && col.key.toLowerCase().includes('value')) return inr(v);
    if (col.key === 'daysToExpiry') return v < 0 ? `${Math.abs(v)} overdue` : v;
    return v ?? 'â€”';
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Inventory Reports</h1>
          <p className="text-xs text-slate-500">Generated from live stock, movements and the ledger</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={storeId} onChange={e => setStoreId(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600">
            <option value="">All Stores</option>
            {stores.map(s => <option key={s.storeId} value={s.storeId}>{s.storeName}</option>)}
          </select>
          <DateFilter
            dateFrom={draftFrom}
            dateTo={draftTo}
            onDateFromChange={setDraftFrom}
            onDateToChange={setDraftTo}
            onSearch={applyDates}
            onReset={clearDates}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.keys(REPORTS) as ReportKey[]).map(k => {
          const r = REPORTS[k];
          const Icon = r.icon;
          return (
            <div key={k} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${r.cls}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800">{r.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5 flex-1">{r.description}</p>
              <p className="text-lg font-bold text-slate-900 mt-2">{r.summary}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setOpen(k)}
                  className="flex-1 px-3 py-1.5 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90">
                  View
                </button>
                <button onClick={() => exportToExcel(r.rows, `${k}_report`)} disabled={r.rows.length === 0}
                  title="Export to Excel"
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-200 disabled:opacity-40">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {BLOCKED.map(b => (
          <div key={b.title} className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-600">{b.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{b.description}</p>
            </div>
          </div>
        ))}
      </div>

      {active && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[88vh] overflow-y-auto">
            <div className="px-4 py-2.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FileBarChart className="w-5 h-5 text-primary" /> {active.title}
                </h2>
                <p className="text-xs text-slate-500">{active.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => exportToExcel(active.rows, `${open}_report`)}
                  disabled={active.rows.length === 0}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-bold text-slate-700 flex items-center gap-1 disabled:opacity-40 ml-auto">
                  <Download className="w-4 h-4" /> Export
                </button>
                <button onClick={() => setOpen(null)} className="p-2 hover:bg-slate-200 rounded-full">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>
            <div className="p-5">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    {active.columns.map(c => (
                      <th key={c.key} className={`px-3 py-2 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedRows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/70">
                      {active.columns.map(c => (
                        <td key={c.key}
                          className={`px-3 py-2 ${c.align === 'right' ? 'text-right font-medium text-slate-800' : 'text-slate-700'}`}>
                          {cell(row, c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {active.rows.length === 0 && (
                    <tr>
                      <td colSpan={active.columns.length} className="px-3 py-10 text-center text-slate-400">
                        {loading ? 'Loadingâ€¦' : 'No data for the selected filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <Pagination page={page} pageSize={PAGE_SIZE} totalItems={activeRows.length} onPageChange={setPage} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

