
import { X, User, Hash, Activity } from 'lucide-react';
import type { OPDVisit } from '../../contexts/OPDVisitContext';
import { useInvestigations } from '../../contexts/InvestigationContext';

interface VisitDetailsModalProps {
  visit: OPDVisit | null;
  onClose: () => void;
  type?: 'Lab' | 'Radiology';
}

export const VisitDetailsModal = ({ visit, onClose, type }: VisitDetailsModalProps) => {
  const { orders: globalOrders } = useInvestigations();

  if (!visit) return null;

  const getRadStatus = (uhid: string, serviceName: string, bodyPart: string, defaultStatus: string, visitDate: string) => {
    const patientOrders = globalOrders.filter((o: any) => o.patientId === uhid && o.category === 'Radiology' && o.orderedAt?.slice(0, 10) === visitDate.slice(0, 10));
    for (const o of patientOrders) {
      const t = o.tests.find((x: any) => x.name === (serviceName || bodyPart) || x.bodyPart === bodyPart);
      if (t) {
        if (t.status === 'Completed' || t.status === 'Verified') {
          return { status: 'Completed', summary: t.resultSummary, result: t.resultValue, resultFile: t.resultFile };
        }
        return { status: t.status === 'Pending' ? 'Ordered' : t.status, summary: undefined, result: undefined, resultFile: undefined };
      }
    }
    return { status: defaultStatus === 'Pending' ? 'Ordered' : defaultStatus, summary: undefined, result: undefined, resultFile: undefined };
  };

  const getLabStatus = (uhid: string, testName: string, defaultStatus: string, visitDate: string) => {
    const patientOrders = globalOrders.filter((o: any) => o.patientId === uhid && o.category === 'Lab' && o.orderedAt?.slice(0, 10) === visitDate.slice(0, 10));
    for (const o of patientOrders) {
      const t = o.tests.find((x: any) => x.name === testName);
      if (t) {
        if (t.status === 'Completed' || t.status === 'Verified') {
          return { status: 'Completed', summary: t.resultSummary, result: t.resultValue, resultFile: t.resultFile };
        }
        return { status: t.status === 'Pending' ? 'Ordered' : t.status, summary: undefined, result: undefined, resultFile: undefined };
      }
    }
    return { status: defaultStatus === 'Pending' ? 'Ordered' : defaultStatus, summary: undefined, result: undefined, resultFile: undefined };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">Visit Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="flex items-center gap-4 mb-6 bg-primary/5 p-4 rounded-xl border border-primary/10">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">{visit.patientName}</h3>
              <p className="text-sm text-slate-500">{visit.uhid} · {visit.age}y · {visit.gender}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                <Hash className="w-4 h-4" /> Visit Info
              </div>
              <p className="text-sm text-slate-700"><strong>Visit No:</strong> {visit.visitNumber}</p>
              <p className="text-sm text-slate-700"><strong>Date:</strong> {visit.date}</p>
              <p className="text-sm text-slate-700"><strong>Status:</strong> {visit.status}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-2">
                <Activity className="w-4 h-4" /> Consultation
              </div>
              <p className="text-sm text-slate-700"><strong>Doctor:</strong> {visit.doctorName}</p>
              <p className="text-sm text-slate-700"><strong>Dept:</strong> {visit.department}</p>
              <p className="text-sm text-slate-700"><strong>Token:</strong> {visit.queueToken}</p>
            </div>
          </div>

          {visit.diagnoses.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-bold text-slate-700 mb-2">Diagnoses</h4>
              <ul className="list-disc pl-5 text-sm text-slate-600">
                {visit.diagnoses.map((d, idx) => <li key={d.id || idx}>{d.description}</li>)}
              </ul>
            </div>
          )}

          {(!type || type === 'Lab') && visit.labOrders.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-bold text-slate-700 mb-2">Lab Orders</h4>
              <ul className="list-disc pl-5 text-sm text-slate-600">
                {visit.labOrders.map((l, idx) => {
                  const labStatus = getLabStatus(visit.uhid, l.testName, l.status, visit.date);
                  return (
                    <li key={l.id || idx} className="mb-2">
                      {l.testName} <span className="text-xs text-slate-400">({labStatus.status})</span>
                      {labStatus.summary && (
                        <div className="mt-1 pl-3 border-l-2 border-slate-200 text-xs text-slate-500 italic">
                          <span className="font-semibold not-italic">Summary:</span> {labStatus.summary}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {(!type || type === 'Radiology') && visit.radiologyOrders.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-bold text-slate-700 mb-2">Radiology Orders</h4>
              <ul className="list-disc pl-5 text-sm text-slate-600">
                {visit.radiologyOrders.map((r, idx) => {
                  const radStatus = getRadStatus(visit.uhid, r.serviceName ?? '', r.bodyPart, r.status, visit.date);
                  return (
                    <li key={r.id || idx} className="mb-2">
                      {r.bodyPart} - {r.modality} <span className="text-xs text-slate-400">({radStatus.status})</span>
                      {radStatus.summary && (
                        <div className="mt-1 pl-3 border-l-2 border-slate-200 text-xs text-slate-500 italic">
                          <span className="font-semibold not-italic">Summary:</span> {radStatus.summary}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
