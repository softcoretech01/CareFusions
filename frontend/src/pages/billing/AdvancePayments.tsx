import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, IndianRupee } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Card } from '../../components/ui/Card';
import { DateFilter } from '../../components/ui/DateFilter';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface AdvanceBill {
  AdvanceId: number;
  AdvanceNo: string;
  ServiceOrderId: number;
  UHID: string;
  TotalAmount: number;
  Status: string;
  CreatedAt: string;
}

const inr = (v: any) =>
  `₹${(parseFloat(v ?? 0) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AdvancePayments = () => {
  const [bills, setBills] = useState<AdvanceBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchBills = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/billing/advance/pending`);
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

  const handlePay = async (bill: AdvanceBill) => {
    setPaying(bill.AdvanceId);
    try {
      await axios.post(`${API_URL}/billing/advance/${bill.AdvanceId}/pay`, {
        Amount: bill.TotalAmount,
        PaymentMode: 'CASH',
        PaymentReference: 'TXN-' + Math.floor(Math.random() * 100000),
      });
      toast.success(`Advance Bill ${bill.AdvanceNo} paid. Services are now unlocked.`);
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

  const totalDue = filteredBills.reduce((sum, b) => sum + (parseFloat(b.TotalAmount as any) || 0), 0);

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

        {/* Opens unfiltered on purpose: an unnoticed default range would hide older
            bills that are still waiting to be collected. */}
        <DateFilter
          label="Raised from :"
          dateFrom={fromDate}
          dateTo={toDate}
          onDateFromChange={setFromDate}
          onDateToChange={setToDate}
          defaultDateFrom=""
          defaultDateTo=""
          onSearch={() => {}}
          onReset={() => { setFromDate(''); setToDate(''); }}
        />

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <span className="bg-amber-50 text-amber-700 px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2 border border-amber-200">
            <IndianRupee className="w-4 h-4" />
            {filteredBills.length} Bill{filteredBills.length === 1 ? '' : 's'} Pending Payment
          </span>
          {filteredBills.length > 0 && (
            <span className="bg-slate-50 text-slate-600 px-4 py-2 rounded-full font-medium text-sm border border-slate-200">
              Total Due <span className="font-bold text-slate-800">{inr(totalDue)}</span>
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
              <h3 className="text-lg font-bold text-slate-800 mb-2">No Advance Payments Pending</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                There are currently no PRO approved orders waiting for advance payment. When a PRO approves an order with a
                patient responsibility, it will automatically appear here.
              </p>
            </>
          ) : (
            // Distinguishing these matters: "none in this range" and "none at all" mean very
            // different things when money is still owed outside the selected dates.
            <>
              <h3 className="text-lg font-bold text-slate-800 mb-2">No Advance Payments In This Range</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                {bills.length} pending bill{bills.length === 1 ? '' : 's'} exist outside the selected dates. Clear the
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
                      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700">
                        {bill.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handlePay(bill)}
                        disabled={paying !== null}
                        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {paying === bill.AdvanceId
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <IndianRupee className="w-4 h-4" />}
                        {paying === bill.AdvanceId ? 'Processing...' : 'Process Payment'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancePayments;
