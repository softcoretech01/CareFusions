import { useState, useEffect, useCallback } from 'react';
import { Activity, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { digitsOnly, decimalOnly, freeText, LIMITS } from '../../utils/inputRules';

const API_BASE = import.meta.env.VITE_API_URL as string;

export interface VitalsEntry {
  id: string;
  timestamp: string;
  temperature: string;
  pulse: string;
  bloodPressure: string;
  respiratoryRate: string;
  spO2: string;
  notes: string;
  recordedBy?: string;
}

interface NursingFlowsheetProps {
  /** IPD AdmissionId — vitals are recorded against the admission. */
  patientId: number;
}

const EMPTY = {
  temperature: '', pulse: '', bloodPressure: '', respiratoryRate: '', spO2: '', notes: '',
};

export const NursingFlowsheet: React.FC<NursingFlowsheetProps> = ({ patientId }) => {
  // Vitals live in hospital.IpdVitals. They were previously kept in
  // localStorage, so they were browser-local and invisible to anyone else.
  const [entries, setEntries] = useState<VitalsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ipd/admissions/${patientId}/vitals`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('[Flowsheet] load failed', e);
    }
    setLoading(false);
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.temperature && !form.pulse && !form.bloodPressure && !form.respiratoryRate && !form.spO2) {
      toast.error('Record at least one vital sign');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/ipd/admissions/${patientId}/vitals`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, recordedBy: 'Nurse' }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Vitals recorded');
      setForm(EMPTY);
      setIsAdding(false);
      await load();
    } catch (err) {
      console.error('[Flowsheet] save failed', err);
      toast.error('Failed to save vitals');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE}/ipd/vitals/${id}`, { method: 'DELETE' });
      toast.success('Entry removed');
      await load();
    } catch (e) {
      console.error('[Flowsheet] delete failed', e);
      toast.error('Failed to remove entry');
    }
  };

  const inputCls = 'w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" /> Nursing Flowsheet
        </h3>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)}
            className="px-3 py-1.5 bg-primary/10 text-primary font-bold rounded-lg text-sm flex items-center gap-2 hover:bg-primary hover:text-white transition-colors">
            <Plus className="w-4 h-4" /> Add Vitals
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Temp</label>
                <input type="text" inputMode="decimal" placeholder="98.6" value={form.temperature}
                  onChange={e => setForm({ ...form, temperature: decimalOnly(e.target.value, 6) })}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pulse</label>
                <input type="text" inputMode="numeric" placeholder="82" value={form.pulse}
                  onChange={e => setForm({ ...form, pulse: digitsOnly(e.target.value, 3) })}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">BP</label>
                <input type="text" placeholder="120/80" value={form.bloodPressure}
                  onChange={e => setForm({ ...form, bloodPressure: e.target.value.replace(/[^\d/]/g, '').slice(0, 7) })}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RR</label>
                <input type="text" inputMode="numeric" placeholder="16" value={form.respiratoryRate}
                  onChange={e => setForm({ ...form, respiratoryRate: digitsOnly(e.target.value, 3) })}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SpO2</label>
                <input type="text" inputMode="numeric" placeholder="98" value={form.spO2}
                  onChange={e => setForm({ ...form, spO2: digitsOnly(e.target.value, 3) })}
                  className={inputCls} />
              </div>
            </div>
            <div className="mb-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
              <input type="text" placeholder="Observations, intake/output, etc." value={form.notes}
                maxLength={LIMITS.notes}
                onChange={e => setForm({ ...form, notes: freeText(e.target.value, LIMITS.notes) })}
                className={inputCls} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setIsAdding(false); setForm(EMPTY); }}
                className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-3 py-1.5 bg-primary text-white font-bold rounded-lg text-sm hover:bg-primary/90 disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Entry'}
              </button>
            </div>
          </form>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-8 text-slate-400 font-medium">
          <Activity className="w-8 h-8 mx-auto text-slate-200 mb-2" />
          {loading ? 'Loading vitals…' : 'No vitals recorded for this admission yet.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2 font-bold">Date</th>
                <th className="px-3 py-2 font-bold">Time</th>
                <th className="px-3 py-2 font-bold">Temp</th>
                <th className="px-3 py-2 font-bold">Pulse</th>
                <th className="px-3 py-2 font-bold">BP</th>
                <th className="px-3 py-2 font-bold">RR</th>
                <th className="px-3 py-2 font-bold">SpO2</th>
                <th className="px-3 py-2 font-bold">Notes</th>
                <th className="px-3 py-2 font-bold">By</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-3 py-2">{entry.temperature || '-'}</td>
                  <td className="px-3 py-2">{entry.pulse || '-'}</td>
                  <td className="px-3 py-2">{entry.bloodPressure || '-'}</td>
                  <td className="px-3 py-2">{entry.respiratoryRate || '-'}</td>
                  <td className="px-3 py-2">{entry.spO2 || '-'}</td>
                  <td className="px-3 py-2 text-slate-500">{entry.notes || '-'}</td>
                  <td className="px-3 py-2 text-slate-500 text-xs">{entry.recordedBy || '-'}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => handleDelete(entry.id)} className="text-red-400 hover:text-red-600 p-1">
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
