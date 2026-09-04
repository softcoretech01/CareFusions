/**
 * Collect an advance payment: review the bill, choose a method, take the money.
 *
 * This replaces a single button that posted the payment immediately, with the
 * amount hardcoded to the full total and the method chosen for the cashier by a
 * `covers[uhid] ? 'INSURANCE' : 'CASH'` guess. That was wrong in three ways:
 *
 *  - the cashier never saw what they were collecting for before it was taken;
 *  - part payment was impossible, though it is the ordinary case on a large
 *    advance;
 *  - "INSURANCE" is not a way for a PATIENT to pay. Insurance cover is applied
 *    at PRO review against an approved pre-authorization and is already deducted
 *    from what the patient owes; booking it as a receipt marked bills PAID with
 *    no money received, which is exactly what happened to ADV-18 and ADV-20.
 *
 * The amount owed and the resulting statuses come from the server; this screen
 * only says how much cash is being taken and by what method.
 */
import { API_BASE_URL } from '@/utils/apiBase';
import React, { useEffect, useMemo, useState } from 'react';
import {
  X, Loader2, IndianRupee, CheckCircle2, AlertTriangle, Wallet,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = API_BASE_URL;

const inr = (v: any) =>
  `₹${(parseFloat(v ?? 0) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Exactly the modes the payment engine accepts. Keeping the list in step with
// the backend means an unsupported method is impossible to pick rather than
// rejected after the cashier has already told the patient it went through.
const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'UPI', label: 'UPI' },
];

// Methods where a transaction/instrument reference is expected. Cash has none.
const NEEDS_REFERENCE = new Set(['CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'NEFT', 'RTGS', 'WALLET', 'ONLINE']);

const Row = ({ label, value, strong, tone }: any) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-sm text-slate-500">{label}</span>
    <span className={`text-sm tabular-nums ${strong ? 'font-bold' : 'font-medium'} ${tone ?? 'text-slate-700'}`}>
      {value}
    </span>
  </div>
);

interface Props {
  bill: any | null;
  cover?: { insurerName?: string; policyNumber?: string } | null;
  onClose: () => void;
  onPaid: () => void;
}

export const AdvancePaymentDialog: React.FC<Props> = ({ bill, onClose, onPaid }) => {
  const outstanding = useMemo(
    () => Math.max(0, Number(bill?.Outstanding ?? (Number(bill?.TotalAmount ?? 0) - Number(bill?.PaidAmount ?? 0)))),
    [bill],
  );

  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('CASH');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  // One key per dialog opening. A double-clicked Pay button, or a retry after a
  // dropped response, returns the original receipt instead of taking the money
  // a second time.
  const [idemKey, setIdemKey] = useState('');

  useEffect(() => {
    if (!bill) return;
    setAmount(outstanding.toFixed(2));
    setMode('CASH');
    setReference('');
    setResult(null);
    setBusy(false);
    setIdemKey(`ADV-${bill.AdvanceId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
  }, [bill, outstanding]);

  useEffect(() => {
    if (!bill) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [bill, busy, onClose]);

  if (!bill) return null;

  const value = parseFloat(amount);
  const invalid =
    !isFinite(value) || value <= 0
      ? 'Enter an amount greater than zero.'
      : value > outstanding + 0.005
      ? `Cannot collect more than the outstanding ${inr(outstanding)}.`
      : NEEDS_REFERENCE.has(mode) && !reference.trim()
      ? 'A transaction reference is required for this payment method.'
      : null;

  const isPartial = !invalid && value < outstanding - 0.005;

  const pay = async () => {
    if (invalid || busy) return;
    setBusy(true);
    try {
      const { data } = await axios.post(`${API_URL}/billing/advance/${bill.AdvanceId}/pay`, {
        Amount: Number(value.toFixed(2)),
        PaymentMode: mode,
        PaymentReference: reference.trim() || null,
        IdempotencyKey: idemKey,
      });
      setResult(data);
      toast.success(data.message ?? 'Payment recorded.');
      onPaid();
    } catch (e: any) {
      // The backend's refusals are written to be read by a person — show them
      // rather than a generic failure.
      toast.error(e.response?.data?.detail ?? 'Failed to record the payment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Collect advance payment"
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 to-teal-600 text-white flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">
              {result ? 'Payment Recorded' : 'Collect Advance Payment'}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className="font-mono text-xs bg-white/15 rounded-md px-2 py-0.5">{bill.AdvanceNo}</span>
              <span className="text-xs font-semibold bg-white/15 rounded-full px-2.5 py-0.5">{bill.Status}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="shrink-0 p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* ── Who and what ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['Patient', bill.PatientName || '—'],
              ['UHID', bill.UHID],
              ['Department', bill.DepartmentName || '—'],
              ['Doctor', bill.DoctorName || '—'],
              ['Order No', bill.OrderNo || '—'],
              ['Type', bill.VisitType || bill.SourceModule || '—'],
              ['Raised On', bill.CreatedAt ? new Date(bill.CreatedAt).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'],
              ['PRO Status', bill.PROStatus || '—'],
            ].map(([label, val]: any) => (
              <div key={label} className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="text-sm font-semibold text-slate-800 break-words">{val}</p>
              </div>
            ))}
          </div>

          {/* ── Services being charged for ───────────────────────── */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Services</p>
            <p className="text-sm font-medium text-slate-700">{bill.ServiceSummary || '—'}</p>

            <div className="mt-3 pt-3 border-t border-slate-200 divide-y divide-slate-100">
              <Row label="Gross" value={inr(bill.GrossAmount ?? bill.TotalAmount)} />
              {Number(bill.DiscountAmount ?? 0) > 0 && (
                <Row label="Discount" value={`− ${inr(bill.DiscountAmount)}`} />
              )}
              <Row label="Net" value={inr(bill.NetAmount ?? bill.TotalAmount)} />
              {Number(bill.InsuranceCoveredAmount ?? 0) > 0 && (
                <Row label="Covered by insurance" value={`− ${inr(bill.InsuranceCoveredAmount)}`} tone="text-sky-700" />
              )}
              <Row label="Patient responsibility" value={inr(bill.PatientResponsibility ?? bill.TotalAmount)} strong />
            </div>
          </div>





          {/* ── Result, or the form ──────────────────────────────── */}
          {result ? (
            <div className="space-y-3">
              <div className="flex gap-2 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">
                    {inr(result.AmountCollected)} collected · receipt {result.ReceiptNo}
                  </p>
                  <p className="text-emerald-700 mt-0.5">
                    Paid to date {inr(result.PaidToDate)} · outstanding {inr(result.Outstanding)} · {result.Status}
                  </p>
                  {result.ItemsReleased?.length > 0 && (
                    <p className="text-emerald-700 mt-0.5">
                      {result.ItemsReleased.length} service(s) released for execution.
                    </p>
                  )}
                </div>
              </div>

              {/* Payment does not always unlock the service — say why, rather
                  than letting the desk assume it did. */}
              {result.StillBlocked?.length > 0 && (
                <div className="flex gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Services are still blocked:</p>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      {result.StillBlocked.flatMap((b: any) => b.blockers).map((r: string, i: number) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {PAYMENT_MODES.map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMode(m.value)}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                        mode === m.value
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pay-amount" className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                    Amount to Collect
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="pay-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={outstanding}
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setAmount(outstanding.toFixed(2))}
                    className="mt-1.5 text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    Collect full outstanding ({inr(outstanding)})
                  </button>
                </div>

                <div>
                  <label htmlFor="pay-ref" className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                    Reference {NEEDS_REFERENCE.has(mode) ? '' : '(optional)'}
                  </label>
                  <input
                    id="pay-ref"
                    type="text"
                    value={reference}
                    onChange={e => setReference(e.target.value)}
                    placeholder={mode === 'CHEQUE' ? 'Cheque number' : 'Transaction / approval reference'}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>
              </div>

              {isPartial && (
                <div className="flex gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Part payment: {inr(outstanding - value)} will remain outstanding, and the
                    services stay blocked until the balance is collected.
                  </span>
                </div>
              )}

              {invalid && amount !== '' && (
                <p className="text-xs font-semibold text-red-600">{invalid}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-slate-50">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              onClick={pay}
              disabled={!!invalid || busy}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              {busy ? 'Processing…' : `Pay ${isFinite(value) && value > 0 ? inr(value) : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancePaymentDialog;
