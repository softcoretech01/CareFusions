import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useIPD } from '../../contexts/IPDContext';
import { UserPlus, Save, ArrowLeft, CheckCircle2, Bed } from 'lucide-react';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.wardId || !form.bedId) {
      toast.error('Please assign a ward and bed.');
      return;
    }

    admitPatient({
      uhid: form.uhid,
      patientName: form.patientName,
      age: Number(form.age),
      gender: form.gender,
      bloodGroup: form.bloodGroup,
      admissionDate: new Date().toISOString(),
      admittingDoctor: form.admittingDoctor,
      specialty: form.specialty,
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

  const inputCls = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-3xl font-bold text-slate-800">New Admission</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-8">
        
        {/* Patient Details */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> Patient Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">UHID</label>
              <input required type="text" value={form.uhid} onChange={e => setForm({...form, uhid: e.target.value})} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Patient Name</label>
              <input required type="text" value={form.patientName} onChange={e => setForm({...form, patientName: e.target.value})} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Age</label>
              <input required type="number" value={form.age} onChange={e => setForm({...form, age: e.target.value})} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gender</label>
              <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className={inputCls}>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Clinical Details */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> Clinical & Admission Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Admitting Doctor</label>
              <input required type="text" value={form.admittingDoctor} onChange={e => setForm({...form, admittingDoctor: e.target.value})} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Specialty</label>
              <input required type="text" value={form.specialty} onChange={e => setForm({...form, specialty: e.target.value})} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Admission Type</label>
              <select value={form.admissionType} onChange={e => setForm({...form, admissionType: e.target.value})} className={inputCls}>
                <option>General</option><option>Surgical</option><option>ICU</option><option>Maternity</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Provisional Diagnosis</label>
              <input type="text" value={form.provisionalDiagnosis} onChange={e => setForm({...form, provisionalDiagnosis: e.target.value})} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Bed Allocation */}
        <div>
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-5 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> Bed Allocation & Finance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Ward</label>
              <select value={form.wardId} onChange={e => setForm({...form, wardId: e.target.value, roomNumber: '', bedId: ''})} className={inputCls} required>
                <option value="">Select Ward</option>
                {wards.map(w => <option key={w.id} value={w.id}>{w.name} ({w.type})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Room</label>
              <select value={form.roomNumber} onChange={e => setForm({...form, roomNumber: e.target.value, bedId: ''})} className={inputCls} required disabled={!form.wardId}>
                <option value="">Select Room</option>
                {roomsInWard.map(room => <option key={room} value={room}>{room}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Insurance Status</label>
              <select value={form.insuranceStatus} onChange={e => setForm({...form, insuranceStatus: e.target.value})} className={inputCls}>
                <option>Self Pay</option><option>Covered</option><option>Pending Approval</option>
              </select>
            </div>
          </div>

          {/* Visual Bed Selection */}
          {form.roomNumber && (
            <div className="mt-8 border border-slate-100 bg-slate-50/50 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Select an Available Bed</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {bedsInRoom.map(bed => {
                  const isAvailable = bed.status === 'Available';
                  const isSelected = form.bedId === String(bed.id);
                  return (
                    <div 
                      key={bed.id}
                      onClick={() => {
                        if (isAvailable) setForm({...form, bedId: String(bed.id)});
                      }}
                      className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                        isAvailable 
                          ? isSelected 
                            ? 'border-primary bg-primary/5 cursor-pointer shadow-sm transform scale-[1.02]' 
                            : 'border-slate-200 bg-white hover:border-primary/50 cursor-pointer hover:shadow-sm'
                          : 'border-red-100 bg-red-50/50 cursor-not-allowed opacity-75'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                        isAvailable ? (isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500') : 'bg-red-100 text-red-500'
                      }`}>
                        <Bed className="w-6 h-6" />
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
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Save className="w-5 h-5" /> Admit Patient
          </button>
        </div>
      </form>
    </div>
  );
};
