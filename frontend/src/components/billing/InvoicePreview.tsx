import { useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { usePharmacyBilling } from '../../contexts/PharmacyBillingContext';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { generateInvoiceData } from '../../utils/billingUtils';

interface InvoicePreviewProps {
  billId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoicePreview = ({ billId, isOpen, onClose }: InvoicePreviewProps) => {
  const { bills } = usePharmacyBilling();
  const invoiceRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !billId) return null;

  const invoiceData = generateInvoiceData(billId, bills);

  if (!invoiceData) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Invoice Error">
        <div className="p-6 text-center text-red-500">Invoice not found.</div>
      </Modal>
    );
  }

  const handlePrint = () => {
    // In a real scenario we could use react-to-print or window.print with custom CSS
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invoice Preview" maxWidth="2xl">
      <div className="flex flex-col max-h-[80vh]">
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50" ref={invoiceRef}>
          <div className="bg-white p-8 border border-slate-200 shadow-sm rounded-xl max-w-3xl mx-auto printable-invoice">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-primary">CareFusions Pharmacy</h1>
                <p className="text-sm text-slate-500 mt-1">123 Health Ave, Medical District</p>
                <p className="text-sm text-slate-500">Phone: (555) 123-4567</p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold text-slate-800">INVOICE</h2>
                <p className="text-sm text-slate-600 mt-1 font-medium">#{invoiceData.billId}</p>
                <p className="text-sm text-slate-500">Date: {new Date(invoiceData.date).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Patient Info */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-700 mb-2">Billed To:</h3>
              <p className="font-medium text-slate-800">{invoiceData.patientName}</p>
              {invoiceData.patientId && <p className="text-sm text-slate-600">ID/Phone: {invoiceData.patientId}</p>}
            </div>

            {/* Items Table */}
            <table className="w-full text-left mb-6 border-collapse">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50">
                  <th className="py-2 px-3 font-semibold text-sm text-slate-700">Description</th>
                  <th className="py-2 px-3 font-semibold text-sm text-slate-700 text-right">Qty</th>
                  <th className="py-2 px-3 font-semibold text-sm text-slate-700 text-right">Unit Price</th>
                  <th className="py-2 px-3 font-semibold text-sm text-slate-700 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoiceData.items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-2 px-3 text-sm text-slate-800">{item.medicineName}</td>
                    <td className="py-2 px-3 text-sm text-slate-600 text-right">{item.quantity}</td>
                    <td className="py-2 px-3 text-sm text-slate-600 text-right">₹{item.unitPrice.toFixed(2)}</td>
                    <td className="py-2 px-3 text-sm text-slate-800 text-right font-medium">₹{item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>₹{invoiceData.totalAmount.toFixed(2)}</span>
                </div>
                {invoiceData.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-₹{invoiceData.discount.toFixed(2)}</span>
                  </div>
                )}
                {invoiceData.tax > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax:</span>
                    <span>+₹{invoiceData.tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-800 text-base pt-2 border-t border-slate-200 mt-2">
                  <span>Total Amount:</span>
                  <span>₹{invoiceData.netAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-slate-200 text-center text-sm text-slate-500">
              <p className="font-medium text-slate-700 mb-1">Payment Status: {invoiceData.paymentStatus} ({invoiceData.paymentMode})</p>
              <p>Thank you for your business!</p>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
          <Button variant="outline" color="secondary" onClick={onClose} icon={X}>Close</Button>
          <Button variant="filled" color="primary" onClick={handlePrint} icon={Printer}>Print Invoice</Button>
        </div>
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable-invoice, .printable-invoice * { visibility: visible; }
          .printable-invoice { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; }
        }
      `}</style>
    </Modal>
  );
};
