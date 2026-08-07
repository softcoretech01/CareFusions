import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIPD } from '../../contexts/IPDContext';
import { ArrowLeft, User, Activity, CheckCircle, Save, AlertTriangle, FileText, Pill, Stethoscope, FlaskConical, ScrollText } from 'lucide-react';
import { DischargePrescription } from '../../components/discharge/DischargePrescription';
import type { DischargeItem } from '../../components/discharge/DischargePrescription';
import { NursingFlowsheet } from '../../components/ipd/NursingFlowsheet';
import { ClinicalRounds } from '../../components/ipd/ClinicalRounds';
import { MarGrid } from '../../components/ipd/MarGrid';
import { InvestigationsTab } from '../../components/ipd/InvestigationsTab';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'nursing', label: 'Nursing Flowsheet', icon: Activity },
  { id: 'rounds', label: 'Clinical Rounds', icon: Stethoscope },
  { id: 'mar', label: 'MAR (Medications)', icon: Pill },
  { id: 'investigations', label: 'Investigations', icon: FlaskConical },
  { id: 'discharge', label: 'Discharge', icon: ScrollText },
];

export const PatientIPDProfile = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { patients, beds, wards, requestDischarge } = useIPD();

  const [activeTab, setActiveTab] = useState('nursing');
  const [dischargeMedicines, setDischargeMedicines] = useState<DischargeItem[]>([]);
  const [dischargeSummary, setDischargeSummary] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [finalDiagnosis, setFinalDiagnosis] = useState('');
  const [dischargeDate, setDischargeDate] = useState(new Date().toISOString().split('T')[0]);
  
  const patient = patients.find(p => p.id === Number(patientId));
  const bed = beds.find(b => b.id === patient?.currentBedId);
  const ward = wards.find(w => w.id === patient?.currentWardId);

  if (!patient) return <div className="p-8 text-center text-slate-500">Patient not found</div>;

  const handleSaveDischarge = () => {
    if (!dischargeSummary.trim()) {
      toast.error('Please enter discharge summary');
      return;
    }
    
    const dischargeInfo = {
      dischargeDate: dischargeDate,
      dischargeSummary: dischargeSummary,
      dischargedBy: patient?.admittingDoctor || 'Doctor',
      medicines: dischargeMedicines.map(dm => ({
        medicineId: dm.medicineId,
        medicineName: dm.medicineName,
        dosage: dm.dosage,
        frequency: dm.frequency,
        duration: dm.duration,
        quantity: dm.quantity,
        notes: dm.notes
      }))
    };

    requestDischarge(patient.id, dischargeInfo);
    toast.success('Discharge information saved. Patient moved to Discharge list.');
    navigate('/ipd/inpatients');
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-6 overflow-hidden">
      
      {/* â”€â”€ LEFT PANEL â€” Patient info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors self-start font-bold text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Ward
        </button>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 mx-auto mb-3">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-center font-bold text-slate-800 text-lg">{patient.patientName}</h2>
          <p className="text-center text-xs text-slate-400 mt-0.5">{patient.uhid}</p>
          <p className="text-center text-sm text-slate-500 mt-1">{patient.age} yrs Â· {patient.gender}</p>

          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Current Location</p>
            <p className="font-bold text-slate-800">{ward?.name}</p>
            <p className="text-sm font-bold text-primary mt-1">Room no {bed?.roomNumber} â€¢ Bed {bed?.bedNumber}</p>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Admitting Doctor</p>
            <p className="font-bold text-slate-800 text-sm">{patient.admittingDoctor}</p>
            <p className="text-xs text-slate-500 mt-0.5">{patient.specialty}</p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Provisional Diagnosis</p>
            <p className="font-medium text-slate-700 text-sm">{patient.provisionalDiagnosis || 'Pending'}</p>
          </div>
        </div>
      </div>

      {/* â”€â”€ CENTER â€” Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Tab bar */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1 mb-4 overflow-x-auto shrink-0">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                  isActive ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-8">
          
          {/* NURSING FLOWSHEET */}
          {activeTab === 'nursing' && <NursingFlowsheet patientId={patient.id} />}
          
          {/* CLINICAL ROUNDS */}
          {activeTab === 'rounds' && <ClinicalRounds patientId={patient.id} />}
          
          {/* MAR (Medications) */}
          {activeTab === 'mar' && <MarGrid patientId={patient.id} />}
          
          {/* INVESTIGATIONS */}
          {activeTab === 'investigations' && <InvestigationsTab admissionId={patient.id} patientName={patient.patientName} />}

          {/* DISCHARGE TAB */}
          {activeTab === 'discharge' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2">
                    <ScrollText className="w-5 h-5 text-primary" /> Discharge Information
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">UHID: {patient.uhid}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Clinical Summary */}
                <div className="border border-slate-200 rounded-2xl p-4">
                  <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Clinical Summary
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">Admission Details</p>
                      <p className="text-sm text-slate-700">
                        <strong>Admission Date:</strong> {new Date(patient.admissionDate).toLocaleDateString()}<br />
                        <strong>Admitting Doctor:</strong> {patient.admittingDoctor}<br />
                        <strong>Specialty:</strong> {patient.specialty}<br />
                        <strong>Provisional Diagnosis:</strong> {patient.provisionalDiagnosis}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Clinical Notes</label>
                      <textarea
                        value={clinicalNotes}
                        onChange={(e) => setClinicalNotes(e.target.value)}
                        placeholder="Clinical notes and observations during admission..."
                        className="w-full mt-2 p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Discharge Details */}
                <div className="border border-slate-200 rounded-2xl p-4">
                  <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    Discharge Details
                  </h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Discharge Date</label>
                        <input
                          type="date"
                          value={dischargeDate}
                          onChange={(e) => setDischargeDate(e.target.value)}
                          className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Final Diagnosis</label>
                        <input
                          type="text"
                          value={finalDiagnosis}
                          onChange={(e) => setFinalDiagnosis(e.target.value)}
                          placeholder="Confirmed diagnosis"
                          className="w-full mt-1 p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Discharge Medicines */}
                <DischargePrescription 
                  items={dischargeMedicines}
                  onItemsChange={setDischargeMedicines}
                  dischargeSummary={dischargeSummary}
                  onSummaryChange={setDischargeSummary}
                />

                {/* Follow-up Instructions */}
                <div className="border border-slate-200 rounded-2xl p-4">
                  <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-primary" />
                    Follow-up Instructions
                  </h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                      <li>Follow prescribed medicines as per frequency</li>
                      <li>Avoid heavy work and strenuous activities for 2-3 days</li>
                      <li>Maintain proper diet and hydration</li>
                      <li>Report immediately if symptoms worsen</li>
                      <li>Keep follow-up appointment with your doctor</li>
                    </ul>
                  </div>
                </div>

                {/* Action Button */}
                <button 
                  onClick={handleSaveDischarge}
                  className="w-full px-6 py-3 bg-primary text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                >
                  <Save className="w-5 h-5" /> Save Discharge Summary
                </button>
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  );
}