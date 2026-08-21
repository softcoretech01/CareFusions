import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { Pagination } from '../../components/ui/Pagination';
import { PageHeader } from '../../components/inventory/PageHeader';
import { DateFilter, monthStart, today } from '@/components/ui/DateFilter';
import { AutoStatusBadge } from '../../components/inventory/StatusBadge';
import { Plus, Search, X, Trash2, FileText, AlertCircle, PackageCheck, Eye, Pencil, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useInventory, type DocType, type IssuableLot, type MovementDocument,
} from '../../contexts/InventoryContext';
import {
  lettersOnly, digitsOnly, decimalOnly, signedDigits, alphanumeric, freeText, LIMITS,
} from '../../utils/inputRules';
import { inr } from '../../utils/inr';
import { exportToExcel } from '../../utils/exportToExcel';
import { useDepartments } from '../../hooks/useMasterOptions';

/** Local calendar day (YYYY-MM-DD) â€” safe against UTC parsing skew. */
const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const dayOf = (s: string | null | undefined) => (s ? localDay(new Date(s)) : 'â€”');

export interface MovementConfig {
  docType: DocType;
  title: string;
  subtitle: string;
  /** Where the stock comes from â€” shows a source store picker and lot selection. */
  needsSource: boolean;
  /** Where the stock lands â€” shows a destination store picker. */
  needsDestination: boolean;
  /** Free-text consumption destination (ISSUE only). */
  needsDepartment?: boolean;
  /** Supplier + external reference (RECEIPT only). */
  needsVendor?: boolean;
  /** Reason dropdown (RETURN / ADJUSTMENT). */
  reasons?: string[];
  /** Lines carry a cost (RECEIPT / RETURN). */
  needsRate?: boolean;
  /** Lines may be negative â€” a write-off (ADJUSTMENT). */
  allowNegative?: boolean;
  submitLabel: string;
  numberLabel: string;
}

// Reference-matching labels per document type, kept here so the trivial wrapper
// files stay untouched. `config` still drives all behaviour flags.
interface Presentation {
  crumb: string;
  title: string;
  newLabel: string;
  modalTitle: string;
  confirmLabel: string;
  qtyLabel: string;
}
const PRESENTATION: Record<DocType, Presentation> = {
  RECEIPT: { crumb: 'Stock In', title: 'Process Stock In', newLabel: 'New Receipt', modalTitle: 'New Stock In', confirmLabel: 'Confirm Stock In', qtyLabel: 'Receive Qty' },
  ISSUE: { crumb: 'Stock Out', title: 'Stock Out', newLabel: 'New Stock Out', modalTitle: 'New Stock Out', confirmLabel: 'Confirm Stock Out', qtyLabel: 'Stock Out Qty' },
  RETURN: { crumb: 'Stock Return', title: 'Stock Return', newLabel: 'New Return', modalTitle: 'New Stock Return', confirmLabel: 'Post Return', qtyLabel: 'Return Qty' },
  TRANSFER: { crumb: 'Stock Transfer', title: 'Stock Transfer', newLabel: 'Initiate Transfer', modalTitle: 'Initiate Stock Transfer', confirmLabel: 'Execute Transfer', qtyLabel: 'Transfer Qty' },
  ADJUSTMENT: { crumb: 'Stock Adjustment', title: 'Stock Adjustment', newLabel: 'New Adjustment', modalTitle: 'New Stock Adjustment', confirmLabel: 'Post Adjustment', qtyLabel: 'Adjust Qty' },
};

interface Column {
  label: string;
  align?: 'left' | 'right';
  render: (d: MovementDocument) => ReactNode;
}

