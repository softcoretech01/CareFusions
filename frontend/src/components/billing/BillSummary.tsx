
import { calculateTax, applyDiscount, calculateTotal } from '../../utils/billingUtils';
import { usePharmacyBilling } from '../../contexts/PharmacyBillingContext';

interface BillSummaryProps {
  discountPercent: number;
  taxPercent: number;
}

export const BillSummary = ({ discountPercent, taxPercent }: BillSummaryProps) => {
  const { currentBillItems } = usePharmacyBilling();

  const rawSubtotal = currentBillItems.reduce((acc, item) => acc + item.subtotal, 0);
  const discountAmount = applyDiscount(rawSubtotal, discountPercent);
  const afterDiscount = rawSubtotal - discountAmount;
  const taxAmount = calculateTax(afterDiscount, taxPercent);
  const totalAmount = calculateTotal(afterDiscount, 0, taxAmount);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm">
      <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Bill Summary</h4>
      
      <div className="flex justify-between text-sm">
        <span className="text-slate-600">Subtotal ({currentBillItems.length} items):</span>
        <span className="font-medium text-slate-800">₹{rawSubtotal.toFixed(2)}</span>
      </div>
      
      {discountPercent > 0 && (
        <div className="flex justify-between text-sm text-emerald-600">
          <span>Discount ({discountPercent}%):</span>
          <span>-₹{discountAmount.toFixed(2)}</span>
        </div>
      )}
      
      {taxPercent > 0 && (
        <div className="flex justify-between text-sm text-slate-600">
          <span>Tax ({taxPercent}%):</span>
          <span>+₹{taxAmount.toFixed(2)}</span>
        </div>
      )}
      
      <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
        <span className="font-bold text-slate-800">Total Amount:</span>
        <span className="font-bold text-xl text-primary">₹{totalAmount.toFixed(2)}</span>
      </div>
    </div>
  );
};
