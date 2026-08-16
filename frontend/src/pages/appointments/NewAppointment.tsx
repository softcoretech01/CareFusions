import { useState, useRef, useEffect } from 'react';
import { Search, Building2, User, CheckCircle, UserCheck, UserPlus, Clock, AlertCircle, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAppointments } from '../../contexts/AppointmentContext';
import { usePatients } from '../../contexts/PatientContext';
import type { GlobalPatientRecord } from '../../contexts/PatientContext';
import { useNavigate } from 'react-router-dom';
import { useDoctorSchedules } from '../../contexts/DoctorScheduleContext';
import { getBookedSlots } from '../../data/doctorSchedules';
import toast from 'react-hot-toast';

// Departments are derived from the doctors configured in Doctor Master,
// so the list always matches doctors that actually exist.

// ── Slot generation from a doctor's schedule ──────────────────
const timeToMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const minToLabel = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};
// Slot labels for one session [start, end) at the given slot duration (minutes).
function buildSessionSlots(start: string, end: string, dur: number): string[] {
  if (!start || !end || !dur || dur <= 0) return [];
  const s = timeToMin(start), e = timeToMin(end);
  const out: string[] = [];
  for (let t = s; t + dur <= e; t += dur) out.push(minToLabel(t));
  return out;
}

// A slot is "past" when its date+time is before now (e.g. earlier times today).
// Future dates are never past.
function isSlotInPast(dateStr: string, timeStr: string): boolean {
  if (!dateStr) return false;
  const [time, ampm] = timeStr.split(' ');
  const [hRaw, m] = time.split(':').map(Number);
  let h = hRaw;
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  const slot = new Date(dateStr + 'T00:00:00');
  slot.setHours(h, m, 0, 0);
  return slot.getTime() < Date.now();
}

