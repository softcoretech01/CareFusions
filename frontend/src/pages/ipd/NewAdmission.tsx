import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useIPD } from '../../contexts/IPDContext';
import { usePatients } from '../../contexts/PatientContext';
import { useDoctorSchedules } from '../../contexts/DoctorScheduleContext';
import type { GlobalPatientRecord } from '../../contexts/PatientContext';
import { UserPlus, Save, ArrowLeft, CheckCircle2, Bed, Stethoscope, BedDouble, Search, X, Syringe } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL as string || 'http://localhost:8000/api/v1';

// Union of what OPD's "Recommend Admission" can send and what this form has always offered.
const ADMISSION_TYPES = ['General', 'Day Care', 'Surgical', 'ICU', 'Maternity'];

// "Dr. Charu", "dr charu " and "Charu" all name the same doctor.
const normaliseDoctorName = (name: string) => (name || '').replace(/^dr\.?\s*/i, '').trim().toLowerCase();

export const NewAdmission = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { admitPatient, updateAdmissionRequestStatus, wards, beds } = useIPD();
  const { patients: registeredPatients } = usePatients();
  const { doctorSchedules } = useDoctorSchedules();

  // Searchable UHID picker (registered patients only)
  const [uhidSearch, setUhidSearch] = useState('');
  const [showList, setShowList] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    uhid: '',
    patientName: '',
    age: '',
    gender: 'Male',
    bloodGroup: 'O+',
    admittingDoctor: '',
    specialty: 'General Medicine',
    admissionType: 'General',
    priority: 'Normal',
    expectedStayDays: 3,
    admissionReason: '',
    wardId: '',
    roomNumber: '',
    bedId: '',
    coverageType: 'Self Pay',
    insuranceStatus: 'NOT_APPLICABLE',
    financialStatus: 'PENDING',
    insuranceCompany: '',
    tpa: '',
    policyNumber: '',
    memberId: '',
    policyHolderName: '',
    relationship: '',
    policyStartDate: '',
    policyEndDate: '',
    preAuthNumber: '',
    authStatus: '',
    approvedAmount: '',
    coveragePercentage: '',
    deductible: '',
    coPay: '',
    nonCoveredAmount: '',
    insuranceRemarks: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [minorOperations, setMinorOperations] = useState<any[]>([]);
  const [majorOperations, setMajorOperations] = useState<any[]>([]);
  const [selectedOperations, setSelectedOperations] = useState<{id: number, type: string, name: string, charge: number}[]>([]);

  useEffect(() => {
    const fetchOps = async () => {
      try {
        const [minRes, majRes] = await Promise.all([
          fetch(`${API_BASE}/minor-operations/`),
          fetch(`${API_BASE}/major-operations/`)
        ]);
        if (minRes.ok) setMinorOperations(await minRes.json());
        if (majRes.ok) setMajorOperations(await majRes.json());
      } catch (e) { console.error('Failed to fetch operations', e); }
    };
    fetchOps();
  }, []);

  useEffect(() => {
    if (state?.request) {
      const req = state.request;
      setUhidSearch(req.uhid);
      setForm(prev => ({
        ...prev,
        uhid: req.uhid,
        patientName: req.patientName,
        // admittingDoctor is filled by the doctor-matching effect below, which only accepts a
        // requester that resolves to a real doctor.
        specialty: req.specialty,
        admissionType: req.admissionType,
        priority: req.priority,
        admissionReason: req.admissionReason || '',
      }));
    }
  }, [state]);

  // The request records the requesting doctor as free text ("Dr. Charu"), while the picker is
  // keyed by the doctor master's exact name ("Charu"), so a plain equality check never matched
  // and the field fell back to "Select Doctor". Match on a normalised form instead, and upgrade
  // the raw text to the master's spelling once the schedules finish loading — but only while the
  // field still holds the raw text, so a manual pick is never overwritten.
  const requestedDoctor = (state?.request?.requestedBy || '').trim();
  const requestedSpecialty = (state?.request?.specialty || '').trim();

  const matchedDoctorName = useMemo(() => {
    if (!requestedDoctor) return '';
    const target = normaliseDoctorName(requestedDoctor);
    return doctorSchedules.find(d => normaliseDoctorName(d.name) === target)?.name || '';
  }, [requestedDoctor, doctorSchedules]);

  // Only a requester that resolves to a real doctor is pre-selected. Older requests stored the
  // placeholder "Dr. on duty", which names nobody — leave the field empty in that case so the
  // clerk has to pick an actual admitting doctor rather than admitting the patient under a
  // string that no doctor record backs.
  // Re-runs when the schedules finish loading, so a match found late still lands. The ref stops
  // it from clobbering a pick the clerk has already made.
  const doctorPicked = useRef(false);

  useEffect(() => {
    if (!requestedDoctor || doctorPicked.current) return;
    setForm(prev => (prev.admittingDoctor === matchedDoctorName
      ? prev
      : { ...prev, admittingDoctor: matchedDoctorName }));
  }, [requestedDoctor, matchedDoctorName]);

  const doctorOptions = useMemo(
    () => doctorSchedules.map(doc => ({ key: String(doc.id), name: doc.name })),
    [doctorSchedules]
  );

  // OPD offers General / Day Care / ICU while this form offered General / Surgical / ICU /
  // Maternity, so a "Day Care" request landed on a value with no matching option. Cover both
  // lists, and keep any other incoming value rather than silently showing something else.
  const admissionTypeOptions = useMemo(() => {
    const current = (form.admissionType || '').trim();
    return current && !ADMISSION_TYPES.includes(current)
      ? [...ADMISSION_TYPES, current]
      : ADMISSION_TYPES;
  }, [form.admissionType]);

  // The admission request only carries UHID/name/clinical fields — it has no
  // age, gender or blood group. Pull those from the registered-patient record
  // matched by UHID. Runs again once the patient directory finishes loading, so
  // "Process Admission" fills the demographics even if patients loaded late.
  useEffect(() => {
    if (!state?.request) return;
    const patient = registeredPatients.find(p => p.uhid === state.request.uhid);
    if (!patient) return;
    setForm(prev => ({
      ...prev,
      age: patient.age ? String(patient.age) : prev.age,
      gender: patient.gender || prev.gender,
      bloodGroup: (patient.bloodGroup as string) || prev.bloodGroup,
    }));
  }, [state, registeredPatients]);

  const roomsInWard = useMemo(() => {
    if (!form.wardId) return [];
    const bedsInWard = beds.filter(b => b.wardId === Number(form.wardId));
    return Array.from(new Set(bedsInWard.map(b => b.roomNumber)));
  }, [form.wardId, beds]);

  const bedsInRoom = useMemo(() => {
    if (!form.wardId || !form.roomNumber) return [];
    return beds.filter(b => b.wardId === Number(form.wardId) && b.roomNumber === form.roomNumber);
  }, [form.wardId, form.roomNumber, beds]);

  // Registered patients matching the UHID search box.
  const matchedPatients = useMemo(() => {
    const q = uhidSearch.trim().toLowerCase();
    if (!q) return [];
    return registeredPatients.filter(p =>
      (p.uhid || '').toLowerCase().includes(q) ||
      (p.patientName || '').toLowerCase().includes(q) ||
      (p.mobileNumber || '').includes(uhidSearch.trim())
    ).slice(0, 8);
  }, [uhidSearch, registeredPatients]);

  const selectPatient = (p: GlobalPatientRecord) => {
    setForm(prev => ({
      ...prev,
      uhid: p.uhid,
      patientName: p.patientName || '',
      age: p.age ? String(p.age) : '',
      gender: p.gender || 'Male',
      bloodGroup: (p.bloodGroup as string) || prev.bloodGroup,
    }));
    setUhidSearch(p.uhid);
    setShowList(false);
    setErrors(prev => ({ ...prev, uhid: '', patientName: '', age: '' }));
  };

  // Close the patient dropdown when clicking outside it.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowList(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isRegisteredPatient = useMemo(() => {
    return registeredPatients.some(p => p.uhid && p.uhid === form.uhid);
  }, [form.uhid, registeredPatients]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.uhid.trim()) e.uhid = 'UHID is required';
    if (!form.patientName.trim()) e.patientName = 'Patient name is required';
    else if (!/^[A-Za-z\s]+$/.test(form.patientName.trim())) e.patientName = 'Letters and spaces only';
    if (!String(form.age).trim()) e.age = 'Age is required';
    else if (Number(form.age) < 0 || Number(form.age) > 150) e.age = 'Age must be between 0 and 150';
    if (!form.admittingDoctor.trim()) e.admittingDoctor = 'Admitting doctor is required';
    if (!form.specialty.trim()) e.specialty = 'Specialty is required';
    if (!form.wardId) e.wardId = 'Select a ward';
    if (!form.roomNumber) e.roomNumber = 'Select a room';
    if (!form.bedId) e.bedId = 'Select an available bed';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) {
      toast.error('Please fix the highlighted fields.');
      return;
    }

    admitPatient({
      uhid: form.uhid.trim(),
      patientName: form.patientName.trim(),
      age: Number(form.age),
      gender: form.gender,
      bloodGroup: form.bloodGroup,
      admissionDate: new Date().toISOString(),
      admittingDoctor: form.admittingDoctor.trim(),
      specialty: form.specialty.trim(),
      admissionType: form.admissionType,
      priority: form.priority,
      expectedStayDays: form.expectedStayDays,
      status: 'Admitted',
      currentWardId: Number(form.wardId),
      currentBedId: Number(form.bedId),
      admissionReason: form.admissionReason,
      coverageType: form.coverageType as any,
      insuranceStatus: form.insuranceStatus as any,
      financialStatus: form.financialStatus as any,
      insuranceCompany: form.insuranceCompany || undefined,
      tpa: form.tpa || undefined,
      policyNumber: form.policyNumber || undefined,
      memberId: form.memberId || undefined,
      policyHolderName: form.policyHolderName || undefined,
      relationship: form.relationship || undefined,
      policyStartDate: form.policyStartDate || undefined,
      policyEndDate: form.policyEndDate || undefined,
      preAuthNumber: form.preAuthNumber || undefined,
      authStatus: form.authStatus || undefined,
      approvedAmount: form.approvedAmount ? Number(form.approvedAmount) : undefined,
      coveragePercentage: form.coveragePercentage ? Number(form.coveragePercentage) : undefined,
      deductible: form.deductible ? Number(form.deductible) : undefined,
      coPay: form.coPay ? Number(form.coPay) : undefined,
      nonCoveredAmount: form.nonCoveredAmount ? Number(form.nonCoveredAmount) : undefined,
      insuranceRemarks: form.insuranceRemarks || undefined,
      operations: selectedOperations,
    });

    if (state?.request?.id) {
      updateAdmissionRequestStatus(state.request.id, 'Admitted');
    }

    toast.success('Patient admitted successfully!');
    navigate('/ipd/admission-desk');
  };

  const labelCls = 'block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5';
  const base = 'w-full px-3 py-1.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all font-medium disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-slate-100';
  const fieldCls = (field?: string) =>
    `${base} ${field && errors[field] ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-primary/20 focus:border-primary'}`;
  const Err = ({ f }: { f: string }) => (errors[f] ? <p className="text-red-500 text-xs mt-1">{errors[f]}</p> : null);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">New Admission</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">

        {/* Patient Details */}
        <div>
          <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" /> Patient Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative" ref={searchRef}>
              <label className={labelCls}>UHID <span className="text-red-500">*</span></label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={uhidSearch}
                  // Once a registered patient is locked in (picked, or carried in
                  // from a "Process Admission" request) the UHID is fixed and no
                  // longer editable — use Clear to choose a different patient.
                  readOnly={isRegisteredPatient}
                  onChange={e => {
                    if (isRegisteredPatient) return;
                    setUhidSearch(e.target.value);
                    setShowList(true);
                    if (form.uhid) setForm({ ...form, uhid: '', patientName: '', age: '' });
                  }}
                  onFocus={() => { if (!isRegisteredPatient) setShowList(true); }}
                  autoComplete="off"
                  placeholder="Search registered patient (UHID / Name / Mobile)"
                  className={`${fieldCls('uhid')} pl-9 ${isRegisteredPatient ? 'pr-9 bg-slate-100 text-slate-600 cursor-not-allowed' : ''}`}
                />
                {isRegisteredPatient && (
                  <button
                    type="button"
                    title="Change patient"
                    onClick={() => {
                      setForm({ ...form, uhid: '', patientName: '', age: '' });
                      setUhidSearch('');
                      setShowList(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {showList && !isRegisteredPatient && uhidSearch.trim() && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                  {matchedPatients.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-400">No registered patient found</div>
                  ) : matchedPatients.map(p => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => selectPatient(p)}
                      className="w-full text-left px-3 py-2 hover:bg-primary/5 border-b border-slate-50 last:border-0"
                    >
                      <div className="font-semibold text-slate-800 text-sm">{p.patientName}</div>
                      <div className="text-xs text-slate-500">{p.uhid} · {p.mobileNumber} · {p.gender}{p.age ? `, ${p.age}y` : ''}</div>
                    </button>
                  ))}
                </div>
              )}
              <Err f="uhid" />
            </div>
            <div>
              <label className={labelCls}>Patient Name <span className="text-red-500">*</span></label>
              <input type="text" maxLength={150} value={form.patientName} onChange={e => setForm({ ...form, patientName: e.target.value.replace(/[^A-Za-z\s]/g, '') })} className={fieldCls('patientName')} placeholder="Letters only" disabled={isRegisteredPatient} />
              <Err f="patientName" />
            </div>
            <div>
              <label className={labelCls}>Age <span className="text-red-500">*</span></label>
              <input type="number" min="0" max="150" value={form.age} onChange={e => setForm({ ...form, age: e.target.value.replace(/\D/g, '').slice(0, 3) })} className={fieldCls('age')} placeholder="Years" disabled={isRegisteredPatient} />
              <Err f="age" />
            </div>
            <div>
              <label className={labelCls}>Gender</label>
              <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className={fieldCls()} disabled={isRegisteredPatient}>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Clinical Details */}
        <div>
          <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-primary" /> Clinical &amp; Admission Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Admitting Doctor <span className="text-red-500">*</span></label>
              <select 
                value={form.admittingDoctor} 
                onChange={e => {
                  doctorPicked.current = true;
                  const docName = e.target.value;
                  const doc = doctorSchedules.find(d => d.name === docName);
                  setForm({
                    ...form,
                    admittingDoctor: docName,
                    // The specialty the consulting doctor asked for is the clinical decision, so
                    // it survives whoever ends up admitting the patient. Only a direct admission,
                    // which carries no requested specialty, defaults to the doctor's department.
                    specialty: requestedSpecialty || (doc ? doc.dept : form.specialty),
                  });
                }}
                className={fieldCls('admittingDoctor')}
              >
                <option value="">Select Doctor</option>
                {doctorOptions.map(doc => (
                  <option key={doc.key} value={doc.name}>{doc.name}</option>
                ))}
              </select>
              <Err f="admittingDoctor" />
            </div>
            <div>
              <label className={labelCls}>Specialty <span className="text-red-500">*</span></label>
              {/* Locked only while the doctor's department is filling this in — a requested
                  specialty is the clerk's to correct if it is wrong. */}
              <input type="text" maxLength={100} value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} className={fieldCls('specialty')} disabled={!requestedSpecialty && !!form.admittingDoctor} />
              <Err f="specialty" />
            </div>
            <div>
              <label className={labelCls}>Admission Type</label>
              <select value={form.admissionType} onChange={e => setForm({ ...form, admissionType: e.target.value })} className={fieldCls()}>
                {admissionTypeOptions.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Admission Reason</label>
              <input type="text" maxLength={500} value={form.admissionReason} onChange={e => setForm({ ...form, admissionReason: e.target.value })} className={fieldCls()} />
            </div>
          </div>
        </div>

        {/* Bed Allocation */}
        <div>
          <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
            <BedDouble className="w-4 h-4 text-primary" /> Bed Allocation &amp; Finance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Select Ward <span className="text-red-500">*</span></label>
              <select value={form.wardId} onChange={e => setForm({ ...form, wardId: e.target.value, roomNumber: '', bedId: '' })} className={fieldCls('wardId')}>
                <option value="">Select Ward</option>
                {wards.filter(w => {
                  if (w.genderRestriction !== 'Any' && w.genderRestriction !== form.gender) return false;
                  return true;
                }).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <Err f="wardId" />
            </div>
            <div>
              <label className={labelCls}>Select Room <span className="text-red-500">*</span></label>
              <select value={form.roomNumber} onChange={e => setForm({ ...form, roomNumber: e.target.value, bedId: '' })} className={fieldCls('roomNumber')} disabled={!form.wardId}>
                <option value="">Select Room</option>
                {roomsInWard.map(room => <option key={room} value={room}>{room}</option>)}
              </select>
              <Err f="roomNumber" />
            </div>
            <div>
              <label className={labelCls}>Financial Coverage</label>
              <select value={form.coverageType} onChange={e => setForm({ ...form, coverageType: e.target.value as any })} className={fieldCls()}>
                <option value="Self Pay">Self Pay</option>
                <option value="Insurance">Insurance</option>
              </select>
            </div>
            {form.coverageType === 'Insurance' && (
              <>
                <div>
                  <label className={labelCls}>Insurance Status</label>
                  <select value={form.insuranceStatus} onChange={e => setForm({ ...form, insuranceStatus: e.target.value })} className={fieldCls()}>
                    <option value="NOT_APPLICABLE">Not Applicable</option>
                    <option value="PENDING">Pending Approval</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Insurance Company</label>
                  <input type="text" value={form.insuranceCompany} onChange={e => setForm({ ...form, insuranceCompany: e.target.value })} className={fieldCls()} placeholder="Company Name" />
                </div>
                <div>
                  <label className={labelCls}>TPA</label>
                  <input type="text" value={form.tpa} onChange={e => setForm({ ...form, tpa: e.target.value })} className={fieldCls()} placeholder="TPA" />
                </div>
                <div>
                  <label className={labelCls}>Policy Number</label>
                  <input type="text" value={form.policyNumber} onChange={e => setForm({ ...form, policyNumber: e.target.value })} className={fieldCls()} placeholder="Policy Number" />
                </div>
                <div>
                  <label className={labelCls}>Member ID</label>
                  <input type="text" value={form.memberId} onChange={e => setForm({ ...form, memberId: e.target.value })} className={fieldCls()} placeholder="Member ID" />
                </div>
                <div>
                  <label className={labelCls}>Auth Number</label>
                  <input type="text" value={form.preAuthNumber} onChange={e => setForm({ ...form, preAuthNumber: e.target.value })} className={fieldCls()} placeholder="Pre-Auth Number" />
                </div>
                <div>
                  <label className={labelCls}>Auth Status</label>
                  <select value={form.authStatus} onChange={e => setForm({ ...form, authStatus: e.target.value })} className={fieldCls()}>
                    <option value="">Select Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Denied">Denied</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Approved Amount</label>
                  <input type="number" value={form.approvedAmount} onChange={e => setForm({ ...form, approvedAmount: e.target.value })} className={fieldCls()} placeholder="Amount" />
                </div>
                <div>
                  <label className={labelCls}>Coverage %</label>
                  <input type="number" value={form.coveragePercentage} onChange={e => setForm({ ...form, coveragePercentage: e.target.value })} className={fieldCls()} placeholder="%" />
                </div>
                <div>
                  <label className={labelCls}>Deductible</label>
                  <input type="number" value={form.deductible} onChange={e => setForm({ ...form, deductible: e.target.value })} className={fieldCls()} placeholder="Deductible" />
                </div>
                <div>
                  <label className={labelCls}>Co-Pay</label>
                  <input type="number" value={form.coPay} onChange={e => setForm({ ...form, coPay: e.target.value })} className={fieldCls()} placeholder="Co-Pay Amount" />
                </div>
              </>
            )}
          </div>

          {/* Visual Bed Selection */}
          {form.roomNumber && (
            <div className="mt-4 border border-slate-100 bg-slate-50/50 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-slate-700 mb-3">Select an Available Bed</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {bedsInRoom.map(bed => {
                  const isAvailable = bed.status === 'Available';
                  const isSelected = form.bedId === String(bed.id);
                  return (
                    <div
                      key={bed.id}
                      onClick={() => { if (isAvailable) setForm({ ...form, bedId: String(bed.id) }); }}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                        isAvailable
                          ? isSelected
                            ? 'border-primary bg-primary/5 cursor-pointer shadow-sm'
                            : 'border-slate-200 bg-white hover:border-primary/50 cursor-pointer hover:shadow-sm'
                          : 'border-red-100 bg-red-50/50 cursor-not-allowed opacity-75'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 ${
                        isAvailable ? (isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500') : 'bg-red-100 text-red-500'
                      }`}>
                        <Bed className="w-5 h-5" />
                      </div>
                      <span className={`font-bold text-sm ${isSelected ? 'text-primary' : 'text-slate-700'}`}>{bed.bedNumber}</span>
                      <span className={`text-[10px] uppercase tracking-wider font-bold mt-1 px-2 py-0.5 rounded-full ${
                        isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {bed.status}
                      </span>
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-sm">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <Err f="bedId" />
            </div>
          )}
        </div>

        {/* Operation Selection (Only if OT is selected) */}
        {form.wardId && wards.find(w => w.id === Number(form.wardId))?.name.toUpperCase().includes('OT') && (
          <div>
            <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
              <Syringe className="w-4 h-4 text-primary" /> Operations Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Select Minor Operations</label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {minorOperations.map(op => {
                    const isSelected = selectedOperations.some(so => so.id === op.id && so.type === 'Minor');
                    return (
                      <label key={op.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded-lg cursor-pointer">
                        <input type="checkbox" checked={isSelected} onChange={(e) => {
                          if (e.target.checked) setSelectedOperations(prev => [...prev, { id: op.id, type: 'Minor', name: op.operationName, charge: op.defaultCharge }]);
                          else setSelectedOperations(prev => prev.filter(so => !(so.id === op.id && so.type === 'Minor')));
                        }} className="rounded border-slate-300 text-primary focus:ring-primary/20" />
                        <span className="text-sm text-slate-700">{op.operationName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={labelCls}>Select Major Operations</label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {majorOperations.map(op => {
                    const isSelected = selectedOperations.some(so => so.id === op.id && so.type === 'Major');
                    return (
                      <label key={op.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded-lg cursor-pointer">
                        <input type="checkbox" checked={isSelected} onChange={(e) => {
                          if (e.target.checked) setSelectedOperations(prev => [...prev, { id: op.id, type: 'Major', name: op.operationName, charge: op.defaultCharge }]);
                          else setSelectedOperations(prev => prev.filter(so => !(so.id === op.id && so.type === 'Major')));
                        }} className="rounded border-slate-300 text-primary focus:ring-primary/20" />
                        <span className="text-sm text-slate-700">{op.operationName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 flex justify-end">
          <button type="submit" className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Save className="w-5 h-5" /> Admit Patient
          </button>
        </div>
      </form>
    </div>
  );
};
