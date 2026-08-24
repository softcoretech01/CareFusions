import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOPDVisits } from '../../contexts/OPDVisitContext';
import { useInvestigations } from '../../contexts/InvestigationContext';
import { ResultViewer } from '../../components/investigations/ResultViewer';
import { Stethoscope, Clock, Hash, Activity, Edit2, FlaskConical, ScanLine } from 'lucide-react';
import { DateFilter } from '../../components/ui/DateFilter';

export const DepartmentConsultations = () => {
  const { department } = useParams<{ department: string }>();
  const { visits } = useOPDVisits();
  const { orders: globalOrders } = useInvestigations();
  const navigate = useNavigate();

  const todayDate = new Date();  const formatYYYYMMDD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = formatYYYYMMDD(todayDate);
  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo, setDateTo] = useState(todayStr);

  const [viewerState, setViewerState] = useState<{ patientId: string; category: 'Lab' | 'Radiology' } | null>(null);

  const [appliedDateFrom, setAppliedDateFrom] = useState(todayStr);
  const [appliedDateTo, setAppliedDateTo] = useState(todayStr);

  // Convert the URL param back to the proper department name for filtering
  const formattedDept = department
    ?.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const getLabStatus = (uhid: string, testName: string, defaultStatus: string) => {
    const patientOrders = globalOrders.filter((o: any) => o.patientId === uhid && o.category === 'Lab');
    for (const o of patientOrders) {
      const t = o.tests.find((x: any) => x.name === testName);
      if (t && (t.status === 'Completed' || t.status === 'Verified')) {
        return 'Completed';
      }
    }
    return defaultStatus;
  };

  const getRadStatus = (uhid: string, serviceName: string, bodyPart: string, defaultStatus: string) => {
    const patientOrders = globalOrders.filter((o: any) => o.patientId === uhid && o.category === 'Radiology');
    for (const o of patientOrders) {
      const t = o.tests.find((x: any) => x.name === (serviceName || bodyPart) || x.bodyPart === bodyPart);
      if (t && (t.status === 'Completed' || t.status === 'Verified')) {
        return 'Completed';
      }
    }
    return defaultStatus;
  };

  const parseDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dStr;
  };

  const deptVisits = visits.filter(v => {
    if (v.department.toLowerCase() !== formattedDept?.toLowerCase()) return false;
    const vDate = parseDate(v.date);
    if (appliedDateFrom && vDate < appliedDateFrom) return false;
    if (appliedDateTo && vDate > appliedDateTo) return false;
    return true;
  }).sort((a, b) => b.id - a.id);

  const handleSearch = () => {
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
  };

  const handleReset = () => {
    setDateFrom(todayStr);
    setDateTo(todayStr);
    setAppliedDateFrom(todayStr);
    setAppliedDateTo(todayStr);
  };

  const pending = deptVisits.filter(v => ['Nursing Assessment', 'Waiting for Doctor', 'Investigation Pending'].includes(v.status));
  const consulting = deptVisits.filter(v => v.status === 'Consulting');
  const completed = deptVisits.filter(v => v.status === 'Completed');


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{formattedDept} Consultations</h1>
        </div>
        
        <DateFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onSearch={handleSearch}
          onReset={handleReset}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{pending.length}</div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wide">Waiting</div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{consulting.length}</div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wide">Consulting</div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
            <Stethoscope className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-800">{completed.length}</div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wide">Completed</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Patient Schedule</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left">Token</th>
                <th className="px-6 py-3 text-left">Patient</th>
                <th className="px-6 py-3 text-left">Doctor</th>
                <th className="px-6 py-3 text-left whitespace-nowrap">Date & Time</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deptVisits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No patients scheduled for {formattedDept} today.
                  </td>
                </tr>
              ) : (
                deptVisits.map(visit => (
                  <tr key={visit.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg text-sm flex items-center gap-1 w-max">
                        <Hash className="w-3 h-3" />{visit.queueToken}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-sm">{visit.patientName}</div>
                      <div className="text-xs text-slate-400">{visit.uhid} · {visit.age}y {visit.gender}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">{visit.doctorName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-700">{visit.date}</div>
                      <div className="text-xs text-slate-400">{visit.timeSlot}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        visit.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        visit.status === 'Consulting' ? 'bg-purple-100 text-purple-700' :
                        visit.status === 'Waiting for Doctor' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {visit.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/opd/visit/${visit.id}`)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            visit.status === 'Completed'
                              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                              : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
                          }`}
                        >
                          <Edit2 className="w-3.5 h-3.5" /> 
                          {visit.status === 'Completed' ? 'Edit EMR' : 'Open EMR'}
                        </button>
                        
                        {visit.labOrders && visit.labOrders.length > 0 && (
                          <button
                            onClick={() => setViewerState({ patientId: visit.uhid, category: 'Lab' })}
                            disabled={!visit.labOrders.some((o: any) => getLabStatus(visit.uhid, o.testName, o.status) === 'Completed')}
                            className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
                              visit.labOrders.some((o: any) => getLabStatus(visit.uhid, o.testName, o.status) === 'Completed')
                                ? 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'
                                : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                            }`}
                            title="View Lab Result"
                          >
                            <FlaskConical className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {visit.radiologyOrders && visit.radiologyOrders.length > 0 && (
                          <button
                            onClick={() => setViewerState({ patientId: visit.uhid, category: 'Radiology' })}
                            disabled={!visit.radiologyOrders.some((o: any) => getRadStatus(visit.uhid, o.serviceName, o.bodyPart, o.status) === 'Completed')}
                            className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
                              visit.radiologyOrders.some((o: any) => getRadStatus(visit.uhid, o.serviceName, o.bodyPart, o.status) === 'Completed')
                                ? 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'
                                : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                            }`}
                            title="View Radiology Result"
                          >
                            <ScanLine className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewerState && (
        <ResultViewer 
          patientId={viewerState.patientId} 
          category={viewerState.category} 
          onClose={() => setViewerState(null)} 
        />
      )}
    </div>
  );
};
