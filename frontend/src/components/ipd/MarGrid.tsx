<<<<<<< HEAD
import { useState, useEffect, useCallback } from 'react';
import { Pill, Plus, Check, Trash2 } from 'lucide-react';
=======
import { useState, useEffect } from 'react';
import { Pill, Plus, Check, Loader2 } from 'lucide-react';
import { medicinesData } from '../../data/medicinesData';
>>>>>>> origin/main
import toast from 'react-hot-toast';
import { freeText } from '../../utils/inputRules';

const API_BASE = import.meta.env.VITE_API_URL as string;

export interface MarMedication {
  id: string;
  medicineId: number | null;
  medicineName: string;
  dosage: string;
  frequency: string;
  route: string;
  administrations: Record<string, boolean>;
}

interface MasterMedicine {
  id: number;
  brandName: string;
  genericName: string;
  strength: string;
}

interface MarGridProps {
<<<<<<< HEAD
  /** IPD AdmissionId — the MAR is recorded against the admission. */
  patientId: number;
}

const TIME_SLOTS = ['Morning', 'Afternoon', 'Evening', 'Night'];
const FREQUENCIES = ['Once Daily', 'Twice Daily', 'Three Times Daily', 'Four Times Daily', 'SOS'];
const ROUTES = ['Oral', 'IV', 'IM', 'Subcutaneous', 'Topical', 'Inhalation'];

export const MarGrid: React.FC<MarGridProps> = ({ patientId }) => {
  // The MAR lives in hospital.IpdMedication and the drug list comes from the
  // real medicine master. Previously both were in-memory: medications were
  // component state and the picker read a hardcoded mock file.
  const [medications, setMedications] = useState<MarMedication[]>([]);
  const [catalogue, setCatalogue] = useState<MasterMedicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ medicineId: '', dosage: '', frequency: 'Once Daily', route: 'Oral' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meds, cat] = await Promise.all([
        fetch(`${API_BASE}/ipd/admissions/${patientId}/medications`).then(r => r.json()),
        fetch(`${API_BASE}/medicines/`).then(r => r.json()),
      ]);
      setMedications(Array.isArray(meds) ? meds : []);
      setCatalogue(Array.isArray(cat) ? cat : []);
    } catch (e) {
      console.error('[MAR] load failed', e);
    }
    setLoading(false);
  }, [patientId]);

  useEffect(() => { load(); }, [load]);
=======
  patientId: number; // AdmissionId
}

const API_BASE = import.meta.env.VITE_API_URL as string;

export const MarGrid: React.FC<MarGridProps> = ({ patientId }) => {
  const [medications, setMedications] = useState<MarMedication[]>([]);
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
>>>>>>> origin/main

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const med = catalogue.find(m => String(m.id) === form.medicineId);
    if (!med || !form.dosage.trim()) {
      toast.error('Select a medicine and enter the dosage');
      return;
    }
<<<<<<< HEAD
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/ipd/admissions/${patientId}/medications`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicineId: med.id,
          medicineName: `${med.brandName}${med.strength ? ` (${med.strength})` : ''}`,
          dosage: form.dosage.trim(),
          frequency: form.frequency,
          route: form.route,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Medication added to the chart');
      setForm({ medicineId: '', dosage: '', frequency: 'Once Daily', route: 'Oral' });
      setIsAdding(false);
      await load();
    } catch (err) {
      console.error('[MAR] save failed', err);
      toast.error('Failed to add medication');
    }
    setSaving(false);
  };

  // Toggling a slot persists immediately — a given dose must survive a refresh.
  const toggleSlot = async (med: MarMedication, slot: string) => {
    const next = { ...med.administrations, [slot]: !med.administrations[slot] };
    setMedications(prev => prev.map(m => (m.id === med.id ? { ...m, administrations: next } : m)));
    try {
      await fetch(`${API_BASE}/ipd/medications/${med.id}/administer`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ administrations: next }),
      });
      if (next[slot]) toast.success(`${slot} dose recorded`);
    } catch (e) {
      console.error('[MAR] administer failed', e);
      toast.error('Failed to record the dose');
      await load();
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE}/ipd/medications/${id}`, { method: 'DELETE' });
      toast.success('Medication removed');
      await load();
    } catch (e) {
      console.error('[MAR] delete failed', e);
      toast.error('Failed to remove medication');
    }
  };

  const inputCls = 'w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Pill className="w-5 h-5 text-primary" /> Medication Administration Record
        </h3>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)}
            className="px-3 py-1.5 bg-primary/10 text-primary font-bold rounded-lg text-sm flex items-center gap-2 hover:bg-primary hover:text-white transition-colors">
