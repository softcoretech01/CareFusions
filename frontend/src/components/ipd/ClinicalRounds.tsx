import { API_BASE_URL } from '@/utils/apiBase';
import { useState, useEffect } from 'react';
import { Stethoscope, Plus, Trash2, User, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDoctorSchedules } from '../../contexts/DoctorScheduleContext';
import { lettersOnly, freeText } from '../../utils/inputRules';

export interface RoundNote {
  id: string;
  timestamp: string;
  doctorName: string;
  note: string;
}

interface ClinicalRoundsProps {
  patientId: number; // AdmissionId
}

const API_BASE = API_BASE_URL;

export const ClinicalRounds: React.FC<ClinicalRoundsProps> = ({ patientId }) => {
  const { doctorSchedules } = useDoctorSchedules();
  const [notes, setNotes] = useState<RoundNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showDocDropdown, setShowDocDropdown] = useState(false);
  const [formData, setFormData] = useState({
    doctorName: '',
    note: ''
  });

  const fetchRounds = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ipd-visits/${patientId}/details`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.rounds) {
          const mapped = data.rounds.map((r: any) => ({
            id: String(r.RoundId),
            timestamp: r.RecordedAt,
            doctorName: r.DoctorName || '',
            note: r.Note || ''
          }));
          setNotes(mapped);
        }
      }
    } catch (e) {
      toast.error('Failed to load rounds');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRounds();
  }, [patientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doctorName || !formData.note) {
      toast.error('Please fill all fields');
      return;
    }

    const payload = {
      admissionId: patientId,
      round: formData
    };

    try {
      const res = await fetch(`${API_BASE}/ipd-visits/save-clinical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success('Round note added');
        setIsAdding(false);
        setFormData({ doctorName: '', note: '' });
        fetchRounds();
      } else {
        toast.error('Failed to save note');
      }
    } catch (e) {
      toast.error('Failed to save note');
    }
  };

  const handleDelete = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
    toast.success('Note removed locally');
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary" /> Clinical Rounds
        </h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-primary/10 text-primary font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-primary hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Note
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Doctor Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  required
                  value={formData.doctorName}
                  onChange={e => {
                    setFormData({ ...formData, doctorName: lettersOnly(e.target.value) });
                    setShowDocDropdown(true);
                  }}
                  onFocus={() => setShowDocDropdown(true)}
                  onBlur={() => setShowDocDropdown(false)}
                  placeholder="e.g. Dr. Sarah Smith"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
                {showDocDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto overflow-x-hidden">
                    {doctorSchedules
                      .filter((d: any) => (d.doctorName || d.name).toLowerCase().includes(formData.doctorName.toLowerCase()))
                      .map((d: any) => (
                      <div 
                        key={d.id ?? d.doctorId} 
                        className="px-3 py-2 text-sm font-medium text-slate-700 hover:bg-primary/5 hover:text-primary cursor-pointer transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevent onBlur firing before click
                          setFormData({ ...formData, doctorName: d.doctorName || d.name });
                          setShowDocDropdown(false);
                        }}
                      >
                        {d.doctorName || d.name}
                      </div>
                    ))}
                    {doctorSchedules.filter((d: any) => (d.doctorName || d.name).toLowerCase().includes(formData.doctorName.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-sm text-slate-500 italic">No matches... (Will use typed name)</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Clinical Note / Plan</label>
              <textarea
                required
                value={formData.note}
                onChange={e => setFormData({ ...formData, note: freeText(e.target.value, 1000) })}
                placeholder="Enter examination findings, plan of care, etc..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 min-h-[100px] resize-y"
              ></textarea>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setIsAdding(false); setFormData({ doctorName: '', note: '' }); }} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-300 transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary/90 transition-colors">Save Note</button>
            </div>
          </form>
        </div>
      )}

      {notes.length === 0 ? (
        <div className="text-center py-12 text-slate-400 font-medium border-2 border-dashed border-slate-100 rounded-2xl">
          <Stethoscope className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          No clinical notes added yet.
        </div>
      ) : (
        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
          {notes.map(note => (
            <div key={note.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                <User className="w-4 h-4" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white border border-slate-200 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative">
                <button onClick={() => handleDelete(note.id)} className="absolute top-3 right-3 text-red-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-slate-800">{note.doctorName}</span>
                  <span className="text-xs text-slate-400">&middot; {new Date(note.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{note.note}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
