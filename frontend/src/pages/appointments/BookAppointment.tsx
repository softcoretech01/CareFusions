import { useState, useRef, useEffect } from 'react';
import { Search, Building2, Stethoscope, CheckCircle, UserCheck, UserPlus, Clock, AlertCircle, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAppointments } from '../../contexts/AppointmentContext';
import type { AppointmentRecord } from '../../contexts/AppointmentContext';
import { usePatients } from '../../contexts/PatientContext';
import type { GlobalPatientRecord } from '../../contexts/PatientContext';
import { useNavigate } from 'react-router-dom';
import { useDoctorSchedules } from '../../contexts/DoctorScheduleContext';
import { getBookedSlots } from '../../data/doctorSchedules';
import { useDepartments } from '../../hooks/useMasterOptions';
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
// Slot labels for one session [start, end) at the given slot duration (minutes), excluding break time.
function buildSessionSlots(start: string, end: string, dur: number, breakStart?: string, breakEnd?: string): string[] {
  if (!start || !end || !dur || dur <= 0) return [];
  const s = timeToMin(start), e = timeToMin(end);
  const bs = breakStart ? timeToMin(breakStart) : null;
  const be = breakEnd ? timeToMin(breakEnd) : null;

  const out: string[] = [];
  for (let t = s; t + dur <= e; t += dur) {
    if (bs !== null && be !== null && t + dur > bs && t < be) continue;
    out.push(minToLabel(t));
  }
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

import { useLocation } from "react-router-dom";

export interface BookAppointmentProps {
  passedPatientProps?: any;
  onClose?: () => void;
}

export const BookAppointment = ({ passedPatientProps, onClose }: BookAppointmentProps) => {
  const { addAppointment, appointments, generateAppointmentNumber } = useAppointments();
  const { getDoctorsWithAvailability, doctorSchedules } = useDoctorSchedules();
  const { options: departmentList } = useDepartments();
  const { patients, addPatient } = usePatients();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [patientSearch, setPatientSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const location = useLocation();
  const passedPatient = passedPatientProps || location.state?.patient;
  // A patient handed to us only counts as "existing" once it has been persisted
  // -- i.e. it carries a database id alongside its UHID. An in-progress
  // registration form has a *preview* UHID and no id; treating that as an
  // existing patient booked the appointment against a UHID no patient owned.
  const isPersistedPatient = Boolean(passedPatient?.id && passedPatient?.uhid);
  const [selectedPatient, setSelectedPatient] = useState<GlobalPatientRecord | null>(
    isPersistedPatient ? passedPatient : null
  );

  useEffect(() => {
    setSelectedPatient(isPersistedPatient ? passedPatient : null);
    if (passedPatient) {
      setFormData(prev => ({
        ...prev,
        patientName: passedPatient.patientName || '',
        mobileNumber: passedPatient.mobileNumber || '',
        email: passedPatient.email || '',
        gender: passedPatient.gender || 'Male',
        age: passedPatient.age ? String(passedPatient.age) : '',
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passedPatient, isPersistedPatient]);

  const searchRef = useRef<HTMLDivElement>(null);

  // A new patient's UHID is assigned by the backend when they're registered on
  // booking (see handleConfirm) — it is NOT invented on the client. The old code
  // generated a UHID here, which collided (every new patient got UHID-…-0001).
  const [saving, setSaving] = useState(false);
  // Provisional preview of the UHID the backend will assign on booking.
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
  });

  // Keep the UHID preview in sync with the current table max whenever the form
  // is in "new patient" mode (no existing patient selected).
  useEffect(() => {
    if (selectedPatient) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/quick-registrations/next-uhid`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.nextUhid) setNextUhid(data.nextUhid);
      } catch {
        /* non-fatal — real UHID assigned on submit */
      }
    })();
    return () => { cancelled = true; };
  }, [selectedPatient]);

  // Click outside to close patient dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter patients for search
  const patientResults = patientSearch.length >= 2
    ? patients.filter(p =>
        p.patientName.toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.uhid.toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.mobileNumber.includes(patientSearch)
      ).slice(0, 5)
    : [];

  // Everything already booked for this patient, newest first. Shown on step 1 so
  // the desk can see the patient's history before adding another appointment --
  // which doctor they usually see, whether they no-showed, and (below) whether
  // they already have one open.
  const patientHistory = selectedPatient
    ? appointments
        .filter(a => a.uhid === selectedPatient.uhid)
        .sort((a, b) => (b.date + b.timeSlot).localeCompare(a.date + a.timeSlot))
    : [];

  const today = getLocalDate();
  const openAppointment = patientHistory.find(
    a => a.date >= today && ['Scheduled', 'Checked-In', 'Waiting', 'Consulting'].includes(a.status)
  );

  // Where the booking lands depends on how the patient reached us. Someone
  // standing at the desk (In-Person registration, and quick/emergency
  // registrations, which are walk-ins by definition) joins today's waiting list
  // straight away; a Phone registration is only Scheduled until they turn up and
  // are checked in. A walk-in booking for a *later* date is Scheduled too -- it
  // has no business sitting in today's live queue.
  const isPhoneRegistration =
    Number((selectedPatient as any)?.registrationMode ?? (passedPatient as any)?.registrationMode ?? 0) === 1;
  const bookingStatus: AppointmentRecord['status'] =
    !isPhoneRegistration && formData.date === getLocalDate() ? 'Waiting' : 'Scheduled';

  const historyStatusClass = (status: string) => {
    if (status === 'Completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'Cancelled') return 'bg-red-50 text-red-700 border-red-200';
    if (status === 'No-Show') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (status === 'Scheduled') return 'bg-primary/10 text-primary border-primary/20';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const formatHistoryDate = (d: string) => {
    const parsed = new Date(`${d}T00:00:00`);
    return Number.isNaN(parsed.getTime())
      ? d
      : parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const selectExistingPatient = (patient: GlobalPatientRecord) => {
    setSelectedPatient(patient);
    setFormData(prev => ({
      ...prev,
      patientName: patient.patientName,
      mobileNumber: patient.mobileNumber,
      email: patient.email || '',
      gender: patient.gender,
      age: String(patient.age),
    }));
    setPatientSearch(`${patient.patientName} (${patient.uhid})`);
    setShowDropdown(false);
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
    if (step === 1) {
      if (onClose) onClose();
      else navigate('/appointments/online-booking');
    }
    else setStep(prev => prev - 1);
  };

  const handleConfirm = async () => {
    let uhidToUse = '';

    if (selectedPatient) {
      // Existing patient — reuse their UHID, do NOT create a new patient.
      uhidToUse = selectedPatient.uhid;
    } else {
      // New patient — register them in the backend so they get a UNIQUE,
      // server-assigned UHID and appear in Patient Registration.
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
            PatientName: formData.patientName,
            Gender: formData.gender,
            Age: parseInt(formData.age) || 0,
            MobileNumber: formData.mobileNumber,
            Department: formData.department || null,
            Doctor: formData.doctor || null,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const created = await res.json();
        uhidToUse = created.Uhid;
      } catch {
        setSaving(false);
        toast.error('Could not register the new patient. Please try again.');
        return;
      }
      setSaving(false);
      addPatient({
        id: Date.now(),
        uhid: uhidToUse,
        patientName: formData.patientName,
        gender: formData.gender,
        age: parseInt(formData.age) || 0,
        mobileNumber: formData.mobileNumber,
        email: formData.email,
        registrationDate: new Date().toISOString().split('T')[0],
        registrationTime: new Date().toLocaleTimeString(),
        registrationType: 'New',
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
      patientName: formData.patientName,
      mobileNumber: formData.mobileNumber,
      department: formData.department,
      doctor: formData.doctor,
      date: formData.date,
      timeSlot: formData.timeSlot,
      durationMinutes: 15,
      type: 'Standard',
      priority: 'Normal',
      status: bookingStatus,
    });

    toast.success(
      bookingStatus === 'Waiting'
        ? `Appointment ${appointmentNumber} confirmed — patient added to today's waiting list.`
        : `Appointment ${appointmentNumber} Confirmed Successfully!`
    );

    if (onClose) {
      onClose();
    } else {
      setStep(1);
      clearPatient();
      setFormData({
        patientName: '',
        mobileNumber: '',
        email: '',
        gender: 'Male',
        age: '',
        department: '',
        doctor: '',
        date: getLocalDate(),
        timeSlot: '',
      });
    }
  };

  const steps = [
    { num: 1, label: 'Patient' },
    { num: 2, label: 'Doctor' },
    { num: 3, label: 'Schedule' },
    { num: 4, label: 'Confirm' },
  ];

  // Departments from the master list.
  const departments = departmentList.map(d => d.departmentName).sort();

  // Doctors with availability for Step 2
  const doctorsWithAvailability = formData.department
    ? getDoctorsWithAvailability(formData.department, formData.date)
    : [];

  // Slots come from the selected doctor's schedule (Standard Timings + Slot Duration)
  const selectedSchedule = doctorSchedules.find(d => d.name === formData.doctor) ?? null;
  const timeSlots = selectedSchedule
    ? buildSessionSlots(
        selectedSchedule.timings.start,
        selectedSchedule.timings.end,
        selectedSchedule.slotDuration,
        selectedSchedule.breakTimings?.start,
        selectedSchedule.breakTimings?.end
      )
    : [];

  // Booked slots for Step 3
  const bookedSlots = formData.doctor && formData.date
    ? getBookedSlots(formData.doctor, formData.date, appointments)
    : new Set<string>();

  return (
    <div className="max-w-3xl mx-auto py-5">
      {/* Top Header */}
      <div className="mb-5">
        <h1 className="text-3xl font-bold text-slate-800">Book Appointment</h1>
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

            <div className="pt-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-600">Patient Information</h3>
                {selectedPatient && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold">
                    UHID: {selectedPatient.uhid}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">UHID</label>
                  <input
                    type="text"
                    value={selectedPatient ? selectedPatient.uhid : (nextUhid || 'Auto-generating…')}
                    readOnly
                    disabled
                    className="w-full px-4 py-2.5 border rounded-xl text-sm bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    maxLength={100}
                    value={formData.patientName}
                    onChange={e => setFormData({ ...formData, patientName: e.target.value })} readOnly={!!selectedPatient}
                    disabled={!!selectedPatient}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                      selectedPatient ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                    }`}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile Number <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={formData.mobileNumber}
                    onChange={e => setFormData({ ...formData, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    disabled={!!selectedPatient}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                      selectedPatient ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                    }`}
                    placeholder="10-digit mobile number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    maxLength={100}
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })} readOnly={!!selectedPatient}
                    disabled={!!selectedPatient}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                      selectedPatient ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                    }`}
                    placeholder="Email (optional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                    disabled={!!selectedPatient}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                      selectedPatient ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Age</label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={formData.age}
                    onChange={e => setFormData({ ...formData, age: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                    disabled={!!selectedPatient}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                      selectedPatient ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                    }`}
                    placeholder="Years"
                  />
                </div>
              </div>
            </div>

            {selectedPatient && (
              <div className="mt-6 border-t border-slate-200 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    Appointment History
                  </h3>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-semibold">
                    {patientHistory.length} total
                  </span>
                </div>

                {openAppointment && (
                  <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                    <span>
                      This patient already has an open appointment —{' '}
                      <span className="font-semibold">{openAppointment.appointmentNumber}</span> on{' '}
                      {formatHistoryDate(openAppointment.date)} at {openAppointment.timeSlot} with{' '}
                      {openAppointment.doctor || 'an unassigned doctor'}.
                    </span>
                  </div>
                )}

                {patientHistory.length === 0 ? (
                  <p className="text-sm text-slate-400 italic py-2">
                    No previous appointments — this is their first booking.
                  </p>
                ) : (
                  <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {patientHistory.slice(0, 6).map(a => (
                      <div key={a.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-700">
                            {formatHistoryDate(a.date)} · {a.timeSlot}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {a.department || '—'}
                            {a.doctor ? ` · ${a.doctor}` : ''}
                            {a.appointmentNumber ? ` · ${a.appointmentNumber}` : ''}
                          </p>
                        </div>
                        <span className={`shrink-0 text-xs px-2 py-1 rounded-full border font-semibold ${historyStatusClass(a.status)}`}>
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {patientHistory.length > 6 && (
                  <p className="text-xs text-slate-400 mt-2">
                    Showing the 6 most recent of {patientHistory.length}.
                  </p>
                )}
              </div>
            )}
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
                className="w-full px-4 py-2.5 border rounded-xl text-sm bg-slate-50 border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
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
                        <Stethoscope className={`w-5 h-5 shrink-0 ${
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

        {/* ─── STEP 3: Schedule ─── */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Schedule Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Available Slots <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.length === 0 && (
                    <p className="col-span-3 text-sm text-slate-400 text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
                      No slots — this doctor has no session times configured. Set them in Admin &gt; Employee &gt; Doctor Schedules.
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
          </div>
        )}

        {/* ─── STEP 4: Confirm ─── */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <CalendarIcon className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Confirm Booking</h2>
              <p className="text-slate-500 mt-1">Please review the details before confirming.</p>
            </div>

            {/* Patient type badge */}
            <div className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl mb-5 w-fit mx-auto ${
              selectedPatient ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {selectedPatient ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {selectedPatient ? `Existing Patient · UHID: ${selectedPatient.uhid}` : `New Patient · UHID: ${nextUhid || '…'}`}
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 grid grid-cols-2 gap-y-5 gap-x-8 max-w-2xl mx-auto">
              {[
                { label: 'Patient', value: formData.patientName },
                { label: 'Mobile', value: formData.mobileNumber },
                { label: 'Gender / Age', value: `${formData.gender}${formData.age ? ` / ${formData.age} Yrs` : ''}` },
                { label: 'Department', value: formData.department },
                { label: 'Doctor', value: formData.doctor },
              ].map(row => (
                <div key={row.label}>
                  <span className="block text-xs font-bold text-slate-400 uppercase mb-1">{row.label}</span>
                  <span className="font-semibold text-slate-800">{row.value || '—'}</span>
                </div>
              ))}
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Date &amp; Time</span>
                <div className="flex items-center gap-2 font-semibold text-primary">
                  {formData.date} <span className="text-slate-300">•</span> {formData.timeSlot}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between items-center mt-5">
        <Button variant="outline" onClick={handleBack}>Back</Button>
        {step < 4 ? (
          <Button
            variant="filled"
            color="primary"
            onClick={handleNext}
            disabled={
              (step === 1 && (!formData.patientName || !formData.mobileNumber)) ||
              (step === 2 && (!formData.date || !formData.doctor)) ||
              (step === 3 && !formData.timeSlot)
            }
          >
            Continue to {step === 1 ? 'Doctor' : step === 2 ? 'Schedule' : 'Confirm'}
          </Button>
        ) : (
          <Button variant="filled" color="primary" icon={CheckCircle} onClick={handleConfirm} disabled={saving}>
            {saving ? 'Registering…' : 'Confirm Booking'}
          </Button>
        )}
      </div>
    </div>
  );
};
