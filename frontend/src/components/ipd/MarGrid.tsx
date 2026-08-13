import { useState, useEffect } from 'react';
import { Pill, Plus, Check, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface MasterMedicine {
  id: number;
  brandName: string;
  genericName: string;
  status: string;
}

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
  patientId: number; // AdmissionId
}

const API_BASE = import.meta.env.VITE_API_URL as string;

export const MarGrid: React.FC<MarGridProps> = ({ patientId }) => {
  const [medications, setMedications] = useState<MarMedication[]>([]);
  const [medicines, setMedicines] = useState<MasterMedicine[]>([]);   // from /medicines master
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    medicineId: '',
    dosage: '',
    frequency: 'OD',
    route: 'Oral'
  });


  const fetchMedications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ipd-visits/${patientId}/details`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.medications) {
          const mapped = data.medications.map((m: any) => ({
            id: String(m.MedicationId),
            medicineId: m.MedicineId || m.MedicationId,
            medicineName: m.MedicineName,
            dosage: m.Dosage,
            frequency: m.Frequency,
            route: m.Route,
            administrations: m.Administrations || {}
          }));
          setMedications(mapped);
        }
      }
    } catch (e) {
      toast.error('Failed to load medications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, [patientId]);

  // Medicine dropdown comes from the Medicine master (Active only).
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/medicines/`);
        if (res.ok) {
          const data = await res.json();
          setMedicines((Array.isArray(data) ? data : []).filter((m: MasterMedicine) => m.status === 'Active'));
        }
      } catch { /* offline — dropdown just shows no options */ }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.medicineId || !formData.dosage) {
      toast.error('Please fill all required fields');
      return;
    }

    const med = medicines.find(m => m.id === Number(formData.medicineId));
    if (!med) return;

    // A brand-new MAR entry has no administrations yet. Crucially we must NOT
    // send `administrations` here: the backend treats a present administrations
    // object as an "update the admin checkboxes on an existing med" call, so an
    // empty {} made the new medication silently not insert.
    const payload = {
      admissionId: patientId,
      medication: {
        medicineId: med.id,
        medicineName: med.brandName,
        dosage: formData.dosage,
        frequency: formData.frequency,
        route: formData.route,
      }
    };

    try {
      const res = await fetch(`${API_BASE}/ipd-visits/save-clinical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success('Medication added to MAR');
        setIsAdding(false);
        setFormData({ medicineId: '', dosage: '', frequency: 'OD', route: 'Oral' });
        fetchMedications();
      } else {
        toast.error('Failed to add medication');
      }
    } catch (e) {
      toast.error('Failed to add medication');
    }
  };

  const toggleAdministration = async (medId: string, medicineId: number, slot: string) => {
    const med = medications.find(m => m.id === medId);
    if (!med) return;

    const newAdmin = { ...med.administrations, [slot]: !med.administrations[slot] };

    setMedications(meds => meds.map(m => {
      if (m.id === medId) {
        return { ...m, administrations: newAdmin };
      }
      return m;
    }));

    const payload = {
      admissionId: patientId,
      medication: {
        medicineId: medicineId,
        medicineName: med.medicineName,
        dosage: med.dosage,
        frequency: med.frequency,
        route: med.route,
        administrations: newAdmin
      }
    };

    try {
      await fetch(`${API_BASE}/ipd-visits/save-clinical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      toast.error('Failed to sync administration');
    }
  };

  // Delete removes the row from hospital.IpdMedication by MedicationId — the same
  // table save-clinical writes to — so a med added here can also be removed here.
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/ipd/medications/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Medication removed');
      fetchMedications();
    } catch (e) {
      console.error('[MAR] delete failed', e);
      toast.error('Failed to remove medication');
    }
  };

  const timeSlots = ['Morning', 'Afternoon', 'Evening', 'Night'];
  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white';

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <Pill className="w-5 h-5 text-primary" /> Medication Administration Record (MAR)
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
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <h4 className="font-bold text-slate-800 mb-3">Add to MAR</h4>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Medication</label>
                <select required value={formData.medicineId} onChange={e => setFormData({ ...formData, medicineId: e.target.value })} className={inputCls}>
                  <option value="">Select Medicine</option>
                  {medicines.length === 0 && <option value="" disabled>No medicines in the Pharmacy master</option>}
                  {medicines.map(m => (
                    <option key={m.id} value={m.id}>{m.brandName} ({m.genericName})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dosage</label>
                <input required type="text" placeholder="e.g. 500mg" value={formData.dosage} onChange={e => setFormData({ ...formData, dosage: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Frequency</label>
                <select value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value })} className={inputCls}>
                  <option value="OD">OD (Once daily)</option>
                  <option value="BD">BD (Twice daily)</option>
                  <option value="TDS">TDS (Thrice daily)</option>
                  <option value="QID">QID (Four times daily)</option>
                  <option value="SOS">SOS (As needed)</option>
                  <option value="STAT">STAT (Immediately)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Route</label>
                <select value={formData.route} onChange={e => setFormData({ ...formData, route: e.target.value })} className={inputCls}>
                  <option value="Oral">Oral</option>
                  <option value="IV">IV</option>
                  <option value="IM">IM</option>
                  <option value="SC">Subcutaneous</option>
                  <option value="Topical">Topical</option>
                  <option value="Drops">Drops</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-300 transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary/90 transition-colors">Save to MAR</button>
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
                <th className="px-4 py-3 font-bold">Dose/Route</th>
                <th className="px-4 py-3 font-bold">Freq</th>
                {timeSlots.map(slot => (
                  <th key={slot} className="px-2 py-3 font-bold text-center w-24">{slot}</th>
                ))}
                <th className="px-2 py-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {medications.map(med => (
                <tr key={med.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-800">{med.medicineName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{med.dosage}</span>
                    <span className="text-slate-400 ml-1">({med.route})</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      {med.frequency}
                    </span>
                  </td>
                  {timeSlots.map(slot => {
                    const isGiven = med.administrations?.[slot];
                    return (
                      <td key={slot} className="px-2 py-3 text-center">
                        <button
                          onClick={() => toggleAdministration(med.id, med.medicineId, slot)}
                          className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center transition-colors border ${
                            isGiven
                              ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm'
                              : 'bg-white border-slate-200 text-slate-300 hover:border-emerald-300 hover:text-emerald-400'
                          }`}
                          title={isGiven ? `Given in ${slot}` : `Mark given in ${slot}`}
                        >
                          {isGiven && <Check className="w-5 h-5" />}
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-2 py-3 text-right">
                    <button
                      onClick={() => handleDelete(med.id)}
                      title="Remove medication"
                      className="text-red-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
