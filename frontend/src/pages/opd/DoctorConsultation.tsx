import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOPDVisits } from '../../contexts/OPDVisitContext';
import { useAppointments } from '../../contexts/AppointmentContext';
import { useIPD } from '../../contexts/IPDContext';
import { useInvestigations } from '../../contexts/InvestigationContext';
import type { Diagnosis, PrescriptionItem, LabOrder, RadiologyOrder } from '../../contexts/OPDVisitContext';
const API_BASE = import.meta.env.VITE_API_URL as string;

// Types for live master data
interface ApiLabTest {
  code: string;
  name: string;
  category: string;
}

interface ApiRadiologyService {
  name: string;
  modality: string;
}
import { User, AlertTriangle, Hash, Activity, Pill, FlaskConical, ScanLine, CheckCircle, Plus, Trash2, Eye, BookOpen, ArrowLeft, RefreshCw, History, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'history', label: 'History', icon: History },
  { id: 'diagnosis', label: 'Diagnosis', icon: BookOpen },
  { id: 'prescription', label: 'Prescription', icon: Pill },
  { id: 'lab', label: 'Lab Orders', icon: FlaskConical },
  { id: 'radiology', label: 'Radiology', icon: ScanLine },
  { id: 'summary', label: 'Summary', icon: Eye },
];

const inputCls = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all';
const labelCls = 'block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5';

const UOM_MAP: Record<string, string> = {
  'Tablet': 'Tabs',
  'Capsule': 'Caps',
  'Injection': 'Vials / ml',
  'Syrup': 'Bottles / ml',
  'Ointment': 'Tubes',
  'Drops': 'ml',
};