export const NewAppointment = () => {
  const { addAppointment, appointments, generateAppointmentNumber } = useAppointments();
  const { getDoctorsWithAvailability, doctorSchedules } = useDoctorSchedules();
  const { patients, addPatient } = usePatients();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [patientSearch, setPatientSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<GlobalPatientRecord | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // A new patient's UHID is assigned by the backend when they're registered on
  // confirm (see handleConfirm) — it is NOT invented on the client. The old code
  // previewed a client UHID, but nothing was persisted, so two walk-ins in a row
  // both reused the same UHID-…-000N and collided.
  const [saving, setSaving] = useState(false);
  // Provisional preview of the UHID the backend will assign on confirm.
  const [nextUhid, setNextUhid] = useState('');

  const getLocalDate = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    patientName: '',
    mobileNumber: '',
    email: '',
    gender: 'Male',
    age: '',
    department: '',
    doctor: '',
    date: getLocalDate(),
    timeSlot: '',
    type: 'Walk-In' as any,
    priority: 'Normal' as any,
  });

  // Fetch the next UHID (quick-registration format) so it can be previewed.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/quick-registrations/next-uhid`);
        if (res.ok) {
          const data = await res.json();
          setNextUhid(data.uhid ?? '');
        }
      } catch { /* offline — field falls back to placeholder text */ }
    })();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter patients based on search
  const patientResults = patientSearch.trim().length >= 2
    ? patients.filter(p =>
        (p.patientName || '').toLowerCase().includes(patientSearch.toLowerCase()) ||
        (p.uhid || '').toLowerCase().includes(patientSearch.toLowerCase()) ||
        (p.mobileNumber || '').includes(patientSearch)
      ).slice(0, 6)
    : [];

  const selectExistingPatient = (p: GlobalPatientRecord) => {
    setSelectedPatient(p);
    setPatientSearch(p.patientName || '');
    setShowDropdown(false);
    setFormData(prev => ({
      ...prev,
      patientName: p.patientName || '',
      mobileNumber: p.mobileNumber || '',
      email: p.email || '',
      gender: p.gender || 'Male',
      age: p.age ? String(p.age) : '',
    }));
  };

  const clearPatient = () => {
    setSelectedPatient(null);
    setPatientSearch('');
    setFormData(prev => ({
      ...prev,
      patientName: '',
      mobileNumber: '',
      email: '',
      gender: 'Male',
      age: '',
    }));
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => {
    if (step === 1) navigate('/appointments/list');
    else setStep(prev => prev - 1);
  };

  const handleConfirm = async () => {
    let uhidToUse = '';

    if (selectedPatient) {
      // Existing patient — reuse their UHID.
      uhidToUse = selectedPatient.uhid;
    } else {
      // New patient — register them in the backend so they get a UNIQUE,
      // server-assigned UHID and appear in Patient Registration. Previously the
      // client invented the UHID, so back-to-back walk-ins reused the same one.
      setSaving(true);
      try {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/quick-registrations/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            RegistrationDate: now.toISOString().split('T')[0],
            RegistrationTime: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
            Title: formData.gender === 'Female' ? 'Mrs.' : 'Mr.',
            PatientName: formData.patientName || 'Walk-in Patient',
            Gender: formData.gender,
            Age: parseInt(formData.age) || 0,
            MobileNumber: formData.mobileNumber || '0000000000',
            Department: formData.department || null,
            Doctor: formData.doctor || null,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const created = await res.json();
        uhidToUse = created.Uhid;
      } catch (e) {
        setSaving(false);
        toast.error('Could not register the new patient. Please try again.');
        return;
      }
      setSaving(false);
      addPatient({
        id: Date.now(),
        uhid: uhidToUse,
        patientName: formData.patientName || 'Walk-in Patient',
        gender: formData.gender,
        age: parseInt(formData.age) || 0,
        mobileNumber: formData.mobileNumber || '0000000000',
        email: formData.email,
        registrationDate: new Date().toISOString().split('T')[0],
        registrationTime: new Date().toLocaleTimeString(),
        registrationType: 'Quick',
        status: 'Active',
        department: formData.department,
        doctor: formData.doctor,
      });
    }

    const appointmentNumber = generateAppointmentNumber();

    addAppointment({
      id: Date.now() + 1,
      appointmentNumber,
      uhid: uhidToUse,
      patientName: formData.patientName || 'Walk-in Patient',
      mobileNumber: formData.mobileNumber || '0000000000',
      department: formData.department,
      doctor: formData.doctor,
      date: formData.date,
      timeSlot: formData.timeSlot,
      durationMinutes: 15,
      type: formData.type,
      priority: formData.priority,
      status: 'Scheduled',
    });

    navigate('/appointments/list');
  };

  const steps = [
    { num: 1, label: 'Patient' },
    { num: 2, label: 'Doctor' },
    { num: 3, label: 'Schedule' },
    { num: 4, label: 'Confirm' },
  ];

  // Departments that actually have doctors (from the real doctor schedules).
  const departments = Array.from(new Set(doctorSchedules.map(d => d.dept).filter(Boolean))).sort();

  // Doctors with availability for Step 2
  const doctorsWithAvailability = formData.department
    ? getDoctorsWithAvailability(formData.department, formData.date)
    : [];

  // Slots come from the selected doctor's schedule (Standard Timings + Slot Duration)
  const selectedSchedule = doctorSchedules.find(d => d.name === formData.doctor) ?? null;
  const timeSlots = selectedSchedule
    ? [
        ...buildSessionSlots(selectedSchedule.session1.start, selectedSchedule.session1.end, selectedSchedule.slotDuration),
        ...buildSessionSlots(selectedSchedule.session2.start, selectedSchedule.session2.end, selectedSchedule.slotDuration),
      ]
    : [];

  // Booked slots for Step 3 (shared pool with online bookings)
  const bookedSlots = formData.doctor && formData.date
    ? getBookedSlots(formData.doctor, formData.date, appointments)
    : new Set<string>();

  return (
    <div className="max-w-3xl mx-auto py-5">
      <div className="mb-5">
        <h1 className="text-3xl font-bold text-slate-800">Book New Appointment</h1>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-4 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10"></div>
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary -z-10 transition-all duration-500"
          style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
        ></div>
        {steps.map(s => (
          <div key={s.num} className="flex flex-col items-center gap-2 bg-background px-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
              step >= s.num ? 'bg-primary text-white shadow-md' : 'bg-slate-100 text-slate-400'
            }`}>
              {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
            </div>
            <span className={`text-sm font-semibold ${step >= s.num ? 'text-primary' : 'text-slate-400'}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">

        {/* ─── STEP 1: Patient Details ─── */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Patient Details</h2>

            {/* Existing Patient Search */}
            <div className="mb-4" ref={searchRef}>
              <label className="block text-sm font-semibold text-slate-600 mb-2 flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                Existing Patient Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={patientSearch}
                  onChange={e => {
                    setPatientSearch(e.target.value);
                    setShowDropdown(true);
                    if (selectedPatient) clearPatient();
                  }}
                  onFocus={() => patientSearch.length >= 2 && setShowDropdown(true)}
                  placeholder="Search by UHID, Name, or Mobile number..."
                  className={`w-full bg-slate-50 border rounded-xl py-3.5 pl-4 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                    selectedPatient ? 'border-green-300 bg-green-50' : 'border-slate-200'
                  }`}
                />
                {selectedPatient && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> Existing Patient
                    </span>
                    <button onClick={clearPatient} className="text-slate-400 hover:text-red-500 transition-colors text-xs">✕</button>
                  </div>
                )}

                {/* Dropdown Results */}
                {showDropdown && patientResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
                    {patientResults.map(p => (
                      <div
                        key={p.id}
                        onClick={() => selectExistingPatient(p)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
                      >
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                          {(p.patientName || 'P').charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-800 text-sm truncate">{p.patientName}</div>
                          <div className="text-xs text-slate-500">{p.uhid} · {p.mobileNumber} · {p.gender}{p.age ? `, ${p.age} Yrs` : ''}</div>
                        </div>
                        <span className="text-xs text-primary font-semibold shrink-0">Select</span>
                      </div>
                    ))}
                  </div>
                )}

                {showDropdown && patientSearch.trim().length >= 2 && patientResults.length === 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-lg px-4 py-4 text-center">
                    <UserPlus className="w-5 h-5 mx-auto text-slate-300 mb-1" />
                    <p className="text-sm text-slate-400">No existing patient found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Fill in the details below to register as new patient</p>
                  </div>
                )}
              </div>

              {!selectedPatient && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>New patient — UHID <span className="font-mono font-bold">{nextUhid || '…'}</span> will be added to registration on confirm</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-600">Patient Information</h3>
                {selectedPatient && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold">
                    UHID: {selectedPatient.uhid}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">UHID</label>
                  <input
                    type="text"
                    value={selectedPatient ? selectedPatient.uhid : (nextUhid || 'Auto-generating…')}
                    readOnly
                    disabled
                    className="w-full px-4 py-2.5 border rounded-xl bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Patient Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    maxLength={100}
                    value={formData.patientName}
                    onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                    disabled={!!selectedPatient}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                      selectedPatient ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                    }`}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Mobile Number <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={formData.mobileNumber}
                    onChange={e => setFormData({ ...formData, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    disabled={!!selectedPatient}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                      selectedPatient ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                    }`}
                    placeholder="Enter 10-digit number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                    disabled={!!selectedPatient}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                      selectedPatient ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Department & Doctor ─── */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Department &amp; Doctor</h2>
            <div className="mb-4 max-w-xs">
              <label className="block text-sm font-medium text-slate-700 mb-2">Appointment Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value, doctor: '', timeSlot: '' })}
                className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Department column */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Department <span className="text-red-500">*</span></label>
                <div className="space-y-3">
                  {departments.length === 0 && (
                    <p className="text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center">
                      No departments configured. Add doctors in Doctor Master first.
                    </p>
                  )}
                  {departments.map(dept => (
                    <div
                      key={dept}
                      onClick={() => setFormData({ ...formData, department: dept, doctor: '', timeSlot: '' })}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                        formData.department === dept
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-slate-100 hover:border-slate-200 text-slate-600'
                      }`}
                    >
                      <Building2 className={`w-5 h-5 ${formData.department === dept ? 'text-primary' : 'text-slate-400'}`} />
                      <span className="font-semibold">{dept}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Doctor column */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Doctor <span className="text-red-500">*</span>
                  {formData.department && (
                    <span className="ml-2 text-xs text-slate-400 font-normal">
                      — available on {new Date(formData.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
                    </span>
                  )}
                </label>
                {formData.department && doctorsWithAvailability.length === 0 ? (
                  <div className="h-full min-h-[140px] border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-center text-slate-400 font-medium p-4">
                    No doctors available in this department. Add doctors in Doctor Master.
                  </div>
                ) : formData.department ? (
                  <div className="space-y-3 animate-in fade-in zoom-in-95">
                    {doctorsWithAvailability.map(({ name, available }) => (
                      <div
                        key={name}
                        onClick={() => available && setFormData({ ...formData, doctor: name, timeSlot: '' })}
                        className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                          !available
                            ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                            : formData.doctor === name
                            ? 'border-primary bg-primary/5 text-primary cursor-pointer'
                            : 'border-slate-100 hover:border-slate-200 text-slate-600 cursor-pointer'
                        }`}
                      >
                        <User className={`w-5 h-5 shrink-0 ${
                          !available ? 'text-slate-300' : formData.doctor === name ? 'text-primary' : 'text-slate-400'
                        }`} />
                        <span className="font-semibold flex-1">{name}</span>
                        {!available && (
                          <span className="flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                            <AlertCircle className="w-3 h-3" /> Not available today
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full min-h-[140px] border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 font-medium">
                    Select a department first
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Schedule Details ─── */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Schedule Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Appointment Date</label>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-medium">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  <span>{formData.date}</span>
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-col gap-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Slot Legend</p>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded border border-slate-200 bg-white inline-block shrink-0"></span>
                    <span className="text-xs text-slate-600">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-green-600 inline-block shrink-0"></span>
                    <span className="text-xs text-slate-600">Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-red-700 inline-block shrink-0"></span>
                    <span className="text-xs text-slate-600">Already booked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-slate-100 border border-slate-200 inline-block shrink-0"></span>
                    <span className="text-xs text-slate-600">Past / unavailable</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Available Slots <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.length === 0 && (
                    <p className="col-span-3 text-sm text-slate-400 text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
                      No slots — this doctor has no session times configured. Set them in Doctor Schedules.
                    </p>
                  )}
                  {timeSlots.map(time => {
                    const isBooked = bookedSlots.has(time);
                    const isPast = isSlotInPast(formData.date, time);
                    const isSelected = formData.timeSlot === time;
                    const disabled = isBooked || isPast;
                    return (
                      <div
                        key={time}
                        onClick={() => !disabled && setFormData({ ...formData, timeSlot: time })}
                        title={isBooked ? 'This slot is already booked' : isPast ? 'This time has already passed' : ''}
                        className={`py-2 px-1 text-center rounded-lg border-2 text-xs font-semibold transition-all duration-200 select-none ${
                          isBooked
                            ? 'bg-red-700 border-red-700 text-white cursor-not-allowed opacity-85'
                            : isPast
                            ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-green-600 border-green-600 text-white shadow-md cursor-pointer scale-105'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-primary hover:shadow-sm cursor-pointer'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <Clock className="w-3 h-3 opacity-70" />
                          {time}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {bookedSlots.size > 0 && (
                  <p className="mt-3 text-xs text-slate-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {bookedSlots.size} slot{bookedSlots.size > 1 ? 's' : ''} already booked for {formData.doctor} on this date
                  </p>
                )}
              </div>
            </div>

            {/* Appointment Type & Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-100">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Appointment Type</label>
                {/* Locked to Walk-In: this is the Walk-in Booking flow, so the
                    appointment always stays visible in the Walk-in list. */}
                <div className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-sm font-medium cursor-not-allowed flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" />
                  Walk-In
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                <select
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-slate-700"
                >
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 4: Confirm ─── */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <CalendarIcon className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Confirm Appointment</h2>
              <p className="text-slate-500 mt-1">Please review the details before confirming.</p>
            </div>

            {/* Patient type badge */}
            <div className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl mb-5 w-fit mx-auto ${
              selectedPatient ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {selectedPatient ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {selectedPatient ? `Existing Patient · UHID: ${selectedPatient.uhid}` : `New Patient · UHID: ${nextUhid || '…'}`}
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 grid grid-cols-2 gap-y-6 gap-x-8 max-w-2xl mx-auto">
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Patient</span>
                <span className="font-semibold text-slate-800">{formData.patientName || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Mobile</span>
                <span className="font-semibold text-slate-800">{formData.mobileNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Department</span>
                <span className="font-semibold text-slate-800">{formData.department}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Doctor</span>
                <span className="font-semibold text-slate-800">{formData.doctor}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Date &amp; Time</span>
                <div className="flex items-center gap-2 font-semibold text-primary">
                  {formData.date} <span className="text-slate-300">•</span> {formData.timeSlot}
                </div>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Type &amp; Priority</span>
                <span className="font-semibold text-slate-800">{formData.type} ({formData.priority})</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-5">
        <Button variant="outline" onClick={handleBack}>Back</Button>
        {step < 4 ? (
          <Button
            variant="filled"
            color="primary"
            onClick={handleNext}
            disabled={
              (step === 1 && !formData.patientName) ||
              (step === 2 && (!formData.date || !formData.doctor)) ||
              (step === 3 && !formData.timeSlot)
            }
          >
            Continue to {step === 1 ? 'Doctor' : step === 2 ? 'Schedule' : 'Confirm'}
          </Button>
        ) : (
          <Button variant="filled" color="primary" icon={CheckCircle} onClick={handleConfirm} disabled={saving}>
            {saving ? 'Registering…' : 'Confirm Appointment'}
          </Button>
        )}
      </div>
    </div>
  );
};
