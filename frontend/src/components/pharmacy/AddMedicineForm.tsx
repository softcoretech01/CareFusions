import { useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Medicine } from '../../contexts/PharmacyBillingContext';

interface AddMedicineFormProps {
  onSave: (medicine: Omit<Medicine, 'id'>) => void;
  onCancel: () => void;
}

const emptyData: Omit<Medicine, 'id'> = {
  name: '',
  category: '',
  batchNo: '',
  quantity: 0,
  unitPrice: 0,
  expiryDate: '',
  manufacturer: '',
  minStockLevel: 0
};

export const AddMedicineForm = ({ onSave, onCancel }: AddMedicineFormProps) => {
  const [formData, setFormData] = useState<Omit<Medicine, 'id'>>(emptyData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.category.trim()) newErrors.category = 'Category is required';
    if (!formData.batchNo.trim()) newErrors.batchNo = 'Batch No is required';
    if (formData.quantity < 0) newErrors.quantity = 'Quantity cannot be negative';
    if (formData.unitPrice <= 0) newErrors.unitPrice = 'Price must be greater than zero';
    if (!formData.expiryDate) newErrors.expiryDate = 'Expiry Date is required';
    else if (new Date(formData.expiryDate) < new Date()) newErrors.expiryDate = 'Cannot be past date';
    if (!formData.manufacturer.trim()) newErrors.manufacturer = 'Manufacturer is required';
    if (formData.minStockLevel < 0) newErrors.minStockLevel = 'Min Stock Level cannot be negative';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <section>
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Medicine Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Medicine Name <span className="text-red-500">*</span></label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.name ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category <span className="text-red-500">*</span></label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.category ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`}>
                <option value="">Select Category</option>
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Injection">Injection</option>
                <option value="Ointment">Ointment</option>
                <option value="Drops">Drops</option>
              </select>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Batch No <span className="text-red-500">*</span></label>
              <input type="text" value={formData.batchNo} onChange={e => setFormData({...formData, batchNo: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.batchNo ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
              {errors.batchNo && <p className="text-red-500 text-xs mt-1">{errors.batchNo}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity <span className="text-red-500">*</span></label>
              <input type="number" min="0" value={formData.quantity || ''} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.quantity ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
              {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Stock Level <span className="text-red-500">*</span></label>
              <input type="number" min="0" value={formData.minStockLevel || ''} onChange={e => setFormData({...formData, minStockLevel: Number(e.target.value)})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.minStockLevel ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
              {errors.minStockLevel && <p className="text-red-500 text-xs mt-1">{errors.minStockLevel}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit Price (₹) <span className="text-red-500">*</span></label>
              <input type="number" min="0" step="0.01" value={formData.unitPrice || ''} onChange={e => setFormData({...formData, unitPrice: Number(e.target.value)})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.unitPrice ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
              {errors.unitPrice && <p className="text-red-500 text-xs mt-1">{errors.unitPrice}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date <span className="text-red-500">*</span></label>
              <input type="date" value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.expiryDate ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
              {errors.expiryDate && <p className="text-red-500 text-xs mt-1">{errors.expiryDate}</p>}
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Manufacturer <span className="text-red-500">*</span></label>
              <input type="text" value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} className={`w-full px-4 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${errors.manufacturer ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20'}`} />
              {errors.manufacturer && <p className="text-red-500 text-xs mt-1">{errors.manufacturer}</p>}
            </div>
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
        <Button variant="outline" color="secondary" onClick={() => setFormData(emptyData)} icon={RefreshCw}>
          Reset
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" color="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="filled" color="primary" onClick={handleSave} icon={Save}>
            Save Medicine
          </Button>
        </div>
      </div>
    </div>
  );
};
