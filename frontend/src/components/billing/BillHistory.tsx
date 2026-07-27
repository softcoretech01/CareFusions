import { useState } from 'react';
import { Search, Eye, Printer, RotateCcw } from 'lucide-react';
import { usePharmacyBilling } from '../../contexts/PharmacyBillingContext';

interface BillHistoryProps {
  onViewInvoice: (billId: string) => void;
}

export const BillHistory = ({ onViewInvoice }: BillHistoryProps) => {
  const { bills, searchBillHistory, refundBill } = usePharmacyBilling();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBills = searchQuery ? searchBillHistory(searchQuery) : bills;

  const handleRefund = (billId: string) => {
    if (window.confirm('Are you sure you want to refund this bill? This will restore medicine stock.')) {
      refundBill(billId);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <h3 className="font-bold text-slate-800">Bill History</h3>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search bills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 text-sm"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
            <tr>
              <th className="px-4 py-3 font-medium">Bill ID</th>
              <th className="px-4 py-3 font-medium">Patient Name</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium text-right">Total Amount (₹)</th>
              <th className="px-4 py-3 font-medium text-center">Payment Status</th>
              <th className="px-4 py-3 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredBills.length > 0 ? (
              filteredBills.map((bill) => (
                <tr key={bill.billId} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-primary">{bill.billId}</td>
                  <td className="px-4 py-3 text-slate-800">{bill.patientName}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(bill.date).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">{bill.netAmount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      bill.paymentStatus === 'Paid' 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                        : 'bg-red-50 text-red-600 border border-red-200'
                    }`}>
                      {bill.paymentStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => onViewInvoice(bill.billId)}
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="View Invoice"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onViewInvoice(bill.billId)} // For now, print logic inside View
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Print"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {bill.paymentStatus === 'Paid' && (
                        <button 
                          onClick={() => handleRefund(bill.billId)}
                          className="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Refund Bill"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No bills found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
