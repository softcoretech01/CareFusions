import { useState } from 'react';
import { Search, RotateCcw, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePharmacyBilling } from '../../contexts/PharmacyBillingContext';
import type { Bill } from '../../contexts/PharmacyBillingContext';

export const Returns = () => {
  const { bills, refundBill } = usePharmacyBilling();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedBill, setSearchedBill] = useState<Bill | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    const found = bills.find(b => b.billId.toLowerCase() === searchQuery.toLowerCase());
    setSearchedBill(found || null);
    setSearchAttempted(true);
    setIsSuccess(false); // Reset success state if searching again
  };

  const handleProcessReturn = () => {
    if (!searchedBill) return;

    // Refund the bill via Context (restores stock, marks as Refunded)
    refundBill(searchedBill.billId);
    
    setIsSuccess(true);
    
    // Update local state to reflect the refund immediately
    setSearchedBill(prev => prev ? { ...prev, paymentStatus: 'Refunded' } : null);

    setTimeout(() => {
      setIsSuccess(false);
      setSearchedBill(null);
      setSearchQuery('');
      setSearchAttempted(false);
    }, 3000);
  };

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto">
      {/* Primary Color Header */}
      <div className="bg-primary rounded-t-xl p-5 flex items-center justify-between text-white shadow-md z-10 relative">
        <div className="flex items-center gap-3">
          <RotateCcw className="w-6 h-6" />
          <div>
            <h2 className="text-xl font-bold tracking-tight">Pharmacy Returns & Refunds</h2>
            <p className="text-white/80 text-xs mt-0.5">Search by Invoice number to process returns and restore stock.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white border-x border-b border-slate-200 rounded-b-xl flex flex-col overflow-hidden shadow-sm p-6">
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <label className="block text-sm font-bold text-slate-700 mb-2">Search Invoice / Bill ID</label>
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input 
                type="text"
                placeholder="e.g. INV-123456"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
              />
            </div>
            <button 
              type="submit"
              className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-sm transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto">
          {!searchAttempted ? (
            <div className="h-full flex flex-col">
              <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Recent Returns</h3>
              {bills.filter(b => b.paymentStatus === 'Refunded').length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-bold">Invoice</th>
                        <th className="px-4 py-3 font-bold">Date</th>
                        <th className="px-4 py-3 font-bold">Customer</th>
                        <th className="px-4 py-3 font-bold text-right">Refund Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bills.filter(b => b.paymentStatus === 'Refunded').map(bill => (
                        <tr key={bill.billId} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-slate-700">{bill.billId}</td>
                          <td className="px-4 py-3 text-slate-500">{new Date(bill.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{bill.patientName || 'Walk-in'}</td>
                          <td className="px-4 py-3 text-right font-extrabold text-primary">₹{bill.netAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
                  <FileText className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium text-slate-500">No returns recorded yet.</p>
                  <p className="text-sm mt-1">Search for an invoice above to process a new return.</p>
                </div>
              )}
            </div>
          ) : !searchedBill ? (
            <div className="h-full flex flex-col items-center justify-center text-red-400">
              <AlertCircle className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium text-red-500">No bill found with ID "{searchQuery}"</p>
              <p className="text-sm mt-1 text-slate-500">Please check the invoice number and try again.</p>
            </div>
          ) : (
            <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              {/* Bill Details Card */}
              <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
                <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">{searchedBill.billId}</h3>
                    <p className="text-sm text-slate-500">{new Date(searchedBill.date).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      searchedBill.paymentStatus === 'Refunded' 
                        ? 'bg-slate-200 text-slate-600'
                        : searchedBill.paymentStatus === 'Paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}>
                      {searchedBill.paymentStatus}
                    </span>
                  </div>
                </div>
                
                <div className="p-5 grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Patient / Customer</p>
                    <p className="font-semibold text-slate-800">{searchedBill.patientName || 'Walk-in'}</p>
                    <p className="text-sm text-slate-500">{searchedBill.patientId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Amount</p>
                    <p className="text-2xl font-extrabold text-primary">₹{searchedBill.netAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <h4 className="font-bold text-slate-700 mb-3 uppercase tracking-wider text-sm border-b border-slate-100 pb-2">Billed Items</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden mb-8">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-bold">Medicine</th>
                      <th className="px-4 py-3 font-bold text-center">Qty</th>
                      <th className="px-4 py-3 font-bold text-right">Price</th>
                      <th className="px-4 py-3 font-bold text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {searchedBill.items.map((item, idx) => (
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

              {/* Action Button */}
              {searchedBill.paymentStatus === 'Refunded' ? (
                <div className="bg-slate-100 text-slate-500 p-4 rounded-xl text-center font-bold flex items-center justify-center gap-2 border border-slate-200">
                  <CheckCircle2 className="w-5 h-5" />
                  This bill has already been refunded
                </div>
              ) : (
                <button
                  onClick={handleProcessReturn}
                  disabled={isSuccess}
                  className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-white transition-all shadow-md ${
                    isSuccess 
                      ? 'bg-emerald-500' 
                      : 'bg-red-500 hover:bg-red-600 shadow-red-500/20 hover:-translate-y-0.5'
                  }`}
                >
                  {isSuccess ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Return Processed Successfully
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-5 h-5" />
                      Process Full Return & Refund
                    </>
                  )}
                </button>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
