import { useState, useEffect, useCallback } from 'react';
import { Pill, Plus, Check, Trash2 } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const med = catalogue.find(m => String(m.id) === form.medicineId);
    if (!med || !form.dosage.trim()) {
      toast.error('Select a medicine and enter the dosage');
      return;
    }
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
            <Plus className="w-4 h-4" /> Add Medication
          </button>
        )}
      </div>

      {isAdding && (
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
                <th className="px-3 py-2 font-bold">Medicine</th>
                <th className="px-3 py-2 font-bold">Dosage</th>
                <th className="px-3 py-2 font-bold">Frequency</th>
                <th className="px-3 py-2 font-bold">Route</th>
                {TIME_SLOTS.map(s => <th key={s} className="px-3 py-2 font-bold text-center">{s}</th>)}
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {medications.map(med => (
                <tr key={med.id} className="border-b border-slate-100 hover:bg-slate-50/50">
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
