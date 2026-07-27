import { useState } from 'react';
import { Pill, Plus, Check } from 'lucide-react';
import { medicinesData } from '../../data/medicinesData';
import toast from 'react-hot-toast';

export interface MarMedication {
  id: string;
  medicineId: number;
  medicineName: string;
  dosage: string;
  frequency: string;
  route: string;
  administrations: Record<string, boolean>; // e.g. "Morning": true
}

interface MarGridProps {
  patientId: number;
}

export const MarGrid: React.FC<MarGridProps> = () => {
  const [medications, setMedications] = useState<MarMedication[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    medicineId: '',
    dosage: '',
    frequency: 'Once Daily',
    route: 'Oral'
  });

  const timeSlots = ['Morning', 'Afternoon', 'Evening', 'Night'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.medicineId || !formData.dosage) {
      toast.error('Please fill all required fields');
      return;
    }

    const med = medicinesData.find(m => m.id === Number(formData.medicineId));
    if (!med) return;

    const newMed: MarMedication = {
      id: Date.now().toString(),
      medicineId: med.id,
      medicineName: `${med.brandName} (${med.strength})`,
      dosage: formData.dosage,
      frequency: formData.frequency,
      route: formData.route,
      administrations: {}
    };

    setMedications([...medications, newMed]);
    setIsAdding(false);
    setFormData({ medicineId: '', dosage: '', frequency: 'Once Daily', route: 'Oral' });
    toast.success('Medication added to MAR');
  };

  const toggleAdministration = (medId: string, slot: string) => {
    setMedications(meds => meds.map(med => {
      if (med.id === medId) {
        const currentlyAdministered = !!med.administrations[slot];
        return {
          ...med,
          administrations: {
            ...med.administrations,
            [slot]: !currentlyAdministered
          }
        };
      }
      return med;
    }));
    toast.success('Administration logged');
  };

  const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2">
          <Pill className="w-5 h-5 text-primary" /> MAR (Medications)
        </h3>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-primary/10 text-primary font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-primary hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Medication
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
          <h4 className="font-bold text-slate-800 mb-4">Prescribe Medication</h4>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Medicine <span className="text-red-500">*</span></label>
              <select 
                value={formData.medicineId}
                onChange={e => setFormData({...formData, medicineId: e.target.value})}
                className={inputCls}
              >
                <option value="">-- Select Medicine --</option>
                {medicinesData.map(m => (
                  <option key={m.id} value={m.id}>{m.brandName} - {m.genericName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dosage <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                placeholder="e.g. 1 Tablet, 5ml" 
                value={formData.dosage} 
                onChange={e => setFormData({...formData, dosage: e.target.value})} 
                className={inputCls} 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Frequency</label>
              <select 
                value={formData.frequency}
                onChange={e => setFormData({...formData, frequency: e.target.value})}
                className={inputCls}
              >
                <option>Once Daily</option>
                <option>Twice Daily (BD)</option>
                <option>Thrice Daily (TDS)</option>
                <option>Four Times Daily (QID)</option>
                <option>SOS (As Needed)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Route</label>
              <select 
                value={formData.route}
                onChange={e => setFormData({...formData, route: e.target.value})}
                className={inputCls}
              >
                <option>Oral</option>
                <option>IV (Intravenous)</option>
                <option>IM (Intramuscular)</option>
                <option>SC (Subcutaneous)</option>
                <option>Topical</option>
                <option>Inhalation</option>
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-300 transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary/90 transition-colors">Add to MAR</button>
            </div>
          </form>
        </div>
      )}

      {medications.length === 0 ? (
        <div className="text-center py-12 text-slate-400 font-medium">
          <Pill className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          No active medications for this patient.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold">Medication</th>
                <th className="px-4 py-3 font-bold">Instructions</th>
                {timeSlots.map(slot => (
                  <th key={slot} className="px-4 py-3 font-bold text-center">{slot}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {medications.map(med => (
                <tr key={med.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-800">{med.medicineName}</p>
                    <p className="text-xs text-slate-500">{med.route}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-700">{med.dosage}</p>
                    <p className="text-xs text-slate-500">{med.frequency}</p>
                  </td>
                  {timeSlots.map(slot => (
                    <td key={slot} className="px-4 py-4 text-center">
                      <button 
                        onClick={() => toggleAdministration(med.id, slot)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-colors ${
                          med.administrations[slot] 
                            ? 'bg-green-100 text-green-600 border border-green-200' 
                            : 'bg-white text-slate-300 border border-slate-200 hover:border-primary hover:text-primary'
                        }`}
                      >
                        {med.administrations[slot] && <Check className="w-4 h-4" />}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
