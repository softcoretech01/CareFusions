import { useState, useEffect } from 'react';
import { Activity, Plus, Trash2, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export interface VitalsEntry {
  id: string;
  timestamp: string;
  temperature: string;
  pulse: string;
  bloodPressure: string;
  respiratoryRate: string;
  spO2: string;
  notes: string;
}

interface NursingFlowsheetProps {
  patientId: number; // This is the AdmissionId
}

const API_BASE = import.meta.env.VITE_API_URL as string;

export const NursingFlowsheet: React.FC<NursingFlowsheetProps> = ({ patientId }) => {
  const [entries, setEntries] = useState<VitalsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    temperature: '',
    pulse: '',
    bloodPressure: '',
    respiratoryRate: '',
    spO2: '',
    notes: '',
  });

  const fetchVitals = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ipd-visits/${patientId}/details`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.vitals) {
          const mapped = data.vitals.map((v: any) => ({
            id: String(v.VitalsId),
            timestamp: v.RecordedAt,
            temperature: v.Temperature || '',
            pulse: v.Pulse || '',
            bloodPressure: v.BloodPressure || '',
            respiratoryRate: v.RespiratoryRate || '',
            spO2: v.SpO2 || '',
            notes: v.Notes || ''
          }));
          setEntries(mapped);
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load vitals');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVitals();
  }, [patientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.temperature && !formData.pulse && !formData.bloodPressure && !formData.respiratoryRate && !formData.spO2) {
      toast.error('Please enter at least one vital sign');
      return;
    }
    
    const payload = {
      admissionId: patientId,
      vitals: formData
    };

    try {
      const res = await fetch(`${API_BASE}/ipd-visits/save-clinical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success('Vitals entry added');
        setIsAdding(false);
        setFormData({ temperature: '', pulse: '', bloodPressure: '', respiratoryRate: '', spO2: '', notes: '' });
        fetchVitals();
      } else {
        toast.error('Failed to save vitals');
      }
    } catch (e) {
      toast.error('Failed to save vitals');
    }
  };

  const handleDelete = (id: string) => {
    // We do not have a delete API currently mapped. 
    // Usually clinical records are immutable, so we just remove locally for now 
    // or ideally don't allow delete. I'll just remove it from state to match original behavior.
    setEntries(entries.filter(e => e.id !== id));
    if (selectedId === id) setSelectedId(null);
    toast.success('Vitals entry removed locally');
  };

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20';
  const shown = selectedId ? entries.filter(e => e.id === selectedId) : entries;

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" /> Nursing Flowsheet
        </h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-primary/10 text-primary font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-primary hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Vitals Entry
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <h4 className="font-bold text-slate-800 mb-3">New Vitals Entry</h4>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Temp (°F/°C)</label>
                <input type="text" placeholder="e.g. 98.6" value={formData.temperature} onChange={e => setFormData({ ...formData, temperature: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pulse (bpm)</label>
                <input type="text" placeholder="e.g. 82" value={formData.pulse} onChange={e => setFormData({ ...formData, pulse: e.target.value.replace(/[^\d]/g, '').slice(0, 3) })} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">BP (mmHg)</label>
                <input type="text" placeholder="e.g. 120/80" value={formData.bloodPressure} onChange={e => setFormData({ ...formData, bloodPressure: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RR (bpm)</label>
                <input type="text" placeholder="e.g. 16" value={formData.respiratoryRate} onChange={e => setFormData({ ...formData, respiratoryRate: e.target.value.replace(/[^\d]/g, '').slice(0, 3) })} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SpO2 (%)</label>
                <input type="text" placeholder="e.g. 98" value={formData.spO2} onChange={e => setFormData({ ...formData, spO2: e.target.value.replace(/[^\d]/g, '').slice(0, 3) })} className={inputCls} />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nursing Notes</label>
              <input type="text" placeholder="Observations, inputs/outputs, etc." value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className={inputCls} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-300 transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary/90 transition-colors">Save Entry</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: History timeline */}
        <div className="lg:col-span-1 border border-slate-100 rounded-2xl bg-slate-50/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">History</h4>
            {selectedId && (
              <button onClick={() => setSelectedId(null)} className="text-[11px] text-primary font-semibold">Show all</button>
            )}
          </div>
          {entries.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No history yet.</p>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {entries.map(entry => {
                const active = selectedId === entry.id;
                return (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedId(active ? null : entry.id)}
                    className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${
                      active ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">{new Date(entry.timestamp).toLocaleDateString()}</span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      T {entry.temperature || '-'} · P {entry.pulse || '-'} · BP {entry.bloodPressure || '-'} · SpO2 {entry.spO2 || '-'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: detail table */}
        <div className="lg:col-span-2">
          {entries.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-medium">
              <Activity className="w-12 h-12 mx-auto text-slate-200 mb-3" />
              No flowsheet entries recorded yet for this shift.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 font-bold">Time</th>
                    <th className="px-3 py-2 font-bold">Temp</th>
                    <th className="px-3 py-2 font-bold">Pulse</th>
                    <th className="px-3 py-2 font-bold">BP</th>
                    <th className="px-3 py-2 font-bold">RR</th>
                    <th className="px-3 py-2 font-bold">SpO2</th>
                    <th className="px-3 py-2 font-bold">Notes</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map(entry => (
                    <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-2">{entry.temperature || '-'}</td>
                      <td className="px-3 py-2">{entry.pulse || '-'}</td>
                      <td className="px-3 py-2">{entry.bloodPressure || '-'}</td>
                      <td className="px-3 py-2">{entry.respiratoryRate || '-'}</td>
                      <td className="px-3 py-2">{entry.spO2 || '-'}</td>
                      <td className="px-3 py-2 text-slate-500">{entry.notes || '-'}</td>
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
      </div>
    </div>
  );
};
