import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePharmacyBilling } from '../../contexts/PharmacyBillingContext';
import { Heart, Plus } from 'lucide-react';

export const PrintableBill = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { bills } = usePharmacyBilling();

  const bill = bills.find(b => b.billId === id);

  const hasPrinted = useRef(false);

  useEffect(() => {
    if (bill && !hasPrinted.current) {
      hasPrinted.current = true;
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [bill]);

  if (!bill) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <h1 className="text-2xl font-bold text-slate-800">Bill Not Found</h1>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Go Back</button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen p-8 text-black">
      {/* Hide print button when printing */}
      <div className="print:hidden mb-4 flex justify-between items-center bg-slate-100 p-4 rounded-lg">
        <p className="text-sm text-slate-600">Print preview generated. If prompt didn't appear, click Print.</p>
        <div className="flex gap-4">
          <button onClick={() => navigate(-1)} className="px-4 py-2 bg-slate-300 hover:bg-slate-400 rounded text-slate-800 font-bold transition-colors">Close</button>
          <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-bold transition-colors">Print Bill</button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto border border-slate-300 rounded-xl p-8 shadow-sm print:border-none print:shadow-none print:p-0">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center">
              <Heart className="w-10 h-10 fill-[#086450] text-[#086450]" />
              <Plus className="w-4 h-4 text-[#D4A62A] absolute" strokeWidth={4} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">CareFusions Hospital</h1>
              <p className="text-sm text-slate-500">123 Health Avenue, Medical District</p>
              <p className="text-sm text-slate-500">Phone: +91 80000 12345</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-extrabold text-slate-800 uppercase tracking-widest mb-2">Invoice</h2>
            <p className="text-sm font-bold text-slate-700">Bill No: <span className="font-normal">{bill.billId}</span></p>
            <p className="text-sm font-bold text-slate-700">Date: <span className="font-normal">{new Date(bill.date).toLocaleString()}</span></p>
            <p className="text-sm font-bold text-slate-700">Status: <span className="font-normal uppercase">{bill.paymentStatus}</span></p>
          </div>
        </div>

        {/* Customer Details */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2 mb-3">Billed To</h3>
          <p className="font-bold text-lg text-slate-900">{bill.patientName}</p>
          <p className="text-sm text-slate-600">Phone: {bill.patientId}</p>
        </div>

        {/* Items Table */}
        <table className="w-full text-left text-sm mb-8">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-center">Qty</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Unit Price</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {bill.items.map((item, index) => (
              <tr key={index}>
                <td className="px-4 py-3">
                  <p className="font-bold text-slate-800">{item.medicineName}</p>
                </td>
                <td className="px-4 py-3 text-center">{item.quantity}</td>
                <td className="px-4 py-3 text-right">₹{item.unitPrice.toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-bold text-slate-800">₹{item.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <div className="flex justify-end border-t border-slate-200 pt-6">
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 font-medium">Sub Total:</span>
              <span className="font-bold text-slate-800">₹{bill.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 font-medium">Discount:</span>
              <span className="font-bold text-slate-800">₹{bill.discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 font-medium">Tax (5%):</span>
              <span className="font-bold text-slate-800">₹{bill.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-end border-t border-slate-300 pt-3 mt-3">
              <span className="text-base font-bold text-slate-800 uppercase tracking-wider">Net Amount:</span>
              <span className="text-2xl font-extrabold text-blue-700">₹{bill.netAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
          <p>Thank you for choosing CareFusions Hospital.</p>
          <p>This is a computer generated invoice and does not require a physical signature.</p>
        </div>
      </div>
    </div>
  );
};
