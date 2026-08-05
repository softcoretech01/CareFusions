import { useState } from 'react';
import { Store, Search, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePharmacyBilling } from '../../contexts/PharmacyBillingContext';
import type { Medicine } from '../../contexts/PharmacyBillingContext';

interface CartItem extends Medicine {
  cartQty: number;
}

export const RetailPOS = () => {
  const { medicines, addRetailBill } = usePharmacyBilling() as any;
  
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card'>('Cash');
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Derived calculations
  const subTotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.cartQty), 0);
  const discount = 0; // Fixed for now as per UI
  const tax = subTotal * 0.05; // 5% GST
  const netAmount = subTotal - discount + tax;

  const filteredMedicines = medicines.filter((m: any) => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMedicine = (medicine: Medicine) => {
    if (medicine.quantity <= 0) {
      setErrorMsg(`${medicine.name} is currently out of stock!`);
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.id === medicine.id);
      if (existing) {
        if (existing.cartQty >= medicine.quantity) return prev; // Cannot exceed stock
        return prev.map(item => item.id === medicine.id ? { ...item, cartQty: item.cartQty + 1 } : item);
      }
      return [...prev, { ...medicine, cartQty: 1 }];
    });
    setSearchQuery('');
  };

  const handleUpdateQty = (id: string, qty: number) => {
    if (qty <= 0) return;
    const med = medicines.find((m: any) => m.id === id);
    if (!med || qty > med.quantity) return; // Cannot exceed stock

    setCart(prev => prev.map(item => item.id === id ? { ...item, cartQty: qty } : item));
  };

  const handleRemoveItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleCompleteSale = () => {
    if (cart.length === 0) return;

    // If a phone number was entered, it must be a full 10 digits.
    if (phoneNumber.length > 0 && phoneNumber.length !== 10) {
      setErrorMsg('Enter a valid 10-digit phone number, or leave it blank.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    const newBill = {
      billId: `INV-${Date.now().toString().slice(-6)}`,
      patientName: customerName || 'Walk-in',
      patientId: phoneNumber || '-',
      date: new Date().toISOString(),
      items: cart.map(item => ({
        medicineId: item.id,
        medicineName: item.name,
        quantity: item.cartQty,
        unitPrice: item.unitPrice,
        subtotal: item.unitPrice * item.cartQty
      })),
      totalAmount: subTotal,
      discount: discount,
      tax: tax,
      netAmount: netAmount,
      paymentMode: paymentMethod,
      // Retail POS collects payment at the counter, so the sale is Paid.
      paymentStatus: 'Paid'
    };

    if (addRetailBill) {
      addRetailBill(newBill);
    }

    setIsSuccess(true);
    setTimeout(() => {
      setCart([]);
      setCustomerName('');
      setPhoneNumber('');
      setIsSuccess(false);
    }, 2000);
  };

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto relative">
      {/* Error Popup */}
      {errorMsg && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-[60] animate-bounce">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium text-sm">{errorMsg}</span>
        </div>
      )}

      {/* Primary Header */}
      <div className="bg-primary rounded-t-xl p-5 flex items-center justify-between text-white shadow-md z-10 relative">
        <div className="flex items-center gap-3">
          <Store className="w-6 h-6" />
          <div>
            <h2 className="text-xl font-bold tracking-tight">Pharmacy POS (Retail)</h2>
            <p className="text-blue-100 text-xs mt-0.5">Direct retail billing for walk-in customers.</p>
          </div>
        </div>
        <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/20">
          <span className="text-white/80 text-sm font-medium mr-2">Total:</span>
          <span className="text-xl font-bold">₹{netAmount.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex-1 bg-slate-50 border-x border-b border-slate-200 rounded-b-xl flex flex-col lg:flex-row overflow-hidden shadow-sm">
        
        {/* Left Column: Input and Cart */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col">
          
          {/* Customer Details Box */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
            <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
               Walk-in Customer Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Customer Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={customerName}
                  // Letters and spaces only.
                  onChange={e => setCustomerName(e.target.value.replace(/[^A-Za-z\s]/g, '').slice(0, 100))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Phone Number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="10-digit mobile number"
                  value={phoneNumber}
                  // Digits only, max 10.
                  onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
                {phoneNumber.length > 0 && phoneNumber.length < 10 && (
                  <p className="text-[11px] text-red-500 mt-1">Enter a valid 10-digit mobile number.</p>
                )}
              </div>
            </div>
          </div>

          {/* Search Medicine */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input 
              type="text"
              placeholder="Search medicines by name or batch..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
            
            {/* Search Results Dropdown */}
            {searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-20 max-h-60 overflow-y-auto">
                {filteredMedicines.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {filteredMedicines.map((med: any) => (
                      <li 
                        key={med.id} 
                        onClick={() => handleAddMedicine(med)}
                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{med.name}</p>
                          <p className="text-xs text-slate-500">Batch: {med.batchNo} | Exp: {new Date(med.expiryDate).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-primary font-extrabold mt-1">₹{med.unitPrice.toFixed(2)}</p>
                          <p className={`text-xs font-medium ${med.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {med.quantity > 0 ? `Stock: ${med.quantity}` : 'Out of Stock'}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-sm text-slate-500">No medicines found.</div>
                )}
              </div>
            )}
          </div>

          {/* Cart Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex-1 flex flex-col shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider w-1/3">Medicine</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">Batch & Exp</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-center">Qty</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right">Price</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right">Total</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-800">{item.name}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-slate-600 text-xs">{item.batchNo}</p>
                        <p className="text-red-500 text-[10px] font-semibold mt-0.5">{item.expiryDate}</p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <input
                          type="number"
                          min="1"
                          max={item.quantity}
                          value={item.cartQty}
                          // Block non-integer characters (e, E, +, -, .).
                          onKeyDown={(e) => ['e', 'E', '+', '-', '.'].includes(e.key) && e.preventDefault()}
                          onChange={(e) => handleUpdateQty(item.id, parseInt(e.target.value) || 1)}
                          className="w-16 text-center border border-slate-200 rounded p-1 text-sm font-semibold focus:outline-none focus:border-primary bg-slate-50"
                        />
                      </td>
                      <td className="px-4 py-4 text-right text-slate-600 font-medium">₹{item.unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-4 text-right font-bold text-primary">₹{(item.unitPrice * item.cartQty).toFixed(2)}</td>
                      <td className="px-4 py-4 text-center">
                        <button 
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center">
                          <Store className="w-12 h-12 mb-3 opacity-20" />
                          <p>Cart is empty. Search and add medicines to begin.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Billing Summary */}
        <div className="w-full lg:w-80 bg-white border-l border-slate-200 p-6 flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3 uppercase tracking-wider">Billing Summary</h3>
          
          <div className="space-y-4 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Sub Total</span>
              <span className="font-bold text-slate-800">₹{subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Discount (%)</span>
              <span className="font-bold text-slate-800">{discount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Tax / GST (5%)</span>
              <span className="font-bold text-slate-800">₹{tax.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="border-t border-dashed border-slate-300 pt-6 pb-6 mt-auto">
            <div className="flex items-end justify-between">
              <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">Net Amount</span>
              <span className="text-2xl font-extrabold text-primary">₹{netAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="mb-4">
            <span className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Payment Method</span>
            <div className="grid grid-cols-3 gap-2">
              {['Cash', 'UPI', 'Card'].map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method as any)}
                  className={`py-2 px-1 text-sm font-bold rounded-lg border transition-all ${
                    paymentMethod === method 
                      ? 'border-primary bg-primary/10 text-primary shadow-sm' 
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleCompleteSale}
            disabled={cart.length === 0 || isSuccess}
            className={`w-full py-4 mt-6 rounded-xl flex items-center justify-center gap-2 font-bold text-white transition-all shadow-md ${
              isSuccess 
                ? 'bg-emerald-500' 
                : cart.length === 0 
                  ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                  : 'bg-primary hover:bg-primary/90 hover:-translate-y-0.5 shadow-primary/20'
            }`}
          >
            {isSuccess ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Sale Completed
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Complete Sale
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
