import { useState, useEffect } from 'react';
import { Syringe, Save, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useIPD } from '../../contexts/IPDContext';

interface OperationsTabProps {
  patientId: number;
}

export const OperationsTab = ({ patientId }: OperationsTabProps) => {
  const { patients, wards, refreshAll } = useIPD();
  const patient = patients.find(p => p.id === patientId);
  const currentWard = wards.find(w => w.id === patient?.currentWardId);
  const inOTWard = currentWard?.type === 'OT' || currentWard?.name.toUpperCase().includes('OT');
  
  // Phase 12: Operations EMR Rule - Strict gate based on Service Release
  const hasRelease = patient?.hasReleasedOT;
  const isOT = inOTWard && hasRelease;
  
  const [savingOps, setSavingOps] = useState(false);
  const [opsData, setOpsData] = useState<any[]>([]);

  useEffect(() => {
    if (patient?.operations) {
      setOpsData(patient.operations);
    }
  }, [patient?.operations]);

  const API_BASE = import.meta.env.VITE_API_URL as string || 'http://localhost:8000/api/v1';

  const handleSaveOperations = async () => {
    try {
      setSavingOps(true);
      const res = await fetch(`${API_BASE}/ipd/admissions/${patientId}/operations-emr`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operations: opsData })
      });
      if (res.ok) {
        toast.success('Operation details saved successfully!');
        if (refreshAll) await refreshAll();
      } else {
        toast.error('Failed to save operation details.');
      }
    } catch (e) {
      toast.error('Network error saving operation details.');
    } finally {
      setSavingOps(false);
    }
  };

  if (!patient) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 p-6">
        <div>
          <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2">
            <Syringe className="w-5 h-5 text-rose-500" /> Operations Details
          </h3>
          <p className="text-xs text-slate-500 mt-1">Record operation summaries and outcomes</p>
        </div>
        {isOT && (
          <button
            onClick={handleSaveOperations}
            disabled={savingOps}
            className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {savingOps ? 'Saving...' : 'Save Operations'}
          </button>
        )}
      </div>

      {inOTWard && !hasRelease && (
        <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-800">Operation Restricted</h4>
            <p className="text-xs text-amber-700 mt-1">This patient does not have an active, released Service Order for an Operation. The PRO must approve the Operation Order before execution can begin in the EMR.</p>
          </div>
        </div>
      )}

      <div className="p-6 space-y-4">
        {!opsData || opsData.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
            <Syringe className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium text-sm mb-4">No operations recorded for this patient.</p>
            {isOT && (
              <button
                onClick={() => setOpsData([{ name: 'New Operation', type: 'Major', summary: '', result: '' }])}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
              >
                Add Operation
              </button>
            )}
          </div>
        ) : (
          <>
            {opsData.map((op, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-500 shadow-sm text-sm">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={op.name}
                    onChange={(e) => {
                      if (!isOT) return;
                      const newOps = [...opsData];
                      newOps[idx].name = e.target.value;
                      setOpsData(newOps);
                    }}
                    placeholder={isOT ? "Enter operation name..." : ""}
                    disabled={!isOT}
                    className="font-bold text-slate-800 text-base bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none px-1 py-0.5 w-full max-w-sm transition-colors disabled:opacity-100 disabled:bg-transparent disabled:hover:border-transparent"
                  />
                  <div className="mt-1">
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {op.type} Operation
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Operation Summary</label>
                  <textarea
                    rows={4}
                    value={op.summary || ''}
                    onChange={(e) => {
                      if (!isOT) return;
                      const newOps = [...opsData];
                      newOps[idx].summary = e.target.value;
                      setOpsData(newOps);
                    }}
                    placeholder={isOT ? "Enter detailed operation summary, procedures performed, findings..." : "No summary recorded"}
                    disabled={!isOT}
                    className="w-full text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none shadow-sm disabled:opacity-80 disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Operation Result</label>
                  <textarea
                    rows={4}
                    value={op.result || ''}
                    onChange={(e) => {
                      if (!isOT) return;
                      const newOps = [...opsData];
                      newOps[idx].result = e.target.value;
                      setOpsData(newOps);
                    }}
                    placeholder={isOT ? "Enter outcome, patient condition post-op, complications if any..." : "No result recorded"}
                    disabled={!isOT}
                    className="w-full text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none shadow-sm disabled:opacity-80 disabled:bg-slate-50"
                  />
                </div>
              </div>
            </div>
            ))}
            {isOT && (
              <button
                onClick={() => setOpsData([...opsData, { name: 'New Operation', type: 'Major', summary: '', result: '' }])}
                className="w-full py-3 bg-slate-50 border border-slate-200 border-dashed text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 hover:text-slate-800 transition-colors"
              >
                + Add Another Operation
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
