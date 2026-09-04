import { API_ROOT_URL } from '@/utils/apiBase';
import { Calendar, Stethoscope, FlaskConical, ScanLine, Pill, FileText, User, CheckCircle } from 'lucide-react';
import { useOPDVisits } from '../../contexts/OPDVisitContext';
import { useIPD } from '../../contexts/IPDContext';
import { useInvestigations } from '../../contexts/InvestigationContext';

export const UnifiedPatientHistory = ({ patientUhid, excludeVisitId }: { patientUhid: string, excludeVisitId?: number }) => {
  const { visits } = useOPDVisits();
  const { patients: ipdAdmissions } = useIPD();
  const { orders: globalOrders } = useInvestigations();

  if (!patientUhid) return null;

  const pastOPDVisits = visits
    .filter(v => v.uhid === patientUhid && v.status === 'Completed' && v.id !== excludeVisitId)
    .map(v => ({
      id: v.id,
      type: 'OPD' as const,
      dateStr: v.date,
      dateObj: new Date(v.date),
      data: v
    }));

  const pastIPDAdmissions = ipdAdmissions
    .filter(a => a.uhid === patientUhid && a.status === 'Discharged')
    .map(a => ({
      id: a.id,
      type: 'IPD' as const,
      dateStr: a.admissionDate,
      dateObj: new Date(a.admissionDate),
      data: a
    }));

  const events = [...pastOPDVisits, ...pastIPDAdmissions].sort(
    (a, b) => b.dateObj.getTime() - a.dateObj.getTime()
  );

  const hasHistory = events.length > 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
      <h3 className="font-bold text-slate-800 mb-6">Patient EMR History</h3>
      
      {!hasHistory ? (
        <div className="text-center py-12 text-slate-400 font-medium">
          No Past History Found
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event, i) => {
            if (event.type === 'IPD') {
              const adm = event.data;
              return (
                <div key={adm.id || i} className="p-4 border border-slate-100 rounded-2xl bg-indigo-50/30">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-indigo-100/50">
                    <div>
                      <p className="font-bold text-indigo-900 text-sm flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-500" /> {adm.admissionDate} to {adm.dischargeInfo?.dischargeDate || 'N/A'}
                        <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] uppercase font-bold tracking-wider">IPD Admission</span>
                        <span className="ml-2 px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px] uppercase font-bold tracking-wider">Discharged</span>
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
                      <p className="text-xs font-bold text-indigo-400 uppercase mb-1 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Diagnosis</p>
                      <p className="text-sm text-indigo-900">{adm.admissionReason || 'N/A'}</p>
                    </div>
                    {adm.dischargeInfo?.dischargeSummary && (
                      <div>
                        <p className="text-xs font-bold text-indigo-400 uppercase mb-1 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Discharge Summary</p>
                        <p className="text-sm text-indigo-900">{adm.dischargeInfo.dischargeSummary}</p>
                      </div>
                    )}
                  </div>

                  {(() => {
                    const admOrders = globalOrders.filter(o => o.admissionId === adm.id);
                    const admLabs = admOrders.filter(o => o.category === 'Lab').flatMap(o => o.tests);
                    const admRads = admOrders.filter(o => o.category === 'Radiology').flatMap(o => o.tests);
                    if (admLabs.length === 0 && admRads.length === 0) return null;
                    return (
                      <div className="mt-4 pt-4 border-t border-indigo-100/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {admLabs.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-indigo-400 uppercase mb-2 flex items-center gap-1.5"><FlaskConical className="w-3.5 h-3.5" /> Lab Results</p>
                            {admLabs.map((l: any, idx: number) => {
                              const isDone = l.status === 'Completed' || l.status === 'Verified';
                              return (
                                <div key={idx} className="text-sm bg-white p-2 border border-slate-100 rounded-lg mb-2 shadow-sm">
                                  <p className="font-bold text-slate-700 mb-1">{l.name}</p>
                                  {isDone ? (
                                    <>
                                      <p className="text-green-600 font-bold text-xs flex items-center gap-1 mb-1"><CheckCircle className="w-3.5 h-3.5" /> Test Completed</p>
                                      {l.resultValue && <p className="text-primary font-medium">Result: {l.resultValue}</p>}
                                      <p className="text-xs text-slate-500 mt-1">Summary: {l.resultSummary || 'N/A'}</p>
                                      {l.resultFile && (
                                        <a href="#" onClick={(e) => {
                                            e.preventDefault();
                                            const baseUrl = API_ROOT_URL;
                                            const rf = l.resultFile ?? '';
                                            const filename = rf.startsWith(patientUhid) ? rf : `${patientUhid}_${rf}`;
                                            window.open(`${baseUrl}/uploads/${encodeURIComponent(filename)}`, '_blank');
                                        }} className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-blue-600 hover:text-blue-700">
                                          <FileText className="w-3 h-3" /> View Report
                                        </a>
                                      )}
                                    </>
                                  ) : (
                                    <p className="text-xs text-amber-500 italic">
                                      {l.status === 'Pending' ? 'Ordered' : 
                                       (l.status === 'Verified' || l.status === 'Completed' ? 'Test Completed' : l.status)}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {admRads.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-indigo-400 uppercase mb-2 flex items-center gap-1.5"><ScanLine className="w-3.5 h-3.5" /> Radiology Results</p>
                            {admRads.map((r: any, idx: number) => {
                              const isDone = r.status === 'Completed' || r.status === 'Verified';
                              return (
                                <div key={idx} className="text-sm bg-white p-2 border border-slate-100 rounded-lg mb-2 shadow-sm">
                                  <p className="font-bold text-slate-700 mb-1">{r.name} {r.bodyPart ? `(${r.bodyPart})` : ''}</p>
                                  {isDone ? (
                                    <>
                                      <p className="text-green-600 font-bold text-xs flex items-center gap-1 mb-1"><CheckCircle className="w-3.5 h-3.5" /> Test Completed</p>
                                      {r.resultValue && <p className="text-primary font-medium">Result: {r.resultValue}</p>}
                                      <p className="text-xs text-slate-500 mt-1">Summary: {r.resultSummary || 'N/A'}</p>
                                      {r.resultFile && (
                                        <a href="#" onClick={(e) => {
                                            e.preventDefault();
                                            const baseUrl = API_ROOT_URL;
                                            const rf = r.resultFile ?? '';
                                            const filename = rf.startsWith(patientUhid) ? rf : `${patientUhid}_${rf}`;
                                            window.open(`${baseUrl}/uploads/${encodeURIComponent(filename)}`, '_blank');
                                        }} className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-blue-600 hover:text-blue-700">
                                          <FileText className="w-3 h-3" /> View Report
                                        </a>
                                      )}
                                    </>
                                  ) : (
                                    <p className="text-xs text-amber-500 italic">
                                      {r.status === 'Pending' ? 'Ordered' : 
                                       (r.status === 'Verified' || r.status === 'Completed' ? 'Test Completed' : r.status)}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            }

            if (event.type === 'OPD') {
              const past = event.data;
              return (
                <div key={past.id || i} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <div>
                      <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" /> {past.date}
                        <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] uppercase font-bold tracking-wider">OPD Visit</span>
                        {(() => {
                          const wasAdmitted = ipdAdmissions.some(a => a.uhid === past.uhid && a.admissionDate?.slice(0, 10) === past.date?.slice(0, 10));
                          if (wasAdmitted) return null;
                          return ['Completed', 'Paid', 'Billed'].includes(past.billingStatus) ? (
                            <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] uppercase font-bold tracking-wider">Bill Paid</span>
                          ) : (
                            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] uppercase font-bold tracking-wider">Billing Pending</span>
                          );
                        })()}
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
                          {past.labOrders.map((l: any, idx: number) => {
                            const st = (() => {
                              const orders = globalOrders.filter((o: any) => o.patientId === past.uhid && o.category === 'Lab' && o.orderedAt?.slice(0, 10) === past.date.slice(0, 10));
                              for (const o of orders) {
                                const t = o.tests.find((x: any) => x.name === l.testName);
                                if (t) return t;
                              }
                              return null;
                            })();
                            const statusRaw = st ? st.status : l.status;
                            const status = statusRaw === 'Pending' ? 'Ordered' : statusRaw;
                            const isDone = status === 'Completed' || status === 'Verified';
                            return (
                              <div key={idx} className="text-sm bg-white p-2 border border-slate-100 rounded-lg mb-2 shadow-sm">
                                <p className="font-bold text-slate-700 mb-1">{l.testName || l.testCode}</p>
                                {isDone && st ? (
                                  <>
                                    <p className="text-green-600 font-bold text-xs flex items-center gap-1 mb-1"><CheckCircle className="w-3.5 h-3.5" /> Test Completed</p>
                                    {st.resultValue && <p className="text-primary font-medium">Result: {st.resultValue}</p>}
                                    <p className="text-xs text-slate-500 mt-1">Summary: {st.resultSummary || 'N/A'}</p>
                                    {st.resultFile && (
                                      <a href="#" onClick={(e) => {
                                          e.preventDefault();
                                          const baseUrl = API_ROOT_URL;
                                          const rf = st.resultFile ?? '';
                                          const filename = rf.startsWith(past.uhid) ? rf : `${past.uhid}_${rf}`;
                                          window.open(`${baseUrl}/uploads/${encodeURIComponent(filename)}`, '_blank');
                                      }} className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-blue-600 hover:text-blue-700">
                                        <FileText className="w-3 h-3" /> View Report
                                      </a>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-xs text-amber-500 italic">
                                    {status === 'Pending' ? 'Ordered' : 
                                     (status === 'Verified' || status === 'Completed' ? 'Test Completed' : (status || 'Ordered'))}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {past.radiologyOrders?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5"><ScanLine className="w-3.5 h-3.5" /> Radiology Results</p>
                          {past.radiologyOrders.map((r: any, idx: number) => {
                            const st = (() => {
                              const orders = globalOrders.filter((o: any) => o.patientId === past.uhid && o.category === 'Radiology' && o.orderedAt?.slice(0, 10) === past.date.slice(0, 10));
                              for (const o of orders) {
                                const t = o.tests.find((x: any) => x.name === (r.serviceName || r.bodyPart) || x.bodyPart === r.bodyPart);
                                if (t) return t;
                              }
                              return null;
                            })();
                            const statusRaw = st ? st.status : r.status;
                            const status = statusRaw === 'Pending' ? 'Ordered' : statusRaw;
                            const isDone = status === 'Completed' || status === 'Verified';
                            return (
                              <div key={idx} className="text-sm bg-white p-2 border border-slate-100 rounded-lg mb-2 shadow-sm">
                                <p className="font-bold text-slate-700 mb-1">{r.serviceName || r.bodyPart} {r.modality ? `(${r.modality})` : ''}</p>
                                {isDone && st ? (
                                  <>
                                    <p className="text-green-600 font-bold text-xs flex items-center gap-1 mb-1"><CheckCircle className="w-3.5 h-3.5" /> Test Completed</p>
                                    {st.resultValue && <p className="text-primary font-medium">Result: {st.resultValue}</p>}
                                    <p className="text-xs text-slate-500 mt-1">Summary: {st.resultSummary || 'N/A'}</p>
                                    {st.resultFile && (
                                      <a href="#" onClick={(e) => {
                                          e.preventDefault();
                                          const baseUrl = API_ROOT_URL;
                                          const rf = st.resultFile ?? '';
                                          const filename = rf.startsWith(past.uhid) ? rf : `${past.uhid}_${rf}`;
                                          window.open(`${baseUrl}/uploads/${encodeURIComponent(filename)}`, '_blank');
                                      }} className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-blue-600 hover:text-blue-700">
                                        <FileText className="w-3 h-3" /> View Report
                                      </a>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-xs text-amber-500 italic">
                                    {status === 'Pending' ? 'Ordered' : 
                                     (status === 'Verified' || status === 'Completed' ? 'Test Completed' : (status || 'Ordered'))}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })}
        </div>
      )}
    </div>
  );
};