=======

    const med = medicinesData.find(m => m.id === Number(formData.medicineId));
    if (!med) return;
    
    const payload = {
      admissionId: patientId,
      medication: {
        medicineId: med.id,
        medicineName: med.name,
        dosage: formData.dosage,
        frequency: formData.frequency,
        route: formData.route,
        administrations: {}
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
>>>>>>> origin/main
            <Plus className="w-4 h-4" /> Add Medication
          </button>
        )}
      </div>

      {isAdding && (
<<<<<<< HEAD
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Medicine *</label>
              <select value={form.medicineId} onChange={e => setForm({ ...form, medicineId: e.target.value })}
                className={inputCls}>
                <option value="">Select medicine…</option>
                {catalogue.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.brandName}{m.strength ? ` (${m.strength})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dosage *</label>
              <input type="text" placeholder="1 tablet" value={form.dosage} maxLength={50}
                onChange={e => setForm({ ...form, dosage: freeText(e.target.value, 50) })}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Frequency</label>
              <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}
                className={inputCls}>
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Route</label>
              <select value={form.route} onChange={e => setForm({ ...form, route: e.target.value })}
                className={inputCls}>
                {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          {catalogue.length === 0 && !loading && (
            <p className="text-[11px] text-amber-700 mb-2">
              No medicines in the master yet — add them under Admin → Masters → Medicine.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-3 py-1.5 bg-primary text-white font-bold rounded-lg text-sm hover:bg-primary/90 disabled:opacity-60">
              {saving ? 'Saving…' : 'Add to Chart'}
            </button>
          </div>
        </form>
=======
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <h4 className="font-bold text-slate-800 mb-3">Add to MAR</h4>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Medication</label>
                <select required value={formData.medicineId} onChange={e => setFormData({ ...formData, medicineId: e.target.value })} className={inputCls}>
                  <option value="">Select Medicine</option>
                  {medicinesData.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.genericName})</option>
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
>>>>>>> origin/main
      )}

      {medications.length === 0 ? (
        <div className="text-center py-8 text-slate-400 font-medium">
          <Pill className="w-8 h-8 mx-auto text-slate-200 mb-2" />
          {loading ? 'Loading medication chart…' : 'No medications charted for this admission yet.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
<<<<<<< HEAD
                <th className="px-3 py-2 font-bold">Medicine</th>
                <th className="px-3 py-2 font-bold">Dosage</th>
                <th className="px-3 py-2 font-bold">Frequency</th>
                <th className="px-3 py-2 font-bold">Route</th>
                {TIME_SLOTS.map(s => <th key={s} className="px-3 py-2 font-bold text-center">{s}</th>)}
                <th className="px-3 py-2 text-right">Action</th>
=======
                <th className="px-4 py-3 font-bold">Medication</th>
                <th className="px-4 py-3 font-bold">Dose/Route</th>
                <th className="px-4 py-3 font-bold">Freq</th>
                {timeSlots.map(slot => (
                  <th key={slot} className="px-2 py-3 font-bold text-center w-24">{slot}</th>
                ))}
>>>>>>> origin/main
              </tr>
            </thead>
            <tbody>
              {medications.map(med => (
                <tr key={med.id} className="border-b border-slate-100 hover:bg-slate-50/50">
<<<<<<< HEAD
                  <td className="px-3 py-2 font-medium text-slate-800">{med.medicineName}</td>
                  <td className="px-3 py-2">{med.dosage}</td>
                  <td className="px-3 py-2">{med.frequency}</td>
                  <td className="px-3 py-2">{med.route}</td>
                  {TIME_SLOTS.map(slot => {
                    const given = !!med.administrations[slot];
                    return (
                      <td key={slot} className="px-3 py-2 text-center">
                        <button onClick={() => toggleSlot(med, slot)}
                          title={given ? `${slot} dose given — click to undo` : `Mark ${slot} dose as given`}
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center mx-auto transition-colors ${
                            given ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-slate-300 text-transparent hover:border-primary hover:text-primary/40'
                          }`}>
                          <Check className="w-4 h-4" />
                        </button>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => handleDelete(med.id)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
=======
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
>>>>>>> origin/main
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
