import { useState } from 'react';
import { Plus } from 'lucide-react';
import { usePharmacyBilling } from '../../contexts/PharmacyBillingContext';
import { Button } from '../ui/Button';

export const BillItemSelector = () => {
  const { medicines, addItemToBill } = usePharmacyBilling();
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMedicines = medicines.filter(
    m => 
      m.quantity > 0 && 
      (m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
       m.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAdd = () => {
    if (!selectedMedicineId) {
      alert('Please select a medicine');
      return;
    }
    if (quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }
    
    addItemToBill(selectedMedicineId, quantity);
    setSelectedMedicineId('');
    setQuantity(1);
    setSearchQuery('');
  };

  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
      <h4 className="text-sm font-bold text-slate-800 mb-3">Add Medicine to Bill</h4>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-5">
          <label className="block text-xs font-medium text-slate-600 mb-1">Search & Select Medicine</label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Type to search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-t-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            {searchQuery && (
              <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-b-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredMedicines.length > 0 ? (
                  filteredMedicines.map(m => (
                    <div 
                      key={m.id} 
                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 ${selectedMedicineId === m.id ? 'bg-primary/10' : ''}`}
                      onClick={() => setSelectedMedicineId(m.id)}
                    >
                      <div className="font-medium text-slate-800">{m.name}</div>
                      <div className="text-xs text-slate-500">Stock: {m.quantity} | ₹{m.unitPrice.toFixed(2)}</div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-slate-500">No medicines found</div>
                )}
              </div>
            )}
            {!searchQuery && selectedMedicineId && (
              <div className="mt-1 text-sm font-medium text-primary">
                Selected: {medicines.find(m => m.id === selectedMedicineId)?.name}
              </div>
            )}
          </div>
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-slate-600 mb-1">Quantity</label>
          <input 
            type="number" 
            min="1" 
            value={quantity} 
            onChange={(e) => setQuantity(Number(e.target.value))} 
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <div className="md:col-span-4">
          <Button variant="filled" color="primary" onClick={handleAdd} icon={Plus} className="w-full justify-center">
            Add to Bill
          </Button>
        </div>
      </div>
    </div>
  );
};
