import { useState } from 'react';
import { Stethoscope, Plus, Trash2, User } from 'lucide-react';
import { useDoctorSchedules } from '../../contexts/DoctorScheduleContext';
import toast from 'react-hot-toast';

export interface RoundNote {
  id: string;
  timestamp: string;
  doctorName: string;
  note: string;
}

interface ClinicalRoundsProps {
  patientId: number;
}

export const ClinicalRounds: React.FC<ClinicalRoundsProps> = () => {
  const { doctorSchedules } = useDoctorSchedules();
  const [notes, setNotes] = useState<RoundNote[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    doctorName: '',
    note: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doctorName || !formData.note) {
      toast.error('Please enter both doctor name and note');
      return;
    }

    const newNote: RoundNote = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...formData
    };

    setNotes([newNote, ...notes]);
    setIsAdding(false);
    setFormData({ doctorName: '', note: '' });
    toast.success('Round note added');
  };

  const handleDelete = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
    toast.success('Round note removed');
  };

  const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary" /> Clinical Rounds
        </h3>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-primary/10 text-primary font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-primary hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Round Note
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
          <h4 className="font-bold text-slate-800 mb-4">New Clinical Note</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Doctor Name <span className="text-red-500">*</span></label>
              <select 
                value={formData.doctorName} 
                onChange={e => setFormData({...formData, doctorName: e.target.value})} 
                className={inputCls} 
              >
                <option value="">Select Doctor</option>
                {doctorSchedules.map(doc => (
                  <option key={doc.id} value={doc.name}>
                    {doc.name} ({doc.dept})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Clinical Note <span className="text-red-500">*</span></label>
              <textarea 
                placeholder="Patient condition, new instructions, etc." 
                value={formData.note} 
                onChange={e => setFormData({...formData, note: e.target.value})} 
                className={inputCls} 
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-300 transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary/90 transition-colors">Save Note</button>
            </div>
          </form>
        </div>
      )}

      {notes.length === 0 ? (
        <div className="text-center py-12 text-slate-400 font-medium">
          <Stethoscope className="w-12 h-12 mx-auto text-slate-200 mb-3" />
          No clinical round notes recorded yet.
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map(note => (
            <div key={note.id} className="p-4 border border-slate-200 rounded-xl bg-white flex flex-col md:flex-row gap-4">
              <div className="shrink-0 flex flex-col items-center justify-center p-3 bg-slate-50 rounded-lg border border-slate-100 min-w-32">
                <p className="text-sm font-bold text-slate-700 text-center mb-1">
                  {new Date(note.timestamp).toLocaleDateString()}
                </p>
                <p className="text-xs text-slate-500 text-center">
                  {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-primary" /> {note.doctorName}
                  </p>
                  <button onClick={() => handleDelete(note.id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{note.note}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
