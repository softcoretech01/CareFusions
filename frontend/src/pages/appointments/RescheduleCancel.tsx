import { useState, useEffect, useCallback } from 'react';
import { useAppointments } from '../../contexts/AppointmentContext';
import { useDoctorSchedules } from '../../contexts/DoctorScheduleContext';
import { useOPDVisits } from '../../contexts/OPDVisitContext';
import { getBookedSlots } from '../../data/doctorSchedules';
import {
  Search, CalendarX, CalendarClock, CheckCircle, X,
  Clock, User, Building2, AlertTriangle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import type { AppointmentRecord } from '../../contexts/AppointmentContext';

const PAGE_SIZE = 10;

const ACTIVE_STATUSES = ['Scheduled', 'Checked-In', 'Waiting'];

const STATUS_BADGE: Record<string, string> = {
  Scheduled:    'bg-slate-100 text-slate-700',
  'Checked-In': 'bg-amber-100 text-amber-700',
  Waiting:      'bg-amber-100 text-amber-700',
  Consulting:   'bg-blue-100 text-blue-700',
  Completed:    'bg-green-100 text-green-700',
  Cancelled:    'bg-red-100 text-red-700',
  'No-Show':    'bg-slate-100 text-slate-400',
};

const timeToMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const minToLabel = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
};
function buildSessionSlots(start: string, end: string, dur: number, breakStart?: string, breakEnd?: string): string[] {
  if (!start || !end || !dur || dur <= 0) return [];
  const s = timeToMin(start), e = timeToMin(end);
  const bs = breakStart ? timeToMin(breakStart) : null;
  const be = breakEnd ? timeToMin(breakEnd) : null;

  const out: string[] = [];
  for (let t = s; t + dur <= e; t += dur) {
    if (bs !== null && be !== null && t + dur > bs && t < be) continue;
    out.push(minToLabel(t));
  }
  return out;
}
function isSlotInPast(dateStr: string, timeStr: string): boolean {
  if (!dateStr) return false;
  const [time, ampm] = timeStr.split(' ');
  const [hRaw, m] = time.split(':').map(Number);
  let h = hRaw;
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  const slot = new Date(dateStr + 'T00:00:00');
  slot.setHours(h, m, 0, 0);
  return slot.getTime() < Date.now();
}

