import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, X, Trash2, FileText, AlertCircle, PackageCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useInventory, type DocType, type IssuableLot, type MovementDocument,
} from '../../contexts/InventoryContext';
import {
  lettersOnly, digitsOnly, decimalOnly, signedDigits, alphanumeric, freeText, LIMITS,
} from '../../utils/inputRules';

/** Local calendar day (YYYY-MM-DD) — safe against UTC parsing skew. */
const localDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export interface MovementConfig {
  docType: DocType;
  title: string;
  subtitle: string;
  /** Where the stock comes from — shows a source store picker and lot selection. */
  needsSource: boolean;
  /** Where the stock lands — shows a destination store picker. */
  needsDestination: boolean;
  /** Free-text consumption destination (ISSUE only). */
  needsDepartment?: boolean;
  /** Supplier + external reference (RECEIPT only). */
  needsVendor?: boolean;
  /** Reason dropdown (RETURN / ADJUSTMENT). */
  reasons?: string[];
  /** Lines carry a cost (RECEIPT / RETURN). */
  needsRate?: boolean;
  /** Lines may be negative — a write-off (ADJUSTMENT). */
  allowNegative?: boolean;
  submitLabel: string;
  numberLabel: string;
}

interface LineDraft {
  key: string;
  itemId: number;
  itemName: string;
  batchNo: string;
  mfgDate: string;
  expiryDate: string;
  uom: string;
  available?: number;
  quantity: string;
  rate: string;
  remarks: string;
}

const DEPARTMENTS = ['Operation Theatre', 'ICU', 'General Ward', 'Emergency', 'Radiology', 'Laboratory', 'OPD'];

