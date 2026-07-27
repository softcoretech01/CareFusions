import { useState } from 'react';
import { useOPDVisits } from '../../contexts/OPDVisitContext';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck, Stethoscope, FlaskConical, CheckCircle,
  AlertTriangle, Clock, ArrowRight, Hash, User, Building2,
} from 'lucide-react';

const DEPT_ALL = 'All';

const COL_CONFIG = [
  { status: 'Nursing Assessment',   label: 'Triage / Nursing',   icon: UserCheck,   color: 'text-amber-500',  hdr: 'bg-amber-50/60' },
  { status: 'Waiting for Doctor',   label: 'Waiting for Doctor', icon: Clock,       color: 'text-blue-500',   hdr: 'bg-blue-50/60'  },
  { status: 'Consulting',           label: 'Consulting',         icon: Stethoscope, color: 'text-purple-500', hdr: 'bg-purple-50/60'},
  { status: 'Investigation Pending',label: 'Investigations',     icon: FlaskConical,color: 'text-orange-500', hdr: 'bg-orange-50/60'},
  { status: 'Completed',            label: 'Completed',          icon: CheckCircle, color: 'text-green-500',  hdr: 'bg-green-50/60' },
];

export const OPDQueueBoard = () => {
  const { visits } = useOPDVisits();
  const navigate = useNavigate();
  const [selectedDept, setSelectedDept] = useState(DEPT_ALL);

  const today = new Date().toISOString().split('T')[0];
  const todaysVisits = visits.filter(v => v.date === today);

  const departments = [DEPT_ALL, ...Array.from(new Set(todaysVisits.map(v => v.department))).sort()];

  const filtered = selectedDept === DEPT_ALL
    ? todaysVisits
    : todaysVisits.filter(v => v.department === selectedDept);

  const sortedByPriority = (list: typeof filtered) =>
    [...list].sort((a, b) => {
      if (a.priority === 'Emergency' && b.priority !== 'Emergency') return -1;
      if (b.priority === 'Emergency' && a.priority !== 'Emergency') return 1;
      return a.timeSlot.localeCompare(b.timeSlot);
    });

  const VisitCard = ({ visit, colStatus }: { visit: typeof filtered[0]; colStatus: string }) => (
    <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ${
      visit.priority === 'Emergency' ? 'border-red-300' : 'border-slate-200'
    }`}>
      {visit.priority === 'Emergency' && <div className="h-1 bg-red-500 animate-pulse" />}
      <div className="p-4">
        {/* Token + name */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-slate-800 text-sm">{visit.patientName}</h4>
              {visit.priority === 'Emergency' && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" /> EMR
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{visit.uhid} · {visit.age}y {visit.gender}</p>
          </div>
          <div className="shrink-0 bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-lg text-sm font-bold flex items-center gap-1">
            <Hash className="w-3 h-3" />{visit.queueToken}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-1 mb-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="font-semibold">{visit.timeSlot}</span>
            <span className="text-slate-300 mx-0.5">·</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">{visit.visitType}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <User className="w-3 h-3 text-slate-400" />
            <span>{visit.doctorName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Building2 className="w-3 h-3 text-slate-400" />
            <span>{visit.department}</span>
          </div>
          {visit.triageInfo && (
            <div className="text-slate-400 italic">
              CC: {visit.triageInfo.chiefComplaint.slice(0, 40)}{visit.triageInfo.chiefComplaint.length > 40 ? '…' : ''}
            </div>
          )}
        </div>

        {/* Action buttons by column */}
        <div className="flex flex-col gap-1.5">
          {colStatus === 'Nursing Assessment' && (
            <button
              onClick={() => navigate(`/opd/triage/${visit.id}`)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" /> Start Triage
            </button>
          )}
          {colStatus === 'Waiting for Doctor' && (
            <button
              onClick={() => navigate(`/opd/visit/${visit.id}`)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors"
            >
              <Stethoscope className="w-3.5 h-3.5" /> Start Consultation
            </button>
          )}
          {colStatus === 'Consulting' && (
            <button
              onClick={() => navigate(`/opd/visit/${visit.id}`)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" /> Continue Consultation
            </button>
          )}
          {colStatus === 'Investigation Pending' && (
            <div className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-orange-50 text-orange-600 rounded-xl text-xs font-bold border border-orange-200">
              <FlaskConical className="w-3.5 h-3.5" /> Awaiting Results
            </div>
          )}
          {colStatus === 'Completed' && (
            <button
              onClick={() => navigate(`/opd/visit/${visit.id}`)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-green-50 text-green-700 rounded-xl text-xs font-bold border border-green-200"
            >
              <CheckCircle className="w-3.5 h-3.5" /> View Summary
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">OPD Queue Board</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
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

      {/* Kanban columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 flex-1 min-h-0 overflow-hidden">
        {COL_CONFIG.map(col => {
          const Icon = col.icon;
          const items = sortedByPriority(filtered.filter(v => v.status === col.status));
          return (
            <div key={col.status} className="flex flex-col bg-slate-50/60 border border-slate-200 rounded-3xl overflow-hidden">
              {/* Column header */}
              <div className={`px-4 py-3 border-b border-slate-200 flex items-center justify-between ${col.hdr}`}>
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${col.color}`} />
                  <h3 className="font-bold text-slate-800 text-xs">{col.label}</h3>
                </div>
                <span className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>
              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {items.length === 0 ? (
                  <div className="text-center text-slate-300 py-10 flex flex-col items-center gap-2">
                    <Icon className={`w-8 h-8 opacity-20 ${col.color}`} />
                    <span className="text-xs font-medium text-slate-400">No patients</span>
                  </div>
                ) : (
                  items.map(v => <VisitCard key={v.id} visit={v} colStatus={col.status} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
