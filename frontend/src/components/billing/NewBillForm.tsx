import { useState } from 'react';
import { Trash2, CheckCircle } from 'lucide-react';
import { usePharmacyBilling } from '../../contexts/PharmacyBillingContext';
import { Button } from '../ui/Button';
import { BillItemSelector } from './BillItemSelector';
import { BillSummary } from './BillSummary';
import { applyDiscount, calculateTax, calculateTotal } from '../../utils/billingUtils';

interface NewBillFormProps {
  onSuccess: (billId: string) => void;
}

export const NewBillForm = ({ onSuccess }: NewBillFormProps) => {
  const { currentBillItems, removeItemFromBill, finalizeBill, cancelBill } = usePharmacyBilling();
  
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');

  const handleFinalize = () => {
    if (!patientName.trim()) {
      alert('Patient name is required');
      return;
    }
    if (currentBillItems.length === 0) {
      alert('Please add at least one item to the bill');
      return;
    }

    const rawSubtotal = currentBillItems.reduce((acc, item) => acc + item.subtotal, 0);
    const discountAmount = applyDiscount(rawSubtotal, discountPercent);
    const afterDiscount = rawSubtotal - discountAmount;
    const taxAmount = calculateTax(afterDiscount, taxPercent);
    const totalAmount = calculateTotal(afterDiscount, 0, taxAmount);

    finalizeBill({
      patientName,
      patientId,
      date: new Date().toISOString(),
      totalAmount: rawSubtotal,
      discount: discountAmount,
      tax: taxAmount,
      netAmount: totalAmount,
      paymentMode,
      paymentStatus: 'Paid'
    });

    onSuccess('latest'); // The context doesn't expose the new bill ID directly, but we can handle this later or pass a flag
    // Clear form
    setPatientName('');
    setPatientId('');
    setDiscountPercent(0);
    setTaxPercent(0);
    setPaymentMode('Cash');
  };

  const handleCancel = () => {
    cancelBill();
    setPatientName('');
    setPatientId('');
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Patient Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Patient Name <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={patientName} 
              onChange={e => setPatientName(e.target.value)} 
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
              placeholder="Enter patient name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Patient ID / Phone (Optional)</label>
            <input 
              type="text" 
              value={patientId} 
              onChange={e => setPatientId(e.target.value)} 
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Enter ID or Phone"
            />
          </div>
        </div>
      </div>

      <BillItemSelector />

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col">
        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Bill Items</h3>
        
        <div className="flex-1 overflow-x-auto min-h-[200px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Medicine</th>
                <th className="px-4 py-3 font-medium text-right">Qty</th>
                <th className="px-4 py-3 font-medium text-right">Unit Price</th>
                <th className="px-4 py-3 font-medium text-right">Subtotal</th>
                <th className="px-4 py-3 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentBillItems.length > 0 ? (
                currentBillItems.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-800 font-medium">{item.medicineName}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-slate-700">₹{item.unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-800 font-medium">₹{item.subtotal.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => removeItemFromBill(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No items added to bill yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 pt-6 border-t border-slate-100">
          <div className="lg:col-span-2 space-y-4">
            <h4 className="font-bold text-slate-800">Billing Options</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Discount (%)</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={discountPercent} 
                  onChange={e => setDiscountPercent(Number(e.target.value))} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tax (%)</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={taxPercent} 
                  onChange={e => setTaxPercent(Number(e.target.value))} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                <select 
                  value={paymentMode} 
                  onChange={e => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="Insurance">Insurance</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button variant="outline" color="secondary" onClick={handleCancel}>Cancel Bill</Button>
              <Button variant="filled" color="primary" onClick={handleFinalize} icon={CheckCircle}>Generate Bill</Button>
            </div>
          </div>
          
          <div>
            <BillSummary discountPercent={discountPercent} taxPercent={taxPercent} />
          </div>
        </div>
      </div>
    </div>
  );
};
