import { useState } from 'react';
import { Clock, CheckCircle, Stethoscope, CalendarDays, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { useAppointments } from '../../contexts/AppointmentContext';
import type { AppointmentRecord } from '../../contexts/AppointmentContext';

/**
 * Waiting List — the step between a booking and the doctor.
 *
 * This page used to render a hardcoded `dummyWaiting` array with an "Assign
 * Slot" button that had no handler, so nothing about it was real.
 *
 * It is now the front desk's arrivals desk, and the gate into the OPD doctor
 * screens. Every appointment starts life as 'Scheduled' (online bookings
 * included). A scheduled patient is NOT the doctor's work — they may arrive in
 * three days, or not at all — so DepartmentConsultations hides them. Checking a
 * patient in here moves them to 'Waiting', which is what puts them on the
 * doctor's list.
 */
export const WaitingList = () => {
  const { appointments, updateAppointmentStatus, loadAppointments } = useAppointments();
  const [busyId, setBusyId] = useState<number | null>(null);

  const today = new Date().toISOString().split('T')[0];

  // Only bookings that have not been checked in yet belong on this list.
  const waiting = appointments
    .filter(a => a.status === 'Scheduled')
    .sort((a, b) => (a.date + a.timeSlot).localeCompare(b.date + b.timeSlot));

  const checkIn = async (appt: AppointmentRecord) => {
    setBusyId(appt.id);
    try {
      await updateAppointmentStatus(appt.id, 'Waiting');
      toast.success(`${appt.patientName} checked in — now on Dr. ${appt.doctor}'s list.`);
    } catch {
      toast.error('Could not check the patient in. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  /** "in 2 days" / "today" / "3 days ago" for the appointment date. */
  const relativeDay = (dateStr: string) => {
    if (!dateStr) return '—';
    const days = Math.round(
      (new Date(dateStr + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000
    );
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days > 1) return `In ${days} days`;
    if (days === -1) return 'Yesterday';
    return `${Math.abs(days)} days ago`;
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Waiting List</h1>
          <p className="text-slate-500 mt-1">
            Booked patients who have not been checked in yet. Checking a patient in puts
            them on their doctor&apos;s OPD list.
          </p>
        </div>
        <Button
          variant="outline"
          color="primary"
          icon={RefreshCw}
          onClick={() => loadAppointments?.()}
        >
          Refresh
        </Button>
      </div>

      <div className="flex-1 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold sticky top-0">
              <tr>
                <th className="px-6 py-4">Patient</th>
                <th className="px-6 py-4">Doctor</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Appointment</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {waiting.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                    <p>No patients waiting to be checked in.</p>
                    <p className="text-xs mt-1">New bookings appear here until they are checked in.</p>
                  </td>
                </tr>
              ) : (
                waiting.map(appt => (
                  <tr key={appt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{appt.patientName}</div>
                      <div className="text-xs text-slate-400">
                        {appt.appointmentNumber} · {appt.uhid}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Stethoscope className="w-4 h-4 text-slate-400 shrink-0" />
                        {appt.doctor || <span className="text-slate-400 italic">Not assigned</span>}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{appt.department}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>
                          {appt.date} {appt.timeSlot && <span className="text-slate-400">· {appt.timeSlot}</span>}
                          <span className="block text-xs text-slate-400">{relativeDay(appt.date)}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        appt.priority === 'Emergency'
                          ? 'bg-red-100 text-red-700'
                          : appt.priority === 'High'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {appt.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        size="sm"
                        variant="outline"
                        color="primary"
                        icon={busyId === appt.id ? Clock : CheckCircle}
                        disabled={busyId === appt.id}
                        onClick={() => checkIn(appt)}
                      >
                        {busyId === appt.id ? 'Checking in…' : 'Check In'}
                      </Button>
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
