import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useIPD } from '../../contexts/IPDContext';
import { UserPlus, Save, ArrowLeft, CheckCircle2, Bed, Stethoscope, BedDouble } from 'lucide-react';
import toast from 'react-hot-toast';

export const NewAdmission = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { admitPatient, updateAdmissionRequestStatus, wards, beds } = useIPD();

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
    provisionalDiagnosis: '',
    insuranceStatus: 'Self Pay',
    wardId: '',
    roomNumber: '',
    bedId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (state?.request) {
      const req = state.request;
      setForm(prev => ({
        ...prev,
        uhid: req.uhid,
        patientName: req.patientName,
        admittingDoctor: req.requestedBy,
        specialty: req.specialty,
        admissionType: req.admissionType,
        priority: req.priority,
        provisionalDiagnosis: req.provisionalDiagnosis,
      }));
    }
  }, [state]);

  const roomsInWard = useMemo(() => {
    if (!form.wardId) return [];
    const bedsInWard = beds.filter(b => b.wardId === Number(form.wardId));
    return Array.from(new Set(bedsInWard.map(b => b.roomNumber)));
  }, [form.wardId, beds]);

  const bedsInRoom = useMemo(() => {
    if (!form.wardId || !form.roomNumber) return [];
    return beds.filter(b => b.wardId === Number(form.wardId) && b.roomNumber === form.roomNumber);
  }, [form.wardId, form.roomNumber, beds]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.uhid.trim()) e.uhid = 'UHID is required';
    if (!form.patientName.trim()) e.patientName = 'Patient name is required';
    else if (!/^[A-Za-z\s]+$/.test(form.patientName.trim())) e.patientName = 'Letters and spaces only';
    if (!String(form.age).trim()) e.age = 'Age is required';
    else if (Number(form.age) < 0 || Number(form.age) > 150) e.age = 'Age must be between 0 and 150';
    if (!form.admittingDoctor.trim()) e.admittingDoctor = 'Admitting doctor is required';
    else if (!/^[A-Za-z\s.\-]+$/.test(form.admittingDoctor.trim())) e.admittingDoctor = "Letters, spaces, '.' and '-' only";
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
      provisionalDiagnosis: form.provisionalDiagnosis,
      insuranceStatus: form.insuranceStatus,
    });

    if (state?.request?.id) {
      updateAdmissionRequestStatus(state.request.id, 'Admitted');
    }

    toast.success('Patient admitted successfully!');
    navigate('/ipd/admission-desk');
  };

  const labelCls = 'block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5';
  const base = 'w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all font-medium';
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

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-5">

        {/* Patient Details */}
        <div>
          <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" /> Patient Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>UHID <span className="text-red-500">*</span></label>
              <input type="text" maxLength={30} value={form.uhid} onChange={e => setForm({ ...form, uhid: e.target.value })} className={fieldCls('uhid')} />
              <Err f="uhid" />
            </div>
            <div>
              <label className={labelCls}>Patient Name <span className="text-red-500">*</span></label>
              <input type="text" maxLength={150} value={form.patientName} onChange={e => setForm({ ...form, patientName: e.target.value.replace(/[^A-Za-z\s]/g, '') })} className={fieldCls('patientName')} placeholder="Letters only" />
              <Err f="patientName" />
            </div>
            <div>
              <label className={labelCls}>Age <span className="text-red-500">*</span></label>
              <input type="number" min="0" max="150" value={form.age} onChange={e => setForm({ ...form, age: e.target.value.replace(/\D/g, '').slice(0, 3) })} className={fieldCls('age')} placeholder="Years" />
              <Err f="age" />
            </div>
            <div>
              <label className={labelCls}>Gender</label>
              <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className={fieldCls()}>
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
              <input type="text" maxLength={150} value={form.admittingDoctor} onChange={e => setForm({ ...form, admittingDoctor: e.target.value.replace(/[^A-Za-z\s.\-]/g, '') })} className={fieldCls('admittingDoctor')} placeholder="e.g. Dr. Sarah Jenkins" />
              <Err f="admittingDoctor" />
            </div>
            <div>
              <label className={labelCls}>Specialty <span className="text-red-500">*</span></label>
              <input type="text" maxLength={100} value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} className={fieldCls('specialty')} />
              <Err f="specialty" />
            </div>
            <div>
              <label className={labelCls}>Admission Type</label>
              <select value={form.admissionType} onChange={e => setForm({ ...form, admissionType: e.target.value })} className={fieldCls()}>
                <option>General</option><option>Surgical</option><option>ICU</option><option>Maternity</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Provisional Diagnosis</label>
              <input type="text" maxLength={500} value={form.provisionalDiagnosis} onChange={e => setForm({ ...form, provisionalDiagnosis: e.target.value })} className={fieldCls()} />
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
                {wards.map(w => <option key={w.id} value={w.id}>{w.name} ({w.type})</option>)}
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
              <label className={labelCls}>Insurance Status</label>
              <select value={form.insuranceStatus} onChange={e => setForm({ ...form, insuranceStatus: e.target.value })} className={fieldCls()}>
                <option>Self Pay</option><option>Covered</option><option>Pending Approval</option>
              </select>
            </div>
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

        <div className="flex justify-end pt-2">
          <button type="submit" className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Save className="w-5 h-5" /> Admit Patient
          </button>
        </div>
      </form>
    </div>
  );
};
