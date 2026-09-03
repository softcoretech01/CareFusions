import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, IndianRupee, CreditCard, Smartphone, Building2, Banknote, RefreshCw, Eye, X } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui/Card';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface AdvanceBill {
  AdvanceId: number;
  AdvanceNo: string;
  ServiceOrderId: number;
  UHID: string;
  PatientName?: string;
  ServiceSummary?: string;
  SourceModule?: string;
  TotalAmount: number;
  PaidAmount: number;
  Status: string;
  CreatedAt: string;
}

const PAYMENT_MODES = [
  { value: 'Cash', label: 'Cash', icon: Banknote },
  { value: 'Card', label: 'Card', icon: CreditCard },
  { value: 'UPI', label: 'UPI', icon: Smartphone },
  { value: 'BankTransfer', label: 'Bank Transfer', icon: Building2 },
];

const inr = (v: any) =>
  `₹${(parseFloat(v ?? 0) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface PaymentState {
  billId: number;
  mode: string;
  reference: string;
  amount: string;
}

const AdvancePayments = () => {
  const [bills, setBills] = useState<AdvanceBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<number | null>(null);
  const [paymentState, setPaymentState] = useState<PaymentState | null>(null);
  const [viewBill, setViewBill] = useState<AdvanceBill | null>(null);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_URL}/billing/advance/all`);
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

  const openPayment = (bill: AdvanceBill) => {
    const outstanding = parseFloat(bill.TotalAmount as any) - parseFloat(bill.PaidAmount as any || 0);
    setPaymentState({
      billId: bill.AdvanceId,
      mode: 'Cash',
      reference: '',
      amount: outstanding.toFixed(2),
    });
  };

  const handlePay = async () => {
    if (!paymentState) return;
    const bill = bills.find(b => b.AdvanceId === paymentState.billId);
    if (!bill) return;

    const amount = parseFloat(paymentState.amount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    if (!paymentState.reference.trim() && paymentState.mode !== 'Cash') {
      toast.error('Reference / Transaction ID is required for non-cash payments');
      return;
    }

    setPaying(paymentState.billId);
    try {
      const { data } = await axios.post(`${API_URL}/billing/advance/${paymentState.billId}/pay`, {
        Amount: amount,
        PaymentMode: paymentState.mode,
        PaymentReference: paymentState.reference || `TXN-${Date.now()}`,
      });
      toast.success(data.message || `Payment recorded for ${bill.AdvanceNo}`);
      setPaymentState(null);
      fetchBills();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to process payment');
    } finally {
      setPaying(null);
    }
  };

  const totalDue = bills.reduce((sum, b) => {
    const outstanding = parseFloat(b.TotalAmount as any) - parseFloat(b.PaidAmount as any || 0);
    return sum + outstanding;
  }, 0);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const activeBill = paymentState ? bills.find(b => b.AdvanceId === paymentState.billId) : null;
  const outstanding = activeBill
    ? parseFloat(activeBill.TotalAmount as any) - parseFloat(activeBill.PaidAmount as any || 0)
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Advance Payments</h1>
          <p className="text-slate-500 text-sm mt-1">Collect advance payments for PRO-approved service orders.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchBills}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="bg-amber-50 text-amber-700 px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2 border border-amber-200">
            <IndianRupee className="w-4 h-4" />
            {bills.filter(b => b.Status !== 'PAID').length} Bill{bills.filter(b => b.Status !== 'PAID').length === 1 ? '' : 's'} Pending Payment
          </span>
          {bills.length > 0 && (
            <span className="bg-slate-50 text-slate-600 px-4 py-2 rounded-full font-medium text-sm border border-slate-200">
              Total Due <span className="font-bold text-slate-800">{inr(totalDue)}</span>
            </span>
          )}
        </div>
      </div>

      {bills.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No Advance Payments Pending</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            There are currently no PRO approved orders waiting for advance payment. When a PRO approves an order with a
            patient responsibility, it will automatically appear here.
          </p>
        </Card>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4">S.No</th>
                  <th className="px-5 py-4">UHID</th>
                  <th className="px-5 py-4">Patient Name</th>
                  <th className="px-5 py-4">Services</th>
                  <th className="px-5 py-4">Raised On</th>
                  <th className="px-5 py-4 text-right">Total</th>
                  <th className="px-5 py-4 text-right">Paid</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.map((bill, idx) => {
                  const outstandingAmt = parseFloat(bill.TotalAmount as any) - parseFloat(bill.PaidAmount as any || 0);
                  return (
                    <tr key={bill.AdvanceId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4 text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-5 py-4 font-mono font-semibold text-slate-800 text-xs">{bill.UHID}</td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-700 text-sm">{bill.PatientName || '—'}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{bill.SourceModule || '—'}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-xs max-w-[200px]">
                        <span className="truncate block" title={bill.ServiceSummary || '—'}>
                          {bill.ServiceSummary || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-xs">
                        {new Date(bill.CreatedAt).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-700 tabular-nums">{inr(bill.TotalAmount)}</td>
                      <td className="px-5 py-4 text-right text-emerald-600 tabular-nums">{inr(bill.PaidAmount || 0)}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                          bill.Status === 'PARTIALLY_PAID'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {bill.Status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewBill(bill)}
                            className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                          {bill.Status === 'PAID' ? (
                            <div className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-400 text-xs font-semibold px-4 py-2 rounded-lg cursor-not-allowed">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Paid
                            </div>
                          ) : (
                            <button
                              onClick={() => openPayment(bill)}
                              disabled={paying !== null}
                              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              <IndianRupee className="w-3.5 h-3.5" />
                              Collect
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Collection Modal */}
      {paymentState && activeBill && (
        <>
          <div
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setPaymentState(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-700 to-teal-600 px-6 py-4 text-white">
                <h2 className="text-lg font-bold">Collect Payment</h2>
                <p className="text-emerald-100 text-sm mt-0.5">{activeBill.AdvanceNo}</p>
              </div>

              <div className="p-6 space-y-5">
                {/* Patient & Amount Info */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Patient</span>
                    <span className="font-semibold text-slate-700">{activeBill.PatientName || activeBill.UHID}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Amount</span>
                    <span className="font-semibold">{inr(activeBill.TotalAmount)}</span>
                  </div>
                  {parseFloat(activeBill.PaidAmount as any || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Already Paid</span>
                      <span className="font-semibold text-emerald-600">{inr(activeBill.PaidAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t border-slate-200 pt-2 mt-2">
                    <span className="font-semibold text-slate-700">Outstanding</span>
                    <span className="font-bold text-amber-700 text-base">{inr(outstanding)}</span>
                  </div>
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-2">
                    Payment Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_MODES.map(pm => {
                      const Icon = pm.icon;
                      return (
                        <button
                          key={pm.value}
                          onClick={() => setPaymentState(p => p ? { ...p, mode: pm.value } : p)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                            paymentState.mode === pm.value
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 hover:border-slate-300 text-slate-600'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {pm.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-1">
                    Amount to Collect (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      min={0.01}
                      max={outstanding}
                      step="0.01"
                      value={paymentState.amount}
                      onChange={e => setPaymentState(p => p ? { ...p, amount: e.target.value } : p)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-4 py-2.5 text-base font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Reference */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 block mb-1">
                    Reference / Transaction ID{paymentState.mode !== 'Cash' && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type="text"
                    placeholder={paymentState.mode === 'Cash' ? 'Optional' : 'Required'}
                    value={paymentState.reference}
                    onChange={e => setPaymentState(p => p ? { ...p, reference: e.target.value } : p)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setPaymentState(null)}
                    disabled={paying !== null}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePay}
                    disabled={paying !== null}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <IndianRupee className="w-4 h-4" />}
                    {paying ? 'Processing...' : 'Collect Payment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {/* View Details Modal */}
      {viewBill && (
        <>
          <div
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setViewBill(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800">Bill Details</h2>
                <button onClick={() => setViewBill(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Advance No</p>
                    <p className="text-sm font-semibold text-slate-800 mt-1">{viewBill.AdvanceNo}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Date</p>
                    <p className="text-sm font-medium text-slate-700 mt-1">
                      {new Date(viewBill.CreatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Patient Name</p>
                    <p className="text-sm font-semibold text-slate-800 mt-1">{viewBill.PatientName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">UHID</p>
                    <p className="text-sm font-semibold text-slate-800 mt-1">{viewBill.UHID}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Services</p>
                    <p className="text-sm font-medium text-slate-700 mt-1">{viewBill.ServiceSummary || '—'}</p>
                  </div>
                </div>
                <div className="mt-6 bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Total Amount</span>
                    <span className="font-semibold text-slate-800">{inr(viewBill.TotalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">Paid Amount</span>
                    <span className="font-semibold text-emerald-600">{inr(viewBill.PaidAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-base border-t border-slate-200 pt-3 mt-3">
                    <span className="font-bold text-slate-700">Outstanding</span>
                    <span className="font-bold text-amber-700">
                      {inr(parseFloat(viewBill.TotalAmount as any) - parseFloat(viewBill.PaidAmount as any || 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdvancePayments;
