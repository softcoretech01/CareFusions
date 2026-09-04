import { API_BASE_URL } from '@/utils/apiBase';
import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, IndianRupee, Eye, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui/Card';
import { DateFilter, monthStart, today } from '../../components/ui/DateFilter';
import { fetchPatientCover, type PatientCover } from '../../utils/patientInsurance';
import { OrderDetailDrawer } from '../../components/pro/OrderDetailDrawer';
import { AdvancePaymentDialog } from '../../components/billing/AdvancePaymentDialog';

const API_URL = API_BASE_URL;

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
  // Resolved server-side from the service order behind the advance.
  VisitType?: string | null;      // OP | IP | EMG
  DepartmentName?: string | null;
  DoctorName?: string | null;
  ServiceSummary?: string | null;
}

const isPending = (b: AdvanceBill) => b.Status !== 'PAID' && b.Status !== 'CANCELLED';

const statusChip = (status: string) =>
  status === 'PAID' ? 'bg-emerald-100 text-emerald-700'
    : status === 'CANCELLED' ? 'bg-slate-200 text-slate-600'
    : 'bg-amber-100 text-amber-700';

// OP / IP / EMG are read at a glance, so they get distinct colours rather than
// three identical grey pills.
const visitChip = (visit: string) =>
  visit === 'IP' ? 'bg-indigo-100 text-indigo-700'
    : visit === 'EMG' ? 'bg-red-100 text-red-700'
    : 'bg-sky-100 text-sky-700';

const inr = (v: any) =>
  `₹${(parseFloat(v ?? 0) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AdvancePayments = () => {
  const navigate = useNavigate();
  const [bills, setBills] = useState<AdvanceBill[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Whatever cover each patient holds, for context inside the payment dialog.
  // It is NOT a payment method: approved cover is deducted from what the patient
  // owes at PRO review, so what reaches this screen is already the patient's own
  // share. Keyed by UHID because several bills can belong to one patient.
  const [covers, setCovers] = useState<Record<string, PatientCover | null>>({});

  useEffect(() => {
    const uhids = Array.from(new Set(bills.map(b => b.UHID).filter(Boolean)));
    const missing = uhids.filter(u => !(u in covers));
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const found = await Promise.all(missing.map(u => {
        // For inpatient bills, use the admission desk's CoverageType as the source
        // of truth — the desk asks the patient directly and their answer overrides
        // any global insurance record that might exist at registration.
        const bill = bills.find(b => b.UHID === u);
        const mod = bill?.VisitType === 'IP' ? 'IPD' : undefined;
        return fetchPatientCover(u, mod);
      }));
      if (cancelled) return;
      setCovers(prev => {
        const next = { ...prev };
        missing.forEach((u, i) => { next[u] = found[i]; });
        return next;
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bills]);

  // Which advance's order the detail panel is showing. Null = closed.
  //
  // The panel is the same OrderDetailDrawer the PRO desk uses, fed by
  // GET /pro/orders/{id}/detail. The old modal here showed four fields and a
  // price table, and got them by pulling EVERY order for the patient's UHID and
  // filtering client-side — so it could not show the patient, the admission, the
  // advance's own receipts, the insurance authorization or the audit trail, and
  // it re-implemented a view that already existed.
  const [viewing, setViewing] = useState<AdvanceBill | null>(null);

  // Which bill the payment dialog is collecting for. Null = closed.
  //
  // Payment used to happen the instant the button was pressed: the full total,
  // with the method guessed from whether the patient had a policy on file. The
  // dialog shows the cashier what they are collecting for, lets them choose a
  // real payment method, and supports part payment.
  const [payingBill, setPayingBill] = useState<AdvanceBill | null>(null);

  // Filters on the date the advance was raised, which is the "Raised On" column.
  const filteredBills = bills.filter(bill => {
    const raised = new Date(bill.CreatedAt);
    const start = fromDate ? new Date(fromDate) : null;
    const end = toDate ? new Date(toDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    return (!start || raised >= start) && (!end || raised <= end);
  });


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
                  <th className="px-6 py-4">S.No</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">UHID</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Raised On</th>
                  <th className="px-6 py-4 text-right">Amount Due</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.map((bill, idx) => (
                  <tr key={bill.AdvanceId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 text-slate-400">{idx + 1}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{bill.PatientName || '—'}</td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{bill.UHID}</td>
                    <td className="px-6 py-4 text-slate-600">{bill.DepartmentName || '—'}</td>
                    <td className="px-6 py-4">
                      {bill.VisitType
                        ? <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${visitChip(bill.VisitType)}`}>{bill.VisitType}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
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
                      <button
                        onClick={() => navigate(`/billing/print-advance/${bill.AdvanceNo}`)}
                        disabled={isPending(bill)}
                        title={isPending(bill) ? 'Pay advance to print receipt' : 'Print Receipt'}
                        aria-label="Print Receipt"
                        className={`flex items-center justify-center border border-slate-200 p-2 rounded-lg transition-colors shrink-0 ${
                          !isPending(bill) ? 'text-primary hover:bg-primary/10 hover:border-primary/20' : 'text-slate-300 cursor-not-allowed bg-slate-50/50'
                        }`}
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {(() => {
                        const cover = covers[bill.UHID];

                        // Settled bills stay listed for the record, showing how they
                        // were cleared rather than an action that would double-collect.
                        if (!isPending(bill)) {
                          return (
                            <div className="text-xs text-slate-500 leading-snug min-w-0">
                              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
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

                        return (
                          <button
                            onClick={() => setPayingBill(bill)}
                            title={cover
                              ? `Patient holds cover with ${cover.insurerName || 'an insurer'} — any approved cover is already deducted from the amount due`
                              : undefined}
                            className="w-full flex items-center justify-center gap-2 text-white text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-colors whitespace-nowrap"
                          >
                            <IndianRupee className="w-4 h-4" />
                            Proceed to Pay
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

      <OrderDetailDrawer
        orderId={viewing?.ServiceOrderId ?? null}
        onClose={() => setViewing(null)}
      />

      <AdvancePaymentDialog
        bill={payingBill}
        cover={payingBill ? covers[payingBill.UHID] : null}
        onClose={() => setPayingBill(null)}
        onPaid={fetchBills}
      />
    </div>
  );
};

export default AdvancePayments;
