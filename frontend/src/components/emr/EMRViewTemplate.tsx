
import { useState } from 'react';
import type { EMRRecord } from './EMRPrintTemplate';
import { Stethoscope, Activity, Pill, Beaker, Clock, CheckCircle2, Syringe, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL as string || 'http://localhost:8000/api/v1';

interface EMRViewTemplateProps {
  record: EMRRecord;
}

export const EMRViewTemplate = ({ record }: EMRViewTemplateProps) => {
  const [savingOps, setSavingOps] = useState(false);
  const [opsData, setOpsData] = useState<any[]>(record?.operations || []);

  const handleSaveOperations = async () => {
    try {
      setSavingOps(true);
      const res = await fetch(`${API_BASE}/ipd/admissions/${record.visitId}/operations-emr`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operations: opsData })
      });
      if (res.ok) toast.success('Operation details saved successfully!');
      else toast.error('Failed to save operation details.');
    } catch (e) {
      toast.error('Network error saving operation details.');
    } finally {
      setSavingOps(false);
    }
  };

  if (!record) return null;

  return (
    <div className="bg-slate-50/50 rounded-2xl min-h-full border border-slate-100 flex flex-col font-sans">
      
      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200 px-6 py-5 rounded-t-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold text-2xl shadow-inner border border-primary/20">
            {record.patientName.charAt(0)}
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">{record.patientName}</h3>
            <p className="text-sm font-medium text-slate-500 mt-0.5">
              UHID: <span className="text-slate-700">{record.uhid}</span> • {record.age} Y / {record.gender}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-start md:items-end">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${
            record.visitType === 'IP' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
          }`}>
            {record.visitType === 'IP' ? 'Inpatient Admission' : 'Outpatient Visit'}
          </span>
          <p className="text-sm text-slate-600 font-medium">{record.doctor} • {record.department || record.specialty}</p>
          <p className="text-xs text-slate-500 mt-0.5">{record.visitDate} (ID: {record.visitId})</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 overflow-y-auto space-y-6">
        
        {/* Vitals Summary Card */}
        {record.vitals && Object.values(record.vitals).some(Boolean) && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
              <Activity className="w-4 h-4 text-rose-500" />
              Vital Signs
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {record.vitals.bp && (
                <div><p className="text-xs font-bold text-slate-400 uppercase">Blood Pressure</p><p className="font-bold text-slate-800 mt-1">{record.vitals.bp} <span className="text-xs text-slate-500 font-normal">mmHg</span></p></div>
              )}
              {record.vitals.pulse && (
                <div><p className="text-xs font-bold text-slate-400 uppercase">Pulse</p><p className="font-bold text-slate-800 mt-1">{record.vitals.pulse} <span className="text-xs text-slate-500 font-normal">bpm</span></p></div>
              )}
              {record.vitals.temp && (
                <div><p className="text-xs font-bold text-slate-400 uppercase">Temperature</p><p className="font-bold text-slate-800 mt-1">{record.vitals.temp} <span className="text-xs text-slate-500 font-normal">°F</span></p></div>
              )}
              {record.vitals.spo2 && (
                <div><p className="text-xs font-bold text-slate-400 uppercase">SpO2</p><p className="font-bold text-slate-800 mt-1">{record.vitals.spo2} <span className="text-xs text-slate-500 font-normal">%</span></p></div>
              )}
              {record.vitals.weight && (
                <div><p className="text-xs font-bold text-slate-400 uppercase">Weight</p><p className="font-bold text-slate-800 mt-1">{record.vitals.weight} <span className="text-xs text-slate-500 font-normal">kg</span></p></div>
              )}
            </div>
          </div>
        )}

        {/* Clinical Overview */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-primary" />
            Clinical Overview
          </h4>
          <div className="p-5 space-y-5">
            {record.chiefComplaint && (
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Chief Complaint</p>
                <div className="bg-amber-50 text-amber-900 p-3 rounded-lg text-sm border border-amber-100/50">
                  {record.chiefComplaint}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Diagnosis / Assessment</p>
                <div className="text-sm text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100 h-full">
                  {record.diagnosis || record.finalDiagnosis || 'Pending'}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Clinical Notes</p>
                <div className="text-sm text-slate-800 bg-blue-50 p-3 rounded-lg border border-blue-100/50 h-full">
                  {record.clinicalNotes || 'No notes provided.'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* INPATIENT SPECIFIC: Hospital Course */}
        {record.visitType === 'IP' && (
          <div className="bg-white rounded-xl border border-indigo-200 overflow-hidden shadow-sm relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
            <h4 className="text-sm font-bold text-slate-800 bg-indigo-50/50 px-5 py-3 border-b border-indigo-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Inpatient Course & Summary
            </h4>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div><p className="text-xs font-bold text-slate-400 uppercase">Admission Date</p><p className="text-sm font-bold text-slate-800">{record.admissionDate}</p></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase">Ward & Bed</p><p className="text-sm font-bold text-slate-800">{record.ward} - {record.bed}</p></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase">Discharge Date</p><p className="text-sm font-bold text-slate-800">{record.dischargeDate || 'Active'}</p></div>
              </div>
              
              {record.hospitalCourse && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hospital Course Summary</p>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">{record.hospitalCourse}</div>
                </div>
              )}
              
              {record.procedureNotes && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Procedures</p>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">{record.procedureNotes}</div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Investigations */}
          {record.investigations && record.investigations.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
                <Beaker className="w-4 h-4 text-purple-500" />
                Investigations
              </h4>
              <div className="p-0">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/50 text-xs text-slate-500 uppercase border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Test</th>
                      <th className="px-5 py-3 font-semibold">Result</th>
                      <th className="px-5 py-3 font-semibold">Summary</th>
                      <th className="px-5 py-3 font-semibold hidden md:table-cell">Range</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {record.investigations.map((inv: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-700">{inv.test}</td>
                        <td className="px-5 py-3 font-bold text-slate-900">{inv.result}</td>
                        <td className="px-5 py-3 text-slate-600">{inv.summary || '—'}</td>
                        <td className="px-5 py-3 text-slate-500 hidden md:table-cell">{inv.normalRange || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Prescriptions */}
          {record.prescriptions && record.prescriptions.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
                <Pill className="w-4 h-4 text-emerald-500" />
                {record.visitType === 'IP' ? 'Discharge Medications' : 'Prescriptions'}
              </h4>
              <div className="p-4 space-y-3">
                {record.prescriptions.map((rx, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50 hover:border-emerald-200 transition-colors">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{rx.medicine}</p>
                      <p className="text-xs text-slate-600 mt-1 font-medium">{rx.dosage} • {rx.frequency} • {rx.duration}</p>
                      {rx.instructions && <p className="text-xs text-slate-500 italic mt-1">{rx.instructions}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Operations Section */}
        {opsData && opsData.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Syringe className="w-4 h-4 text-rose-500" />
                Operations Details
              </h4>
              <button
                onClick={handleSaveOperations}
                disabled={savingOps}
                className="text-xs px-3 py-1.5 bg-primary text-white rounded font-bold hover:bg-primary/90 flex items-center gap-1"
              >
                <Save className="w-3 h-3" /> {savingOps ? 'Saving...' : 'Save Operations'}
              </button>
            </div>
            <div className="p-5 space-y-4">
              {opsData.map((op, idx) => (
                <div key={idx} className="border border-slate-100 rounded-xl p-4 bg-slate-50">
                  <p className="font-bold text-slate-800 mb-3">{op.name} <span className="text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 ml-2">{op.type} Operation</span></p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Operation Summary</label>
                      <textarea
                        rows={3}
                        className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-primary"
                        value={op.summary || ''}
                        onChange={(e) => {
                          const newOps = [...opsData];
                          newOps[idx].summary = e.target.value;
                          setOpsData(newOps);
                        }}
                        placeholder="Enter operation summary..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Operation Result</label>
                      <textarea
                        rows={3}
                        className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-primary"
                        value={op.result || ''}
                        onChange={(e) => {
                          const newOps = [...opsData];
                          newOps[idx].result = e.target.value;
                          setOpsData(newOps);
                        }}
                        placeholder="Enter operation result/outcome..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up & Advice */}
        {record.followUpDate && (
          <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-5 shadow-sm">
            <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Follow-up & Advice
            </h4>
            <p className="text-sm text-emerald-800 mb-3">
              Next Follow-up Scheduled: <span className="font-black bg-white px-2 py-0.5 rounded ml-1 border border-emerald-200">{record.followUpDate}</span>
            </p>
            {record.dischargeAdvice && (
              <p className="text-sm text-emerald-800 whitespace-pre-wrap bg-white/50 p-3 rounded-lg border border-emerald-100/50">
                {record.dischargeAdvice}
              </p>
            )}
          </div>
        )}

      </div>
      
      {/* Footer */}
      <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 text-center rounded-b-2xl mt-auto">
        <p className="text-xs font-medium text-slate-500">Care Fusions EMR Viewer • Last synchronized: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
};

export default EMRViewTemplate;
