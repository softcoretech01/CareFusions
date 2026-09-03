import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Search, X, CheckCircle, XCircle, Loader, Calendar,
  AlertCircle, ChevronRight, FileText, User, Pencil, Layers,
  Stethoscope, BedDouble, Activity, ShieldCheck,
} from 'lucide-react';
import { fetchPatientCover } from '../../utils/patientInsurance';
import { monthStart, today } from '../../components/ui/DateFilter';

const API = (import.meta.env.VITE_API_URL as string || 'http://localhost:8000/api/v1') + '/pro';

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
  const itemCount = useMemo(() => orders.reduce((n, o) => n + (o.Items?.length ?? 0), 0), [orders]);

  const [editedPrices, setEditedPrices] = useState<Record<number, number>>({});

  // Whatever cover the patient holds, looked up by UHID. Shown read-only so the
  // officer approving these prices can see who is actually paying — this screen
  // does not edit the policy.
  const [policy, setPolicy] = useState<any | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);

  useEffect(() => {
    const uhid = (row.UHID || '').trim();
    if (!uhid) { setPolicy(null); return; }
    let cancelled = false;
    setPolicyLoading(true);
    (async () => {
      const found = await fetchPatientCover(uhid);
      if (!cancelled) {
        setPolicy(found);
        setPolicyLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [row.UHID]);

  useEffect(() => {
    const initial: Record<number, number> = {};
    orders.forEach(o => {
      (o.Items ?? []).forEach((it: any) => {
        initial[it.ServiceOrderItemId] = lineAmount(it);
      });
    });
    setEditedPrices(initial);
  }, [orders]);

  const [saving, setSaving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Approving an order that is already approved re-runs the auto-release and used to
  // fail on the one-active-release-per-item constraint. The backend now tolerates it,
  // but there is nothing to gain from sending it, so the button goes dead once every
  // order in view has been reviewed.
  const nothingToApprove = orders.length > 0 && !orders.some(isPendingOrder);

  const total = useMemo(() => {
    return Object.values(editedPrices).reduce((sum, val) => sum + val, 0);
  }, [editedPrices]);
  const originalTotal = useMemo(() => orderTotals.reduce((a, b) => a + b, 0), [orderTotals]);

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

  // No advance splitting needed since PROPrice is set directly per item
  const splitAdvance = useCallback(() => {
    return orders.map(o => {
      return (o.Items ?? []).reduce((sum: number, it: any) => sum + (editedPrices[it.ServiceOrderItemId] ?? 0), 0);
    });
  }, [orders, editedPrices]);

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
                const amount = editedPrices[it.ServiceOrderItemId] ?? lineAmount(it);
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
        onClose();
        navigate('/billing/advance-payments');
      } else if (failed.length === orders.length) {
        toast.error(failed[0]);
      } else {
        toast.error(`${orders.length - failed.length} approved, ${failed.length} failed — ${failed[0]}`);
      }

      onRefresh();
      if (failed.length !== 0 && failed.length !== orders.length) onClose();
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

            {/* Insurance on file — read-only; this screen approves prices, not cover. */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Insurance</h3>
              </div>

              {policyLoading ? (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-400 italic">
                  Checking for a policy…
                </div>
              ) : !policy ? (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-500">
                  No insurance policy on file — this is a <span className="font-semibold text-slate-700">self-pay</span> patient.
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-sm font-bold text-slate-800">{policy.insurerName || '—'}</span>
                    {policy.planName && <span className="text-xs text-slate-500">· {policy.planName}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      policy.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {policy.status || 'Unknown'}
                    </span>
                    {policy.networkHospital && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        Network Hospital
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <InfoRow label="Policy Number" value={policy.policyNumber} />
                    <InfoRow label="TPA" value={policy.tpaName} />
                    <InfoRow label="Valid Until" value={policy.validUntil ? String(policy.validUntil).slice(0, 10) : null} />
                    {policy.sumInsured != null && <InfoRow label="Sum Insured" value={inr(policy.sumInsured)} />}
                    {policy.balanceAmount != null && <InfoRow label="Balance" value={inr(policy.balanceAmount)} />}
                    {policy.copayPercentage != null && <InfoRow label="Co-Pay" value={`${policy.copayPercentage}%`} />}
                  </div>
                  {policy.source === 'registration' && (
                    <p className="text-xs text-slate-500 mt-3">
                      From the patient's registration record — no formal policy exists under
                      Insurance &gt; Policies, so there is no sum insured or balance to bill against.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Service Items */}
            <section>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Service Orders</h3>
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
                              {/* Who settles this line, alongside how far the review has got.
                                  Held back while the cover lookup is still running so the row
                                  does not flash SELF-PAY at an insured patient. */}
                              {!policyLoading && (
                                <span className={`text-[11px] px-2 py-1 rounded-full font-bold tracking-wide ${
                                  policy
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}>
                                  {policy ? 'INSURANCE' : 'SELF-PAY'}
                                </span>
                              )}
                              <StatusBadge status={item.PROStatus} />
                              <div className="relative w-28">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 pointer-events-none">₹</span>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={editedPrices[item.ServiceOrderItemId] ?? ''}
                                  onChange={e => setEditedPrices(prev => ({ ...prev, [item.ServiceOrderItemId]: parseFloat(e.target.value) || 0 }))}
                                  disabled={saving || rejecting}
                                  className="w-full bg-slate-50 rounded-lg border border-slate-200 pl-6 pr-2 py-1 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                                />
                                <Pencil className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {total <= 0 && itemCount > 0 && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                No price is set, so this will be approved as zero-cost.
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-slate-100 bg-white shrink-0">
            <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500">Total Amount</span>
              <span className="font-bold text-slate-700">{inr(total)}</span>
            </div>

            {nothingToApprove && (
              <p className="px-6 pt-3 text-xs text-slate-500">
                {multi
                  ? 'Every order here has already been reviewed — nothing left to approve.'
                  : 'This order has already been reviewed.'}
              </p>
            )}

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
                disabled={saving || rejecting || itemCount === 0 || nothingToApprove}
                title={nothingToApprove ? 'Already reviewed — there is nothing left to approve' : undefined}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl px-4 py-2.5 font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {saving ? 'Approving...' : nothingToApprove ? 'Approved' : multi ? 'Approve all' : 'Approve'}
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
// Each screen owns a disjoint slice of the orders, so nothing shows up twice:
// OPD and IPD are keyed by the module that raised the order but exclude
// operations, and the Operations screen takes every OPERATION order regardless of
// which module it came from — an operation on an IPD admission is still an
// operation, and that is the desk that prices it.
const MODULE_CONFIG = {
  OPD: {
    label: 'OPD Orders',
    description: 'Outpatient service orders awaiting PRO review',
    icon: Stethoscope,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    query: 'source_module=OPD&exclude_order_type=OPERATION',
  },
  IPD: {
    label: 'IPD Orders',
    description: 'Inpatient / admitted service orders awaiting PRO review',
    icon: BedDouble,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    query: 'source_module=IPD&exclude_order_type=OPERATION',
  },
  EMERGENCY: {
    label: 'Operations Orders',
    description: 'Operation theatre service orders awaiting PRO review',
    icon: Activity,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    query: 'order_type=OPERATION',
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
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/orders?${config.query}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setOrders(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [config.query]);

  useEffect(() => { load(); }, [load]);

  const filtered = orders.filter(o => {
    if (dateFrom && o.OrderDate < dateFrom) return false;
    if (dateTo && o.OrderDate > dateTo + 'T23:59:59') return false;
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl ${config.bg} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${config.color}`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{config.label}</h1>
            <p className="text-slate-500 text-sm">{config.description}</p>
          </div>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm shrink-0">
          <span className="text-slate-500 text-sm font-medium">From :</span>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <span className="text-slate-500 text-sm font-medium ml-1">to :</span>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          <button className="bg-[#086450] text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-[#075342] transition-colors">
            Search
          </button>
          <button
            onClick={() => { setDateFrom(monthStart()); setDateTo(today()); }}
            className="bg-slate-100 text-slate-700 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Search bar & Filters */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[300px]">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Order No, UHID, Patient..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Overview Labels */}
          {!loading && !error && (
            <div className="flex flex-wrap gap-2">
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
                  <th className="px-4 py-3 text-left font-semibold">S.No</th>
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
