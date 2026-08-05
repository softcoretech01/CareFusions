import { useState, useEffect, useCallback } from 'react';
import { useAppointments } from '../../contexts/AppointmentContext';
import type { AppointmentRecord } from '../../contexts/AppointmentContext';
import { useOPDVisits } from '../../contexts/OPDVisitContext';
import {
  Clock, UserCheck, Stethoscope, CheckCircle, AlertTriangle,
  Hash, Building2, User, CalendarDays,
  ArrowRight, XCircle, RefreshCw,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { DateFilter } from '../../components/ui/DateFilter';

const DEPT_ALL = 'All';



const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  Scheduled:  { label: 'Scheduled',  color: 'text-slate-600',  bg: 'bg-slate-50',   border: 'border-slate-200', dot: 'bg-slate-400'  },
  'Checked-In':{ label: 'Waiting',   color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200', dot: 'bg-amber-500'  },
  Consulting: { label: 'Consulting', color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200',  dot: 'bg-blue-500'   },
  Completed:  { label: 'Completed',  color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200', dot: 'bg-green-500'  },
  Cancelled:  { label: 'Cancelled',  color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-200',   dot: 'bg-red-500'    },
  'No-Show':  { label: 'No-Show',    color: 'text-slate-400',  bg: 'bg-slate-50',   border: 'border-slate-200', dot: 'bg-slate-300'  },
  Waiting:    { label: 'Waiting',    color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200', dot: 'bg-amber-500'  },
};

const PRIORITY_META: Record<string, { label: string; badge: string }> = {
  Normal:    { label: 'Normal',    badge: 'bg-slate-100 text-slate-500' },
  High:      { label: 'High',      badge: 'bg-orange-100 text-orange-600' },
  Emergency: { label: 'Emergency', badge: 'bg-red-100 text-red-600 animate-pulse' },
};

export const QueueManagement = () => {
  const { updateAppointmentStatus, queryAppointments, apiError, clearError } = useAppointments();
  const { visits, addVisit, updateVisitStatus: updateOPDVisitStatus } = useOPDVisits();
  const [selectedDept, setSelectedDept] = useState(DEPT_ALL);
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: string } | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const [appliedDateFrom, setAppliedDateFrom] = useState(today);
  const [appliedDateTo, setAppliedDateTo] = useState(today);

  // All appointments in the applied date range (fetched from the backend).
  const [rangeAll, setRangeAll] = useState<AppointmentRecord[]>([]);

  const reload = useCallback(() => {
    queryAppointments({ dateFrom: appliedDateFrom, dateTo: appliedDateTo }).then(setRangeAll);
  }, [queryAppointments, appliedDateFrom, appliedDateTo]);

  useEffect(() => { reload(); }, [reload]);

  // Change an appointment's status: persist + optimistic local update + re-sync.
  const changeStatus = (id: number, status: AppointmentRecord['status']) => {
    updateAppointmentStatus(id, status);
    setRangeAll(prev => prev.map(a => (a.id === id ? { ...a, status } : a)));
    setTimeout(reload, 500);
  };

  // Unique departments from ranged appointments
  const departments = [DEPT_ALL, ...Array.from(new Set(rangeAll.map(a => a.department))).sort()];

  // Filtered by department
  const todaysFiltered = selectedDept === DEPT_ALL
    ? rangeAll
    : rangeAll.filter(a => a.department === selectedDept);

  // Sorted: Emergency first, then by time slot
  const sortedByPriority = (list: typeof rangeAll) =>
    [...list].sort((a, b) => {
      if (a.priority === 'Emergency' && b.priority !== 'Emergency') return -1;
      if (b.priority === 'Emergency' && a.priority !== 'Emergency') return 1;
      return a.timeSlot.localeCompare(b.timeSlot);
    });

  const scheduled   = sortedByPriority(todaysFiltered.filter(a => a.status === 'Scheduled'));
  const waiting     = sortedByPriority(todaysFiltered.filter(a => a.status === 'Checked-In' || a.status === 'Waiting'));
  const consulting  = sortedByPriority(todaysFiltered.filter(a => a.status === 'Consulting'));
  const completed   = todaysFiltered.filter(a => a.status === 'Completed');
  const cancelled   = todaysFiltered.filter(a => a.status === 'Cancelled' || a.status === 'No-Show');

  // Stats
  const stats = [
    { label: 'Total Today',  value: todaysFiltered.length,   color: 'text-slate-800',  bg: 'bg-slate-100',   icon: CalendarDays },
    { label: 'Scheduled',    value: scheduled.length,        color: 'text-slate-600',  bg: 'bg-slate-100',   icon: Clock },
    { label: 'Waiting',      value: waiting.length,          color: 'text-amber-600',  bg: 'bg-amber-100',   icon: UserCheck },
    { label: 'Consulting',   value: consulting.length,       color: 'text-blue-600',   bg: 'bg-blue-100',    icon: Stethoscope },
    { label: 'Completed',    value: completed.length,        color: 'text-green-600',  bg: 'bg-green-100',   icon: CheckCircle },
    { label: 'Cancelled',    value: cancelled.length,        color: 'text-red-500',    bg: 'bg-red-100',     icon: XCircle },
  ];

  // Actions
  const handleSearch = () => {
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
  };

  const handleReset = () => {
    setDateFrom('');
    setDateTo('');
    setAppliedDateFrom('');
    setAppliedDateTo('');
  };

  // Token is already assigned at booking time — just move to Checked-In
  const handleCheckIn = (id: number) => {
    changeStatus(id, 'Checked-In');

    // Sync with OPD Visit Queue
    const appt = rangeAll.find(a => a.id === id);
    if (appt) {
      const existingVisit = visits.find(v => v.appointmentId === id);
      if (existingVisit) {
        updateOPDVisitStatus(existingVisit.id, 'Nursing Assessment');
      } else {
        addVisit({
          id: Date.now(),
          visitNumber: `OPD-${Date.now()}`,
          appointmentId: appt.id,
          uhid: appt.uhid,
          patientName: appt.patientName,
          age: 30,
          gender: 'Male',
          mobileNumber: appt.mobileNumber,
          doctorName: appt.doctor,
          department: appt.department,
          date: appt.date,
          timeSlot: appt.timeSlot,
          queueToken: appt.queueToken || '',
          appointmentNumber: appt.appointmentNumber,
          visitType: appt.type === 'Follow-up' ? 'Follow-Up' : (appt.type as any),
          priority: appt.priority,
          status: 'Nursing Assessment',
          billingStatus: 'Pending',
          allergies: [],
          diagnoses: [],
          prescriptions: [],
          labOrders: [],
          radiologyOrders: [],
          procedures: [],
          isFinalized: false,
        });
      }
    }
  };

  const handleCallConsult = (id: number) => {
    changeStatus(id, 'Consulting');
    const visit = visits.find(v => v.appointmentId === id);
    if (visit) updateOPDVisitStatus(visit.id, 'Consulting');
  };

  const handleComplete = (id: number) => {
    changeStatus(id, 'Completed');
    const visit = visits.find(v => v.appointmentId === id);
    if (visit) updateOPDVisitStatus(visit.id, 'Completed');
  };

  const handleNoShow = (id: number) => { changeStatus(id, 'No-Show'); setConfirmAction(null); };
  const handleCancel = (id: number) => { changeStatus(id, 'Cancelled'); setConfirmAction(null); };

  /* ── Patient Card ── */
  const PatientCard = ({
    item,
    actions,
  }: {
    item: (typeof rangeAll)[0];
    actions: React.ReactNode;
  }) => {
    const meta = STATUS_META[item.status] ?? STATUS_META['Scheduled'];
    const pMeta = PRIORITY_META[item.priority] ?? PRIORITY_META['Normal'];
    return (
      <div className={`relative bg-white rounded-2xl border ${meta.border} shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden`}>
        {/* Emergency pulse bar */}
        {item.priority === 'Emergency' && (
          <div className="h-1 bg-red-500 animate-pulse w-full" />
        )}
        <div className="p-4">
          {/* Top row: name + token */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-slate-800 text-sm truncate">{item.patientName}</h4>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pMeta.badge}`}>
                  {pMeta.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{item.uhid}</p>
            </div>
            {item.queueToken ? (
              <div className="shrink-0 bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-lg text-sm font-bold flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {item.queueToken}
              </div>
            ) : (
              <div className="shrink-0 text-xs text-slate-300 font-medium px-2 py-1 border border-dashed border-slate-200 rounded-lg">
                No Token
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-1 mb-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Clock className="w-3 h-3 shrink-0 text-slate-400" />
              <span className="font-semibold">{item.timeSlot}</span>
              <span className="text-slate-300 mx-0.5">·</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${meta.bg} ${meta.color}`}>
                {item.type}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <User className="w-3 h-3 shrink-0 text-slate-400" />
              <span>{item.doctor}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <Building2 className="w-3 h-3 shrink-0 text-slate-400" />
              <span>{item.department}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <Hash className="w-3 h-3 shrink-0 text-slate-400" />
              <span className="font-mono text-[10px]">{item.appointmentNumber}</span>
            </div>
          </div>

          {/* Action area */}
          <div className="flex flex-col gap-1.5">
            {actions}
          </div>
        </div>
      </div>
    );
  };

  /* ── Column ── */
  const Column = ({
    title, count, icon: Icon, iconColor, headerBg, children,
  }: {
    title: string; count: number; icon: any; iconColor: string; headerBg: string; children: React.ReactNode;
  }) => (
    <div className="flex flex-col bg-slate-50/60 border border-slate-200 rounded-3xl overflow-hidden shadow-sm min-h-0">
      <div className={`px-5 py-4 border-b border-slate-200 flex items-center justify-between ${headerBg}`}>
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
        </div>
        <span className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-sm">
          {count}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {count === 0 ? (
          <div className="text-center text-slate-400 font-medium py-10 text-sm flex flex-col items-center gap-2">
            <Icon className={`w-8 h-8 opacity-20 ${iconColor}`} />
            <span>No patients</span>
          </div>
        ) : children}
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col relative">

      {/* API error banner */}
      {apiError && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{apiError}</span>
          <button onClick={clearError} className="text-red-500 hover:text-red-700 font-medium">Dismiss</button>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {confirmAction.action === 'cancel' ? 'Cancel Appointment' : 'Mark as No-Show'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {confirmAction.action === 'cancel'
                ? 'Are you sure you want to cancel this appointment?'
                : 'Mark this patient as no-show? They did not arrive for their appointment.'}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmAction(null)}>Back</Button>
              <Button
                variant="filled"
                className={`flex-1 ${confirmAction.action === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-600 hover:bg-slate-700'} text-white border-0`}
                onClick={() =>
                  confirmAction.action === 'cancel'
                    ? handleCancel(confirmAction.id)
                    : handleNoShow(confirmAction.id)
                }
              >
                {confirmAction.action === 'cancel' ? 'Cancel Appointment' : 'Mark No-Show'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Queue Management</h1>
        </div>
        <div className="flex flex-col items-end gap-3">
          <DateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onSearch={handleSearch}
            onReset={handleReset}
          />
          {/* Department filter */}
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex-wrap">
          {departments.map(dept => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedDept === dept
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {dept}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full ${s.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide leading-tight">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0 overflow-hidden">

        {/* 1 — Scheduled */}
        <Column title="Scheduled" count={scheduled.length} icon={Clock} iconColor="text-slate-500" headerBg="bg-white">
          {scheduled.map(item => (
            <PatientCard key={item.id} item={item} actions={
              <>
                <button
                  onClick={() => handleCheckIn(item.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Confirm Arrival / Check-In
                </button>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setConfirmAction({ id: item.id, action: 'noshow' })}
                    className="flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    No-Show
                  </button>
                  <button
                    onClick={() => setConfirmAction({ id: item.id, action: 'cancel' })}
                    className="flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-50 border border-red-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            } />
          ))}
        </Column>

        {/* 2 — Waiting */}
        <Column title="Waiting / Checked-In" count={waiting.length} icon={UserCheck} iconColor="text-amber-500" headerBg="bg-amber-50/50">
          {waiting.map((item, idx) => (
            <PatientCard key={item.id} item={item} actions={
              <>
                {/* Queue position badge */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Queue #{idx + 1}
                  </span>
                  {item.priority === 'Emergency' && (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" /> Priority
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleCallConsult(item.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <ArrowRight className="w-3.5 h-3.5" /> Call to Consult
                </button>
              </>
            } />
          ))}
        </Column>

        {/* 3 — Consulting */}
        <Column title="Consulting" count={consulting.length} icon={Stethoscope} iconColor="text-blue-500" headerBg="bg-blue-50/50">
          {consulting.map(item => (
            <PatientCard key={item.id} item={item} actions={
              <>
                <button
                  onClick={() => handleComplete(item.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-colors shadow-sm"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Mark Complete
                </button>
                <button
                  onClick={() => changeStatus(item.id, 'Checked-In')}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-slate-400 hover:bg-slate-100 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Send Back to Waiting
                </button>
              </>
            } />
          ))}
        </Column>

        {/* 4 — Completed */}
        <Column title="Completed" count={completed.length} icon={CheckCircle} iconColor="text-green-500" headerBg="bg-green-50/50">
          {completed.map(item => (
            <PatientCard key={item.id} item={item} actions={
              <div className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-green-50 text-green-700 rounded-xl text-xs font-bold border border-green-200">
                <CheckCircle className="w-3.5 h-3.5" /> Consultation Done
              </div>
            } />
          ))}

          {/* Cancelled/No-show at bottom of completed column */}
          {cancelled.length > 0 && (
            <div className="mt-3 border-t border-slate-200 pt-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Cancelled / No-Show</p>
              {cancelled.map(item => (
                <PatientCard key={item.id} item={item} actions={
                  <div className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-50 text-slate-400 rounded-xl text-xs font-bold border border-slate-200">
                    <XCircle className="w-3.5 h-3.5" /> {item.status}
                  </div>
                } />
              ))}
            </div>
          )}
        </Column>

      </div>
    </div>
  );
};
