import { useState, useRef, useEffect } from 'react';
import { Search, Building2, Stethoscope, CheckCircle, UserCheck, UserPlus, Clock, AlertCircle, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAppointments } from '../../contexts/AppointmentContext';
import { usePatients } from '../../contexts/PatientContext';
import type { GlobalPatientRecord } from '../../contexts/PatientContext';
import { useNavigate } from 'react-router-dom';
import { useDoctorSchedules } from '../../contexts/DoctorScheduleContext';
import { getBookedSlots } from '../../data/doctorSchedules';

const MOCK_DEPARTMENTS = ['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Dermatology', 'Neurology'];

const TIME_SLOTS = [
  '09:00 AM', '09:15 AM', '09:30 AM', '09:45 AM',
  '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM',
  '11:00 AM', '11:15 AM', '11:30 AM', '11:45 AM',
];

export const NewOnlineBooking = () => {
  const { addAppointment, appointments, generateAppointmentNumber } = useAppointments();
  const { getDoctorsWithAvailability } = useDoctorSchedules();
  const { patients, addPatient } = usePatients();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [patientSearch, setPatientSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<GlobalPatientRecord | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    patientName: '',
    mobileNumber: '',
    email: '',
    gender: 'Male',
    age: '',
    department: '',
    doctor: '',
    date: new Date().toISOString().split('T')[0],
    timeSlot: '',
  });

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
    if (step === 1) navigate('/appointments/online-booking');
    else setStep(prev => prev - 1);
  };

  const handleConfirm = () => {
    let uhidToUse = '';

    if (selectedPatient) {
      // Existing patient — reuse their UHID, do NOT create new patient
      uhidToUse = selectedPatient.uhid;
    } else {
      // New patient — generate UHID and create in PatientContext (registration)
      uhidToUse = `UHID-ONL-${String(Math.floor(Math.random() * 9000) + 1000)}`;
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
      status: 'Scheduled',
    });

    navigate('/appointments/online-booking');
  };

  const steps = [
    { num: 1, label: 'Patient' },
    { num: 2, label: 'Doctor' },
    { num: 3, label: 'Schedule' },
    { num: 4, label: 'Confirm' },
  ];



  // Doctors with availability for Step 2
  const doctorsWithAvailability = formData.department
    ? getDoctorsWithAvailability(formData.department, formData.date)
    : [];

  // Booked slots for Step 3
  const bookedSlots = formData.doctor && formData.date
    ? getBookedSlots(formData.doctor, formData.date, appointments)
    : new Set<string>();

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Top Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">New Online Booking</h1>
        <Button variant="outline" onClick={handleBack}>Back</Button>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-12 relative">
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
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm min-h-[420px]">

        {/* ─── STEP 1: Patient Details ─── */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Patient Details</h2>

            {/* Existing Patient Search */}
            <div className="mb-6" ref={searchRef}>
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
                        className="flex items-center gap-3 px-4 py-3 hover:bg-primary/5 cursor-pointer transition-colors border-b border-slate-50 last:border-0"
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

              {/* Patient type indicator */}
              {!selectedPatient && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>New patient — a new UHID will be auto-generated and registered</span>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.patientName}
                    onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                    disabled={!!selectedPatient}
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                      selectedPatient ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                    }`}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile Number <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.mobileNumber}
                    onChange={e => setFormData({ ...formData, mobileNumber: e.target.value })}
                    disabled={!!selectedPatient}
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                      selectedPatient ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                    }`}
                    placeholder="10-digit mobile number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    disabled={!!selectedPatient}
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
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
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
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
                    value={formData.age}
                    onChange={e => setFormData({ ...formData, age: e.target.value })}
                    disabled={!!selectedPatient}
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                      selectedPatient ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                    }`}
                    placeholder="Years"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Department & Doctor ─── */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Department &amp; Doctor</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Department column */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Department <span className="text-red-500">*</span></label>
                <div className="space-y-3">
                  {MOCK_DEPARTMENTS.map(dept => (
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
                {formData.department ? (
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
                  <div className="h-full min-h-[200px] border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 font-medium">
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
            <h2 className="text-xl font-bold text-slate-800 mb-6">Schedule Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date <span className="text-red-500">*</span></label>
                <div className="relative">
                  <CalendarIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value, timeSlot: '' })}
                    className="w-full px-4 py-3 pl-12 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-slate-700 font-medium"
                  />
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
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Available Slots <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map(time => {
                    const isBooked = bookedSlots.has(time);
                    const isSelected = formData.timeSlot === time;
                    return (
                      <div
                        key={time}
                        onClick={() => !isBooked && setFormData({ ...formData, timeSlot: time })}
                        title={isBooked ? 'This slot is already booked' : ''}
                        className={`py-2 px-1 text-center rounded-lg border-2 text-xs font-semibold transition-all duration-200 select-none ${
                          isBooked
                            ? 'bg-red-700 border-red-700 text-white cursor-not-allowed opacity-85'
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
            <div className="flex flex-col items-center text-center mb-8">
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
              {selectedPatient ? `Existing Patient · UHID: ${selectedPatient.uhid}` : 'New Patient · UHID will be auto-generated'}
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
      <div className="flex justify-end items-center mt-8">
        {step < 4 ? (
          <Button
            variant="filled"
            color="primary"
            onClick={handleNext}
            disabled={
              (step === 1 && (!formData.patientName || !formData.mobileNumber)) ||
              (step === 2 && !formData.doctor) ||
              (step === 3 && (!formData.date || !formData.timeSlot))
            }
          >
            Continue to {step === 1 ? 'Doctor' : step === 2 ? 'Schedule' : 'Confirm'}
          </Button>
        ) : (
          <Button variant="filled" color="primary" icon={CheckCircle} onClick={handleConfirm}>
            Confirm Booking
          </Button>
        )}
      </div>
    </div>
  );
};
