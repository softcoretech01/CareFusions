import { useState, useEffect, useCallback } from 'react';
import { Stethoscope, Plus, Trash2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDoctorSchedules } from '../../contexts/DoctorScheduleContext';
import { lettersOnly, freeText } from '../../utils/inputRules';

const API_BASE = import.meta.env.VITE_API_URL as string;

export interface RoundNote {
  id: string;
  timestamp: string;
  doctorName: string;
  note: string;
}

interface ClinicalRoundsProps {
  /** IPD AdmissionId — round notes are recorded against the admission. */
  patientId: number;
}

export const ClinicalRounds: React.FC<ClinicalRoundsProps> = ({ patientId }) => {
  const { doctorSchedules } = useDoctorSchedules();

  // Round notes live in hospital.IpdClinicalRounds. They were previously held
  // in component state, so they vanished on tab switch or refresh.
  const [notes, setNotes] = useState<RoundNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ doctorName: '', note: '' });
  const [showDocDropdown, setShowDocDropdown] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ipd/admissions/${patientId}/rounds`);
      const data = await res.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('[Rounds] load failed', e);
    }
    setLoading(false);
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.doctorName.trim() || !form.note.trim()) {
      toast.error('Enter both the doctor and the note');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/ipd/admissions/${patientId}/rounds`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorName: form.doctorName.trim(), note: form.note.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Round note added');
      setForm({ doctorName: '', note: '' });
      setIsAdding(false);
      await load();
    } catch (err) {
      console.error('[Rounds] save failed', err);
      toast.error('Failed to save round note');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE}/ipd/rounds/${id}`, { method: 'DELETE' });
      toast.success('Note removed');
      await load();
    } catch (e) {
      console.error('[Rounds] delete failed', e);
      toast.error('Failed to remove note');
    }
  };

  const inputCls = 'w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary" /> Clinical Rounds
        </h3>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)}
            className="px-3 py-1.5 bg-primary/10 text-primary font-bold rounded-lg text-sm flex items-center gap-2 hover:bg-primary hover:text-white transition-colors">
            <Plus className="w-4 h-4" /> Add Note
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
          <div className="relative">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Doctor</label>
            <input 
              value={form.doctorName}
              onChange={e => {
                setForm({ ...form, doctorName: lettersOnly(e.target.value) });
                setShowDocDropdown(true);
              }}
              onFocus={() => setShowDocDropdown(true)}
              onBlur={() => setShowDocDropdown(false)}
              placeholder="Select or type a doctor" 
              className={inputCls} 
            />
            {showDocDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto overflow-x-hidden">
                {doctorSchedules
                  .filter((d: any) => (d.doctorName || d.name).toLowerCase().includes(form.doctorName.toLowerCase()))
                  .map((d: any) => (
                  <div 
                    key={d.id ?? d.doctorId} 
                    className="px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary/5 hover:text-primary cursor-pointer transition-colors"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent onBlur firing before click
                      setForm({ ...form, doctorName: d.doctorName || d.name });
                      setShowDocDropdown(false);
                    }}
                  >
                    {d.doctorName || d.name}
                  </div>
                ))}
                {doctorSchedules.filter((d: any) => (d.doctorName || d.name).toLowerCase().includes(form.doctorName.toLowerCase())).length === 0 && (
                  <div className="px-3 py-2 text-sm text-slate-500 italic">No matches... (Will use typed name)</div>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Round Note</label>
            <textarea rows={3} value={form.note}
              onChange={e => setForm({ ...form, note: freeText(e.target.value, 1000) })}
              placeholder="Findings, plan, instructions…" className={inputCls} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setIsAdding(false); setForm({ doctorName: '', note: '' }); }}
              className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-3 py-1.5 bg-primary text-white font-bold rounded-lg text-sm hover:bg-primary/90 disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Note'}
            </button>
          </div>
        </form>
      )}

      {notes.length === 0 ? (
        <div className="text-center py-8 text-slate-400 font-medium">
          <Stethoscope className="w-8 h-8 mx-auto text-slate-200 mb-2" />
          {loading ? 'Loading rounds…' : 'No round notes recorded for this admission yet.'}
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map(n => (
            <div key={n.id} className="border border-slate-100 rounded-xl p-3 hover:bg-slate-50/60 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{n.doctorName}</p>
                    <p className="text-[11px] text-slate-500">
                      {new Date(n.timestamp).toLocaleString('en-GB', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <button onClick={() => handleDelete(n.id)} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{n.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