const VitalChip = ({ label, value, unit, alert }: { label: string; value: any; unit: string; alert?: boolean }) => (
  <div className={`px-3 py-2 rounded-xl border text-center ${alert ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
    <div className={`text-lg font-bold ${alert ? 'text-red-600' : 'text-slate-800'}`}>{value ?? '—'}<span className="text-xs font-normal ml-0.5">{unit}</span></div>
    <div className="text-[10px] text-slate-400 font-semibold uppercase">{label}</div>
  </div>
);

export const DoctorConsultation = () => {
  const { visitId } = useParams<{ visitId: string }>();
  const {
    getVisitById, addDiagnosis, removeDiagnosis,
    addPrescription, removePrescription, addLabOrder, removeLabOrder,
    addRadiologyOrder, removeRadiologyOrder, finalizeVisit, updateVisitStatus, visits
  } = useOPDVisits();

  const { appointments, updateAppointmentStatus } = useAppointments();
  const { requestAdmission, patients } = useIPD();
  const { addOrder: addGlobalInvestigationOrder } = useInvestigations();

  const navigate = useNavigate();

  const visit = getVisitById(Number(visitId));
  const isAdmitted = patients?.some(p => p.uhid === visit?.uhid && p.status === 'Admitted');
  const [activeTab, setActiveTab] = useState('history');

  const patientHistory = visits
    .filter(v => v.uhid === visit?.uhid && v.id !== visit?.id && v.status === 'Completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ── Lab Tests from Master API ──
  const [apiLabTests, setApiLabTests] = useState<ApiLabTest[]>([]);
  const [labTestsLoading, setLabTestsLoading] = useState(true);

  // ── Radiology Services from Master API ──
  const [apiRadiologyServices, setApiRadiologyServices] = useState<ApiRadiologyService[]>([]);
  const [radServicesLoading, setRadServicesLoading] = useState(true);

  // ── Medicine Data from API ──
  const [apiMedicines, setApiMedicines] = useState<any[]>([]);

  useEffect(() => {
    // Fetch Lab Tests from Master_LabTest
    const fetchLabTests = async () => {
      try {
        const res = await fetch(`${API_BASE}/tests/`);
        if (res.ok) {
          const data = await res.json();
          const active = data
            .filter((item: any) => item.status === 'Active')
            .map((item: any): ApiLabTest => ({
              code: item.testCode,
              name: item.testName,
              category: item.testCategory || '',
            }));
          setApiLabTests(active);
        }
      } catch (e) {
        console.error('Failed to fetch lab tests from master', e);
      } finally {
        setLabTestsLoading(false);
      }
    };

    // Fetch Radiology Services from Master_RadiologyService
    const fetchRadiologyServices = async () => {
      try {
        const res = await fetch(`${API_BASE}/radiology-services/`);
        if (res.ok) {
          const data = await res.json();
          const active = data
            .filter((item: any) => item.status === 'Active')
            .map((item: any): ApiRadiologyService => ({
              name: item.serviceName,
              modality: item.serviceCategory || '',
            }));
          setApiRadiologyServices(active);
        }
      } catch (e) {
        console.error('Failed to fetch radiology services from master', e);
      } finally {
        setRadServicesLoading(false);
      }
    };

    fetchLabTests();
    fetchRadiologyServices();
  }, []);

  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        const res = await fetch(`${API_BASE}/medicines`);
        if (res.ok) {
          const data = await res.json();
          // Filter to only active medicines
          setApiMedicines(data.filter((m: any) => m.status === 'Active' || m.status === 'active'));
        }
      } catch (e) {
        console.error("Failed to fetch medicines", e);
      }
    };
    fetchMedicines();
  }, []);

  // Compute unique types (Dosage Forms) from live medicines to populate the Type dropdown
  const uniqueDosageForms = Array.from(
    new Set(apiMedicines.map(m => m.dosageForm).filter(Boolean))
  ).sort();

  // Sync Global Queue Status to 'Consulting'
  useEffect(() => {
    if (visit && visit.appointmentId && visit.status !== 'Consulting' && visit.status !== 'Completed') {
      updateAppointmentStatus(visit.appointmentId, 'Consulting');
      updateVisitStatus(visit.id, 'Consulting');
    }
  }, [visit, updateAppointmentStatus, updateVisitStatus]);

  // Diagnosis State
  const [diagnosisText, setDiagnosisText] = useState('');

  // Prescription State
  const [rxForm, setRxForm] = useState({
    type: 'Tablet' as PrescriptionItem['type'],
    medicineName: '',
    quantity: '',
  });

  // Lab & Radiology local state (checked IDs)
  const [selectedLabs, setSelectedLabs] = useState<string[]>([]);
  const [selectedRadiology, setSelectedRadiology] = useState<string[]>([]);
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [admitForm, setAdmitForm] = useState({ specialty: 'General Medicine', type: 'General', priority: 'Normal' });

  useEffect(() => {
    if (visit) {
      setSelectedLabs(visit.labOrders.map(l => l.testCode));
      setSelectedRadiology(visit.radiologyOrders.map(r => r.bodyPart));
    }
  }, [visit]);

  if (!visit) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
      <div className="text-5xl">🔍</div>
      <p className="font-semibold text-slate-600">Visit not found or session expired.</p>
      <button onClick={() => navigate(-1)} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
        ← Go Back
      </button>
    </div>
  );


  const handleAddDiagnosis = () => {
    if (!diagnosisText.trim()) return;
    const diag: Diagnosis = {
      id: Date.now().toString(),
      description: diagnosisText,
    };
    addDiagnosis(visit.id, diag);
    setDiagnosisText('');
    toast.success('Diagnosis added');
  };

  const handleAddPrescription = () => {
    if (!rxForm.medicineName) {
      toast.error('Select a medicine');
      return;
    }
    const item: PrescriptionItem = {
      id: Date.now().toString(),
      type: rxForm.type,
      medicineName: rxForm.medicineName,
      quantity: rxForm.quantity,
      alerts: [],
    };
    addPrescription(visit.id, item);
    setRxForm({ type: 'Tablet', medicineName: '', quantity: '1' });
    toast.success('Added to prescription');
  };

  const toggleLabOrder = (test: ApiLabTest) => {
    const isSelected = selectedLabs.includes(test.code);
    if (isSelected) {
      const order = visit.labOrders.find(o => o.testCode === test.code);
      if (order) removeLabOrder(visit.id, order.id);
      setSelectedLabs(prev => prev.filter(c => c !== test.code));
    } else {
      const order: LabOrder = {
        id: Date.now().toString(),
        testName: test.name,
        testCode: test.code,
        priority: 'Routine',
        clinicalNotes: '',
        status: 'Ordered',
      };
      addLabOrder(visit.id, order);
      setSelectedLabs(prev => [...prev, test.code]);
    }
  };

  const toggleRadiologyOrder = (svc: ApiRadiologyService) => {
    const isSelected = selectedRadiology.includes(svc.name);
    if (isSelected) {
      const order = visit.radiologyOrders.find(o => o.bodyPart === svc.name);
      if (order) removeRadiologyOrder(visit.id, order.id);
      setSelectedRadiology(prev => prev.filter(c => c !== svc.name));
    } else {
      const order: RadiologyOrder = {
        id: Date.now().toString(),
        modality: svc.modality as RadiologyOrder['modality'],
        bodyPart: svc.name,
        indication: '',
        priority: 'Routine',
        contrastRequired: false,
        specialInstructions: '',
        status: 'Ordered',
      };
      addRadiologyOrder(visit.id, order);
      setSelectedRadiology(prev => [...prev, svc.name]);
    }
  };


  const handleFinalizeVisit = () => {
    finalizeVisit(visit.id, 'Dr. on duty');

    // Push Labs to Global Investigation Context
    if (visit.labOrders.length > 0) {
      addGlobalInvestigationOrder({
        id: `LAB-${Date.now().toString().slice(-6)}`,
        type: 'OP',
        category: 'Lab',
        patientId: visit.uhid,
        patientName: visit.patientName,
        orderedBy: visit.doctorName,
        orderedAt: new Date().toISOString(),
        tests: visit.labOrders.map(l => ({ id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36), name: l.testName, status: 'Pending' })),
        status: 'Pending'
      });
    }

    // Push Radiology to Global Investigation Context
    if (visit.radiologyOrders.length > 0) {
      addGlobalInvestigationOrder({
        id: `RAD-${Date.now().toString().slice(-6)}`,
        type: 'OP',
        category: 'Radiology',
        patientId: visit.uhid,
        patientName: visit.patientName,
        orderedBy: visit.doctorName,
        orderedAt: new Date().toISOString(),
        tests: visit.radiologyOrders.map(r => ({ id: Math.random().toString(36).substring(2, 10) + Date.now().toString(36), name: r.bodyPart, status: 'Pending' })),
        status: 'Pending'
      });
    }

    // Find corresponding appointment
    let apptId = visit.appointmentId;
    if (!apptId) {
      const match = appointments.find(a => a.uhid === visit.uhid && a.date === visit.date);
      if (match) apptId = match.id;
    }

    if (apptId) {
      updateAppointmentStatus(apptId, 'Completed');
    }

    toast.success('Visit finalized successfully');
    navigate(-1);
  };

  const handleUpdateEMR = () => {
    toast.success('EMR Updated Successfully');
    navigate(-1);
  };

  const handleRecommendAdmission = () => {
    if (visit.diagnoses.length === 0) {
      toast.error('Please add a diagnosis before admitting.');
      return;
    }
    requestAdmission({
      uhid: visit.uhid,
      patientName: visit.patientName,
      specialty: admitForm.specialty,
      admissionType: admitForm.type,
      priority: admitForm.priority,
      provisionalDiagnosis: visit.diagnoses.map(d => d.description).join(', '),
      requestedBy: 'Dr. on duty'
    });

    // Auto Finalize Visit
    handleFinalizeVisit();
    toast.success('Admission Request Sent to IPD');
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-6 overflow-hidden">
      {/* ── LEFT PANEL — Patient info ─────────────────────────────────────── */}
      <div className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors self-start font-bold text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Patient card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 mx-auto mb-3">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-center font-bold text-slate-800 text-lg">{visit.patientName}</h2>
          <p className="text-center text-xs text-slate-400 mt-0.5">{visit.uhid}</p>
          <p className="text-center text-sm text-slate-500 mt-1">{visit.age} yrs · {visit.gender}</p>

          <div className="mt-3 flex items-center justify-center">
            <span className="font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-lg text-sm flex items-center gap-1">
              <Hash className="w-3 h-3" />{visit.queueToken}
            </span>
          </div>

          {visit.allergies.length > 0 && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-bold text-red-600 uppercase">Allergies</span>
              </div>
              {visit.allergies.map((a, i) => (
                <span key={a || i} className="inline-block text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full mr-1 mb-1">{a}</span>
              ))}
            </div>
          )}
        </div>

        {/* Vitals */}
        {visit.vitals && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" /> Vitals
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <VitalChip label="BP" value={`${visit.vitals.bp_systolic}/${visit.vitals.bp_diastolic}`} unit="" alert={visit.vitals.bp_systolic > 140} />
              <VitalChip label="Pulse" value={visit.vitals.pulse} unit="bpm" />
              <VitalChip label="Temp" value={visit.vitals.temp} unit={`°${visit.vitals.tempUnit}`} />
              <VitalChip label="SpO₂" value={visit.vitals.spo2} unit="%" />
            </div>
            {visit.triageInfo && (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Chief Complaint</p>
                <p className="text-sm text-slate-700">{visit.triageInfo.chiefComplaint}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CENTER — Tabs ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Tab bar */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1 mb-4 overflow-x-auto shrink-0">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const badge = tab.id === 'prescription' ? visit.prescriptions.length
              : tab.id === 'lab' ? visit.labOrders.length
                : tab.id === 'radiology' ? visit.radiologyOrders.length
                  : tab.id === 'diagnosis' ? visit.diagnoses.length
                    : 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all relative ${activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {badge > 0 && (
                  <span className={`ml-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${activeTab === tab.id ? 'bg-white text-primary' : 'bg-primary text-white'
                    }`}>{badge}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* ── DIAGNOSIS TAB (Simplified) ── */}
          {activeTab === 'diagnosis' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">Diagnosis</h3>
              <div className="flex flex-col gap-3">
                <textarea
                  rows={4}
                  value={diagnosisText}
                  onChange={e => setDiagnosisText(e.target.value)}
                  placeholder="Enter diagnosis description..."
                  className={`${inputCls} resize-none text-base`}
                />
                <button
                  onClick={handleAddDiagnosis}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors self-end flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Diagnosis
                </button>
              </div>

              {visit.diagnoses.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-sm font-bold text-slate-600 mb-3">Saved Diagnoses</h4>
                  <div className="space-y-3">
                    {visit.diagnoses.map((d, i) => (
                      <div key={d.id || i} className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-slate-800">{d.description}</p>
                        <button onClick={() => removeDiagnosis(visit.id, d.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-6">Patient History</h3>
              {patientHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-medium">
                  NO History
                </div>
              ) : (
                <div className="space-y-6">
                  {patientHistory.map((past, i) => (
                    <div key={past.id || i} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                        <div>
                          <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" /> {past.date}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">Visit: {past.visitNumber} · Dept: {past.department}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-700">{past.doctorName}</p>
                        </div>
                      </div>

                      {past.diagnoses.length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Diagnoses</h4>
                          <p className="text-sm text-slate-700">{past.diagnoses.map(d => d.description).join(', ')}</p>
                        </div>
                      )}

                      {past.prescriptions.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Prescriptions</h4>
                          <div className="space-y-1">
                            {past.prescriptions.map((p, i) => (
                              <p key={p.id || i} className="text-sm text-slate-700">
                                • {p.medicineName} <span className="text-slate-400">(Qty: {p.quantity} {UOM_MAP[p.type] || ''})</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PRESCRIPTION TAB (Simplified) ── */}
          {activeTab === 'prescription' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4">Add Medicine</h3>

              <div className="flex items-end gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-1/4">
                  <label className={labelCls}>Type</label>
                  <select
                    value={rxForm.type}
                    onChange={e => {
                      const newType = e.target.value as any;
                      setRxForm(f => {
                        const newState = { ...f, type: newType };
                        // If type is selected, filter medicines. If current medicine doesn't match, clear it (or select first)
                        if (newType) {
                          const matchedMeds = apiMedicines.filter(m => m.dosageForm === newType);
                          if (matchedMeds.length === 1) {
                            newState.medicineName = matchedMeds[0].brandName || matchedMeds[0].genericName;
                          } else {
                            const currentMedMatches = matchedMeds.some(m => (m.brandName === f.medicineName || m.genericName === f.medicineName));
                            if (!currentMedMatches) newState.medicineName = '';
                          }
                        }
                        return newState;
                      });
                    }}
                    className={inputCls}
                  >
                    <option value="">Select Type</option>
                    {(uniqueDosageForms.length > 0 ? uniqueDosageForms : ['Tablet', 'Injection', 'Syrup', 'Capsule', 'Ointment', 'Drops']).map((t: any) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className={labelCls}>Medicine</label>
                  <select
                    value={rxForm.medicineName}
                    onChange={e => {
                      const selectedName = e.target.value;
                      const matchedMed = apiMedicines.find(m => m.brandName === selectedName || m.genericName === selectedName);
                      setRxForm(f => ({
                        ...f,
                        medicineName: selectedName,
                        // Auto-fill Type if we found a matching medicine
                        ...(matchedMed && matchedMed.dosageForm ? { type: matchedMed.dosageForm as any } : {})
                      }));
                    }}
                    className={inputCls}
                  >
                    <option value="">Select from Master...</option>
                    {apiMedicines
                      .filter(m => !rxForm.type || m.dosageForm === rxForm.type)
                      .map((m, i) => {
                        const name = m.brandName || m.genericName;
                        return <option key={m.id || m.medicineId || name || i} value={name}>{name}</option>;
                      })}
                  </select>
                </div>
                <div className="w-36">
                  <label className={labelCls}>{UOM_MAP[rxForm.type] || 'QTY'}</label>
                  <input
                    type="text"
                    placeholder="e.g. 1-0-1 or 2"
                    value={rxForm.quantity}
                    onChange={e => setRxForm(f => ({ ...f, quantity: e.target.value }))}
                    className={`${inputCls} w-full`}
                  />
                </div>
                <button
                  onClick={handleAddPrescription}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors h-[42px] flex items-center justify-center shrink-0"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </button>
              </div>

              {visit.prescriptions.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-600 mb-3">Prescribed Medicines</h4>
                  <div className="space-y-2">
                    {visit.prescriptions.map((p, i) => (
                      <div key={p.id || i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-lg">
                            {p.type}
                          </span>
                          <span className="font-bold text-slate-800">{p.medicineName}</span>
                          <span className="text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            Qty: {p.quantity} <span className="text-xs font-medium ml-0.5">{UOM_MAP[p.type] || ''}</span>
                          </span>
                        </div>
                        <button onClick={() => removePrescription(visit.id, p.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── LAB ORDERS TAB (Simplified) ── */}
          {activeTab === 'lab' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
                <span>Laboratory Tests Master</span>
                <span className="text-xs bg-primary text-white px-2 py-1 rounded-lg">{selectedLabs.length} Selected</span>
              </h3>

              {labTestsLoading ? (
                <div className="text-sm text-slate-400 py-6 text-center">Loading lab tests...</div>
              ) : apiLabTests.length === 0 ? (
                <div className="text-sm text-slate-400 py-6 text-center">No active lab tests found. Please add tests in Lab Master.</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {apiLabTests.map(test => {
                    const checked = selectedLabs.includes(test.code);
                    return (
                      <label
                        key={test.code}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${checked ? 'bg-primary/5 border-primary/40' : 'bg-slate-50 border-slate-200 hover:border-primary/30'
                          }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 w-4 h-4 accent-primary rounded"
                          checked={checked}
                          onChange={() => toggleLabOrder(test)}
                        />
                        <div className="flex-1">
                          <div className={`text-sm font-bold ${checked ? 'text-primary' : 'text-slate-700'}`}>{test.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{test.category}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── RADIOLOGY TAB (Simplified) ── */}
          {activeTab === 'radiology' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
                <span>Radiology Services Master</span>
                <span className="text-xs bg-primary text-white px-2 py-1 rounded-lg">{selectedRadiology.length} Selected</span>
              </h3>

              {radServicesLoading ? (
                <div className="text-sm text-slate-400 py-6 text-center">Loading radiology services...</div>
              ) : apiRadiologyServices.length === 0 ? (
                <div className="text-sm text-slate-400 py-6 text-center">No active radiology services found. Please add services in Radiology Master.</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {apiRadiologyServices.map(svc => {
                    const checked = selectedRadiology.includes(svc.name);
                    return (
                      <label
                        key={svc.name}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${checked ? 'bg-purple-50 border-purple-300' : 'bg-slate-50 border-slate-200 hover:border-purple-300'
                          }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 w-4 h-4 accent-purple-600 rounded"
                          checked={checked}
                          onChange={() => toggleRadiologyOrder(svc)}
                        />
                        <div className="flex-1">
                          <div className={`text-sm font-bold ${checked ? 'text-purple-700' : 'text-slate-700'}`}>{svc.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{svc.modality}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── SUMMARY TAB ── */}
          {activeTab === 'summary' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
              <h3 className="font-bold text-slate-800 text-xl">Visit Summary — {visit.visitNumber}</h3>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Patient</h4>
                  <p className="font-bold text-slate-800">{visit.patientName}</p>
                  <p className="text-sm text-slate-500">{visit.uhid} · {visit.age}y · {visit.gender}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Visit</h4>
                  <p className="font-bold text-slate-800">{visit.visitNumber}</p>
                  <p className="text-sm text-slate-500">{visit.date} · {visit.doctorName}</p>
                </div>
              </div>

              {visit.diagnoses.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Diagnoses</h4>
                  {visit.diagnoses.map((d, i) => (
                    <p key={d.id || i} className="text-sm text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 mb-2">
                      {d.description}
                    </p>
                  ))}
                </div>
              )}

              {visit.prescriptions.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Prescriptions</h4>
                  {visit.prescriptions.map((p, i) => (
                    <div key={p.id || i} className="text-sm text-slate-700 mb-1 flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-slate-200 px-1.5 py-0.5 rounded">{p.type}</span>
                      {p.medicineName} <span className="text-slate-400">— Qty: {p.quantity} {UOM_MAP[p.type] || ''}</span>
                    </div>
                  ))}
                </div>
              )}

              {visit.labOrders.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Lab Orders</h4>
                  {visit.labOrders.map((l, i) => <div key={l.id || i} className="text-sm text-slate-700 mb-1">• {l.testName}</div>)}
                </div>
              )}

              {visit.radiologyOrders.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Radiology Orders</h4>
                  {visit.radiologyOrders.map((r, i) => <div key={r.id || i} className="text-sm text-slate-700 mb-1">• {r.bodyPart} ({r.modality})</div>)}
                </div>
              )}

              <div className="flex gap-4 pt-2 border-t border-slate-100">
                {visit.status === 'Completed' ? (
                  <>
                    <button onClick={handleUpdateEMR}
                      className="px-8 py-3 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors shadow-sm flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Update EMR
                    </button>
                    {isAdmitted ? (
                      <div className="px-8 py-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2 border border-red-200">
                        <CheckCircle className="w-4 h-4" />
                        Admitted
                      </div>
                    ) : (
                      <button onClick={() => setShowAdmitModal(true)}
                        className="px-8 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors shadow-sm flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Admit to IPD
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button onClick={handleFinalizeVisit}
                      className="px-8 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Finalize Visit
                    </button>
                    {isAdmitted ? (
                      <div className="px-8 py-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2 border border-red-200">
                        <CheckCircle className="w-4 h-4" />
                        Admitted
                      </div>
                    ) : (
                      <button onClick={() => setShowAdmitModal(true)}
                        className="px-8 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors shadow-sm flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Admit to IPD
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {showAdmitModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Recommend Admission</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Specialty</label>
                <input value={admitForm.specialty} onChange={e => setAdmitForm({ ...admitForm, specialty: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Admission Type</label>
                <select value={admitForm.type} onChange={e => setAdmitForm({ ...admitForm, type: e.target.value })} className={inputCls}>
                  <option>General</option><option>ICU</option><option>Surgical</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Priority</label>
                <select value={admitForm.priority} onChange={e => setAdmitForm({ ...admitForm, priority: e.target.value })} className={inputCls}>
                  <option>Normal</option><option>Emergency</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setShowAdmitModal(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
                <button onClick={handleRecommendAdmission} className="px-6 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors">Confirm & Admit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
