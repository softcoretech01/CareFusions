import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Printer, CreditCard, X, Eye } from 'lucide-react';
import { usePharmacyBilling } from '../../contexts/PharmacyBillingContext';
import { DateFilter, monthStart, today as todayInput } from '../../components/ui/DateFilter';

export const RetailReports = () => {
  const navigate = useNavigate();
  const { bills, updateBillStatus, refresh } = usePharmacyBilling() as any;

  useEffect(() => { refresh?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [viewingBill, setViewingBill] = useState<any | null>(null);
  // Report opens on "this month so far": 1st of the current month → today.
  const [fromDate, setFromDate] = useState(monthStart);
  const [toDate, setToDate] = useState(todayInput);
  const [searchQuery, setSearchQuery] = useState('');

  // Compare on local calendar days (YYYY-MM-DD) so the range is inclusive of
  // the whole end day and free of UTC-vs-local parsing skew.
  const toLocalDay = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const filteredBills = bills.filter((bill: any) => {
    const day = toLocalDay(new Date(bill.date));
    if (fromDate && day < fromDate) return false;
    if (toDate && day > toDate) return false;
    const q = searchQuery.toLowerCase();
    return bill.billId.toLowerCase().includes(q) ||
      (bill.patientName && bill.patientName.toLowerCase().includes(q));
  });

  const exportToCSV = () => {
    if (filteredBills.length === 0) return;

    const headers = ['Invoice No', 'Date', 'Customer', 'Phone', 'Total Items', 'Subtotal', 'Tax', 'Discount', 'Net Amount', 'Status', 'Payment Mode'];
    const rows = filteredBills.map((bill: any) => [
      bill.billId,
      new Date(bill.date).toLocaleDateString(),
      bill.patientName || 'Walk-in',
      bill.patientId || '-',
      bill.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
      bill.totalAmount.toFixed(2),
      bill.tax.toFixed(2),
      bill.discount.toFixed(2),
      bill.netAmount.toFixed(2),
      bill.paymentStatus,
      bill.paymentMode || 'Cash'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r: any) => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `retail_sales_report_${fromDate || 'all'}_to_${toDate || 'all'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto">

      {/* Header Tabs (Static for UI as per screenshot) */}
      {/* <div className="flex border-b border-slate-200 mb-4">
        <button className="px-6 py-3 border-b-2 border-primary text-primary font-bold text-sm flex items-center gap-2 bg-primary/5 rounded-t-lg">
          <FileText className="w-4 h-4" />
          Retail Sales Report
        </button>
      </div> */}

      <div className="flex-1 bg-white border border-slate-200 rounded-xl flex flex-col shadow-sm overflow-hidden">

        {/* Controls Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-extrabold text-slate-800">Retail Sales Report</h2>
          <div className="flex items-center gap-3">
            <DateFilter
              dateFrom={fromDate}
              dateTo={toDate}
              onDateFromChange={setFromDate}
              onDateToChange={setToDate}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              defaultDateFrom={monthStart()}
              defaultDateTo={todayInput()}
              onSearch={() => { }}
              onReset={() => { setFromDate(monthStart()); setToDate(todayInput()); setSearchQuery(''); }}
            />
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* Report Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100/80 text-slate-500 sticky top-0 border-b border-slate-200 z-10">
              <tr>
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Invoice</th>
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Customer Details</th>
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Medicine Details</th>
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-center">Qty</th>
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-right">Net Amount</th>
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBills.length > 0 ? (
                filteredBills.map((bill: any) => (
                  <tr key={bill.billId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-bold text-primary">{bill.billId}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(bill.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{bill.patientName || 'Walk-in'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Ph: {bill.patientId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                        {bill.items.length} {bill.items.length === 1 ? 'item' : 'items'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700">
                      {bill.items.reduce((sum: number, item: any) => sum + item.quantity, 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-primary text-base">₹{bill.netAmount.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {bill.paymentStatus === 'Paid' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {bill.paymentStatus !== 'Paid' && (
                          <button
                            onClick={() => updateBillStatus(bill.billId, 'Paid')}
                            className="p-1.5 text-amber-600 hover:text-white hover:bg-amber-500 rounded transition-colors"
                            title="Pay Bill"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setViewingBill({ ...bill })}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => bill.paymentStatus === 'Paid' && navigate(`/pharmacy/print/${bill.billId}`)}
                          disabled={bill.paymentStatus !== 'Paid'}
                          className={`p-1.5 rounded transition-colors ${bill.paymentStatus === 'Paid'
                              ? 'text-primary hover:text-white hover:bg-primary'
                              : 'text-slate-300 cursor-not-allowed bg-slate-50'
                            }`}
                          title={bill.paymentStatus === 'Paid' ? "Print Bill" : "Bill must be Paid to print"}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-lg font-medium">No sales recorded today.</p>
                    <p className="text-sm mt-1">Use the Retail POS to create new bills.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {viewingBill && (
        <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Bill Details: {viewingBill.billId}
              </h3>
              <button onClick={() => setViewingBill(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase">Customer</p>
                  <p className="font-bold text-slate-800">{viewingBill.patientName || 'Walk-in'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase">Phone</p>
                  <p className="font-bold text-slate-800">{viewingBill.patientId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase">Date</p>
                  <p className="font-bold text-slate-800">{new Date(viewingBill.date).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase">Status & Mode</p>
                  <p className="font-bold text-slate-800">{viewingBill.paymentStatus} ({viewingBill.paymentMode})</p>
                </div>
              </div>

              <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Medicine Details</h4>
              <div className="space-y-3 mb-4">
                {viewingBill.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-bold text-slate-800">{item.medicineName}</p>
                      <p className="text-xs text-slate-500">₹{item.unitPrice.toFixed(2)} x {item.quantity}</p>
                    </div>
                    <div className="font-bold text-slate-800">₹{item.subtotal.toFixed(2)}</div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>₹{viewingBill.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax (5%)</span>
                  <span>₹{viewingBill.tax.toFixed(2)}</span>
                </div>
                {viewingBill.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>-₹{viewingBill.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-lg text-primary pt-2 border-t border-slate-100 mt-2">
                  <span>Net Amount</span>
                  <span>₹{viewingBill.netAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex justify-end">
              <button
                onClick={() => setViewingBill(null)}
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-bold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
