import { useState } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { medicinesData } from '../../data/medicinesData';
import toast from 'react-hot-toast';

export interface DischargeItem {
  id: string;
  medicineId: number;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  notes: string;
}

interface DischargePrescriptionProps {
  items: DischargeItem[];
  onItemsChange: (items: DischargeItem[]) => void;
  dischargeSummary: string;
  onSummaryChange: (summary: string) => void;
}

export const DischargePrescription = ({
  items,
  onItemsChange,
  dischargeSummary,
  onSummaryChange
}: DischargePrescriptionProps) => {
  const [selectedMedicineId, setSelectedMedicineId] = useState<number | ''>('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once Daily');
  const [duration, setDuration] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const handleAddItem = () => {
    if (!selectedMedicineId || !dosage || !duration || !quantity) {
      toast.error('Please fill in all required fields');
      return;
    }

    const selectedMedicine = medicinesData.find(m => m.id === selectedMedicineId);
    if (!selectedMedicine) {
      toast.error('Medicine not found');
      return;
    }

    const newItem: DischargeItem = {
      id: Date.now().toString(),
      medicineId: selectedMedicineId as number,
      medicineName: `${selectedMedicine.brandName} (${selectedMedicine.strength})`,
      dosage,
      frequency,
      duration,
      quantity: Number(quantity),
      notes
    };

    onItemsChange([...items, newItem]);
    
    // Reset form
    setSelectedMedicineId('');
    setDosage('');
    setFrequency('Once Daily');
    setDuration('');
    setQuantity('');
    setNotes('');
    
    toast.success('Medicine added to discharge prescription');
  };

  const handleRemoveItem = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id));
    toast.success('Medicine removed');
  };

  return (
    <div className="space-y-6">
      {/* Add Medicine Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Add Discharge Medicines</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select Medicine <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedMedicineId}
              onChange={(e) => setSelectedMedicineId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="">-- Select Medicine --</option>
              {medicinesData.filter(m => m.status === 'Active').map(medicine => (
                <option key={medicine.id} value={medicine.id}>
                  {medicine.brandName} - {medicine.genericName} ({medicine.strength})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Dosage <span className="text-red-500">*</span>
            </label>
            <select
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="">-- Select Dosage --</option>
              <option value="1 tablet">1 tablet</option>
              <option value="2 tablets">2 tablets</option>
              <option value="1/2 tablet">1/2 tablet</option>
              <option value="5ml">5ml</option>
              <option value="10ml">10ml</option>
              <option value="15ml">15ml</option>
              <option value="1 injection">1 injection</option>
              <option value="1 drop">1 drop</option>
              <option value="2 drops">2 drops</option>
              <option value="Apply locally">Apply locally</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Frequency <span className="text-red-500">*</span>
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option>Once Daily</option>
              <option>Twice Daily</option>
              <option>Thrice Daily</option>
              <option>Four Times Daily</option>
              <option>Every 4 Hours</option>
              <option>Every 6 Hours</option>
              <option>Every 8 Hours</option>
              <option>Every 12 Hours</option>
              <option>As Needed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Duration <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., 5 days, 2 weeks"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              placeholder="e.g., 10"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Additional Notes
            </label>
            <input
              type="text"
              placeholder="e.g., After food, With water"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        <button
          onClick={handleAddItem}
          className="w-full px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Medicine to Discharge
        </button>
      </div>

      {/* Prescribed Medicines List */}
      {items.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-800">Discharge Medicines List</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Medicine</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Dosage</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Frequency</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Duration</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Qty</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Notes</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-700 font-medium">{item.medicineName}</td>
                    <td className="px-4 py-3 text-slate-600">{item.dosage}</td>
                    <td className="px-4 py-3 text-slate-600">{item.frequency}</td>
                    <td className="px-4 py-3 text-slate-600">{item.duration}</td>
                    <td className="px-4 py-3 text-slate-600">{item.quantity}</td>
                    <td className="px-4 py-3 text-slate-600">{item.notes || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove medicine"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Discharge Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Discharge Summary
        </label>
        <textarea
          value={dischargeSummary}
          onChange={(e) => onSummaryChange(e.target.value)}
          placeholder="Enter discharge summary, diagnosis, treatment provided, follow-up recommendations, etc."
          rows={5}
          className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-medium mb-1">Discharge Instructions:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Add all medicines prescribed for discharge</li>
            <li>Specify frequency and duration for each medicine</li>
            <li>Include any special instructions or precautions</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
