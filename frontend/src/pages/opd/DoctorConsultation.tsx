import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOPDVisits } from '../../contexts/OPDVisitContext';
import { useAppointments } from '../../contexts/AppointmentContext';
import { useIPD } from '../../contexts/IPDContext';
import { useInvestigations } from '../../contexts/InvestigationContext';
import type { Diagnosis, PrescriptionItem, LabOrder, RadiologyOrder } from '../../contexts/OPDVisitContext';
import { MedicineSearch, loadMedicines, medicineLabel } from '../../components/ui/MedicineSearch';
const API_BASE = import.meta.env.VITE_API_URL as string;

// Types for live master data
interface ApiLabTest {
  /** Master_LabTest.TestId — carried so the placed order can link to the master. */
  testId: number;
  code: string;
  name: string;
  category: string;
}

interface ApiRadiologyService {
  name: string;
  modality: string;
}
import { User, AlertTriangle, Hash, Activity, Pill, FlaskConical, ScanLine, CheckCircle, Plus, Trash2, Eye, BookOpen, ArrowLeft, RefreshCw, History, Calendar, Edit2, X, Printer, Search, Stethoscope, ChevronRight, Clock, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { UnifiedPatientHistory } from '../../components/emr/UnifiedPatientHistory';

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
    addRadiologyOrder, removeRadiologyOrder, finalizeVisit, updateVisit, updateVisitStatus, visits
  } = useOPDVisits();

  const { appointments, updateAppointmentStatus } = useAppointments();
  const { requestAdmission, patients, admissionRequests } = useIPD();
  const { addOrder: addGlobalInvestigationOrder, orders: globalOrders } = useInvestigations();

  const navigate = useNavigate();

  const visit = getVisitById(Number(visitId));
  const patientAdmissions = patients?.filter(p => p.uhid === visit?.uhid) || [];
  const latestAdmission = patientAdmissions.length > 0 ? patientAdmissions[0] : null;
  const isAdmitted = latestAdmission && (latestAdmission.status === 'Admitted' || latestAdmission.status === 'Discharge Requested');
  const hasAdmissionRequest = admissionRequests?.some(r => r.uhid === visit?.uhid && r.status === 'Pending');
  const [activeTab, setActiveTab] = useState('history');

  // Printing state
  const [printTab, setPrintTab] = useState<'prescription' | 'lab' | 'radiology' | null>(null);
  const [selectedPrintLab, setSelectedPrintLab] = useState<string[]>([]);
  const [selectedPrintRad, setSelectedPrintRad] = useState<string[]>([]);

  useEffect(() => {
    if (!printTab) return;
    const timer = window.setTimeout(() => window.print(), 300);
    return () => clearTimeout(timer);
  }, [printTab]);

  useEffect(() => {
    const clearPrint = () => setPrintTab(null);
    window.addEventListener('afterprint', clearPrint);
    return () => window.removeEventListener('afterprint', clearPrint);
  }, []);



  // Backstop ref — declared here so all hooks are above the early-return guard.
  const syncingRef = useRef(false);

  // ── Lab Tests from Master API ──
  const [apiLabTests, setApiLabTests] = useState<ApiLabTest[]>([]);
  const [labTestsLoading, setLabTestsLoading] = useState(true);

  // ── Radiology Services from Master API ──
  const [apiRadiologyServices, setApiRadiologyServices] = useState<ApiRadiologyService[]>([]);
  const [, setRadServicesLoading] = useState(true);

  // ── Medicine Data from API ──
  const [, setApiMedicines] = useState<any[]>([]);

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
              testId: item.testId,
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

  // The prescribable catalog: Medicine master only, Active only. Medical Items
  // (syringes, gloves) are stocked and billable but are never prescribable, so
  // they are deliberately absent here.
  useEffect(() => {
    let alive = true;
    loadMedicines()
      .then(list => { if (alive) setApiMedicines(list); })
      .catch(e => console.error('Failed to fetch medicines', e));
    return () => { alive = false; };
  }, []);

  // Live pharmacy-counter stock, so the doctor knows before prescribing
  // whether the patient can actually collect it. Read-only: this is the same
  // unified ledger the pharmacy sells from, not a separate number.
  const [counterStock, setCounterStock] = useState<Record<number, number>>({});
  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/catalog/?type=MEDICINE`)
      .then(r => (r.ok ? r.json() : []))
      .then((rows: any[]) => {
        if (!alive) return;
        setCounterStock(Object.fromEntries(rows.map(r => [r.itemId, r.availableStock])));
      })
      .catch(() => { /* the badge simply does not render */ });
    return () => { alive = false; };
  }, []);
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
    type: '' as PrescriptionItem['type'],
    medicineId: '' as number | '',
    medicineName: '',
    quantity: '',
    freqM: false,
    freqA: false,
    freqN: false,
    duration: '',
    instructions: '',
    uom: '',   // auto-filled from medicine master unit
  });

  // Lab local state (checked IDs)
  const selectedStock = typeof rxForm.medicineId === 'number'
    ? counterStock[rxForm.medicineId] : undefined;
  const [labForm, setLabForm] = useState({ testCode: '', clinicalNotes: '' });
  const [radForm, setRadForm] = useState({ serviceName: '', bodyPart: '' });
  const [showAdmitModal, setShowAdmitModal] = useState(false);
  const [admitForm, setAdmitForm] = useState({ specialty: 'General Medicine', type: 'General', priority: 'Normal', admissionReason: '' });

  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({ date: '', notes: '' });

  useEffect(() => {
    if (visit) {
    }
  }, [visit]);


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

    let finalQty = rxForm.quantity.trim();
    let freqParts = [];
    if (rxForm.freqM || rxForm.freqA || rxForm.freqN) {
      const m = rxForm.freqM ? '1' : '0';
      const a = rxForm.freqA ? '1' : '0';
      const n = rxForm.freqN ? '1' : '0';
      freqParts.push(`${m}-${a}-${n}`);
    }

    if (rxForm.duration) {
      freqParts.push(`(${rxForm.duration})`);
    }

    if (freqParts.length > 0) {
      finalQty += finalQty ? ` | ${freqParts.join(' ')}` : freqParts.join(' ');
    }

    if (rxForm.instructions) {
      finalQty += finalQty ? ` - ${rxForm.instructions}` : rxForm.instructions;
    }

    if (!finalQty.trim()) {
      finalQty = 'As directed';
    }

    const item: PrescriptionItem = {
      id: Date.now().toString(),
      type: rxForm.type,
      medicineId: typeof rxForm.medicineId === 'number' ? rxForm.medicineId : undefined,
      medicineName: rxForm.medicineName,
      quantity: finalQty.trim(),
      alerts: [],
    };

    addPrescription(visit.id, item);
    setRxForm({
      type: '' as PrescriptionItem['type'],
      medicineId: '',
      medicineName: '',
      quantity: '',
      freqM: false, freqA: false, freqN: false,
      duration: '', instructions: '', uom: ''
    });
    toast.success('Added to prescription');
  };


  const handleAddLab = () => {
    if (!labForm.testCode) {
      toast.error('Select a lab test');
      return;
    }
    const test = apiLabTests.find(t => t.code === labForm.testCode);
    if (!test) return;

    if (visit?.labOrders.find(o => o.testCode === test.code)) {
      toast.error('Test already added');
      return;
    }

    const order: LabOrder = {
      id: crypto.randomUUID(),
      testId: test.testId,
      testName: test.name,
      testCode: test.code,
      priority: 'Routine',
      clinicalNotes: labForm.clinicalNotes,
      status: 'Ordered'
    };
    addLabOrder(visit.id, order);
    toast.success('Added lab order');
    setLabForm({ testCode: '', clinicalNotes: '' });
  };

  const handleAddRadiology = () => {
    if (!radForm.serviceName) {
      toast.error('Select a radiology service');
      return;
    }
    const svc = apiRadiologyServices.find(s => s.name === radForm.serviceName);
    if (!svc) return;

    const order: RadiologyOrder = {
      id: Date.now().toString(),
      serviceName: svc.name,
      modality: svc.modality as RadiologyOrder['modality'],
      bodyPart: radForm.bodyPart || svc.name,
      indication: '',
      priority: 'Routine',
      contrastRequired: false,
      specialInstructions: '',
      status: 'Ordered',
    };
    addRadiologyOrder(visit.id, order);
    setRadForm({ serviceName: '', bodyPart: '' });
    toast.success('Added radiology order');
  };


  /**
   * Push this visit's lab / radiology orders into the shared Investigation
   * system (hospital.Lab_Order), which is what the Lab and Radiology worklists
   * actually read. The OPD visit's own Trn_OpdVisitLabOrder rows are a record of
   * what the doctor wrote — they are NOT the lab's queue.
   *
   * Three things this fixes:
   *  - Orders used to be pushed ONLY from handleFinalizeVisit. A consultation
   *    saved without finalising left them sitting in the visit, invisible to
   *    the lab, while the OPD screen still showed them as ordered.
   *  - The push was fire-and-forget, so a failed POST was silent.
   *  - handleRecommendAdmission called finalize unconditionally, so finalising
   *    and then admitting pushed every order a second time.
   *
   * Dedupe is scoped to orders raised for this patient on this visit's date, so
   * re-running is harmless while a genuine repeat of the same test on another
   * day still goes through.
   */
  const syncInvestigationOrders = async (): Promise<boolean> => {
    const sameVisitDay = (iso?: string) => !!iso && iso.slice(0, 10) === visit.date?.slice(0, 10);
    const sentFor = (category: 'Lab' | 'Radiology') =>
      new Set(
        globalOrders
          .filter(o => o.category === category && o.patientId === visit.uhid && sameVisitDay(o.orderedAt))
          .flatMap(o => o.tests.map(t => t.name))
      );

    const newLabs = visit.labOrders.filter(l => !sentFor('Lab').has(l.testName));
    // A radiology order lacking a serviceName was loaded from the backend
    // (which drops the field). It was already pushed to the lab during the
    // session it was created. We cannot re-push it anyway because we'd send
    // 'Head' as the test name, creating a garbage duplicate.
    const newRads = visit.radiologyOrders.filter(r => r.serviceName && !sentFor('Radiology').has(r.serviceName));

    const mkId = () => Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    let ok = true;

    if (newLabs.length > 0) {
      // testId/testCode are what link the order line to Master_LabTest, which is
      // where NormalRange and Unit come from. Sending only the name left every
      // line without a reference range for the lab to report against.
      ok = await addGlobalInvestigationOrder({
        id: `LAB-${Date.now().toString().slice(-6)}`,
        type: 'OP',
        category: 'Lab',
        patientId: visit.uhid,
        patientName: visit.patientName,
        orderedBy: visit.doctorName,
        orderedAt: new Date().toISOString(),
        tests: newLabs.map(l => ({
          id: mkId(),
          testId: l.testId,
          testCode: l.testCode,
          name: l.testName,
          status: 'Pending' as const,
        })),
        status: 'Pending',
      }) && ok;
    }

    if (newRads.length > 0) {
      ok = await addGlobalInvestigationOrder({
        id: `RAD-${Date.now().toString().slice(-6)}`,
        type: 'OP',
        category: 'Radiology',
        patientId: visit.uhid,
        patientName: visit.patientName,
        orderedBy: visit.doctorName,
        orderedAt: new Date().toISOString(),
        tests: newRads.map(r => ({ id: mkId(), name: r.serviceName || r.bodyPart, bodyPart: r.bodyPart, status: 'Pending' as const })),
        status: 'Pending',
      }) && ok;
    }

    if (!ok) toast.error('Some orders could not be sent to the Lab/Radiology worklist. Please retry.');
    return ok;
  };

  // Backstop so an order can never be stranded. Both explicit exits (Finalize
  // and Update EMR) sync, but a doctor who simply navigates away would still
  // have left the lab unaware of the tests they ordered. This pushes anything
  // outstanding a couple of seconds after the last change; the dedupe inside
  // syncInvestigationOrders makes repeat runs no-ops, and the delay is long
  // enough that ticking a test and immediately un-ticking it sends nothing.
  const syncInvestigationOrdersRef = useRef(syncInvestigationOrders);
  useEffect(() => {
    syncInvestigationOrdersRef.current = syncInvestigationOrders;
  });

  useEffect(() => {
    if (!visit) return;
    if (visit.isFinalized) return;
    if (visit.labOrders.length === 0 && visit.radiologyOrders.length === 0) return;

    const t = setTimeout(async () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      try { await syncInvestigationOrdersRef.current(); } finally { syncingRef.current = false; }
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visit?.labOrders, visit?.radiologyOrders, visit?.isFinalized]);

  // ── Early return AFTER all hooks ──────────────────────────────────────
  if (!visit) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
      <div className="text-5xl">🔍</div>
      <p className="font-semibold text-slate-600">Visit not found or session expired.</p>
      <button onClick={() => navigate(-1)} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
        ← Go Back
      </button>
    </div>
  );

  const handleFinalizeVisit = async () => {
    // Send the orders BEFORE closing the visit, and stop if they did not land —
    // finalising a visit whose orders never reached the lab is the failure this
    // whole path exists to prevent.
    const sent = await syncInvestigationOrders();
    if (!sent) return;

    finalizeVisit(visit.id, 'Dr. on duty');

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

  const handleUpdateEMR = async () => {
    // Was two hand-rolled copies of the push logic. They deduped against EVERY
    // order this patient had ever had, so a legitimate repeat of the same test
    // on a later date was silently dropped, and neither copy passed testId — so
    // orders raised from here also arrived at the lab with no reference range.
    const sent = await syncInvestigationOrders();
    if (!sent) return;

    toast.success('EMR Updated Successfully');
    navigate(-1);
  };

  const handleRecommendAdmission = () => {
    setShowAdmitModal(false);
    requestAdmission({
      uhid: visit.uhid,
      patientName: visit.patientName,
      specialty: admitForm.specialty,
      admissionType: admitForm.type,
      priority: admitForm.priority,
      admissionReason: admitForm.admissionReason,
      requestedBy: 'Dr. on duty'
    });

    // Auto-finalise, but only if the visit is still open. This used to run
    // unconditionally: finalising a visit and then admitting the patient pushed
    // every lab and radiology order to the worklist a second time, duplicating
    // both the work and the charges.
    if (!visit.isFinalized) {
      handleFinalizeVisit();
    } else {
      syncInvestigationOrders();
    }
    toast.success('Admission Request Sent to IPD');
  };

  const getLabOrderId = (l: any, i: number) => {
    const go = globalOrders.find(o => o.category === 'Lab' && o.patientId === visit.uhid && o.orderedAt?.slice(0, 10) === visit.date?.slice(0, 10) && o.tests.some(t => t.name === l.testName));
    return go ? go.id : (l.id || `TMP-${i}`);
  };

  const getRadOrderId = (r: any, i: number) => {
    const go = globalOrders.find(o => o.category === 'Radiology' && o.patientId === visit.uhid && o.orderedAt?.slice(0, 10) === visit.date?.slice(0, 10) && o.tests.some(t => t.name === (r.serviceName || r.bodyPart)));
    return go ? go.id : (r.id || `TMP-${i}`);
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
            <UnifiedPatientHistory patientUhid={visit.uhid} />
          )}

          {/* ── PRESCRIPTION TAB (Simplified) ── */}
          {activeTab === 'prescription' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800">Add Medicine</h3>
                {visit.prescriptions.length > 0 && (
                  <button onClick={() => setPrintTab('prescription')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium">
                    <Printer className="w-4 h-4" /> Print
                  </button>
                )}
              </div>

              <div className="flex items-start gap-4 mb-6 bg-slate-50 p-4 pb-8 rounded-2xl border border-slate-100">
                <div className="flex-1 relative">
                  <label className={labelCls}>Medicine</label>
                  <MedicineSearch
                    value={rxForm.medicineId}
                    hint={selectedStock === undefined ? null : (
                      <div className="absolute top-full mt-1.5 left-0 flex items-center gap-2 text-xs">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${selectedStock <= 0 ? 'bg-red-50 text-red-600'
                            : selectedStock < 10 ? 'bg-amber-50 text-amber-700'
                              : 'bg-emerald-50 text-emerald-700'}`}>
                          {selectedStock <= 0
                            ? 'Out of stock at pharmacy'
                            : `${selectedStock} in stock at pharmacy`}
                        </span>
                      </div>
                    )}
                    onSelect={m => setRxForm(f => ({
                      ...f,
                      medicineId: m ? m.id : '',
                      medicineName: m ? medicineLabel(m) : '',
                      type: m?.dosageForm ? (m.dosageForm as PrescriptionItem['type']) : f.type,
                      uom: m?.unit || '',
                    }))}
                  />
                </div>

                <div className="w-[420px] shrink-0">
                  <label className={labelCls}>
                    {rxForm.uom ? `Dosage Frequency (${rxForm.uom})` : 'Dosage Frequency'}
                  </label>

                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="text"
                      placeholder="Qty (e.g. 10 or 1 Strip)"
                      value={rxForm.quantity}
                      onChange={e => setRxForm(f => ({ ...f, quantity: e.target.value }))}
                      className="w-[140px] px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary h-[42px]"
                    />

                    <div className="flex-1 flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2.5 h-[42px]">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rxForm.freqM}
                          onChange={e => setRxForm(f => ({ ...f, freqM: e.target.checked }))}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300"
                        />
                        <span className="text-sm font-bold text-slate-700">Mor</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rxForm.freqA}
                          onChange={e => setRxForm(f => ({ ...f, freqA: e.target.checked }))}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300"
                        />
                        <span className="text-sm font-bold text-slate-700">Aft</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rxForm.freqN}
                          onChange={e => setRxForm(f => ({ ...f, freqN: e.target.checked }))}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300"
                        />
                        <span className="text-sm font-bold text-slate-700">Night</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Duration (e.g. 5 Days)"
                      value={rxForm.duration}
                      onChange={e => setRxForm(f => ({ ...f, duration: e.target.value }))}
                      className="w-[140px] px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                    />
                    <input
                      type="text"
                      placeholder="Instructions (e.g. After Food)"
                      value={rxForm.instructions}
                      onChange={e => setRxForm(f => ({ ...f, instructions: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAddPrescription}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors h-[42px] flex items-center justify-center shrink-0 mt-[26px]"
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
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800">Add Lab Order</h3>
                {visit.labOrders.length > 0 && (
                  <button onClick={() => setPrintTab('lab')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium">
                    <Printer className="w-4 h-4" /> Print
                  </button>
                )}
              </div>

              <div className="flex items-end gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-1/3">
                  <label className={labelCls}>Lab Test</label>
                  <select
                    value={labForm.testCode}
                    onChange={e => setLabForm(f => ({ ...f, testCode: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">Select Test...</option>
                    {apiLabTests.map(test => (
                      <option key={test.code} value={test.code}>{test.name} ({test.category})</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className={labelCls}>Clinical Notes</label>
                  <input
                    type="text"
                    placeholder="e.g., Fasting 12 hours"
                    value={labForm.clinicalNotes}
                    onChange={e => setLabForm(f => ({ ...f, clinicalNotes: e.target.value }))}
                    className={`${inputCls} w-full`}
                  />
                </div>
                <button
                  onClick={handleAddLab}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors h-[42px] flex items-center justify-center shrink-0"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </button>
              </div>

              {visit.labOrders.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-600 mb-3">Ordered Tests</h4>
                  <div className="space-y-2">
                    {visit.labOrders.map((l, i) => (
                      <div key={l.id || i} className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
                        <div className="flex items-start justify-between mb-3 border-b border-slate-100 pb-3">
                          <div className="flex items-start gap-3">
                            <div className="pt-0.5">
                              <input
                                type="checkbox"
                                checked={selectedPrintLab.includes(l.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedPrintLab([...selectedPrintLab, l.id]);
                                  else setSelectedPrintLab(selectedPrintLab.filter(id => id !== l.id));
                                }}
                                className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
                                title="Select for print"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs font-bold text-slate-500">ID: {getLabOrderId(l, i)}</span>
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase bg-blue-50 text-blue-600 border border-blue-200">
                                  {apiLabTests.find(t => t.code === l.testCode)?.category || 'Lab'}
                                </span>
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                                  <Activity className="w-3 h-3" /> Applied in OPD
                                </span>
                              </div>
                              <div className="text-xs text-slate-500">Ordered on {visit.date}</div>
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border ${l.status === 'Completed' || l.status === 'Verified' || l.status === 'Resulted'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : 'bg-amber-100 text-amber-700 border-amber-200'
                            }`}>
                            {l.status === 'Completed' || l.status === 'Verified' || l.status === 'Resulted'
                              ? <CheckCircle className="w-3.5 h-3.5" />
                              : <Clock className="w-3.5 h-3.5" />}
                            {l.status === 'Pending' ? 'Ordered' : (l.status === 'Verified' || l.status === 'Completed' || l.status === 'Resulted' ? 'Test Completed' : (l.status || 'Ordered'))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm py-1">
                          <span className="font-medium text-slate-700">
                            {l.testName} {l.clinicalNotes && <span className="text-slate-400 font-normal">({l.clinicalNotes})</span>}
                          </span>
                          <div className="flex items-center gap-4">
                            {l.status === 'Completed' || l.status === 'Verified' || l.status === 'Resulted' ? (
                              <span className="text-green-600 font-bold text-xs flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> {l.result ? `Result: ${l.result}` : 'Test Completed'}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">{l.status === 'Pending' ? 'Ordered' : (l.status || 'Ordered')}</span>
                            )}
                            <button onClick={() => removeLabOrder(visit.id, l.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── RADIOLOGY TAB (Simplified) ── */}
          {activeTab === 'radiology' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800">Add Radiology Order</h3>
                {visit.radiologyOrders.length > 0 && (
                  <button onClick={() => setPrintTab('radiology')} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium">
                    <Printer className="w-4 h-4" /> Print
                  </button>
                )}
              </div>

              <div className="flex items-end gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-1/3">
                  <label className={labelCls}>Service</label>
                  <select
                    value={radForm.serviceName}
                    onChange={e => setRadForm(f => ({ ...f, serviceName: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">Select Service...</option>
                    {apiRadiologyServices.map((svc, i) => (
                      <option key={i} value={svc.name}>{svc.name} ({svc.modality})</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className={labelCls}>Specific Parts / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g., Head and Neck"
                    value={radForm.bodyPart}
                    onChange={e => setRadForm(f => ({ ...f, bodyPart: e.target.value }))}
                    className={`${inputCls} w-full`}
                  />
                </div>
                <button
                  onClick={handleAddRadiology}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors h-[42px] flex items-center justify-center shrink-0"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </button>
              </div>

              {visit.radiologyOrders.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-600 mb-3">Ordered Scans</h4>
                  <div className="space-y-2">
                    {visit.radiologyOrders.map((r, i) => (
                      <div key={r.id || i} className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
                        <div className="flex items-start justify-between mb-3 border-b border-slate-100 pb-3">
                          <div className="flex items-start gap-3">
                            <div className="pt-0.5">
                              <input
                                type="checkbox"
                                checked={selectedPrintRad.includes(r.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedPrintRad([...selectedPrintRad, r.id]);
                                  else setSelectedPrintRad(selectedPrintRad.filter(id => id !== r.id));
                                }}
                                className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
                                title="Select for print"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-xs font-bold text-slate-500">ID: {getRadOrderId(r, i)}</span>
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase bg-purple-50 text-purple-600 border border-purple-200">
                                  {r.modality}
                                </span>
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase border bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                                  <Activity className="w-3 h-3" /> Applied in OPD
                                </span>
                              </div>
                              <div className="text-xs text-slate-500">Ordered on {visit.date}</div>
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border ${r.status === 'Completed' || r.status === 'Verified' || r.status === 'Reported'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : 'bg-amber-100 text-amber-700 border-amber-200'
                            }`}>
                            {r.status === 'Completed' || r.status === 'Verified' || r.status === 'Reported'
                              ? <CheckCircle className="w-3.5 h-3.5" />
                              : <Clock className="w-3.5 h-3.5" />}
                            {r.status === 'Pending' ? 'Ordered' : (r.status === 'Verified' || r.status === 'Completed' || r.status === 'Reported' ? 'Test Completed' : (r.status || 'Ordered'))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm py-1">
                          <span className="font-medium text-slate-700">
                            {r.bodyPart} {r.serviceName && <span className="text-slate-400 font-normal">({r.serviceName})</span>}
                          </span>
                          <div className="flex items-center gap-4">
                            {r.status === 'Completed' || r.status === 'Verified' || r.status === 'Reported' ? (
                              <span className="text-green-600 font-bold text-xs flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> {r.result ? `Result: ${r.result}` : 'Test Completed'}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">{r.status === 'Pending' ? 'Ordered' : (r.status || 'Ordered')}</span>
                            )}
                            <button onClick={() => removeRadiologyOrder(visit.id, r.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SUMMARY TAB ── */}
          {activeTab === 'summary' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
              <h3 className="font-bold text-slate-800 text-xl">Visit Summary — {visit.visitNumber}</h3>

              <div className="grid grid-cols-4 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Patient</h4>
                  <p className="font-bold text-slate-800">{visit.patientName}</p>
                  <p className="text-sm text-slate-500">{visit.uhid} &middot; {visit.age}y &middot; {visit.gender}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Visit</h4>
                  <p className="font-bold text-slate-800">{visit.visitNumber}</p>
                  <p className="text-sm text-slate-500">{visit.date} &middot; {visit.doctorName}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Next Follow-Up</h4>
                    <button
                      onClick={() => {
                        setIsFinalizing(false);
                        setFollowUpForm({ date: visit.followUp?.followUpDate || '', notes: visit.followUp?.specialInstructions || '' });
                        setShowFinalizeModal(true);
                      }}
                      className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                  {visit.followUp?.followUpDate ? (
                    <p className="font-bold text-indigo-600">{new Date(visit.followUp.followUpDate).toLocaleDateString()}</p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Not scheduled</p>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Instructions / Notes</h4>
                  {visit.followUp?.specialInstructions ? (
                    <p className="text-sm text-slate-600">{visit.followUp.specialInstructions}</p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">None</p>
                  )}
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
                    ) : hasAdmissionRequest ? (
                      <div className="px-8 py-3 bg-amber-50 text-amber-600 rounded-xl text-sm font-bold flex items-center gap-2 border border-amber-200">
                        <CheckCircle className="w-4 h-4" />
                        Admission Requested
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
                    <button onClick={() => { setIsFinalizing(true); setFollowUpForm({ date: visit.followUp?.followUpDate || '', notes: visit.followUp?.specialInstructions || '' }); setShowFinalizeModal(true); }}
                      className="px-8 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Finalize Visit
                    </button>
                    {isAdmitted ? (
                      <div className="px-8 py-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2 border border-red-200">
                        <CheckCircle className="w-4 h-4" />
                        Admitted
                      </div>
                    ) : hasAdmissionRequest ? (
                      <div className="px-8 py-3 bg-amber-50 text-amber-600 rounded-xl text-sm font-bold flex items-center gap-2 border border-amber-200">
                        <CheckCircle className="w-4 h-4" />
                        Admission Requested
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg flex items-center gap-2"><Plus className="w-5 h-5" /> Recommend Admission</h3>
              <button onClick={() => setShowAdmitModal(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Admission Type</label>
                  <select value={admitForm.type} onChange={e => setAdmitForm({ ...admitForm, type: e.target.value })} className={inputCls}>
                    <option>General</option><option>Day Care</option><option>ICU</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Priority</label>
                  <select value={admitForm.priority} onChange={e => setAdmitForm({ ...admitForm, priority: e.target.value })} className={inputCls}>
                    <option>Normal</option><option>Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Admission Reason</label>
                  <textarea
                    value={admitForm.admissionReason}
                    onChange={e => setAdmitForm({ ...admitForm, admissionReason: e.target.value })}
                    className={`${inputCls} resize-none`}
                    rows={2}
                    placeholder="Enter reason for admission..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                <button onClick={() => setShowAdmitModal(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
                <button onClick={handleRecommendAdmission} className="px-6 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm">Submit Request</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                {isFinalizing ? <CheckCircle className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                {isFinalizing ? 'Finalize Visit' : 'Schedule Follow-Up'}
              </h3>
              <button onClick={() => setShowFinalizeModal(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              {isFinalizing && <p className="text-sm text-slate-600 mb-4">Would you like to schedule a follow-up before closing this visit?</p>}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Next Follow-Up Date (Optional)</label>
                  <input
                    type="date"
                    value={followUpForm.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setFollowUpForm({ ...followUpForm, date: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Instructions / Notes (Optional)</label>
                  <textarea
                    value={followUpForm.notes}
                    onChange={e => setFollowUpForm({ ...followUpForm, notes: e.target.value })}
                    className={`${inputCls} resize-none`}
                    rows={3}
                    placeholder="E.g., Review lab results, continue meds..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 mt-2 border-t border-slate-100">
                <button onClick={() => setShowFinalizeModal(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
                <button onClick={() => {
                  if (followUpForm.date || followUpForm.notes) {
                    updateVisit(visit.id, {
                      followUp: {
                        followUpDate: followUpForm.date,
                        specialInstructions: followUpForm.notes,
                        reviewInterval: '',
                        requiredInvestigations: ''
                      }
                    });
                  }
                  if (isFinalizing) {
                    handleFinalizeVisit();
                  }
                  setShowFinalizeModal(false);
                }} className={`px-6 py-2 ${isFinalizing ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold rounded-xl transition-colors shadow-sm`}>
                  {isFinalizing ? 'Confirm & Finalize' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* HIDDEN PRINT AREA */}
      {printTab && (
        <div id="opd-print-area" className="hidden print:block print-isolated bg-white w-full h-full text-black print:p-0">
          <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">CAREFUSIONS</h1>
                <p className="text-slate-500 font-medium">Excellence in Healthcare</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-bold text-slate-800">Date: {visit.date}</p>
                <p className="text-slate-600">Visit No: {visit.visitNumber}</p>
              </div>
            </div>

            {/* Patient Info */}
            <div className="flex justify-between mb-8 text-sm p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-slate-500 mb-1">Patient Name</p>
                <p className="font-bold text-slate-800 text-lg">{visit.patientName}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">UHID</p>
                <p className="font-bold text-slate-800">{visit.uhid}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Age / Gender</p>
                <p className="font-bold text-slate-800">{visit.age}Y / {visit.gender}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Doctor</p>
                <p className="font-bold text-slate-800">{visit.doctorName}</p>
              </div>
            </div>

            {/* Content based on printTab */}
            {printTab === 'prescription' && (
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Prescription</h2>
                <div className="space-y-4">
                  {visit.prescriptions.map((p, i) => (
                    <div key={i} className="flex justify-between items-start p-3 border-b border-slate-100">
                      <div>
                        <p className="font-bold text-slate-800 text-lg">{p.medicineName}</p>
                        <p className="text-sm text-slate-600 mt-1">{p.instructions || 'As prescribed'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-700">Qty: {p.quantity} {UOM_MAP[p.type] || ''}</p>
                        <p className="text-sm text-slate-500 mt-1">{p.duration || ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {printTab === 'lab' && (
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Lab Orders</h2>
                <div className="space-y-3">
                  {(selectedPrintLab.length > 0 ? visit.labOrders.filter((l: any) => selectedPrintLab.includes(l.id)) : visit.labOrders).map((l: any, i: number) => (
                    <div key={i} className="p-3 border-b border-slate-100 flex justify-between">
                      <p className="font-bold text-slate-800">{l.testName}</p>
                      <p className="text-sm text-slate-600">{l.clinicalNotes}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {printTab === 'radiology' && (
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">Radiology Orders</h2>
                <div className="space-y-3">
                  {(selectedPrintRad.length > 0 ? visit.radiologyOrders.filter((r: any) => selectedPrintRad.includes(r.id)) : visit.radiologyOrders).map((r: any, i: number) => (
                    <div key={i} className="p-3 border-b border-slate-100 flex justify-between">
                      <p className="font-bold text-slate-800">{r.bodyPart} <span className="text-slate-500">({r.modality})</span></p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-slate-200 flex justify-between items-end">
              <div className="text-xs text-slate-400">
                <p>Generated on {new Date().toLocaleString()}</p>
                <p>This is a computer generated document.</p>
              </div>
              <div className="text-center">
                <div className="w-48 border-b border-slate-400 mb-2"></div>
                <p className="text-sm font-bold text-slate-600">Doctor's Signature</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
