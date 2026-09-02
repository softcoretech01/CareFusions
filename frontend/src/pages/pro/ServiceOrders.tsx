import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Search, X, CheckCircle, XCircle, Loader,
  AlertCircle, ChevronRight, FileText, User, Pencil, Wallet, Layers,
  Stethoscope, BedDouble, Activity,
} from 'lucide-react';

const API = 'http://localhost:8000/api/v1/pro';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const num = (v: any) => parseFloat(v ?? 0) || 0;
const inr = (v: any) => `₹${num(v).toFixed(2)}`;
const dash = (v: any) => (v === null || v === undefined || v === '' ? '—' : v);
const round2 = (v: number) => Math.round(v * 100) / 100;

// An item's amount is its original (or master) price times the quantity ordered — the same
// figure the order-creation endpoints write into GrossAmount / PatientResponsibility.
const lineAmount = (item: any) => (num(item.OriginalPrice) || num(item.MasterPrice)) * (item.Quantity ?? 1);
const orderTotal = (order: any) => (order.Items ?? []).reduce((sum: number, it: any) => sum + lineAmount(it), 0);

const isPendingOrder = (o: any) => o.PROStatus === 'PENDING' || o.PROStatus === 'UNDER_REVIEW';

const StatusBadge = ({ status }: { status?: string }) => {
  if (!status) return null;
  const map: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-700',
    UNDER_REVIEW: 'bg-blue-100 text-blue-700',
    RELEASED: 'bg-teal-100 text-teal-700',
    NOT_RELEASED: 'bg-slate-100 text-slate-600',
    UNPAID: 'bg-orange-100 text-orange-700',
    PAID: 'bg-green-100 text-green-700',
    NOT_REQUIRED: 'bg-slate-100 text-slate-500',
    MIXED: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

const AMOUNT_TONES = {
  slate: { wrap: 'bg-slate-50 border-slate-100', label: 'text-slate-400', value: 'text-slate-700' },
  orange: { wrap: 'bg-orange-50/70 border-orange-200', label: 'text-orange-500', value: 'text-orange-700' },
};

const AmountTile = ({
  label, value, tone = 'slate', hint,
}: { label: string; value: string; tone?: keyof typeof AMOUNT_TONES; hint?: string }) => {
  const t = AMOUNT_TONES[tone];
  return (
    <div className={`rounded-xl border p-3 ${t.wrap}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${t.label}`}>{label}</p>
      <p className={`text-base font-bold ${t.value}`}>{value}</p>
      {hint ? <p className={`text-[11px] mt-0.5 ${t.label}`}>{hint}</p> : null}
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: any }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    <p className="font-semibold text-slate-700 truncate">{dash(value)}</p>
  </div>
);

// ─── Review Modal ─────────────────────────────────────────────────────────────
// `row` carries one or more service orders: a patient's still-pending orders are reviewed
// together, while already-decided orders are reviewed on their own.
const ReviewModal = ({
  row, onClose, onRefresh,
}: { row: any; onClose: () => void; onRefresh: () => void }) => {
  const orders: any[] = useMemo(() => row.orders ?? [], [row]);
  const multi = orders.length > 1;

  const orderTotals = useMemo(() => orders.map(orderTotal), [orders]);
  const total = useMemo(() => orderTotals.reduce((a, b) => a + b, 0), [orderTotals]);
  const itemCount = useMemo(() => orders.reduce((n, o) => n + (o.Items?.length ?? 0), 0), [orders]);

  const [advance, setAdvance] = useState(0);
  const [saving, setSaving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Default the up-front collection to the whole amount; the officer can lower it.
  useEffect(() => { setAdvance(total); }, [total]);

  const remaining = Math.max(0, total - advance);

  // Esc closes the reject prompt first, then the review; page scroll stays locked behind it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showRejectModal) setShowRejectModal(false);
      else onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, showRejectModal]);

  const updateAdvance = useCallback((value: number) => {
    setAdvance(Math.min(Math.max(0, value), total));
  }, [total]);

  // The advance is entered once for the whole row, but each order raises its own advance bill,
  // so split it in proportion to each order's amount. The last order absorbs the rounding
  // remainder, keeping the parts summing to exactly what the officer typed.
  const splitAdvance = useCallback(() => {
    let assigned = 0;
    return orderTotals.map((t, i) => {
      if (i === orderTotals.length - 1) return Math.max(0, round2(advance - assigned));
      const part = total > 0 ? round2((advance * t) / total) : 0;
      assigned += part;
      return part;
    });
  }, [orderTotals, advance, total]);

  const handleApprove = async () => {
    if (itemCount === 0) { toast.error('There are no service items to approve.'); return; }
    setSaving(true);
    const parts = splitAdvance();
    const failed: string[] = [];
    try {
      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        try {
          const res = await fetch(`${API}/orders/${order.ServiceOrderId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              Items: (order.Items ?? []).map((it: any) => {
                const amount = lineAmount(it);
                return {
                  ServiceOrderItemId: it.ServiceOrderItemId,
                  PROPrice: amount,
                  AuthorizedDiscount: 0,
                  InsuranceCoveredAmount: 0,
                  PatientResponsibility: amount,
                };
              }),
              AdvanceAmount: parts[i],
            }),
          });
          if (!res.ok) {
            const e = await res.json().catch(() => ({} as any));
            throw new Error(e.detail || `Server error ${res.status}`);
          }
        } catch (e: any) {
          failed.push(`${order.OrderNo}: ${e.message}`);
        }
      }

      if (failed.length === 0) {
        toast.success(multi ? `${orders.length} orders approved` : `Order ${orders[0].OrderNo} approved`);
      } else if (failed.length === orders.length) {
        toast.error(failed[0]);
      } else {
        toast.error(`${orders.length - failed.length} approved, ${failed.length} failed — ${failed[0]}`);
      }

      onRefresh();
      if (failed.length !== orders.length) onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Rejection reason is required'); return; }
    setRejecting(true);
    const failed: string[] = [];
    try {
      for (const order of orders) {
        try {
          const res = await fetch(
            `${API}/orders/${order.ServiceOrderId}/reject?reason=${encodeURIComponent(rejectReason.trim())}`,
            { method: 'POST' }
          );
          if (!res.ok) {
            const e = await res.json().catch(() => ({} as any));
            throw new Error(e.detail || `Server error ${res.status}`);
          }
        } catch (e: any) {
          failed.push(`${order.OrderNo}: ${e.message}`);
        }
      }

      if (failed.length === 0) {
        toast.success(multi ? `${orders.length} orders rejected` : `Order ${orders[0].OrderNo} rejected`);
      } else if (failed.length === orders.length) {
        toast.error(failed[0]);
      } else {
        toast.error(`${orders.length - failed.length} rejected, ${failed.length} failed — ${failed[0]}`);
      }

      setShowRejectModal(false);
      onRefresh();
      if (failed.length !== orders.length) onClose();
    } finally {
      setRejecting(false);
    }
  };

  const modal = (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm"
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
          role="dialog"
          aria-modal="true"
          aria-label="PRO Review"
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] pointer-events-auto flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 to-teal-600 px-6 py-4 text-white flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">PRO Review</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {multi ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-white/15 rounded-md px-2 py-0.5">
                    <Layers className="w-3 h-3" /> {orders.length} orders
                  </span>
                ) : (
                  <span className="font-mono text-xs bg-white/15 rounded-md px-2 py-0.5">{orders[0]?.OrderNo}</span>
                )}
                <span className="text-xs font-semibold bg-white/15 rounded-full px-2.5 py-0.5">{row.SourceModule}</span>
                <StatusBadge status={row.PROStatus} />
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close review"
              className="shrink-0 p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            {/* Patient Info */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Patient Information</h3>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 grid grid-cols-2 gap-4 text-sm">
                <InfoRow label="Patient Name" value={row.PatientName} />
                <InfoRow label="UHID" value={row.UHID} />
                <InfoRow label="Module" value={row.SourceModule} />
                <InfoRow label="Doctor" value={row.DoctorName} />
                <InfoRow label="Department" value={row.DepartmentName} />
                <InfoRow label="Order Date" value={row.OrderDate ? new Date(row.OrderDate).toLocaleDateString() : null} />
              </div>
            </section>

            {/* Service Items */}
            <section>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Service Items</h3>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {itemCount} item{itemCount === 1 ? '' : 's'}{multi ? ` · ${orders.length} orders` : ''}
                </span>
              </div>

              {itemCount === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium">No service items</p>
                  <p className="text-sm mt-1">There is nothing to bill.</p>
                </div>
              ) : (
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  {orders.map((order: any, oi: number) => (
                    <div key={order.ServiceOrderId} className={oi > 0 ? 'border-t border-slate-100' : ''}>
                      {multi && (
                        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-slate-50 border-b border-slate-100">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-xs font-semibold text-slate-600">{order.OrderNo}</span>
                            <span className="text-[11px] text-slate-400">{order.OrderType}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-600 tabular-nums">{inr(orderTotals[oi])}</span>
                        </div>
                      )}
                      <div className="divide-y divide-slate-100">
                        {(order.Items ?? []).map((item: any) => (
                          <div key={item.ServiceOrderItemId} className="flex items-center justify-between gap-3 px-4 py-3 bg-white">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-700 truncate">{item.ItemName}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{dash(item.ItemType)} · Qty: {item.Quantity ?? 1}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <StatusBadge status={item.PROStatus} />
                              <span className="text-sm font-bold text-slate-700 tabular-nums">{inr(lineAmount(item))}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Payment */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Payment</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AmountTile label="Original Amount" value={inr(total)} hint="From the service master" />
                <AmountTile label="Total" value={inr(total)} hint={multi ? `Across ${orders.length} orders` : 'Amount payable'} />

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                  <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600 mb-1">
                    <Pencil className="w-3 h-3" /> Advance Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-600 pointer-events-none">₹</span>
                    <input
                      type="number"
                      min={0}
                      max={total}
                      step="0.01"
                      disabled={saving || rejecting}
                      value={advance}
                      onFocus={e => e.target.select()}
                      onChange={e => updateAdvance(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white rounded-lg border border-emerald-200 pl-6 pr-2 py-1.5 text-base font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[11px] text-emerald-600 mt-1">
                    {multi ? 'Split across the orders by amount' : 'Collected up front'}
                  </p>
                </div>

                <AmountTile label="Remaining" value={inr(remaining)} tone="orange" hint="Auto-calculated" />
              </div>

              {total <= 0 && itemCount > 0 && (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  No price is set on the service master, so this will be approved as zero-cost.
                </p>
              )}
            </section>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-slate-100 bg-white shrink-0">
            <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm">
              <span className="text-slate-500">Total <span className="font-bold text-slate-700">{inr(total)}</span></span>
              <span className="text-slate-500">Advance <span className="font-bold text-emerald-600">{inr(advance)}</span></span>
              <span className="text-slate-500">Remaining <span className="font-bold text-orange-600">{inr(remaining)}</span></span>
            </div>

            <div className="px-6 py-4 flex gap-3">
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={saving || rejecting}
                className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-2.5 font-semibold hover:bg-red-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <XCircle className="w-4 h-4" /> {multi ? 'Reject all' : 'Reject'}
              </button>
              <button
                onClick={handleApprove}
                disabled={saving || rejecting || itemCount === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl px-4 py-2.5 font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {saving ? 'Approving...' : multi ? 'Approve all' : 'Approve'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Reject prompt */}
      <AnimatePresence>
        {showRejectModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRejectModal(false)}
              className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 pointer-events-auto"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">
                      {multi ? `Reject ${orders.length} orders` : 'Reject Order'}
                    </h3>
                    <p className="text-slate-500 text-sm mt-0.5">
                      A reason is mandatory and is written to the PRO audit log
                      {multi ? ' for each order.' : '.'}
                    </p>
                  </div>
                </div>
                <textarea
                  rows={4}
                  autoFocus
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  placeholder="Enter rejection reason..."
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setShowRejectModal(false)}
                    disabled={rejecting}
                    className="flex-1 border border-slate-200 rounded-xl py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={rejecting || !rejectReason.trim()}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {rejecting ? <Loader className="w-4 h-4 animate-spin" /> : null}
                    {rejecting ? 'Rejecting...' : 'Confirm Reject'}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );

  // Portalled to <body> so the fixed overlay is never clipped by the PRO layout's
  // animated (transformed) content wrapper.
  return typeof document === 'undefined' ? modal : createPortal(modal, document.body);
};

// ─── Module Config ────────────────────────────────────────────────────────────
const MODULE_CONFIG = {
  OPD: {
    label: 'OPD Orders',
    description: 'Outpatient service orders awaiting PRO review',
    icon: Stethoscope,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    sourceModule: 'OPD',
  },
  IPD: {
    label: 'IPD Orders',
    description: 'Inpatient / admitted service orders awaiting PRO review',
    icon: BedDouble,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    sourceModule: 'IPD',
  },
  EMERGENCY: {
    label: 'Operations Orders',
    description: 'Emergency & operation theatre service orders awaiting PRO review',
    icon: Activity,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    sourceModule: 'EMERGENCY',
  },
};

// ─── Shared Service Orders Page ───────────────────────────────────────────────
const ServiceOrdersPage = ({ module }: { module: 'OPD' | 'IPD' | 'EMERGENCY' }) => {
  const config = MODULE_CONFIG[module];
  const Icon = config.icon;

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/orders?source_module=${config.sourceModule}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setOrders(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [config.sourceModule]);

  useEffect(() => { load(); }, [load]);

  const filtered = orders.filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.OrderNo?.toLowerCase().includes(s) ||
      o.UHID?.toLowerCase().includes(s) ||
      o.PatientName?.toLowerCase().includes(s)
    );
  });

  // A patient's outstanding lab and radiology orders are reviewed as one unit, so they collapse
  // into a single row. Orders already approved or rejected stay separate — the history reads
  // better one order at a time, and there is nothing left to decide on them together.
  const rows = useMemo(() => {
    const groups = new Map<string, any[]>();
    const decided: any[] = [];

    for (const o of filtered) {
      if (isPendingOrder(o)) {
        const key = o.UHID || `order-${o.ServiceOrderId}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(o);
      } else {
        decided.push(o);
      }
    }

    const firstOf = (list: any[], field: string) => list.find(o => o[field])?.[field] ?? null;

    const pendingRows = [...groups.entries()].map(([uhid, list]) => {
      const latest = list.reduce((a, b) => (new Date(a.OrderDate) >= new Date(b.OrderDate) ? a : b));
      const payments = new Set(list.map(o => o.PaymentStatus));
      return {
        key: `group-${uhid}`,
        orders: list,
        isGroup: list.length > 1,
        UHID: uhid,
        PatientName: firstOf(list, 'PatientName'),
        DoctorName: firstOf(list, 'DoctorName'),
        DepartmentName: firstOf(list, 'DepartmentName'),
        SourceModule: latest.SourceModule,
        OrderDate: latest.OrderDate,
        PROStatus: 'PENDING',
        PaymentStatus: payments.size === 1 ? list[0].PaymentStatus : 'MIXED',
        amount: list.reduce((sum, o) => sum + orderTotal(o), 0),
      };
    });

    const decidedRows = decided.map(o => ({
      key: `order-${o.ServiceOrderId}`,
      orders: [o],
      isGroup: false,
      UHID: o.UHID,
      PatientName: o.PatientName,
      DoctorName: o.DoctorName,
      DepartmentName: o.DepartmentName,
      SourceModule: o.SourceModule,
      OrderDate: o.OrderDate,
      PROStatus: o.PROStatus,
      PaymentStatus: o.PaymentStatus,
      amount: orderTotal(o),
    }));

    return [...pendingRows, ...decidedRows].sort(
      (a, b) => new Date(b.OrderDate).getTime() - new Date(a.OrderDate).getTime()
    );
  }, [filtered]);

  const pendingCount = orders.filter(isPendingOrder).length;
  const approvedCount = orders.filter(o => o.PROStatus === 'APPROVED').length;
  const rejectedCount = orders.filter(o => o.PROStatus === 'REJECTED').length;

  return (
    <div className="space-y-5">
      {selectedRow && (
        <ReviewModal row={selectedRow} onClose={() => setSelectedRow(null)} onRefresh={load} />
      )}

      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl ${config.bg} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${config.color}`} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{config.label}</h1>
          <p className="text-slate-500 text-sm">{config.description}</p>
        </div>
      </div>

      {/* Summary chips */}
      {!loading && !error && (
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-3 py-1 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> {pendingCount} Pending
          </span>
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> {approvedCount} Approved
          </span>
          <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 rounded-full px-3 py-1 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> {rejectedCount} Rejected
          </span>
          <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-full px-3 py-1 text-xs font-semibold">
            {orders.length} Total
          </span>
        </div>
      )}

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Search bar */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Order No, UHID, Patient..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="w-6 h-6 animate-spin text-emerald-500" />
            <span className="ml-3 text-slate-400 text-sm">Loading {config.label}...</span>
          </div>
        ) : error ? (
          <div className="m-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Icon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No {config.label.toLowerCase()} found</p>
            <p className="text-sm mt-1">{search ? 'Try a different search term.' : 'No orders have been created yet.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-semibold">#</th>
                  <th className="px-4 py-3 text-left font-semibold">Order No</th>
                  <th className="px-4 py-3 text-left font-semibold">UHID</th>
                  <th className="px-4 py-3 text-left font-semibold">Patient</th>
                  <th className="px-4 py-3 text-left font-semibold">Doctor</th>
                  <th className="px-4 py-3 text-left font-semibold">Department</th>
                  <th className="px-4 py-3 text-left font-semibold">Order Date</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold">PRO Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Payment</th>
                  <th className="px-4 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.key} className="border-t border-slate-50 hover:bg-emerald-50/30 transition-colors">
                    <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3">
                      {row.isGroup ? (
                        <span
                          title={row.orders.map((o: any) => o.OrderNo).join('\n')}
                          className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        >
                          <Layers className="w-3 h-3" /> {row.orders.length} orders
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-slate-600">{row.orders[0].OrderNo}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{row.UHID}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{dash(row.PatientName)}</td>
                    <td className="px-4 py-3 text-slate-500">{dash(row.DoctorName)}</td>
                    <td className="px-4 py-3 text-slate-500">{dash(row.DepartmentName)}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(row.OrderDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700 tabular-nums">{inr(row.amount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.PROStatus} /></td>
                    <td className="px-4 py-3"><StatusBadge status={row.PaymentStatus} /></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedRow(row)}
                        className="flex items-center gap-1 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        <ChevronRight className="w-3 h-3" /> Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Named Exports for Routes ─────────────────────────────────────────────────
export const OPDServiceOrders = () => <ServiceOrdersPage module="OPD" />;
export const IPDServiceOrders = () => <ServiceOrdersPage module="IPD" />;
export const OperationsServiceOrders = () => <ServiceOrdersPage module="EMERGENCY" />;

// Keep old export working (redirects to OPD by default)
export const ServiceOrders = OPDServiceOrders;
