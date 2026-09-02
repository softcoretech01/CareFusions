import { useState, useEffect } from 'react';
import { useIPD } from '../../contexts/IPDContext';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle } from 'lucide-react';
import { DateFilter } from '../../components/ui/DateFilter';
import { IpdErrorBanner } from './IpdErrorBanner';

// Values older requests stored in place of a doctor. None of them is a person.
const DOCTOR_PLACEHOLDERS = ['dr. on duty', 'dr on duty', 'on duty', 'doctor', 'n/a'];
const isNamedDoctor = (name?: string) =>
  !!name?.trim() && !DOCTOR_PLACEHOLDERS.includes(name.trim().toLowerCase());

export const AdmissionDesk = () => {
  const { admissionRequests, refreshAll } = useIPD();

  // Bed and admission state moves constantly — re-pull whenever this screen
  // opens. Keyed to mount rather than the callback identity so it fires exactly
  // once per visit; the context holds an in-flight ref that prevents overlap.
  useEffect(() => { refreshAll?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];
  const firstDay = `${today.split('-')[0]}-${today.split('-')[1]}-01`;
  const [dateFrom, setDateFrom] = useState(firstDay);
  const [dateTo, setDateTo] = useState(today);
  const [appliedDateFrom, setAppliedDateFrom] = useState(firstDay);
  const [appliedDateTo, setAppliedDateTo] = useState(today);

  const handleSearch = () => {
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
  };

  const handleReset = () => {
    setDateFrom(firstDay);
    setDateTo(today);
    setAppliedDateFrom(firstDay);
    setAppliedDateTo(today);
  };

  const pendingRequests = admissionRequests.filter(r => {
    if (r.status !== 'Pending') return false;

    if (appliedDateFrom && appliedDateTo) {
      const rDate = r.requestDate.substring(0, 10);
      return rDate >= appliedDateFrom && rDate <= appliedDateTo;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <IpdErrorBanner />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Admission Desk</h1>
        </div>
        <button
          onClick={() => navigate('/ipd/new-admission')}
          className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors"
        >
          Direct Admission
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-10rem)]">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Pending Admission Requests</h2>
          <DateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onSearch={handleSearch}
            onReset={handleReset}
          />
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full">
            <thead className="bg-white text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-100 shadow-sm z-10">
              <tr>
                <th className="px-4 py-3 text-left w-16">S.No</th>
                <th className="px-4 py-3 text-left">Request Time</th>
                <th className="px-4 py-3 text-left">Patient Details</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Admission Type</th>
                <th className="px-4 py-3 text-left">Requested Doctor</th>
                <th className="px-4 py-3 text-left">Details</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    No pending admission requests.
                  </td>
                </tr>
              ) : (
                pendingRequests.map((req, index) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                        <Clock className="w-4 h-4 text-amber-500" />
                        {new Date(req.requestDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{req.patientName}</div>
                      <div className="text-xs text-slate-500">{req.uhid}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{req.specialty}</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-700">{req.admissionType}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {/* Older requests stored the placeholder "Dr. on duty", which names no
                          actual doctor — show it as unrecorded rather than as a person. */}
                      {isNamedDoctor(req.requestedBy)
                        ? req.requestedBy
                        : <span className="text-slate-400 italic text-xs">Not recorded</span>}
                    </td>
                    <td className="px-4 py-3">
                      {req.admissionReason ? <div className="text-xs text-indigo-500 truncate max-w-[200px]">Reason: {req.admissionReason}</div> : <span className="text-slate-400 italic text-xs">No specific details</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate('/ipd/new-admission', { state: { request: req } })}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Process Admission
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
