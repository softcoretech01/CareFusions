import { Calendar, Stethoscope, FlaskConical, ScanLine, Pill, FileText, User } from 'lucide-react';
import { useOPDVisits } from '../../contexts/OPDVisitContext';
import { useIPD } from '../../contexts/IPDContext';

export const PatientHistoryTab = ({ patient }: { patient: any }) => {
  const { visits } = useOPDVisits();
  const { patients: ipdAdmissions } = useIPD();

  if (!patient) return null;

  const pastOPDVisits = visits
    .filter(v => v.uhid === patient.uhid && v.status === 'Completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const pastIPDAdmissions = ipdAdmissions
    .filter(a => a.uhid === patient.uhid && a.id !== patient.id && a.status === 'Discharged')
    .sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime());

  const hasHistory = pastOPDVisits.length > 0 || pastIPDAdmissions.length > 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
      <h3 className="font-bold text-slate-800 mb-6">Patient EMR History</h3>
      
      {!hasHistory ? (
        <div className="text-center py-12 text-slate-400 font-medium">
          No Past History Found
        </div>
      ) : (
        <div className="space-y-8">
          
          {pastIPDAdmissions.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-slate-700 uppercase mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Past IPD Admissions
              </h4>
              <div className="space-y-4">
                {pastIPDAdmissions.map((adm, i) => (
                  <div key={adm.id || i} className="p-4 border border-slate-100 rounded-2xl bg-indigo-50/30">
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-indigo-100/50">
                      <div>
                        <p className="font-bold text-indigo-900 text-sm flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-indigo-500" /> {adm.admissionDate} to {adm.dischargeInfo?.dischargeDate || 'N/A'}
                        </p>
                        <p className="text-xs text-indigo-700/70 mt-1">Admission: {adm.admissionNumber} &middot; Dept: {adm.specialty}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-indigo-900 flex items-center justify-end gap-1.5">
                          <span className="text-xs font-normal text-indigo-700/70">Doctor:</span> {adm.admittingDoctor}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-bold text-indigo-400 uppercase mb-1">Diagnosis</p>
                        <p className="text-sm text-indigo-900">{adm.provisionalDiagnosis || 'N/A'}</p>
                      </div>
                      {adm.dischargeInfo?.dischargeSummary && (
                        <div>
                          <p className="text-xs font-bold text-indigo-400 uppercase mb-1">Discharge Summary</p>
                          <p className="text-sm text-indigo-900">{adm.dischargeInfo.dischargeSummary}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pastOPDVisits.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-slate-700 uppercase mb-4 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-emerald-500" /> Past OPD Visits
              </h4>
              <div className="space-y-4">
                {pastOPDVisits.map((past, i) => (
                  <div key={past.id || i} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                      <div>
                        <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" /> {past.date}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Visit: {past.visitNumber} &middot; Dept: {past.department}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-700 flex items-center justify-end gap-1.5">
                          <span className="text-xs font-normal text-slate-500">Doctor:</span> {past.doctorName}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {past.diagnoses && past.diagnoses.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5"><Stethoscope className="w-3.5 h-3.5" /> Diagnosis</p>
                          {past.diagnoses.map((d: any, idx: number) => (
                            <p key={idx} className="text-sm text-slate-700 bg-white p-2 rounded-lg border border-slate-100 mb-1">{d.description}</p>
                          ))}
                        </div>
                      )}
                      {past.prescriptions && past.prescriptions.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5"><Pill className="w-3.5 h-3.5" /> Prescription</p>
                          {past.prescriptions.map((p: any, idx: number) => (
                            <div key={idx} className="text-sm text-slate-700 mb-1 flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100">
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{p.type}</span>
                              <span className="font-medium">{p.medicineName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {(past.labOrders?.length > 0 || past.radiologyOrders?.length > 0) && (
                      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {past.labOrders?.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5"><FlaskConical className="w-3.5 h-3.5" /> Lab Results</p>
                            {past.labOrders.map((l: any, idx: number) => (
                              <div key={idx} className="text-sm bg-white p-2 border border-slate-100 rounded-lg mb-2">
                                <p className="font-bold text-slate-700 mb-1">{l.testName}</p>
                                {l.result ? <p className="text-primary font-medium">Result: {l.result}</p> : null}
                                {l.resultSummary && <p className="text-xs text-slate-500 mt-1">{l.resultSummary}</p>}
                                {!l.result && !l.resultSummary && <p className="text-xs text-amber-500 italic">Pending</p>}
                              </div>
                            ))}
                          </div>
                        )}
                        {past.radiologyOrders?.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5"><ScanLine className="w-3.5 h-3.5" /> Radiology Results</p>
                            {past.radiologyOrders.map((r: any, idx: number) => (
                              <div key={idx} className="text-sm bg-white p-2 border border-slate-100 rounded-lg mb-2">
                                <p className="font-bold text-slate-700 mb-1">{r.bodyPart} ({r.modality})</p>
                                {r.result ? <p className="text-primary font-medium">Result: {r.result}</p> : null}
                                {r.resultSummary && <p className="text-xs text-slate-500 mt-1">{r.resultSummary}</p>}
                                {!r.result && !r.resultSummary && <p className="text-xs text-amber-500 italic">Pending</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