const buildColumns = (docType: DocType): Column[] => {
  const num = (d: MovementDocument): ReactNode => <span className="font-bold text-primary">{d.docNumber}</span>;
  switch (docType) {
    case 'RECEIPT':
      return [
        { label: 'GRN No', render: num },
        { label: 'PO Number', render: d => d.referenceNo || 'â€”' },
        { label: 'Vendor', render: d => d.vendorName || 'â€”' },
        { label: 'Target Store', render: d => d.toStoreName || 'â€”' },
        { label: 'Received Date', render: d => dayOf(d.docDate) },
        { label: 'Total Items', align: 'right', render: d => d.totalItems },
        { label: 'Status', render: d => <AutoStatusBadge status={d.status || 'Received'} /> },
      ];
    case 'ISSUE':
      return [
        { label: 'Stock Out No', render: num },
        { label: 'Date', render: d => dayOf(d.docDate) },
        { label: 'Destination', render: d => d.departmentName || 'â€”' },
        { label: 'Store', render: d => d.fromStoreName || 'â€”' },
        { label: 'Requested By', render: d => d.requestedBy || 'â€”' },
        { label: 'Total Items', align: 'right', render: d => d.totalItems },
        { label: 'Total Qty', align: 'right', render: d => <span className="font-semibold text-slate-800">{d.totalQty}</span> },
      ];
    case 'RETURN':
      return [
        { label: 'Return No', render: num },
        { label: 'Date', render: d => dayOf(d.docDate) },
        { label: 'Source (Returned From)', render: d => d.fromStoreName || d.departmentName || 'â€”' },
        { label: 'Returned By', render: d => d.requestedBy || 'â€”' },
        { label: 'Reason', render: d => d.reason || 'â€”' },
        { label: 'Items', align: 'right', render: d => d.totalItems },
        { label: 'Total Qty', align: 'right', render: d => <span className="font-semibold text-slate-800">{d.totalQty}</span> },
        { label: 'Status', render: d => <AutoStatusBadge status={d.status || 'Pending'} /> },
      ];
    case 'TRANSFER':
      return [
        {
          label: 'Transfer No', render: d => (
            <div>
              <div className="font-bold text-primary">{d.docNumber}</div>
              {d.requestedBy && <div className="text-[11px] uppercase tracking-wide text-slate-400">By: {d.requestedBy}</div>}
            </div>
          ),
        },
        { label: 'Date', render: d => dayOf(d.docDate) },
        { label: 'Source Store', render: d => d.fromStoreName || 'â€”' },
        { label: 'Destination Store', render: d => d.toStoreName || 'â€”' },
        { label: 'Total Items', align: 'right', render: d => d.totalItems },
        { label: 'Total Qty', align: 'right', render: d => <span className="font-semibold text-slate-800">{d.totalQty}</span> },
        { label: 'Status', render: d => <AutoStatusBadge status={d.status || 'Pending'} /> },
      ];
    default: // ADJUSTMENT
      return [
        { label: 'Adjustment No', render: num },
        { label: 'Date', render: d => dayOf(d.docDate) },
        { label: 'Store', render: d => d.fromStoreName || 'â€”' },
        { label: 'Reason', render: d => d.reason || 'â€”' },
        { label: 'Items', align: 'right', render: d => d.totalItems },
        { label: 'Total Qty', align: 'right', render: d => <span className="font-semibold text-slate-800">{d.totalQty}</span> },
        { label: 'Status', render: d => <AutoStatusBadge status={d.status || 'Posted'} /> },
      ];
  }
};

interface LineDraft {
  key: string;
  itemId: number;
  itemName: string;
  category?: string;
  batchNo: string;
  mfgDate: string;
  expiryDate: string;
  uom: string;
  available?: number;
  quantity: string;
  rate: string;
  remarks: string;
}

