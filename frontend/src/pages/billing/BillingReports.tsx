import { useState } from 'react';
import { Printer, Download, Eye, X } from 'lucide-react';
import { usePharmacyBilling } from '../../contexts/PharmacyBillingContext';
import { useNavigate } from 'react-router-dom';
import { DateFilter } from '../../components/ui/DateFilter';

export const BillingReports = () => {
  const { bills, updateBillStatus } = usePharmacyBilling();
  const navigate = useNavigate();

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBill, setSelectedBill] = useState<any>(null);

  // Helper: determine if a bill belongs to an IP patient (UHID 0006–0010)
  const isIPBill = (patientId?: string) => {
    if (!patientId) return false;
    return patientId.startsWith('UHID-2026-0006') || patientId.startsWith('UHID-2026-0007') ||
           patientId.startsWith('UHID-2026-0008') || patientId.startsWith('UHID-2026-0009') ||
           patientId.startsWith('UHID-2026-0010') || patientId.startsWith('IP-');
  };
  const isOPBill = (patientId?: string) => {
    if (!patientId) return false;
    return patientId.startsWith('UHID-2026-0001') || patientId.startsWith('UHID-2026-0002') ||
           patientId.startsWith('UHID-2026-0003') || patientId.startsWith('UHID-2026-0004') ||
           patientId.startsWith('UHID-2026-0005') || patientId.startsWith('OP-');
  };

  // Show all OP and IP bills in Billing portal
  const billingBills = bills.filter(b => isIPBill(b.patientId) || isOPBill(b.patientId));

  const filteredBills = billingBills.filter(bill => {
    const billDate = new Date(bill.date);
    const startDate = fromDate ? new Date(fromDate) : null;
    const endDate = toDate ? new Date(toDate) : null;
    if (startDate) startDate.setHours(0,0,0,0);
    if (endDate) endDate.setHours(23,59,59,999);
    
    const matchesFrom = !startDate || billDate >= startDate;
    const matchesTo = !endDate || billDate <= endDate;
    const matchesSearch = 
      bill.billId.toLowerCase().includes(searchQuery.toLowerCase()) || 
      bill.patientName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFrom && matchesTo && matchesSearch;
  });

  const handleMarkPaid = (billId: string) => {
    updateBillStatus(billId, 'Paid');
  };

  const handlePrint = (billId: string) => {
    navigate(`/billing/print/${billId}`);
  };

  const exportToCSV = () => {
    if (filteredBills.length === 0) return;
    
    const headers = ['Bill ID', 'Type', 'Patient Name', 'Date', 'Amount', 'Status'];
    const rows = filteredBills.map(bill => {
      const isIP = isIPBill(bill.patientId);
      return [
        bill.billId,
        isIP ? 'IP' : 'OP',
        bill.patientName || 'Walk-in',
        new Date(bill.date).toLocaleDateString(),
        bill.netAmount.toFixed(2),
        bill.paymentStatus
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `billing_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col space-y-6 w-full">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Billing Reports</h2>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
            <div className="flex-1 w-full md:w-auto">
              <DateFilter
                dateFrom={fromDate}
                dateTo={toDate}
                onDateFromChange={setFromDate}
                onDateToChange={setToDate}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSearch={() => {}}
                onReset={() => { setFromDate(''); setToDate(''); setSearchQuery(''); }}
              />
            </div>
            <button 
              onClick={exportToCSV}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg font-bold text-slate-700 flex items-center justify-center gap-2 transition-colors w-full md:w-auto shrink-0"
            >
               <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Bill ID</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">UHID / IP No</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Pay</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-14 text-center text-slate-400">
                      No bills found matching your criteria.
                    </td>
                  </tr>
                ) : filteredBills.map(bill => {
                  const isPaid = bill.paymentStatus === 'Paid';
                  const isIP = isIPBill(bill.patientId);
                  return (
                    <tr key={bill.billId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-slate-900">{bill.billId}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${isIP ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {isIP ? 'IP' : 'OP'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{bill.patientId || '-'}</td>
                      <td className="px-6 py-4 text-slate-700 font-medium">{bill.patientName}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">₹{bill.netAmount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                          isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {bill.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {!isPaid ? (
                          <button
                            onClick={() => handleMarkPaid(bill.billId)}
                            className="px-3 py-1.5 text-xs font-bold bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-sm hover:shadow active:scale-95"
                            title="Mark as Paid"
                          >
                            Pay Bill
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedBill(bill)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="View Bill Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => isPaid && handlePrint(bill.billId)}
                            disabled={!isPaid}
                            className={`p-2 rounded-lg transition-all ${
                              isPaid
                                ? 'text-primary hover:bg-primary/10 hover:shadow-sm cursor-pointer'
                                : 'text-slate-300 cursor-not-allowed'
                            }`}
                            title={isPaid ? 'Print Bill' : 'Mark as Paid to enable printing'}
                          >
                            <Printer className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Bill Details - {selectedBill.billId}</h3>
              <button 
                onClick={() => setSelectedBill(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Patient Name</p>
                  <p className="font-bold text-slate-800">{selectedBill.patientName || 'Walk-in'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">UHID / IP No</p>
                  <p className="font-mono font-bold text-slate-800">{selectedBill.patientId || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Bill Date</p>
                  <p className="font-bold text-slate-800">{new Date(selectedBill.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Payment Status</p>
                  <span className={`px-2 py-1 text-xs font-bold rounded-md inline-block mt-1 ${
                    selectedBill.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {selectedBill.paymentStatus}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Items</h4>
                <div className="space-y-3">
                  {selectedBill.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                      <div>
                        <p className="font-semibold text-slate-800">{item.medicineName || item.name || 'Item'}</p>
                        <p className="text-xs text-slate-500">Qty: {item.quantity || item.qty || 1} × ₹{(item.unitPrice || item.price || 0).toFixed(2)}</p>
                      </div>
                      <p className="font-bold text-slate-800">₹{(item.subtotal || item.total || item.totalPrice || 0).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex flex-col items-end gap-2 text-sm">
                <div className="flex justify-between w-48 text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-medium">₹{selectedBill.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-48 text-slate-600">
                  <span>Discount:</span>
                  <span className="font-medium text-emerald-600">-₹{selectedBill.discount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-48 text-slate-600">
                  <span>Tax:</span>
                  <span className="font-medium text-slate-800">₹{selectedBill.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-48 text-lg font-bold text-slate-800 border-t border-slate-100 pt-2 mt-2">
                  <span>Total:</span>
                  <span className="text-primary">₹{selectedBill.netAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setSelectedBill(null)}
                className="px-6 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              {selectedBill.paymentStatus === 'Paid' && (
                <button
                  onClick={() => {
                    handlePrint(selectedBill.billId);
                    setSelectedBill(null);
                  }}
                  className="px-6 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print Bill
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
