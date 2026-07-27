import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOPDVisits } from '../../contexts/OPDVisitContext';
import type { Vitals, TriageInfo } from '../../contexts/OPDVisitContext';
import { Heart, Activity, AlertTriangle, CheckCircle, ArrowRight, User, Clock, Hash } from 'lucide-react';
import toast from 'react-hot-toast';



const inputCls = 'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all';
const labelCls = 'block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5';

export const NursingTriage = () => {
  const { visitId } = useParams<{ visitId: string }>();
  const { getVisitById, saveTriage } = useOPDVisits();
  const navigate = useNavigate();

  const visit = getVisitById(Number(visitId));

  const [vitals, setVitals] = useState<Partial<Vitals>>({
    bp_systolic: visit?.vitals?.bp_systolic ?? undefined,
    bp_diastolic: visit?.vitals?.bp_diastolic ?? undefined,
    pulse: visit?.vitals?.pulse ?? undefined,
    respRate: visit?.vitals?.respRate ?? undefined,
    temp: visit?.vitals?.temp ?? undefined,
    tempUnit: visit?.vitals?.tempUnit ?? 'C',
    spo2: visit?.vitals?.spo2 ?? undefined,
    height: visit?.vitals?.height ?? undefined,
    weight: visit?.vitals?.weight ?? undefined,
    bmi: visit?.vitals?.bmi ?? undefined,
    bloodSugar: visit?.vitals?.bloodSugar ?? undefined,
  });

  const [triage, setTriage] = useState<Partial<TriageInfo>>({
    chiefComplaint: visit?.triageInfo?.chiefComplaint ?? '',
    painScore: visit?.triageInfo?.painScore ?? 0,
    allergyVerified: visit?.triageInfo?.allergyVerified ?? false,
    pregnancyStatus: visit?.triageInfo?.pregnancyStatus ?? 'NA',
    fallRisk: visit?.triageInfo?.fallRisk ?? 'Low',
    infectionStatus: visit?.triageInfo?.infectionStatus ?? 'None',
    observations: visit?.triageInfo?.observations ?? '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!visit) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Visit not found.
      </div>
    );
  }

  // Auto-calculate BMI
  const updateVital = (key: keyof Vitals, val: any) => {
    const updated = { ...vitals, [key]: val };
    if ((key === 'height' || key === 'weight') && updated.height && updated.weight) {
      const h = Number(updated.height) / 100;
      updated.bmi = Math.round((Number(updated.weight) / (h * h)) * 10) / 10;
    }
    setVitals(updated);
  };

  // Vital alerts
  const vitalAlerts: string[] = [];
  if (vitals.spo2 && vitals.spo2 < 94) vitalAlerts.push(`SpO₂ ${vitals.spo2}% — below 94%`);
  if (vitals.bp_systolic && vitals.bp_systolic > 180) vitalAlerts.push(`BP ${vitals.bp_systolic}/${vitals.bp_diastolic} mmHg — critically high`);
  if (vitals.pulse && (vitals.pulse > 100 || vitals.pulse < 50)) vitalAlerts.push(`Pulse ${vitals.pulse} bpm — abnormal`);
  if (vitals.temp && vitals.temp > 38.5) vitalAlerts.push(`Temperature ${vitals.temp}°C — febrile`);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!triage.chiefComplaint?.trim()) e.cc = 'Chief complaint is required';
    if (!vitals.bp_systolic) e.bp = 'Blood pressure is required';
    if (!vitals.pulse) e.pulse = 'Pulse is required';
    if (!vitals.temp) e.temp = 'Temperature is required';
    if (!vitals.spo2) e.spo2 = 'SpO₂ is required';
    if (!triage.allergyVerified) e.allergy = 'Allergy must be verified before proceeding';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    saveTriage(
      visit.id,
      {
        ...vitals,
        recordedAt: timeStr,
        recordedBy: 'Nurse on duty',
        bmi: vitals.bmi ?? 0,
        bp_systolic: vitals.bp_systolic ?? 0,
        bp_diastolic: vitals.bp_diastolic ?? 0,
        pulse: vitals.pulse ?? 0,
        respRate: vitals.respRate ?? 0,
        temp: vitals.temp ?? 0,
        tempUnit: vitals.tempUnit ?? 'C',
        spo2: vitals.spo2 ?? 0,
        height: vitals.height ?? 0,
        weight: vitals.weight ?? 0,
      } as Vitals,
      {
        chiefComplaint: triage.chiefComplaint ?? '',
        painScore: triage.painScore ?? 0,
        allergyVerified: triage.allergyVerified ?? false,
        pregnancyStatus: triage.pregnancyStatus ?? 'NA',
        fallRisk: triage.fallRisk ?? 'Low',
        infectionStatus: triage.infectionStatus ?? 'None',
        observations: triage.observations ?? '',
      } as TriageInfo
    );
    toast.success('Triage saved — patient moved to "Waiting for Doctor"');
    navigate('/opd/queue');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Patient header */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{visit.patientName}</h2>
              <p className="text-sm text-slate-500">{visit.uhid} · {visit.age}y · {visit.gender}</p>
              {visit.allergies.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs font-bold text-red-500">Allergies: {visit.allergies.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-primary" />
              <span className="font-bold text-primary">{visit.queueToken}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{visit.timeSlot}</span>
            </div>
            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-xs font-bold">
              {visit.department}
            </div>
          </div>
        </div>
      </div>

      {/* Vital alerts */}
      {vitalAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700 mb-1">⚠️ Abnormal Vitals Detected</p>
            {vitalAlerts.map((a, i) => <p key={i} className="text-xs text-red-600">{a}</p>)}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── VITALS ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Vital Signs
          </h3>

          {/* BP */}
          <div className="mb-4">
            <label className={labelCls}>Blood Pressure (mmHg) {errors.bp && <span className="text-red-500 normal-case ml-1">{errors.bp}</span>}</label>
            <div className="flex gap-2">
              <input type="number" placeholder="Systolic" value={vitals.bp_systolic ?? ''} onChange={e => updateVital('bp_systolic', Number(e.target.value))}
                className={`${inputCls} ${errors.bp ? 'border-red-300' : ''}`} />
              <span className="self-center text-slate-400 font-bold">/</span>
              <input type="number" placeholder="Diastolic" value={vitals.bp_diastolic ?? ''} onChange={e => updateVital('bp_diastolic', Number(e.target.value))}
                className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelCls}>Pulse (bpm) {errors.pulse && <span className="text-red-500 normal-case ml-1">{errors.pulse}</span>}</label>
              <input type="number" placeholder="72" value={vitals.pulse ?? ''} onChange={e => updateVital('pulse', Number(e.target.value))}
                className={`${inputCls} ${errors.pulse ? 'border-red-300' : ''}`} />
            </div>
            <div>
              <label className={labelCls}>Resp. Rate (/min)</label>
              <input type="number" placeholder="16" value={vitals.respRate ?? ''} onChange={e => updateVital('respRate', Number(e.target.value))}
                className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelCls}>Temperature {errors.temp && <span className="text-red-500 normal-case ml-1">{errors.temp}</span>}</label>
              <div className="flex gap-2">
                <input type="number" step="0.1" placeholder="37.0" value={vitals.temp ?? ''} onChange={e => updateVital('temp', Number(e.target.value))}
                  className={`${inputCls} ${errors.temp ? 'border-red-300' : ''} flex-1`} />
                <select value={vitals.tempUnit} onChange={e => updateVital('tempUnit', e.target.value)}
                  className="px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                  <option value="C">°C</option>
                  <option value="F">°F</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>SpO₂ (%) {errors.spo2 && <span className="text-red-500 normal-case ml-1">{errors.spo2}</span>}</label>
              <input type="number" max={100} placeholder="99" value={vitals.spo2 ?? ''} onChange={e => updateVital('spo2', Number(e.target.value))}
                className={`${inputCls} ${errors.spo2 ? 'border-red-300' : ''} ${vitals.spo2 && vitals.spo2 < 94 ? 'border-red-400 bg-red-50' : ''}`} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelCls}>Height (cm)</label>
              <input type="number" placeholder="170" value={vitals.height ?? ''} onChange={e => updateVital('height', Number(e.target.value))}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Weight (kg)</label>
              <input type="number" placeholder="70" value={vitals.weight ?? ''} onChange={e => updateVital('weight', Number(e.target.value))}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>BMI (auto)</label>
              <div className={`${inputCls} bg-slate-100 text-slate-700 font-bold flex items-center`}>
                {vitals.bmi ? vitals.bmi : '—'}
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Blood Sugar (mg/dL) — optional</label>
            <input type="number" placeholder="Optional" value={vitals.bloodSugar ?? ''} onChange={e => updateVital('bloodSugar', Number(e.target.value))}
              className={inputCls} />
          </div>
        </div>

        {/* ── CLINICAL INFO ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" /> Clinical Information
          </h3>

          <div className="mb-4">
            <label className={labelCls}>Chief Complaint <span className="text-red-400">*</span> {errors.cc && <span className="text-red-500 normal-case ml-1">{errors.cc}</span>}</label>
            <textarea rows={3} placeholder="Main reason for visit..." value={triage.chiefComplaint}
              onChange={e => setTriage(t => ({ ...t, chiefComplaint: e.target.value }))}
              className={`${inputCls} resize-none ${errors.cc ? 'border-red-300' : ''}`} />
          </div>

          {/* Pain score */}
          <div className="mb-4">
            <label className={labelCls}>Pain Score: <span className="text-primary font-bold">{triage.painScore} / 10</span></label>
            <div className="flex items-center gap-2">
              {[...Array(11)].map((_, i) => (
                <button key={i} onClick={() => setTriage(t => ({ ...t, painScore: i }))}
                  className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${
                    i === triage.painScore
                      ? i <= 3 ? 'bg-green-500 text-white' : i <= 6 ? 'bg-orange-400 text-white' : 'bg-red-500 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}>
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* Allergy verified */}
          <div className="mb-4">
            <label className={`${labelCls} ${errors.allergy ? 'text-red-500' : ''}`}>
              Allergy Verification {errors.allergy && <span className="normal-case text-red-500 ml-1">— required</span>}
            </label>
            <button
              onClick={() => setTriage(t => ({ ...t, allergyVerified: !t.allergyVerified }))}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                triage.allergyVerified
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-primary'
              }`}
            >
              <CheckCircle className={`w-4 h-4 ${triage.allergyVerified ? 'text-green-500' : 'text-slate-400'}`} />
              {triage.allergyVerified ? 'Allergies Verified ✓' : 'Click to Confirm Allergy Check'}
            </button>
            {visit.allergies.length > 0 && (
              <p className="text-xs text-red-500 mt-1.5 font-medium">
                Known: {visit.allergies.join(', ')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelCls}>Fall Risk</label>
              <select value={triage.fallRisk} onChange={e => setTriage(t => ({ ...t, fallRisk: e.target.value as any }))}
                className={inputCls}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Infection Status</label>
              <select value={triage.infectionStatus} onChange={e => setTriage(t => ({ ...t, infectionStatus: e.target.value as any }))}
                className={inputCls}>
                <option value="None">None</option>
                <option value="Suspected">Suspected</option>
                <option value="Confirmed">Confirmed</option>
              </select>
            </div>
          </div>

          {visit.gender === 'Female' && (
            <div className="mb-4">
              <label className={labelCls}>Pregnancy Status</label>
              <select value={triage.pregnancyStatus} onChange={e => setTriage(t => ({ ...t, pregnancyStatus: e.target.value as any }))}
                className={inputCls}>
                <option value="NotPregnant">Not Pregnant</option>
                <option value="Pregnant">Pregnant</option>
                <option value="Unknown">Unknown</option>
                <option value="NA">N/A</option>
              </select>
            </div>
          )}

          <div>
            <label className={labelCls}>Initial Observations</label>
            <textarea rows={3} placeholder="Nurse observations..." value={triage.observations}
              onChange={e => setTriage(t => ({ ...t, observations: e.target.value }))}
              className={`${inputCls} resize-none`} />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex gap-4 justify-end pb-8">
        <button onClick={() => navigate('/opd/queue')}
          className="px-6 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
          Cancel
        </button>
        <button onClick={handleSave}
          className="px-8 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2">
          <ArrowRight className="w-4 h-4" /> Save Triage &amp; Send to Doctor
        </button>
      </div>
    </div>
  );
};