export const MovementScreen = ({ config }: { config: MovementConfig }) => {
  const {
    stores, items, documents, loading, error, clearError,
    getIssuableLots, postDocument, deleteDocument,
  } = useInventory();

  const [showForm, setShowForm] = useState(false);
  const [viewDoc, setViewDoc] = useState<MovementDocument | null>(null);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
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
    if (d.docDate) {
      const day = localDay(new Date(d.docDate));
      if (fromDate && day < fromDate) return false;
      if (toDate && day > toDate) return false;
    }
    return true;
  }), [documents, config.docType, search, fromDate, toDate]);

  const resetForm = () => {
    setFromStoreId(''); setToStoreId(''); setDepartmentName(''); setVendorName('');
    setReferenceNo(''); setRequestedBy(''); setReason(''); setRemarks(''); setLines([]);
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
    if (!lot) { updateLine(key, { itemId: 0, itemName: '', batchNo: '', available: undefined }); return; }
    updateLine(key, {
      itemId: lot.itemId, itemName: lot.itemName, batchNo: lot.batchNo,
      uom: lot.uom, available: lot.quantity, expiryDate: lot.expiryDate || '',
    });
  };

  const selectItem = (key: string, itemId: string) => {
    const item = items.find(i => String(i.itemId) === itemId);
    if (!item) { updateLine(key, { itemId: 0, itemName: '', uom: '' }); return; }
    updateLine(key, { itemId: item.itemId, itemName: item.itemName, uom: item.uom });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) { toast.error(problem); return; }

    setSubmitting(true);
    const result = await postDocument({
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
        rate: config.needsRate ? Number(l.rate) || 0 : 0,
        uom: l.uom || null,
        remarks: l.remarks || null,
      })),
    });
    setSubmitting(false);

    if (result) {
      toast.success(`${config.numberLabel} ${result.docNumber} posted`);
      setShowForm(false);
      resetForm();
    }
  };

  const handleDelete = async (doc: MovementDocument) => {
    if (!window.confirm(`Delete ${doc.docNumber}? Stock will NOT be reversed — post a correcting adjustment instead.`)) return;
    const ok = await deleteDocument(doc.docId);
    toast[ok ? 'success' : 'error'](ok ? 'Document deleted' : 'Failed to delete document');
  };

  const inputCls = 'w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary';

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{config.title}</h1>
          <p className="text-xs text-slate-500">{config.subtitle}</p>
        </div>
        <button
          onClick={() => { resetForm(); addLine(); setShowForm(true); }}
          className="px-4 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm text-sm w-max"
        >
          <Plus className="w-4 h-4" /> {config.submitLabel}
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-xs text-rose-700 flex-1">{error}</p>
          <button onClick={clearError} className="text-rose-400 hover:text-rose-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2.5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${config.numberLabel.toLowerCase()} no, person or party...`}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-primary"
          />
        </div>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600" />
        <span className="text-slate-400 text-sm">to</span>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600" />
        <button onClick={() => { setSearch(''); setFromDate(''); setToDate(''); }}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200">Clear</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">{config.numberLabel} No</th>
                <th className="px-3 py-2 text-left">Date</th>
                {config.needsSource && <th className="px-3 py-2 text-left">From</th>}
                {(config.needsDestination || config.needsDepartment) && <th className="px-3 py-2 text-left">To</th>}
                {config.needsVendor && <th className="px-3 py-2 text-left">Vendor</th>}
                {config.reasons && <th className="px-3 py-2 text-left">Reason</th>}
                <th className="px-3 py-2 text-right">Items</th>
                <th className="px-3 py-2 text-right">Total Qty</th>
                <th className="px-3 py-2 text-right">Value</th>
                <th className="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map(d => (
                <tr key={d.docId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-3 py-2 font-bold text-primary whitespace-nowrap">{d.docNumber}</td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                    {d.docDate ? new Date(d.docDate).toLocaleDateString('en-GB') : '—'}
                  </td>
                  {config.needsSource && <td className="px-3 py-2 text-slate-600">{d.fromStoreName || '—'}</td>}
                  {(config.needsDestination || config.needsDepartment) && (
                    <td className="px-3 py-2 text-slate-600">{d.toStoreName || d.departmentName || '—'}</td>
                  )}
                  {config.needsVendor && <td className="px-3 py-2 text-slate-600">{d.vendorName || '—'}</td>}
                  {config.reasons && <td className="px-3 py-2 text-slate-600">{d.reason || '—'}</td>}
                  <td className="px-3 py-2 text-right text-slate-700">{d.totalItems}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800">{d.totalQty}</td>
                  <td className="px-3 py-2 text-right text-slate-700">{inr(d.totalValue)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setViewDoc(d)} title="View"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <FileText className="w-4 h-4" />
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
                  <td colSpan={10} className="px-3 py-8 text-center text-slate-400">
                    {loading ? 'Loading…' : `No ${config.title.toLowerCase()} records yet.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── New movement ── */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
            <div className="px-4 py-2.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
              <h2 className="text-lg font-bold text-slate-800">{config.submitLabel}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-200 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {config.needsSource && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Source Store *</label>
                    <select value={fromStoreId} onChange={e => { setFromStoreId(e.target.value); setLines([]); addLine(); }} className={inputCls}>
                      <option value="">Select store…</option>
                      {stores.map(s => <option key={s.storeId} value={s.storeId}>{s.storeName}</option>)}
                    </select>
                  </div>
                )}
                {config.needsDestination && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Store *</label>
                    <select value={toStoreId} onChange={e => setToStoreId(e.target.value)} className={inputCls}>
                      <option value="">Select store…</option>
                      {stores.filter(s => String(s.storeId) !== fromStoreId).map(s => (
                        <option key={s.storeId} value={s.storeId}>{s.storeName}</option>
                      ))}
                    </select>
                  </div>
                )}
                {config.needsDepartment && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Issue To (Department) *</label>
                    <select value={departmentName} onChange={e => setDepartmentName(e.target.value)} className={inputCls}>
                      <option value="">Select department…</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
                {config.needsVendor && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor</label>
                      <input type="text" value={vendorName} maxLength={LIMITS.shortText}
                        onChange={e => setVendorName(freeText(e.target.value, LIMITS.shortText))}
                        className={inputCls} placeholder="Supplier name" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">PO / GRN Reference</label>
                      <input type="text" value={referenceNo} maxLength={LIMITS.reference}
                        onChange={e => setReferenceNo(alphanumeric(e.target.value, LIMITS.reference))}
                        className={inputCls} placeholder="e.g. PO-2026-001" />
                    </div>
                  </>
                )}
                {config.reasons && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Reason *</label>
                    <select value={reason} onChange={e => setReason(e.target.value)} className={inputCls}>
                      <option value="">Select reason…</option>
                      {config.reasons.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Requested / Done By</label>
                  <input type="text" value={requestedBy}
                    maxLength={LIMITS.name}
                    onChange={e => setRequestedBy(lettersOnly(e.target.value))}
                    className={inputCls} placeholder="Name" />
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Items</h3>
                  <button type="button" onClick={addLine}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add line
                  </button>
                </div>
                <div className="p-3 space-y-2">
                  {config.needsSource && !fromStoreId && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                      Select a source store to load its available stock.
                    </p>
                  )}
                  {lines.map(line => (
                    <div key={line.key} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-4">
                        {config.needsSource ? (
                          <select
                            value={lots.find(l => l.itemId === line.itemId && l.batchNo === line.batchNo)?.stockId ?? ''}
                            onChange={e => selectLot(line.key, e.target.value)}
                            className={inputCls} disabled={!fromStoreId}>
                            <option value="">Select stock lot…</option>
                            {lots.map(l => (
                              <option key={l.stockId} value={l.stockId}>
                                {l.itemName} · {l.batchNo} · {l.quantity} {l.uom}
                                {l.expiryDate ? ` · exp ${new Date(l.expiryDate).toLocaleDateString('en-GB')}` : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <select value={line.itemId || ''} onChange={e => selectItem(line.key, e.target.value)} className={inputCls}>
                            <option value="">Select item…</option>
                            {items.map(i => <option key={i.itemId} value={i.itemId}>{i.itemName} ({i.itemCode})</option>)}
                          </select>
                        )}
                        {line.available !== undefined && (
                          <p className="text-[11px] text-slate-500 mt-1">Available: {line.available} {line.uom}</p>
                        )}
                      </div>
                      {!config.needsSource && (
                        <>
                          <div className="col-span-2">
                            <input type="text" value={line.batchNo} placeholder="Batch"
                              maxLength={LIMITS.batch}
                              onChange={e => updateLine(line.key, { batchNo: alphanumeric(e.target.value, LIMITS.batch) })} className={inputCls} />
                          </div>
                          <div className="col-span-2">
                            <input type="date" value={line.expiryDate} title="Expiry date"
                              onChange={e => updateLine(line.key, { expiryDate: e.target.value })} className={inputCls} />
                          </div>
                        </>
                      )}
                      <div className={config.needsSource ? 'col-span-2' : 'col-span-1'}>
                        <input
                          type="text" inputMode="numeric" value={line.quantity} placeholder="Qty"
                          onChange={e => updateLine(line.key, {
                            quantity: config.allowNegative
                              ? signedDigits(e.target.value)
                              : digitsOnly(e.target.value, LIMITS.qty),
                          })}
                          className={inputCls} />
                      </div>
                      {config.needsRate && (
                        <div className="col-span-2">
                          <input type="text" inputMode="decimal" value={line.rate} placeholder="Rate ₹"
                            maxLength={LIMITS.amount}
                            onChange={e => updateLine(line.key, { rate: decimalOnly(e.target.value) })}
                            className={inputCls} />
                        </div>
                      )}
                      <div className={config.needsSource ? (config.needsRate ? 'col-span-3' : 'col-span-5') : 'col-span-2'}>
                        <input type="text" value={line.remarks} placeholder="Remarks"
                          maxLength={LIMITS.remarks}
                          onChange={e => updateLine(line.key, { remarks: freeText(e.target.value) })} className={inputCls} />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button type="button" onClick={() => removeLine(line.key)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {lines.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">No lines yet — click "Add line".</p>
                  )}
                </div>
                <div className="bg-slate-50 px-4 py-2 flex items-center justify-end gap-4 text-sm">
                  <span className="text-slate-500">Lines: <b className="text-slate-800">{lines.length}</b></span>
                  <span className="text-slate-500">Total Qty: <b className="text-slate-800">{totalQty}</b></span>
                  {config.needsRate && (
                    <span className="text-slate-500">Value: <b className="text-slate-800">{inr(totalValue)}</b></span>
                  )}
                </div>
              </div>

              {config.allowNegative && (
                <p className="text-[11px] text-slate-500">
                  Enter a negative quantity to write stock off (damage, loss, expiry) and a positive
                  quantity to add it back after a physical count.
                </p>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                <input type="text" value={remarks} maxLength={LIMITS.notes}
                  onChange={e => setRemarks(freeText(e.target.value, LIMITS.notes))}
                  className={inputCls} placeholder="Optional note for this document" />
              </div>

              <div className="pt-1 flex gap-3">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 px-4 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                  <PackageCheck className="w-4 h-4" />
                  {submitting ? 'Posting…' : `Post ${config.numberLabel}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View ── */}
      {viewDoc && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-2.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> {viewDoc.docNumber}
              </h2>
              <button onClick={() => setViewDoc(null)} className="p-2 hover:bg-slate-200 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div><p className="text-xs text-slate-500">Date</p><p className="font-bold text-slate-800">{new Date(viewDoc.docDate).toLocaleString('en-GB')}</p></div>
                {viewDoc.fromStoreName && <div><p className="text-xs text-slate-500">From</p><p className="font-bold text-slate-800">{viewDoc.fromStoreName}</p></div>}
                {(viewDoc.toStoreName || viewDoc.departmentName) && <div><p className="text-xs text-slate-500">To</p><p className="font-bold text-slate-800">{viewDoc.toStoreName || viewDoc.departmentName}</p></div>}
                {viewDoc.vendorName && <div><p className="text-xs text-slate-500">Vendor</p><p className="font-bold text-slate-800">{viewDoc.vendorName}</p></div>}
                {viewDoc.referenceNo && <div><p className="text-xs text-slate-500">Reference</p><p className="font-bold text-slate-800">{viewDoc.referenceNo}</p></div>}
                {viewDoc.reason && <div><p className="text-xs text-slate-500">Reason</p><p className="font-bold text-slate-800">{viewDoc.reason}</p></div>}
                {viewDoc.requestedBy && <div><p className="text-xs text-slate-500">By</p><p className="font-bold text-slate-800">{viewDoc.requestedBy}</p></div>}
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
