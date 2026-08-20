import { X, Calendar, Clock, Phone, Stethoscope, Building2, Tag, Hash, FileText, Ticket, Timer, AlertOctagon, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import type { AppointmentRecord } from '../../contexts/AppointmentContext';

/** The happy-path lifecycle, rendered as a progress track. Cancelled and
 *  No-Show sit outside it and get a banner instead. */
const FLOW = ['Scheduled', 'Checked-In', 'Consulting', 'Completed'] as const;

const FLOW_INDEX: Record<string, number> = {
  Scheduled: 0,
  'Checked-In': 1,
  Waiting: 1,
  Consulting: 2,
  Completed: 3,
};

const PRIORITY_STYLES: Record<string, string> = {
  Normal: 'bg-slate-100 text-slate-600',
  High: 'bg-amber-100 text-amber-700',
  Emergency: 'bg-red-100 text-red-600',
};

const initials = (name: string) =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('') || '?';

/** One label/value row. Values fall back to an em dash so empty fields still
 *  occupy their slot instead of collapsing the grid. */
const Row = ({
  label,
  value,
  icon: Icon,
  mono,
}: {
  label: string;
  value?: string | number | null;
  icon: React.ComponentType<{ className?: string }>;
  mono?: boolean;
}) => (
  <div className="flex items-start gap-3 py-2.5">
    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-slate-400" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-semibold text-slate-800 truncate ${mono ? 'font-mono' : ''}`}>
        {value === null || value === undefined || value === '' ? '—' : value}
      </p>
    </div>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">{title}</h3>
    <div className="bg-white border border-slate-200 rounded-2xl px-4 divide-y divide-slate-50">{children}</div>
  </div>
);

/** Scheduled → Checked-In → Consulting → Completed, with everything up to the
 *  current status filled in. */
const StatusTrack = ({ status }: { status: string }) => {
  const active = FLOW_INDEX[status] ?? 0;
  return (
    <div className="flex items-center">
      {FLOW.map((step, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                  done
                    ? 'bg-primary text-white'
                    : current
                      ? 'bg-primary text-white ring-4 ring-primary/15'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-semibold whitespace-nowrap ${
                  done || current ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                {step}
              </span>
            </div>
            {i < FLOW.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 -mt-5 rounded ${i < active ? 'bg-primary' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

interface Props {
  item: AppointmentRecord;
  /** Heading shown above the patient name, e.g. "Online Booking Details". */
  title?: string;
  onClose: () => void;
  /** Optional: switch straight from viewing into the edit form. */
  onEdit?: (item: AppointmentRecord) => void;
}

/** Read-only detail view for a single appointment, shared by the Online
 *  Booking and Walk-in Booking lists. */
export const AppointmentDetailsModal = ({ item, title = 'Appointment Details', onClose, onEdit }: Props) => {
  const isClosed = item.status === 'Cancelled' || item.status === 'No-Show';

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-50 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* ── Patient banner ── */}
        <div className="bg-gradient-primary px-7 py-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wider mb-3">{title}</p>

          <div className="flex items-center gap-4 pr-10">
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white text-lg font-bold shrink-0">
              {initials(item.patientName)}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{item.patientName || 'Unknown Patient'}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-white/70 font-medium">
                <span className="font-mono">{item.uhid || '—'}</span>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span className="font-mono">{item.appointmentNumber || '—'}</span>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white text-primary">
              {item.status}
            </span>
            <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${PRIORITY_STYLES[item.priority] || 'bg-white/15 text-white'}`}>
              {item.priority} Priority
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/15 text-white border border-white/20">
              {item.type}
            </span>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-7 py-6 space-y-5 overflow-y-auto custom-scrollbar">

          {/* Lifecycle */}
          {isClosed ? (
            <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              <AlertOctagon className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-700">This appointment was {item.status.toLowerCase()}</p>
                <p className="text-xs text-red-500/80">It is excluded from the active queue and daily counts.</p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl px-5 pt-4 pb-3">
              <StatusTrack status={item.status} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Section title="Schedule">
              <Row label="Appointment Date" value={item.date} icon={Calendar} />
              <Row label="Time Slot" value={item.timeSlot} icon={Clock} />
              <Row label="Duration" value={item.durationMinutes ? `${item.durationMinutes} minutes` : ''} icon={Timer} />
              <Row label="Queue Token" value={item.queueToken} icon={Ticket} mono />
            </Section>

            <Section title="Care Team & Contact">
              <Row label="Doctor" value={item.doctor} icon={Stethoscope} />
              <Row label="Department" value={item.department} icon={Building2} />
              <Row label="Mobile Number" value={item.mobileNumber} icon={Phone} mono />
              <Row label="Booking Type" value={item.type} icon={Tag} />
            </Section>
          </div>

          {item.notes && (
            <Section title="Notes">
              <div className="flex items-start gap-3 py-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed pt-1">{item.notes}</p>
              </div>
            </Section>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-3 px-7 py-4 border-t border-slate-200 bg-white shrink-0">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            <span className="font-mono">{item.appointmentNumber}</span>
          </span>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Close</Button>
            {onEdit && (
              <Button variant="filled" color="primary" onClick={() => onEdit(item)}>Edit</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
