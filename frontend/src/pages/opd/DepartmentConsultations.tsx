import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOPDVisits } from '../../contexts/OPDVisitContext';
import { useInvestigations } from '../../contexts/InvestigationContext';
import { useIPD } from '../../contexts/IPDContext';
import { ResultViewer } from '../../components/investigations/ResultViewer';
import { Stethoscope, Clock, Hash, Edit2, FlaskConical, ScanLine } from 'lucide-react';
import { DateFilter } from '../../components/ui/DateFilter';

export const DepartmentConsultations = () => {
  const { department } = useParams<{ department: string }>();
  const { visits } = useOPDVisits();
  const { orders: globalOrders } = useInvestigations();
  const { patients: ipdAdmissions } = useIPD();
  const navigate = useNavigate();

  const todayDate = new Date(); const formatYYYYMMDD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const todayStr = formatYYYYMMDD(todayDate);
  
  // A consulting list is "who am I seeing today", not a month of history, so
  // this screen opens on today at both ends. It is the deliberate exception to
  // the app-wide month-start default in DateFilter: on a reporting screen a
  // month is the useful window, on a clinic list it buries today's patients
  // under every visit since the 1st.
  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo, setDateTo] = useState(todayStr);

  const [viewerState, setViewerState] = useState<{ patientId: string; category: 'Lab' | 'Radiology'; visitDate?: string } | null>(null);

  const [appliedDateFrom, setAppliedDateFrom] = useState(todayStr);
  const [appliedDateTo, setAppliedDateTo] = useState(todayStr);

  // Convert the URL param back to the proper department name for filtering
  const formattedDept = department
    ?.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const getLabStatus = (uhid: string, testName: string, defaultStatus: string, visitDate: string) => {
    const patientOrders = globalOrders.filter((o: any) => o.patientId === uhid && o.category === 'Lab' && o.orderedAt?.slice(0, 10) === visitDate.slice(0, 10));
    for (const o of patientOrders) {
      const t = o.tests.find((x: any) => x.name === testName);
      if (t && (t.status === 'Completed' || t.status === 'Verified')) {
        return 'Completed';
      }
    }
    return defaultStatus === 'Pending' ? 'Ordered' : defaultStatus;
  };

  const getRadStatus = (uhid: string, serviceName: string, bodyPart: string, defaultStatus: string, visitDate: string) => {
    const patientOrders = globalOrders.filter((o: any) => o.patientId === uhid && o.category === 'Radiology' && o.orderedAt?.slice(0, 10) === visitDate.slice(0, 10));
    for (const o of patientOrders) {
      const t = o.tests.find((x: any) => x.name === (serviceName || bodyPart) || x.bodyPart === bodyPart);
      if (t && (t.status === 'Completed' || t.status === 'Verified')) {
        return 'Completed';
      }
    }
    return defaultStatus === 'Pending' ? 'Ordered' : defaultStatus;
  };

  const parseDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dStr;
  };

  // A booking is not the doctor's work until the patient actually turns up.
  // 'Scheduled' is what every appointment starts as (online bookings included),
  // and it stays that way until reception moves the patient onto the Waiting
  // List. Showing those here meant a doctor's list was full of people who might
  // arrive days later, or never. Cancelled and No-Show are excluded for the
  // same reason.
  //
  // Everything past that point stays visible: Waiting / Checked-In while the
  // patient is in the department, then the in-visit statuses (Nursing
  // Assessment, Waiting for Doctor, Investigation Pending), Consulting, and
  // Completed so the day's finished consultations can still be reviewed.
  const NOT_YET_ARRIVED = ['Scheduled', 'Cancelled', 'No-Show'];

  const deptVisits = visits.filter(v => {
    if (v.department.toLowerCase() !== formattedDept?.toLowerCase()) return false;
    if (NOT_YET_ARRIVED.includes(v.status)) return false;
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

  const pending = deptVisits.filter(v => ['Waiting', 'Checked-In', 'Nursing Assessment', 'Waiting for Doctor', 'Investigation Pending'].includes(v.status));
  const completed = deptVisits.filter(v => v.status === 'Completed');


  return (
    <div className="space-y-6">
      <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{formattedDept} Consultations</h1>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white px-5 py-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 min-w-[150px]">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800 leading-none">{pending.length}</div>
                <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wide mt-1">Waiting</div>
              </div>
            </div>
            <div className="bg-white px-5 py-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 min-w-[150px]">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                <Stethoscope className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800 leading-none">{completed.length}</div>
                <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wide mt-1">Completed</div>
              </div>
            </div>
          </div>

          <div className="hidden md:block w-px h-8 bg-slate-200"></div>

          <DateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onSearch={handleSearch}
            onReset={handleReset}
            defaultDateFrom={todayStr}
            defaultDateTo={todayStr}
          />
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
                    <p>No patients waiting for {formattedDept} today.</p>
                    <p className="text-xs mt-1">
                      Booked patients appear here once reception moves them to the Waiting List.
                    </p>
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
                      <div className="flex flex-col gap-2 items-start">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold w-max ${visit.status === 'Completed' ? 'bg-green-100 text-green-700' :
                            visit.status === 'Consulting' ? 'bg-purple-100 text-purple-700' :
                              visit.status === 'Waiting for Doctor' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-600'
                          }`}>
                          {visit.status}
                        </span>
                        {(() => {
                          const wasAdmitted = ipdAdmissions?.some(a => a.uhid === visit.uhid && a.admissionDate?.slice(0, 10) === visit.date?.slice(0, 10));
                          if (wasAdmitted) return null;
                          return ['Completed', 'Paid', 'Billed'].includes(visit.billingStatus) ? (
                            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] uppercase font-bold tracking-wider w-max">Bill Paid</span>
                          ) : (
                            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] uppercase font-bold tracking-wider w-max">Billing Pending</span>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/opd/visit/${visit.id}`)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${visit.status === 'Completed'
                              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                              : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
                            }`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          {visit.status === 'Completed' ? 'Edit EMR' : 'Open EMR'}
                        </button>

                        {visit.labOrders && visit.labOrders.length > 0 && (
                          <button
                            onClick={() => setViewerState({ patientId: visit.uhid, category: 'Lab', visitDate: visit.date })}
                            disabled={!visit.labOrders.some((o: any) => getLabStatus(visit.uhid, o.testName, o.status, visit.date) === 'Completed')}
                            className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${visit.labOrders.some((o: any) => getLabStatus(visit.uhid, o.testName, o.status, visit.date) === 'Completed')
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
                            onClick={() => setViewerState({ patientId: visit.uhid, category: 'Radiology', visitDate: visit.date })}
                            disabled={!visit.radiologyOrders.some((o: any) => getRadStatus(visit.uhid, o.serviceName, o.bodyPart, o.status, visit.date) === 'Completed')}
                            className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${visit.radiologyOrders.some((o: any) => getRadStatus(visit.uhid, o.serviceName, o.bodyPart, o.status, visit.date) === 'Completed')
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
          visitDate={viewerState.visitDate}
          onClose={() => setViewerState(null)}
        />
      )}
    </div>
  );
};
