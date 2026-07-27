
import { useParams, useNavigate } from 'react-router-dom';
import { usePharmacyBilling } from '../../contexts/PharmacyBillingContext';
import { Printer, ArrowLeft } from 'lucide-react';

export const BillingPrintTemplate = () => {
  const { id } = useParams<{ id: string }>();
  const { bills } = usePharmacyBilling();
  const navigate = useNavigate();

  const bill = bills.find(b => b.billId === id);

  if (!bill) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-slate-500 text-lg">Bill not found.</p>
        <button onClick={() => navigate(-1)} className="text-primary underline">Go Back</button>
      </div>
    );
  }

  const isIP = bill.patientId?.startsWith('IP');
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      {/* Screen controls - hidden on print */}
      <div className="max-w-4xl mx-auto py-6 px-4 print:hidden flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <button
          onClick={() => window.print()}
          className="ml-auto flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Printer className="w-5 h-5" /> Print Bill
        </button>
      </div>

      {/* Printable Invoice */}
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl print:shadow-none print:rounded-none print:max-w-full overflow-hidden">

        {/* Header */}
        <div className="bg-primary px-10 py-8 text-white print:px-8 print:py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-wide">CENTRAL GENERAL HOSPITAL</h1>
              <p className="text-white/80 text-sm mt-1">123, Hospital Road, Health City — 600001</p>
              <p className="text-white/80 text-sm">Phone: +91 44 1234 5678 | Email: billing@cgh.in</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold bg-white/20 px-4 py-2 rounded-xl">
                {isIP ? 'IP BILL' : 'OP BILL'}
              </div>
              <p className="text-white/70 text-xs mt-2">{today}</p>
            </div>
          </div>
        </div>

        {/* Bill Meta */}
        <div className="grid grid-cols-2 gap-6 px-10 py-6 border-b border-slate-200 bg-slate-50 print:px-8">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bill To</p>
            <p className="text-xl font-bold text-slate-900">{bill.patientName}</p>
            <p className="text-sm text-slate-500">{bill.patientId}</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bill Details</p>
            <p className="text-sm"><span className="font-semibold">Bill No:</span> {bill.billId}</p>
            <p className="text-sm"><span className="font-semibold">Date:</span> {new Date(bill.date).toLocaleDateString('en-IN')}</p>
            <p className="text-sm"><span className="font-semibold">Mode:</span> {bill.paymentMode}</p>
            <span className={`inline-block mt-1 px-3 py-1 text-xs font-bold rounded-full ${bill.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {bill.paymentStatus}
            </span>
          </div>
        </div>

        {/* Items Table */}
        <div className="px-10 py-6 print:px-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary/5 border border-slate-200 rounded-lg">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Unit Price (₹)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item, idx) => (
                <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                  <td className="px-4 py-3 text-slate-800 font-medium">{item.medicineName}</td>
                  <td className="px-4 py-3 text-right text-slate-700">₹{item.unitPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center text-slate-700">{item.quantity}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">₹{item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-10 pb-8 print:px-8">
          <div className="ml-auto w-80 space-y-2 border-t border-slate-200 pt-4">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>₹{bill.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Discount</span>
              <span className="text-green-600">- ₹{(bill.discount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Tax (GST)</span>
              <span>₹{(bill.tax || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-extrabold text-slate-900 border-t-2 border-primary pt-3 mt-2">
              <span>NET TOTAL</span>
              <span className="text-primary">₹{bill.netAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-10 py-6 print:px-8 text-center">
          <p className="text-xs text-slate-400">
            This is a computer-generated bill and does not require a signature. For queries, contact billing@cgh.in
          </p>
          <p className="text-xs text-slate-400 mt-1">Thank you for choosing Central General Hospital</p>
        </div>
      </div>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};
