import { useState } from 'react';
import { Search, RotateCcw, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { usePharmacyBilling } from '../../contexts/PharmacyBillingContext';
import type { Bill } from '../../contexts/PharmacyBillingContext';
import { DateFilter } from '../../components/ui/DateFilter';
import toast from 'react-hot-toast';

export const Returns = () => {
  const { bills, refundBill } = usePharmacyBilling();
  
  const today = new Date().toISOString().split('T')[0];
  const firstDay = `${today.split('-')[0]}-${today.split('-')[1]}-01`;
  
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  
  const [dateFrom, setDateFrom] = useState(firstDay);
  const [dateTo, setDateTo] = useState(today);
  const [appliedDateFrom, setAppliedDateFrom] = useState(firstDay);
  const [appliedDateTo, setAppliedDateTo] = useState(today);

  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSearch = () => {
    setAppliedSearch(search);
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
  };

  const handleReset = () => {
    setDateFrom(firstDay);
    setDateTo(today);
    setSearch('');
    setAppliedSearch('');
    setAppliedDateFrom(firstDay);
    setAppliedDateTo(today);
  };

  const handleProcessReturn = () => {
    if (!selectedBill) return;

    refundBill(selectedBill.billId);
    
    setIsSuccess(true);
    toast.success(`Refund processed for ${selectedBill.billId}`);
    
    setTimeout(() => {
      setIsSuccess(false);
      setSelectedBill(null);
    }, 2000);
  };

  // Filter bills (maybe only Paid and Refunded?)
  const filteredBills = bills.filter(b => {
    const s = appliedSearch.toLowerCase();
    const matchesSearch = !s || 
      b.billId.toLowerCase().includes(s) || 
      (b.patientName && b.patientName.toLowerCase().includes(s));
      
    let matchesDate = true;
    if (appliedDateFrom && appliedDateTo) {
      const bDate = b.date.substring(0, 10);
      matchesDate = bDate >= appliedDateFrom && bDate <= appliedDateTo;
    }
    
    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pharmacy Returns & Refunds</h1>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-10rem)]">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Invoice or Patient..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <DateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onSearch={handleSearch}
            onReset={handleReset}
          />
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 shadow-sm z-10 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No matching invoices found.
                  </td>
                </tr>
              ) : (
                filteredBills.map(bill => (
                  <tr key={bill.billId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">{bill.billId}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(bill.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{bill.patientName || 'Walk-in'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-bold rounded-lg ${
                        bill.paymentStatus === 'Refunded' ? 'bg-slate-100 text-slate-600' :
                        bill.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {bill.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">₹{bill.netAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedBill(bill)}
                        className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBill && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden relative">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Invoice: {selectedBill.billId}</h3>
                <p className="text-sm text-slate-500">{new Date(selectedBill.date).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedBill(null)} className="text-slate-400 hover:text-slate-600 p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Patient / Customer</p>
                  <p className="font-semibold text-slate-800">{selectedBill.patientName || 'Walk-in'}</p>
                  <p className="text-sm text-slate-500">{selectedBill.patientId}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Amount</p>
                  <p className="text-2xl font-extrabold text-primary">₹{selectedBill.netAmount.toFixed(2)}</p>
                </div>
              </div>

              <h4 className="font-bold text-slate-700 mb-3 uppercase tracking-wider text-sm border-b border-slate-100 pb-2">Billed Items</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden mb-8 max-h-[30vh] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 font-bold">Medicine</th>
                      <th className="px-4 py-3 font-bold text-center">Qty</th>
                      <th className="px-4 py-3 font-bold text-right">Price</th>
                      <th className="px-4 py-3 font-bold text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedBill.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 font-semibold text-slate-800">{item.medicineName}</td>
                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-slate-600">₹{item.unitPrice.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">₹{item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedBill.paymentStatus === 'Refunded' ? (
                <div className="bg-slate-100 text-slate-500 p-4 rounded-xl text-center font-bold flex items-center justify-center gap-2 border border-slate-200">
                  <CheckCircle2 className="w-5 h-5" />
                  This bill has already been refunded
                </div>
              ) : (
                <button
                  onClick={handleProcessReturn}
                  disabled={isSuccess || selectedBill.paymentStatus !== 'Paid'}
                  className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-white transition-all shadow-md ${
                    isSuccess 
                      ? 'bg-emerald-500' 
                      : selectedBill.paymentStatus !== 'Paid' ? 'bg-slate-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 shadow-red-500/20 hover:-translate-y-0.5'
                  }`}
                >
                  {isSuccess ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Refund Successful
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-5 h-5" />
                      {selectedBill.paymentStatus !== 'Paid' ? 'Cannot refund unpaid bill' : 'Process Full Refund'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
