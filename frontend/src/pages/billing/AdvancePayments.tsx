import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, IndianRupee, ShieldCheck, Eye, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui/Card';
import { DateFilter, monthStart, today } from '../../components/ui/DateFilter';
import { fetchPatientCover, type PatientCover } from '../../utils/patientInsurance';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface AdvanceBill {
  AdvanceId: number;
  AdvanceNo: string;
  ServiceOrderId: number;
  UHID: string;
  TotalAmount: number;
  PaidAmount?: number | null;
  PaymentMode?: string | null;
  PaymentReference?: string | null;
  PatientName?: string | null;
  Status: string;
  CreatedAt: string;
  UpdatedAt?: string | null;
}

const isPending = (b: AdvanceBill) => b.Status !== 'PAID' && b.Status !== 'CANCELLED';

const statusChip = (status: string) =>
  status === 'PAID' ? 'bg-emerald-100 text-emerald-700'
    : status === 'CANCELLED' ? 'bg-slate-200 text-slate-600'
    : 'bg-amber-100 text-amber-700';

const inr = (v: any) =>
  `₹${(parseFloat(v ?? 0) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AdvancePayments = () => {
  const [bills, setBills] = useState<AdvanceBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(today);

  const fetchBills = async () => {
    try {
      // Every advance, not just the unpaid ones: a collected advance used to vanish
      // from this screen the moment it was settled, leaving no record of what was
      // taken. Paid rows stay in the grid with their mode and reference.
      const { data } = await axios.get(`${API_URL}/billing/advance/`);
      setBills(data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to fetch advance bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  // An insured patient's advance is settled against their cover rather than
  // collected at the counter, so the row offers that instead of a cash payment.
  // Keyed by UHID because several bills can belong to one patient.
  const [covers, setCovers] = useState<Record<string, PatientCover | null>>({});
  const [coversLoading, setCoversLoading] = useState(false);

  useEffect(() => {
    const uhids = Array.from(new Set(bills.map(b => b.UHID).filter(Boolean)));
    const missing = uhids.filter(u => !(u in covers));
    if (missing.length === 0) return;
    let cancelled = false;
    setCoversLoading(true);
    (async () => {
      const found = await Promise.all(missing.map(u => fetchPatientCover(u)));
      if (cancelled) return;
      setCovers(prev => {
        const next = { ...prev };
        missing.forEach((u, i) => { next[u] = found[i]; });
        return next;
      });
      setCoversLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bills]);

  // Detail view. The advance row itself carries only money and a ServiceOrderId, so
  // the order behind it is fetched on open — that is where the actual services being
  // charged for live.
  const [viewing, setViewing] = useState<AdvanceBill | null>(null);
  const [order, setOrder] = useState<any | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);

  useEffect(() => {
    if (!viewing) { setOrder(null); return; }
    let cancelled = false;
    setOrderLoading(true);
    (async () => {
      try {
        const { data } = await axios.get(`${API_URL}/pro/orders/by-uhid/${encodeURIComponent(viewing.UHID)}`);
        const match = Array.isArray(data)
          ? data.find((o: any) => o.ServiceOrderId === viewing.ServiceOrderId)
          : null;
        if (!cancelled) setOrder(match ?? null);
      } catch {
        if (!cancelled) setOrder(null);
      } finally {
        if (!cancelled) setOrderLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [viewing]);

  // Esc closes the detail view.
  useEffect(() => {
    if (!viewing) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setViewing(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [viewing]);

  const settle = async (bill: AdvanceBill, byInsurance: boolean) => {
    setPaying(bill.AdvanceId);
    try {
      await axios.post(`${API_URL}/billing/advance/${bill.AdvanceId}/pay`, {
        Amount: bill.TotalAmount,
        PaymentMode: byInsurance ? 'INSURANCE' : 'CASH',
        PaymentReference: byInsurance
          ? `INS-${covers[bill.UHID]?.policyNumber || bill.UHID}`
          : 'TXN-' + Math.floor(Math.random() * 100000),
      });
      toast.success(
        byInsurance
          ? `Advance Bill ${bill.AdvanceNo} settled by insurance. Services are now unlocked.`
          : `Advance Bill ${bill.AdvanceNo} paid. Services are now unlocked.`
      );
      fetchBills();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to process payment');
    } finally {
      setPaying(null);
    }
  };

  // Filters on the date the advance was raised, which is the "Raised On" column.
  const filteredBills = bills.filter(bill => {
    const raised = new Date(bill.CreatedAt);
    const start = fromDate ? new Date(fromDate) : null;
    const end = toDate ? new Date(toDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    return (!start || raised >= start) && (!end || raised <= end);
  });

  // The grid now carries settled bills too, so the headline figures count only what
  // is still owed — a paid advance is history, not an amount to collect.
  const pendingBills = filteredBills.filter(isPending);
  const totalDue = pendingBills.reduce((sum, b) => sum + (parseFloat(b.TotalAmount as any) || 0), 0);
  const totalCollected = filteredBills
    .filter(b => b.Status === 'PAID')
    .reduce((sum, b) => sum + (parseFloat((b.PaidAmount ?? b.TotalAmount) as any) || 0), 0);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight shrink-0">Advance Payments</h1>

        <DateFilter
          label="Raised from :"
          dateFrom={fromDate}
          dateTo={toDate}
          onDateFromChange={setFromDate}
          onDateToChange={setToDate}
          defaultDateFrom={monthStart()}
          defaultDateTo={today()}
          onSearch={() => {}}
          onReset={() => { setFromDate(monthStart()); setToDate(today()); }}
        />

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <span className="bg-amber-50 text-amber-700 px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2 border border-amber-200">
            <IndianRupee className="w-4 h-4" />
            {pendingBills.length} Bill{pendingBills.length === 1 ? '' : 's'} Pending Payment
          </span>
          {pendingBills.length > 0 && (
            <span className="bg-slate-50 text-slate-600 px-4 py-2 rounded-full font-medium text-sm border border-slate-200">
              Total Due <span className="font-bold text-slate-800">{inr(totalDue)}</span>
            </span>
          )}
          {totalCollected > 0 && (
            <span className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full font-medium text-sm border border-emerald-200">
              Collected <span className="font-bold">{inr(totalCollected)}</span>
            </span>
          )}
        </div>
      </div>

      {filteredBills.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          {bills.length === 0 ? (
            <>
              <h3 className="text-lg font-bold text-slate-800 mb-2">No Advance Payments Yet</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                No advance bills have been raised. When a PRO approves an order with a patient responsibility, it will
                appear here and stay on this page after it is settled.
              </p>
            </>
          ) : (
            // Distinguishing these matters: "none in this range" and "none at all" mean very
            // different things when money is still owed outside the selected dates.
            <>
              <h3 className="text-lg font-bold text-slate-800 mb-2">No Advance Payments In This Range</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                {bills.length} bill{bills.length === 1 ? '' : 's'} exist outside the selected dates. Clear the
                date filter to see {bills.length === 1 ? 'it' : 'them'}.
              </p>
            </>
          )}
        </Card>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Advance No</th>
                  <th className="px-6 py-4">UHID</th>
                  <th className="px-6 py-4">Service Order</th>
                  <th className="px-6 py-4">Raised On</th>
                  <th className="px-6 py-4 text-right">Amount Due</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.map((bill) => (
                  <tr key={bill.AdvanceId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-slate-800">{bill.AdvanceNo}</td>
                    <td className="px-6 py-4 text-slate-600">{bill.UHID}</td>
                    <td className="px-6 py-4 text-slate-500">#{bill.ServiceOrderId}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(bill.CreatedAt).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800 tabular-nums">{inr(bill.TotalAmount)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${statusChip(bill.Status)}`}>
                        {bill.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                      <button
                        onClick={() => setViewing(bill)}
                        title="View advance details"
                        aria-label="View advance details"
                        className="flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 p-2 rounded-lg transition-colors shrink-0"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {(() => {
                        const cover = covers[bill.UHID];
                        const busy = paying === bill.AdvanceId;

                        // Settled bills stay listed for the record, showing how they were
                        // cleared rather than an action that would double-collect.
                        if (!isPending(bill)) {
                          return (
                            <div className="text-xs text-slate-500 leading-snug min-w-0">
                              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600">
                                {bill.PaymentMode?.toUpperCase() === 'INSURANCE'
                                  ? <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                                  : <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                                {bill.PaymentMode || '—'}
                              </span>
                              {bill.PaymentReference && (
                                <span className="block text-slate-400 font-mono mt-0.5 truncate">
                                  {bill.PaymentReference}
                                </span>
                              )}
                            </div>
                          );
                        }

                        // Wait for the cover lookup rather than offering a cash
                        // payment on a patient who turns out to be insured.
                        if (coversLoading && !(bill.UHID in covers)) {
                          return (
                            <span className="flex items-center justify-center gap-2 text-xs text-slate-400">
                              <Loader2 className="w-4 h-4 animate-spin" /> Checking cover…
                            </span>
                          );
                        }
                        return (
                          <button
                            onClick={() => settle(bill, !!cover)}
                            disabled={paying !== null}
                            title={cover
                              ? `Covered by ${cover.insurerName || 'insurance'}${cover.policyNumber ? ` · policy ${cover.policyNumber}` : ''}`
                              : undefined}
                            className={`w-full flex items-center justify-center gap-2 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                              cover ? 'bg-sky-600 hover:bg-sky-700' : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            {busy
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : cover ? <ShieldCheck className="w-4 h-4" /> : <IndianRupee className="w-4 h-4" />}
                            {busy ? 'Processing...' : cover ? 'Insurance Covered' : 'Process Payment'}
                          </button>
                        );
                      })()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewing && (() => {
        const cover = covers[viewing.UHID];
        const items: any[] = order?.Items ?? [];
        return (
          <div
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setViewing(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Advance details"
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 to-teal-600 text-white flex items-start justify-between gap-3 shrink-0">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold">Advance Details</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="font-mono text-xs bg-white/15 rounded-md px-2 py-0.5">{viewing.AdvanceNo}</span>
                    <span className="text-xs font-semibold bg-white/15 rounded-full px-2.5 py-0.5">{viewing.Status}</span>
                  </div>
                </div>
                <button
                  onClick={() => setViewing(null)}
                  aria-label="Close details"
                  className="shrink-0 p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Patient</h3>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 grid grid-cols-2 gap-4 text-sm">
                    <Detail label="Name" value={viewing.PatientName || order?.PatientName} />
                    <Detail label="UHID" value={viewing.UHID} />
                    <Detail
                      label="Insurance"
                      value={cover ? `${cover.insurerName || 'Covered'}${cover.policyNumber ? ` · ${cover.policyNumber}` : ''}` : 'Self pay'}
                    />
                    <Detail label="Valid Until" value={cover?.validUntil ? String(cover.validUntil).slice(0, 10) : null} />
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Advance</h3>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 grid grid-cols-2 gap-4 text-sm">
                    <Detail label="Amount Due" value={inr(viewing.TotalAmount)} />
                    <Detail label="Paid Amount" value={viewing.PaidAmount != null ? inr(viewing.PaidAmount) : null} />
                    <Detail label="Payment Mode" value={viewing.PaymentMode} />
                    <Detail label="Reference" value={viewing.PaymentReference} />
                    <Detail
                      label="Raised On"
                      value={new Date(viewing.CreatedAt).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    />
                    <Detail
                      label={viewing.Status === 'PAID' ? 'Settled On' : 'Last Updated'}
                      value={viewing.UpdatedAt
                        ? new Date(viewing.UpdatedAt).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                          })
                        : null}
                    />
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                    Service Order #{viewing.ServiceOrderId}
                  </h3>
                  {orderLoading ? (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-400 italic flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading order…
                    </div>
                  ) : !order ? (
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-500">
                      The linked service order could not be loaded.
                    </div>
                  ) : (
                    <>
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 grid grid-cols-2 gap-4 text-sm mb-3">
                        <Detail label="Order No" value={order.OrderNo} />
                        <Detail label="Type" value={`${order.OrderType} · ${order.SourceModule}`} />
                        <Detail label="PRO Status" value={order.PROStatus} />
                        <Detail label="Service Status" value={order.ServiceStatus} />
                      </div>
                      {items.length === 0 ? (
                        <p className="text-sm text-slate-400 italic">No service items on this order.</p>
                      ) : (
                        <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                          {items.map((it: any) => (
                            <div key={it.ServiceOrderItemId} className="flex items-center justify-between gap-3 px-4 py-3">
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-700 truncate">{it.ItemName}</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {it.ItemType} · Qty: {it.Quantity ?? 1}
                                </p>
                              </div>
                              <span className="font-bold text-slate-700 tabular-nums shrink-0">
                                {inr(it.NetAmount ?? it.GrossAmount ?? it.OriginalPrice)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </section>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

const Detail = ({ label, value }: { label: string; value: any }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    <p className="font-semibold text-slate-700 break-words">
      {value === null || value === undefined || value === '' ? '—' : value}
    </p>
  </div>
);

export default AdvancePayments;
