import { useState, useEffect } from 'react';
import { Search, Save, Calendar, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useDoctorSchedules } from '../../contexts/DoctorScheduleContext';
import type { DoctorScheduleRecord } from '../../contexts/DoctorScheduleContext';


// Ensure the two sessions are sensible: each start before its end, and the
// evening session starts after the morning session ends (no overlap).
const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
function validateSessions(doc: DoctorScheduleRecord): string | null {
  const { session1: s1, session2: s2 } = doc;
  if (s1.start && s1.end && toMin(s1.start) >= toMin(s1.end))
    return 'Morning session end time must be after its start time.';
  if (s2.start && s2.end && toMin(s2.start) >= toMin(s2.end))
    return 'Evening session end time must be after its start time.';
  if (s1.end && s2.start && s2.end && toMin(s2.start) < toMin(s1.end))
    return 'Evening session must start after the morning session ends.';
  return null;
}

export const DoctorSchedules = () => {
  const {
    doctorSchedules, isLoading, apiError, clearError,
    updateDoctorSchedule, saveDoctorSchedule, getDoctorsForDept,
  } = useDoctorSchedules();

  const [selectedDept, setSelectedDept] = useState('All Departments');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [newLeaveDate, setNewLeaveDate] = useState('');
  const [newLeaveReason, setNewLeaveReason] = useState('');
  const [savedMsg, setSavedMsg] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Selected doctor (by id); auto-select the first once data loads.
  const currentDoc = doctorSchedules.find(d => d.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId === null && doctorSchedules.length > 0) {
      setSelectedId(doctorSchedules[0].id);
    }
  }, [doctorSchedules, selectedId]);

  const update = (updates: Partial<DoctorScheduleRecord>) => {
    if (currentDoc) updateDoctorSchedule(currentDoc.id, updates);
  };

  const toggleDay = (day: string) => {
    if (!currentDoc) return;
    const wd = currentDoc.workingDays.includes(day)
      ? currentDoc.workingDays.filter(d => d !== day)
      : [...currentDoc.workingDays, day];
    update({ workingDays: wd });
  };

  const handleAddLeave = () => {
    if (currentDoc && newLeaveDate) {
      update({
        exceptions: [...currentDoc.exceptions, { date: newLeaveDate, reason: newLeaveReason || 'Leave' }],
      });
      setShowLeaveModal(false);
      setNewLeaveDate('');
      setNewLeaveReason('');
    }
  };

  const removeLeave = (index: number) => {
    if (!currentDoc) return;
    const newExceptions = [...currentDoc.exceptions];
    newExceptions.splice(index, 1);
    update({ exceptions: newExceptions });
  };

  const handleSave = async () => {
    if (!currentDoc) return;
    const err = validateSessions(currentDoc);
    if (err) {
      setScheduleError(err);
      return;
    }
    setScheduleError(null);
    const ok = await saveDoctorSchedule(currentDoc.id);
    if (ok) {
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    }
  };

  // Department options come from the real doctors (loaded from the backend),
  // so actual departments like "test" appear and empty ones don't.
  const deptOptions = ['All Departments', ...Array.from(new Set(doctorSchedules.map(d => d.dept).filter(Boolean))).sort()];

  const filteredDoctors = getDoctorsForDept(selectedDept).filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col relative">
      {(apiError || scheduleError) && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{scheduleError || apiError}</span>
          <button onClick={() => { setScheduleError(null); clearError(); }} className="text-red-500 hover:text-red-700 font-medium">Dismiss</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Doctor Schedules</h1>
        </div>
        <Button variant="filled" color="primary" icon={Save} onClick={handleSave} disabled={!currentDoc}>
          {savedMsg ? '✓ Saved!' : 'Save Schedule'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 flex-1 overflow-hidden">

        {/* Doctor List */}
        <div className="lg:col-span-1 bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex flex-col">
          <div className="mb-4">
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 focus:outline-none focus:border-primary text-sm font-medium"
            >
              {deptOptions.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search doctor..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 focus:outline-none focus:border-primary text-sm font-medium"
            />
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
            {isLoading ? (
              <p className="text-sm text-slate-500 text-center py-4">Loading doctors…</p>
            ) : filteredDoctors.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No doctors found.</p>
            ) : (
              filteredDoctors.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedId(doc.id)}
                  className={`px-4 py-3 rounded-xl cursor-pointer transition-colors ${
                    selectedId === doc.id
                      ? 'bg-primary/5 border border-primary/20 text-primary font-bold'
                      : 'hover:bg-slate-50 border border-transparent text-slate-700 font-medium'
                  }`}
                >
                  <div>{doc.name}</div>
                  <div className={`text-xs mt-0.5 ${selectedId === doc.id ? 'text-primary/70' : 'text-slate-400 font-normal'}`}>
                    {doc.dept}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Schedule Config */}
        <div className="lg:col-span-3 bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col overflow-y-auto custom-scrollbar relative">

          {!currentDoc ? (
            <div className="flex-1 flex items-center justify-center p-5 text-center text-slate-400 font-medium">
              {isLoading ? 'Loading doctors…' : 'No active doctors found. Add doctors in Doctor Master first.'}
            </div>
          ) : (
          <>

          {showLeaveModal && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center p-6">
              <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-6 w-full max-w-md">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Add Leave / Exception</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Date</label>
                    <input type="date" value={newLeaveDate} onChange={e => setNewLeaveDate(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">Reason (Optional)</label>
                    <input type="text" value={newLeaveReason} onChange={e => setNewLeaveReason(e.target.value)} className="w-full px-3 py-2 border rounded-xl" placeholder="e.g. Conference" />
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <Button variant="outline" onClick={() => setShowLeaveModal(false)}>Cancel</Button>
                    <Button variant="filled" color="primary" onClick={handleAddLeave}>Save Leave</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-lg font-bold text-primary">
                {currentDoc.name.split(' ')[1]?.[0] ?? '?'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{currentDoc.name}</h2>
                <p className="text-sm font-medium text-slate-500">{currentDoc.dept} • General OP</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">

            {/* Working Days */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">Working Days</h3>
              <div className="flex gap-3">
                {days.map(day => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                      currentDoc.workingDays.includes(day)
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'bg-slate-50 text-slate-400 border border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Timings */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">Standard Timings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><SunIcon /> Morning Session</h4>
                  <div className="flex items-center gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={currentDoc.session1.start}
                        onChange={e => update({ session1: { ...currentDoc.session1, start: e.target.value } })}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-primary"
                      />
                    </div>
                    <span className="text-slate-400 font-bold mt-4">to</span>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">End Time</label>
                      <input
                        type="time"
                        value={currentDoc.session1.end}
                        onChange={e => update({ session1: { ...currentDoc.session1, end: e.target.value } })}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><MoonIcon /> Evening Session</h4>
                  <div className="flex items-center gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={currentDoc.session2.start}
                        onChange={e => update({ session2: { ...currentDoc.session2, start: e.target.value } })}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-primary"
                      />
                    </div>
                    <span className="text-slate-400 font-bold mt-4">to</span>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">End Time</label>
                      <input
                        type="time"
                        value={currentDoc.session2.end}
                        onChange={e => update({ session2: { ...currentDoc.session2, end: e.target.value } })}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Capacity */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">Capacity &amp; Slots</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Slot Duration (Minutes)</label>
                  <select
                    value={currentDoc.slotDuration}
                    onChange={e => update({ slotDuration: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary font-medium"
                  >
                    <option value={10}>10 Minutes</option>
                    <option value={15}>15 Minutes</option>
                    <option value={20}>20 Minutes</option>
                    <option value={30}>30 Minutes</option>
                    <option value={60}>60 Minutes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Max Patients Per Day</label>
                  <input
                    type="number"
                    value={currentDoc.maxPatients}
                    onChange={e => update({ maxPatients: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary font-medium"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Exceptions / Leaves */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Leaves &amp; Exceptions</h3>
                <Button variant="outline" icon={Plus} size="sm" onClick={() => setShowLeaveModal(true)}>Add Leave</Button>
              </div>

              {currentDoc.exceptions.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center flex flex-col items-center">
                  <Calendar className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-slate-500 font-medium">No upcoming leaves scheduled.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentDoc.exceptions.map((exc, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-100">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 opacity-70" />
                        <span className="font-bold">{exc.date}</span>
                        <span className="opacity-70">- {exc.reason}</span>
                      </div>
                      <button onClick={() => removeLeave(idx)} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          </>
          )}
        </div>
      </div>
    </div>
  );
};

const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>;