export const MovementScreen = ({ config }: { config: MovementConfig }) => {
  const {
    stores, items, stock, documents, loading, error, clearError,
    getIssuableLots, postDocument, updateDocument, deleteDocument,
  } = useInventory();

  const pres = PRESENTATION[config.docType];
  const columns = useMemo(() => buildColumns(config.docType), [config.docType]);
  // Departments come from the Department Master (Active only), so a department
  // added there shows up here â€” no hardcoded list to keep in sync.
  const { options: departmentOptions } = useDepartments();

  const [showForm, setShowForm] = useState(false);
  const [viewDoc, setViewDoc] = useState<MovementDocument | null>(null);
  const [editingDoc, setEditingDoc] = useState<MovementDocument | null>(null);
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  // Draft vs applied date range so the header Search/Cancel buttons do real work.
  const [draftFrom, setDraftFrom] = useState(monthStart());
  const [draftTo, setDraftTo] = useState(today());
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(today());
  const [submitting, setSubmitting] = useState(false);

  const [fromStoreId, setFromStoreId] = useState<string>('');
  const [toStoreId, setToStoreId] = useState<string>('');
  const [departmentName, setDepartmentName] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [lots, setLots] = useState<IssuableLot[]>([]);

  // Load the source store's issuable lots (FEFO ordered, expired excluded).
  useEffect(() => {
    if (!config.needsSource || !fromStoreId) { setLots([]); return; }
    getIssuableLots(Number(fromStoreId)).then(setLots);
  }, [config.needsSource, fromStoreId, getIssuableLots]);

  const docs = useMemo(() => documents.filter(d => {
    if (d.docType !== config.docType) return false;
    const s = search.trim().toLowerCase();
    if (s && !(d.docNumber.toLowerCase().includes(s)
      || (d.requestedBy || '').toLowerCase().includes(s)
      || (d.vendorName || '').toLowerCase().includes(s)
      || (d.departmentName || '').toLowerCase().includes(s))) return false;
    if (storeFilter && String(d.fromStoreId) !== storeFilter && String(d.toStoreId) !== storeFilter) return false;
    if (d.docDate) {
      const day = localDay(new Date(d.docDate));
      if (fromDate && day < fromDate) return false;
      if (toDate && day > toDate) return false;
    }
    return true;
  }), [documents, config.docType, search, storeFilter, fromDate, toDate]);

  // The item's most recently updated stock lot â€” the source for the default
  // batch, expiry and cost when an item is picked.
  const latestLotFor = (itemId: number) => {
    const its = stock.filter(s => s.itemId === itemId);
    return its.length ? its.reduce((a, b) => (b.stockId > a.stockId ? b : a)) : null;
  };

  // Items have no price column, so the lot's moving-average rate is the closest
  // "last rate" the DB holds.
  const lastRateFor = (itemId: number): string => {
    const lot = latestLotFor(itemId);
    return lot?.valuationRate ? String(lot.valuationRate) : '';
  };

  // A fresh batch code for items with no existing lot to inherit a batch from.
  const genBatch = () => `BAT-${String(Date.now()).slice(-6)}`;

  // Current on-hand quantity for an item, summed across every store's lots.
  const onHandFor = (itemId: number): number =>
    stock.filter(s => s.itemId === itemId).reduce((sum, s) => sum + s.quantity, 0);

  // Outbound lines (issue/transfer) can't move more than the chosen lot holds â€”
  // cap the quantity at the lot's available balance as the user types.
  const clampToAvailable = (raw: string, available?: number): string => {
    const digits = digitsOnly(raw, LIMITS.qty);
    if (available === undefined || digits === '') return digits;
    return Number(digits) > available ? String(available) : digits;
  };

  const resetForm = () => {
    setFromStoreId(''); setToStoreId(''); setDepartmentName(''); setVendorName('');
    setReferenceNo(''); setRequestedBy(''); setReason(''); setRemarks(''); setLines([]);
    setEditingDoc(null);
    clearError();
  };

  const addLine = () => setLines(prev => [...prev, {
    key: `${Date.now()}-${prev.length}`,
    itemId: 0, itemName: '', batchNo: '', mfgDate: '', expiryDate: '', uom: '',
    quantity: '', rate: '', remarks: '',
  }]);

  const updateLine = (key: string, patch: Partial<LineDraft>) =>
    setLines(prev => prev.map(l => (l.key === key ? { ...l, ...patch } : l)));

  const removeLine = (key: string) => setLines(prev => prev.filter(l => l.key !== key));

  // Source movements pick an existing lot; inbound movements pick a catalogue item.
  const selectLot = (key: string, stockId: string) => {
    const lot = lots.find(l => String(l.stockId) === stockId);
    if (!lot) { updateLine(key, { itemId: 0, itemName: '', batchNo: '', available: undefined, category: '', rate: '' }); return; }
    updateLine(key, {
      itemId: lot.itemId, itemName: lot.itemName, batchNo: lot.batchNo, category: lot.category,
      uom: lot.uom, available: lot.quantity, expiryDate: lot.expiryDate || '',
      rate: String(lot.valuationRate || 0),
    });
  };

  const selectItem = (key: string, itemId: string) => {
    const item = items.find(i => String(i.itemId) === itemId);
    if (!item) { updateLine(key, { itemId: 0, itemName: '', uom: '', category: '', rate: '', batchNo: '', expiryDate: '' }); return; }
    // Selecting an item applies what the DB knows: unit, category and last cost.
    const lot = latestLotFor(item.itemId);
    const patch: Partial<LineDraft> = {
      itemId: item.itemId, itemName: item.itemName, uom: item.uom, category: item.category,
    };
    if (config.needsRate) patch.rate = lot?.valuationRate ? String(lot.valuationRate) : '';
    // Inbound lines (return) carry a batch/expiry â€” show the item's current lot
    // values, or auto-generate a batch when it has no stock yet.
    if (!config.needsSource) {
      patch.batchNo = lot?.batchNo && lot.batchNo !== '-' ? lot.batchNo : genBatch();
      patch.expiryDate = lot?.expiryDate || '';
    }
    updateLine(key, patch);
  };

  const totalQty = lines.reduce((s, l) => s + Math.abs(Number(l.quantity) || 0), 0);
  const totalValue = lines.reduce((s, l) => s + Math.abs((Number(l.quantity) || 0) * (Number(l.rate) || 0)), 0);

  const validate = (): string | null => {
    if (config.needsSource && !fromStoreId) return 'Select the source store';
    if (config.needsDestination && !toStoreId) return 'Select the destination store';
    if (config.docType === 'TRANSFER' && fromStoreId === toStoreId) return 'Source and destination must differ';
    if (config.needsDepartment && !departmentName) return 'Select the destination department';
    if (config.reasons && !reason) return 'Select a reason';
    if (lines.length === 0) return 'Add at least one item';
    for (const l of lines) {
      if (!l.itemId) return 'Every line needs an item';
      const q = Number(l.quantity);
      if (!q || isNaN(q)) return `Enter a quantity for ${l.itemName || 'the selected item'}`;
      if (!config.allowNegative && q <= 0) return 'Quantity must be greater than zero';
      if (l.available !== undefined && Math.abs(q) > l.available) {
        return `Only ${l.available} available for ${l.itemName}`;
      }
    }
    return null;
  };

  const handleEdit = (doc: MovementDocument) => {
    setFromStoreId(doc.fromStoreId ? String(doc.fromStoreId) : '');
    setToStoreId(doc.toStoreId ? String(doc.toStoreId) : '');
    setDepartmentName(doc.departmentName || '');
    setVendorName(doc.vendorName || '');
    setReferenceNo(doc.referenceNo || '');
    setRequestedBy(doc.requestedBy || '');
    setReason(doc.reason || '');
    setRemarks(doc.remarks || '');
    setLines(doc.items.map((it, idx) => ({
      key: `edit-${idx}`,
      itemId: it.itemId,
      itemName: it.itemName,
      category: '',
      batchNo: it.batchNo,
      mfgDate: it.mfgDate || '',
      expiryDate: it.expiryDate || '',
      uom: it.uom,
      quantity: String(config.allowNegative ? it.quantity : Math.abs(it.quantity)),
      rate: it.rate ? String(it.rate) : lastRateFor(it.itemId),
      remarks: it.remarks || '',
    })));
    setEditingDoc(doc);
    clearError();
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) { toast.error(problem); return; }

    setSubmitting(true);
    const payload = {
      docType: config.docType,
      fromStoreId: config.needsSource ? Number(fromStoreId) : null,
      toStoreId: config.needsDestination ? Number(toStoreId) : null,
      departmentName: config.needsDepartment ? departmentName : null,
      vendorName: config.needsVendor ? vendorName || null : null,
      referenceNo: config.needsVendor ? referenceNo || null : null,
      requestedBy: requestedBy || null,
      reason: config.reasons ? reason : null,
      remarks: remarks || null,
      items: lines.map(l => ({
        itemId: l.itemId,
        batchNo: l.batchNo || null,
        mfgDate: l.mfgDate || null,
        expiryDate: l.expiryDate || null,
        quantity: Number(l.quantity),
        rate: Number(l.rate) || 0,
        uom: l.uom || null,
        remarks: l.remarks || null,
      })),
    };

    if (editingDoc) {
      const ok = await updateDocument(editingDoc.docId, payload);
      setSubmitting(false);
      if (ok) {
        toast.success(`${config.numberLabel} ${editingDoc.docNumber} updated`);
        setShowForm(false);
        resetForm();
      }
    } else {
      const result = await postDocument(payload);
      setSubmitting(false);
      if (result) {
        toast.success(`${config.numberLabel} ${result.docNumber} posted`);
        setShowForm(false);
        resetForm();
      }
    }
  };

  const handleDelete = async (doc: MovementDocument) => {
    if (!window.confirm(`Delete ${doc.docNumber}? Stock will NOT be reversed â€” post a correcting adjustment instead.`)) return;
    const ok = await deleteDocument(doc.docId);
    toast[ok ? 'success' : 'error'](ok ? 'Document deleted' : 'Failed to delete document');
  };

  const inputCls = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary';

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalRows = docs.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  // Filters can shrink the list under the current page â€” snap back into range.
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const paged = docs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const applyDates = () => { setFromDate(draftFrom); setToDate(draftTo); };
  const clearDates = () => { setDraftFrom(''); setDraftTo(''); setFromDate(''); setToDate(''); };
  const openForm = () => { resetForm(); addLine(); setShowForm(true); };

  const dateInput = 'h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-primary';

  const exportDocs = () => exportToExcel(docs.map(d => ({
    Number: d.docNumber, Date: dayOf(d.docDate), From: d.fromStoreName, To: d.toStoreName || d.departmentName,
    Vendor: d.vendorName, Reference: d.referenceNo, Reason: d.reason, RequestedBy: d.requestedBy,
    Items: d.totalItems, Qty: d.totalQty, Value: d.totalValue, Status: d.status,
  })), `${config.docType.toLowerCase()}_documents`);

  return (
    <div className="space-y-4">
      <PageHeader
        crumb={pres.crumb}
        title={pres.title}
        right={
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <DateFilter
              dateFrom={draftFrom}
              dateTo={draftTo}
              onDateFromChange={setDraftFrom}
              onDateToChange={setDraftTo}
              onSearch={applyDates}
              onReset={clearDates}
            />
            <button onClick={openForm}
              className="h-10 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm">
              <Plus className="w-4 h-4" /> {pres.newLabel}
            </button>
          </div>
        }
      />

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700 flex-1">{error}</p>
          <button onClick={clearError} className="text-rose-400 hover:text-rose-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Search by ${pres.crumb} No or Requester...`}
            className="w-full h-11 pl-10 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary focus:bg-white"
          />
        </div>
        <select value={storeFilter} onChange={e => setStoreFilter(e.target.value)}
          className="h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-primary">
          <option value="">All Stores</option>
          {stores.map(s => <option key={s.storeId} value={s.storeId}>{s.storeName}</option>)}
        </select>
        <button onClick={exportDocs}
          className="h-11 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center gap-2 ml-auto">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                {columns.map(c => (
                  <th key={c.label} className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.label}</th>
                ))}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map(d => (
                <tr key={d.docId} className="hover:bg-slate-50/70 transition-colors">
                  {columns.map(c => (
                    <td key={c.label} className={`px-4 py-3 whitespace-nowrap ${c.align === 'right' ? 'text-right' : 'text-left text-slate-600'}`}>
                      {c.render(d)}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setViewDoc(d)} title="View"
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(d)} title="Edit"
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(d)} title="Delete"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {docs.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-3 py-14 text-center text-slate-400">
                    <FileText className="w-9 h-9 mx-auto text-slate-200 mb-2" />
                    {loading ? 'Loadingâ€¦' : `No ${pres.title.toLowerCase()} records yet.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} totalItems={totalRows} onPageChange={setPage} />
      </div>

      {/* â”€â”€ New / Edit movement â”€â”€ */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-800">{editingDoc ? `Edit ${editingDoc.docNumber}` : pres.modalTitle}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {config.needsSource && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Source Store</label>
                    <select value={fromStoreId} onChange={e => { setFromStoreId(e.target.value); setLines([]); addLine(); }} className={inputCls}>
                      <option value="">Select Store</option>
                      {stores.map(s => <option key={s.storeId} value={s.storeId}>{s.storeName}</option>)}
                    </select>
                  </div>
                )}
                {config.needsDestination && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">{config.docType === 'RETURN' ? 'Return To' : 'Destination Store'}</label>
                    <select value={toStoreId} onChange={e => setToStoreId(e.target.value)} className={inputCls}>
                      <option value="">Select Destination</option>
                      {stores.filter(s => String(s.storeId) !== fromStoreId).map(s => (
                        <option key={s.storeId} value={s.storeId}>{s.storeName}</option>
                      ))}
                    </select>
                  </div>
                )}
                {config.needsDepartment && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Destination</label>
                    <select value={departmentName} onChange={e => setDepartmentName(e.target.value)} className={inputCls}>
                      <option value="">Select Destination</option>
                      {departmentOptions.map(d => (
                        <option key={d.id} value={d.departmentName}>{d.departmentName}</option>
                      ))}
                    </select>
                  </div>
                )}
                {config.needsVendor && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Vendor</label>
                      <input type="text" value={vendorName} maxLength={LIMITS.shortText}
                        onChange={e => setVendorName(freeText(e.target.value, LIMITS.shortText))}
                        className={inputCls} placeholder="Supplier name" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">PO / GRN Reference</label>
                      <input type="text" value={referenceNo} maxLength={LIMITS.reference}
                        onChange={e => setReferenceNo(alphanumeric(e.target.value, LIMITS.reference))}
                        className={inputCls} placeholder="e.g. PO-2026-001" />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Requested By</label>
                  <input type="text" value={requestedBy}
                    maxLength={LIMITS.name}
                    onChange={e => setRequestedBy(lettersOnly(e.target.value))}
                    className={inputCls} placeholder="Name" />
                </div>
                {config.reasons && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reason</label>
                    <select value={reason} onChange={e => setReason(e.target.value)} className={inputCls}>
                      <option value="">Select reasonâ€¦</option>
                      {config.reasons.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                )}
                {config.docType === 'TRANSFER' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reason / Remarks</label>
                    <input type="text" value={remarks} maxLength={LIMITS.notes}
                      onChange={e => setRemarks(freeText(e.target.value, LIMITS.notes))}
                      className={inputCls} placeholder="Optional" />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-slate-800">Items for {pres.crumb}</h3>
                  <button type="button" onClick={addLine}
                    className="px-3 py-1.5 border border-primary text-primary rounded-lg text-sm font-bold hover:bg-primary/5 flex items-center gap-1.5">
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs font-bold text-slate-600">
                        <tr>
                          <th className="px-3 py-2.5 text-left">Select Item</th>
                          <th className="px-3 py-2.5 text-left">Category</th>
                          {!config.needsSource && <th className="px-3 py-2.5 text-left">Batch</th>}
                          {!config.needsSource && <th className="px-3 py-2.5 text-left">Expiry</th>}
                          <th className="px-3 py-2.5 text-left">Available Qty</th>
                          <th className="px-3 py-2.5 text-left">{pres.qtyLabel}</th>
                          {config.needsRate && <th className="px-3 py-2.5 text-left">Rate â‚¹</th>}
                          <th className="px-3 py-2.5 text-left">{config.docType === 'RETURN' ? 'Condition / Remarks' : config.docType === 'ISSUE' ? 'Damages / Remarks' : 'Remarks'}</th>
                          <th className="px-3 py-2.5"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {lines.map(line => (
                          <tr key={line.key} className="align-top">
                            <td className="px-3 py-2 min-w-[200px]">
                              {config.needsSource ? (
                                <select
                                  value={lots.find(l => l.itemId === line.itemId && l.batchNo === line.batchNo)?.stockId ?? ''}
                                  onChange={e => selectLot(line.key, e.target.value)}
                                  className={inputCls} disabled={!fromStoreId}>
                                  <option value="">Select stock lotâ€¦</option>
                                  {lots.map(l => (
                                    <option key={l.stockId} value={l.stockId}>
                                      {l.itemName} Â· {l.batchNo} Â· {l.quantity} {l.uom}
                                      {l.expiryDate ? ` Â· exp ${dayOf(l.expiryDate)}` : ''}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <select value={line.itemId || ''} onChange={e => selectItem(line.key, e.target.value)} className={inputCls}>
                                  <option value="">Select itemâ€¦</option>
                                  {items.map(i => <option key={i.itemId} value={i.itemId}>{i.itemName} ({i.itemCode})</option>)}
                                </select>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-500">{line.category || 'â€”'}</td>
                            {!config.needsSource && (
                              <td className="px-3 py-2 min-w-[110px]">
                                <input type="text" value={line.batchNo} placeholder="Batch"
                                  maxLength={LIMITS.batch}
                                  onChange={e => updateLine(line.key, { batchNo: alphanumeric(e.target.value, LIMITS.batch) })} className={inputCls} />
                              </td>
                            )}
                            {!config.needsSource && (
                              <td className="px-3 py-2 min-w-[140px]">
                                <input type="date" value={line.expiryDate} title="Expiry date"
                                  onChange={e => updateLine(line.key, { expiryDate: e.target.value })} className={inputCls} />
                              </td>
                            )}
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                              {line.available !== undefined
                                ? `${line.available} ${line.uom}`
                                : line.itemId ? `${onHandFor(line.itemId)} ${line.uom}` : 'â€”'}
                            </td>
                            <td className="px-3 py-2 min-w-[90px]">
                              <input
                                type="text" inputMode="numeric" value={line.quantity} placeholder="0"
                                onChange={e => updateLine(line.key, {
                                  quantity: config.allowNegative
                                    ? signedDigits(e.target.value)
                                    : clampToAvailable(e.target.value, line.available),
                                })}
                                className={inputCls} />
                            </td>
                            {config.needsRate && (
                              <td className="px-3 py-2 min-w-[90px]">
                                <input type="text" inputMode="decimal" value={line.rate} placeholder="0.00"
                                  maxLength={LIMITS.amount}
                                  onChange={e => updateLine(line.key, { rate: decimalOnly(e.target.value) })}
                                  className={inputCls} />
                              </td>
                            )}
                            <td className="px-3 py-2 min-w-[140px]">
                              <input type="text" value={line.remarks} placeholder="Remarks"
                                maxLength={LIMITS.remarks}
                                onChange={e => updateLine(line.key, { remarks: freeText(e.target.value) })} className={inputCls} />
                            </td>
                            <td className="px-3 py-2">
                              <button type="button" onClick={() => removeLine(line.key)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {lines.length === 0 && (
                          <tr>
                            <td colSpan={9} className="px-3 py-8 text-center text-sm text-slate-400">
                              {config.needsSource && !fromStoreId
                                ? 'Please select a store and add items.'
                                : 'Please add items to process.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {config.allowNegative && (
                <p className="text-[11px] text-slate-500">
                  Enter a negative quantity to write stock off (damage, loss, expiry) and a positive
                  quantity to add it back after a physical count.
                </p>
              )}

              {/* Summary */}
              <div className="bg-primary/5 border border-primary/15 rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <PackageCheck className="w-5 h-5" /> {pres.crumb} Summary
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Line Items</div>
                    <div className="text-2xl font-bold text-slate-800">{lines.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Total Quantity</div>
                    <div className="text-2xl font-bold text-slate-800">{totalQty}</div>
                  </div>
                  {config.needsRate && (
                    <div className="text-center">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Value</div>
                      <div className="text-2xl font-bold text-primary">{inr(totalValue)}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-1 flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-6 py-2.5 border border-slate-200 bg-white text-slate-700 font-bold rounded-xl hover:bg-slate-50 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover text-sm disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm">
                  <PackageCheck className="w-4 h-4" />
                  {submitting ? 'Savingâ€¦' : editingDoc ? `Update ${config.numberLabel}` : pres.confirmLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* â”€â”€ View â”€â”€ */}
      {viewDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> {viewDoc.docNumber}
              </h2>
              <button onClick={() => setViewDoc(null)} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div><p className="text-xs text-slate-500">Date</p><p className="font-bold text-slate-800">{dayOf(viewDoc.docDate)}</p></div>
                {viewDoc.fromStoreName && <div><p className="text-xs text-slate-500">From</p><p className="font-bold text-slate-800">{viewDoc.fromStoreName}</p></div>}
                {(viewDoc.toStoreName || viewDoc.departmentName) && <div><p className="text-xs text-slate-500">To</p><p className="font-bold text-slate-800">{viewDoc.toStoreName || viewDoc.departmentName}</p></div>}
                {viewDoc.vendorName && <div><p className="text-xs text-slate-500">Vendor</p><p className="font-bold text-slate-800">{viewDoc.vendorName}</p></div>}
                {viewDoc.referenceNo && <div><p className="text-xs text-slate-500">Reference</p><p className="font-bold text-slate-800">{viewDoc.referenceNo}</p></div>}
                {viewDoc.reason && <div><p className="text-xs text-slate-500">Reason</p><p className="font-bold text-slate-800">{viewDoc.reason}</p></div>}
                {viewDoc.requestedBy && <div><p className="text-xs text-slate-500">By</p><p className="font-bold text-slate-800">{viewDoc.requestedBy}</p></div>}
                {viewDoc.status && <div><p className="text-xs text-slate-500">Status</p><AutoStatusBadge status={viewDoc.status} /></div>}
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Item</th>
                    <th className="px-3 py-2 text-left">Batch</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Rate</th>
                    <th className="px-3 py-2 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewDoc.items.map(it => (
                    <tr key={it.docItemId}>
                      <td className="px-3 py-2 font-medium text-slate-800">{it.itemName}</td>
                      <td className="px-3 py-2 text-slate-600">{it.batchNo}</td>
                      <td className="px-3 py-2 text-right">{it.quantity} {it.uom}</td>
                      <td className="px-3 py-2 text-right">{inr(it.rate)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{inr(it.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 flex justify-end">
              <button onClick={() => setViewDoc(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-bold rounded-xl">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