export const RescheduleCancel = () => {
  const { updateAppointmentStatus, updateAppointment, queryAppointments, appointments, apiError, clearError } = useAppointments();
  const { doctorSchedules } = useDoctorSchedules();
  const { visits, updateVisit } = useOPDVisits();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedItem, setSelectedItem] = useState<AppointmentRecord | null>(null);
  const [actionModal, setActionModal] = useState<{ type: 'cancel' | 'noshow' | 'reschedule'; item: AppointmentRecord } | null>(null);
  const [allFiltered, setAllFiltered] = useState<AppointmentRecord[]>([]);
  const [page, setPage] = useState(1);
  const paged = allFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reschedule form state
  const [newDate, setNewDate] = useState('');
  const [newSlot, setNewSlot] = useState('');

  // Fetch from the backend (search server-side). Status is applied here because
  // the default view is a SET of active statuses the API can't express directly.
  const reload = useCallback(() => {
    queryAppointments({ search: search.trim(), status: filterStatus }).then(rows => {
      setAllFiltered(filterStatus ? rows : rows.filter(a => ACTIVE_STATUSES.includes(a.status)));
    });
  }, [queryAppointments, search, filterStatus]);

  useEffect(() => {
    const t = setTimeout(reload, 300);
    return () => clearTimeout(t);
  }, [reload]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(allFiltered.length / PAGE_SIZE));
    if (page > totalPages) setPage(1);
  }, [allFiltered, page]);

  // Confirm cancel
  const confirmCancel = () => {
    if (!actionModal) return;
    updateAppointmentStatus(actionModal.item.id, 'Cancelled');
    setActionModal(null);
    setSelectedItem(null);
    setTimeout(reload, 500);
  };

  // Confirm no-show
  const confirmNoShow = () => {
    if (!actionModal) return;
    updateAppointmentStatus(actionModal.item.id, 'No-Show');
    setActionModal(null);
    setSelectedItem(null);
    setTimeout(reload, 500);
  };

  // Confirm reschedule
  const confirmReschedule = () => {
    if (!actionModal || !newDate || !newSlot) return;
    updateAppointment(actionModal.item.id, { date: newDate, timeSlot: newSlot, status: 'Scheduled' });
    const visit = visits.find(v => v.appointmentId === actionModal.item.id);
    if (visit) {
      updateVisit(visit.id, { date: newDate, timeSlot: newSlot, status: 'Scheduled' });
    }
    setActionModal(null);
    setSelectedItem(null);
    setNewDate('');
    setNewSlot('');
    setTimeout(reload, 500);
  };

  const selectedSchedule = actionModal?.item?.doctor
    ? doctorSchedules.find(d => d.name === actionModal.item.doctor) ?? null
    : null;

  const timeSlots = selectedSchedule
    ? buildSessionSlots(
        selectedSchedule.timings.start,
        selectedSchedule.timings.end,
        selectedSchedule.slotDuration,
        selectedSchedule.breakTimings?.start,
        selectedSchedule.breakTimings?.end
      )
    : [];

  const bookedSlots = actionModal?.item?.doctor && newDate
    ? getBookedSlots(actionModal.item.doctor, newDate, appointments)
    : new Set<string>();

  return (
    <div className="flex flex-col relative">

      {/* API error banner */}
      {apiError && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{apiError}</span>
          <button onClick={clearError} className="text-red-500 hover:text-red-700 font-medium">Dismiss</button>
        </div>
      )}

      {/* ── Action Modal ── */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal header */}
            <div className={`px-6 py-5 border-b flex items-center justify-between ${
              actionModal.type === 'cancel' ? 'bg-red-50 border-red-100' :
              actionModal.type === 'noshow' ? 'bg-slate-50 border-slate-100' :
              'bg-primary/5 border-primary/10'
            }`}>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">
                  {actionModal.type === 'cancel' ? '⛔ Cancel Appointment' :
                   actionModal.type === 'noshow' ? '🚫 Mark as No-Show' :
                   '📅 Reschedule Appointment'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {actionModal.item.appointmentNumber} · {actionModal.item.patientName}
                </p>
              </div>
              <button onClick={() => setActionModal(null)} className="p-2 hover:bg-white/80 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5">
              {/* Patient summary */}
              <div className="bg-slate-50 rounded-2xl p-4 mb-5 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold">{actionModal.item.patientName}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">{actionModal.item.uhid}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{actionModal.item.date} at {actionModal.item.timeSlot}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>{actionModal.item.doctor} · {actionModal.item.department}</span>
                </div>
              </div>

              {/* Reschedule fields */}
              {actionModal.type === 'reschedule' && (
                <div className="space-y-4 mb-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">New Date</label>
                    <input
                      type="date"
                      value={newDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => { setNewDate(e.target.value); setNewSlot(''); }}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  {newDate && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                      <div>
                        {/* Legend */}
                        <div className="flex flex-col gap-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Slot Legend</p>
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded border border-slate-200 bg-white inline-block shrink-0"></span>
                            <span className="text-xs text-slate-600">Available</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded bg-green-600 inline-block shrink-0"></span>
                            <span className="text-xs text-slate-600">Selected</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded bg-red-700 inline-block shrink-0"></span>
                            <span className="text-xs text-slate-600">Already booked</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded bg-slate-100 border border-slate-200 inline-block shrink-0"></span>
                            <span className="text-xs text-slate-600">Past / unavailable</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">New Time Slot</label>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                          {timeSlots.length === 0 && (
                            <p className="col-span-2 text-xs text-slate-400 text-center py-4 border-2 border-dashed border-slate-200 rounded-xl">
                              No slots configured for this doctor.
                            </p>
                          )}
                          {timeSlots.map(time => {
                            const isBooked = bookedSlots.has(time);
                            const isPast = isSlotInPast(newDate, time);
                            const isSelected = newSlot === time;
                            const disabled = isBooked || isPast;
                            return (
                              <div
                                key={time}
                                onClick={() => !disabled && setNewSlot(time)}
                                title={isBooked ? 'Already booked' : isPast ? 'Time has passed' : ''}
                                className={`py-1.5 px-1 text-center rounded-lg border-2 text-xs font-semibold transition-all duration-200 select-none ${
                                  isBooked
                                    ? 'bg-red-700 border-red-700 text-white cursor-not-allowed opacity-85'
                                    : isPast
                                    ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed line-through'
                                    : isSelected
                                    ? 'bg-green-600 border-green-600 text-white shadow-md cursor-pointer'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-primary hover:shadow-sm cursor-pointer'
                                }`}
                              >
                                <div className="flex flex-col items-center gap-0.5">
                                  {time}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Warning for cancel / no-show */}
              {(actionModal.type === 'cancel' || actionModal.type === 'noshow') && (
                <div className={`flex items-start gap-3 p-3 rounded-xl mb-5 ${
                  actionModal.type === 'cancel' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-sm">
                    {actionModal.type === 'cancel'
                      ? 'This will permanently cancel the appointment. The patient may need to re-book.'
                      : 'This marks the patient as absent. The slot will be freed. You can reschedule from this screen.'}
                  </p>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setActionModal(null)}>Back</Button>
              {actionModal.type === 'cancel' && (
                <button
                  onClick={confirmCancel}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
                >
                  <CalendarX className="w-4 h-4" /> Confirm Cancel
                </button>
              )}
              {actionModal.type === 'noshow' && (
                <button
                  onClick={confirmNoShow}
                  className="px-5 py-2.5 bg-slate-600 hover:bg-slate-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Mark No-Show
                </button>
              )}
              {actionModal.type === 'reschedule' && (
                <button
                  onClick={confirmReschedule}
                  disabled={!newDate || !newSlot}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CalendarClock className="w-4 h-4" /> Confirm Reschedule
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Reschedule &amp; Cancel</h1>
        </div>
      </div>

      {/* ── Search + Filter ── */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm">
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by Name, UHID, Appt No, Mobile..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Active (Scheduled/Waiting)</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Checked-In">Checked-In</option>
            <option value="Waiting">Waiting</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2">Appt No.</th>
                <th className="px-4 py-2">Patient</th>
                <th className="px-4 py-2">Doctor &amp; Date</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allFiltered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-14 text-slate-400">
                    <CalendarX className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No appointments found</p>
                  </td>
                </tr>
              ) : (
                paged.map(item => {
                  const isCancelledOrNoShow = item.status === 'Cancelled' || item.status === 'No-Show';
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${selectedItem?.id === item.id ? 'bg-primary/5' : ''}`}
                    >
                      <td className="px-4 py-2 font-bold text-primary text-sm font-mono whitespace-nowrap">{item.appointmentNumber}</td>
                      <td className="px-4 py-2">
                        <div className="font-bold text-slate-800 text-sm">{item.patientName}</div>
                        <div className="text-xs text-slate-400">{item.uhid} · {item.mobileNumber}</div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="font-semibold text-slate-700">{item.doctor}</div>
                        <div className="text-slate-400 text-xs">{item.date} · {item.timeSlot}</div>
                        <div className="text-slate-400 text-xs">{item.department}</div>
                      </td>
                      <td className="px-4 py-2 text-slate-500 text-sm">{item.type}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[item.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-2">
                          {!isCancelledOrNoShow && (
                            <>
                              <button
                                onClick={() => setActionModal({ type: 'reschedule', item })}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary border border-primary/30 hover:bg-primary/5 rounded-lg transition-colors"
                              >
                                <CalendarClock className="w-3.5 h-3.5" /> Reschedule
                              </button>
                              <button
                                onClick={() => setActionModal({ type: 'cancel', item })}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-500 border border-red-200 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <CalendarX className="w-3.5 h-3.5" /> Cancel
                              </button>
                            </>
                          )}
                          {isCancelledOrNoShow && (
                            <span className="text-xs text-slate-400 italic">No actions available</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} totalItems={allFiltered.length} onPageChange={setPage} />
      </div>
    </div>
  );
};
