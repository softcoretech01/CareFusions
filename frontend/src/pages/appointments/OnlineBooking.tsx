import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Globe, CalendarPlus, Calendar, Clock, Edit2, Eye, Download, X, CheckCircle, AlertTriangle, Building2, Stethoscope, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAppointments } from '../../contexts/AppointmentContext';
import type { AppointmentRecord } from '../../contexts/AppointmentContext';
import { useDepartments } from '../../hooks/useMasterOptions';
import { exportToExcel } from '../../utils/exportToExcel';
import { Pagination } from '../../components/ui/Pagination';
import { AppointmentDetailsModal } from '../../components/appointments/AppointmentDetailsModal';
import { DateFilter } from '../../components/ui/DateFilter';
import { useDoctorSchedules } from '../../contexts/DoctorScheduleContext';
import { getBookedSlots, buildSessionSlots, isSlotInPast } from '../../data/doctorSchedules';

const PAGE_SIZE = 10;

const STATUS_COLORS: Record<string, string> = {
  Scheduled: 'bg-blue-100 text-blue-700',
  'Checked-In': 'bg-indigo-100 text-indigo-700',
  Waiting: 'bg-amber-100 text-amber-700',
  Consulting: 'bg-purple-100 text-purple-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};



export const OnlineBooking = () => {
  const navigate = useNavigate();
  const { updateAppointment, queryAppointments, apiError, clearError, appointments } = useAppointments();
  const { options: departments } = useDepartments();
  const { getDoctorsWithAvailability, doctorSchedules } = useDoctorSchedules();

  // Department options come from the backend master.
  const departmentOptions = departments.map(d => d.departmentName).sort();

  const formatYYYYMMDD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const dToday = new Date();
  const dFirstDay = new Date(dToday.getFullYear(), dToday.getMonth(), 1);

  const todayStr = formatYYYYMMDD(dToday);
  const firstDayStr = formatYYYYMMDD(dFirstDay);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState(firstDayStr);
  const [dateTo, setDateTo] = useState(todayStr);

  // Server-filtered rows (online = everything that is NOT Walk-In).
  const [filtered, setFiltered] = useState<AppointmentRecord[]>([]);
  const [page, setPage] = useState(1);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Edit modal state
  const [editItem, setEditItem] = useState<AppointmentRecord | null>(null);
  const [editForm, setEditForm] = useState<Partial<AppointmentRecord>>({});

  // Doctors offered for the selected department. This must sit AFTER editForm is
  // declared: computing it above the useState read `editForm` inside a filter
  // callback that runs immediately, which throws
  //   ReferenceError: Cannot access 'editForm' before initialization
  // on first render and blanks the page. TypeScript does not flag it because it
  // cannot tell when a callback executes.
  //
  // Department names on Master_Doctor match Master_Department exactly, so a
  // direct comparison is right; trimming guards against stray whitespace from
  // older rows. With no department chosen yet, every active doctor is offered.
  const selectedDepartment = (editForm.department || '').trim();

  // Doctors for the chosen department, flagged with whether they actually work
  // on the chosen weekday — the same source the New Online Booking page uses,
  // so both screens agree on who can be booked.
  const editDoctors = selectedDepartment
    ? getDoctorsWithAvailability(selectedDepartment, editForm.date || '')
    : [];

  // Slots come from the selected doctor's own schedule (session times, slot
  // duration and break), not a fixed list.
  const editSchedule = doctorSchedules.find(d => d.name === editForm.doctor) ?? null;
  const editSlots = editSchedule
    ? buildSessionSlots(
        editSchedule.timings.start,
        editSchedule.timings.end,
        editSchedule.slotDuration,
        editSchedule.breakTimings?.start,
        editSchedule.breakTimings?.end
      )
    : [];

  const editBookedSlots = editForm.doctor && editForm.date
    ? getBookedSlots(editForm.doctor, editForm.date, appointments)
    : new Set<string>();

  // Read-only details modal state
  const [viewItem, setViewItem] = useState<AppointmentRecord | null>(null);

  const reload = useCallback(() => {
    queryAppointments({
      search: searchTerm.trim(),
      department: filterDept,
      status: filterStatus,
      dateFrom,
      dateTo,
      excludeType: 'Walk-In',
    }).then(setFiltered);
  }, [queryAppointments, searchTerm, filterDept, filterStatus, dateFrom, dateTo]);

  useEffect(() => {
    const t = setTimeout(reload, 300);
    return () => clearTimeout(t);
  }, [reload]);

  const handleSearch = () => {
    setPage(1);
    reload();
  };

  const handleReset = () => {
    setSearchTerm('');
    setFilterDept('');
    setFilterStatus('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (page > totalPages) setPage(1);
  }, [filtered, page]);

  const openEdit = (item: AppointmentRecord) => {
    setEditItem(item);
    setEditForm({
      patientName: item.patientName,
      mobileNumber: item.mobileNumber,
      department: item.department,
      doctor: item.doctor,
      date: item.date,
      timeSlot: item.timeSlot,
      status: item.status,
      type: item.type,
      priority: item.priority,
    });
  };

  const handleSave = () => {
    if (!editItem) return;
    updateAppointment(editItem.id, editForm);
    setFiltered(prev => prev.map(r => (r.id === editItem.id ? { ...r, ...editForm } as AppointmentRecord : r)));
    setEditItem(null);
    setTimeout(reload, 500);
  };

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

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Online Booking</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" icon={Download} onClick={() => exportToExcel(filtered, 'OnlineBookings')}>Export</Button>
          <Button
            variant="filled"
            color="primary"
            icon={CalendarPlus}
            onClick={() => navigate('/appointments/online-booking/new')}
          >
            New Online Booking
          </Button>
        </div>
      </div>

      {/* List Card */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm">

        {/* Search + Filters Row */}
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search appointments..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium transition-all"
              />
            </div>

            <div className="w-px h-6 bg-slate-200 hidden sm:block mx-1"></div>

            <DateFilter
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              onSearch={handleSearch}
              onReset={handleReset}
            />

            {/* Department filter */}
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all h-[42px]"
            >
              <option value="">All Departments</option>
              {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all h-[42px]"
            >
              <option value="">All Statuses</option>
              {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2">Appt No.</th>
                <th className="px-4 py-2">UHID</th>
                <th className="px-4 py-2">Patient Name</th>
                <th className="px-4 py-2">Phone No.</th>
                <th className="px-4 py-2">Date &amp; Time</th>
                <th className="px-4 py-2">Doctor</th>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-slate-400">
                    <Globe className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No online bookings yet</p>
                    <p className="text-sm mt-1">Click "New Online Booking" to create the first one.</p>
                  </td>
                </tr>
              ) : (
                paged.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-2 font-semibold text-primary text-sm whitespace-nowrap">{item.appointmentNumber}</td>
                    <td className="px-4 py-2 text-slate-500 text-sm whitespace-nowrap">{item.uhid}</td>
                    <td className="px-4 py-2 font-bold text-slate-800 text-sm">{item.patientName}</td>
                    <td className="px-4 py-2 text-slate-600 text-sm">{item.mobileNumber}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1 text-slate-700 text-sm font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {item.date}
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                        <Clock className="w-3 h-3 shrink-0" />
                        {item.timeSlot}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm font-medium text-slate-700">{item.doctor}</td>
                    <td className="px-4 py-2 text-sm text-slate-500">{item.department}</td>
                    <td className="px-4 py-2 align-middle">
                      <span className={`inline-flex items-center justify-center min-w-[96px] px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-600'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewItem(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Booking"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => item.status !== 'Completed' && openEdit(item)}
                          disabled={item.status === 'Completed'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            item.status === 'Completed'
                              ? 'text-slate-300 cursor-not-allowed opacity-50'
                              : 'text-slate-400 hover:text-primary hover:bg-primary/10'
                          }`}
                          title={item.status === 'Completed' ? 'Completed bookings cannot be edited' : 'Edit Booking'}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} totalItems={filtered.length} onPageChange={setPage} />
      </div>

      {/* ── VIEW MODAL ── */}
      {viewItem && (
        <AppointmentDetailsModal
          item={viewItem}
          title="Online Booking Details"
          onClose={() => setViewItem(null)}
          onEdit={(item) => { setViewItem(null); openEdit(item); }}
        />
      )}

      {/* ── EDIT MODAL ── */}
      {editItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Edit Online Booking</h2>
                <p className="text-xs text-slate-400 mt-0.5">{editItem.appointmentNumber} · {editItem.uhid}</p>
              </div>
              <button onClick={() => setEditItem(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-7 py-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Patient Name</label>
                  <input
                    type="text"
                    maxLength={100}
                    value={editForm.patientName || ''}
                    onChange={e => setEditForm({ ...editForm, patientName: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Mobile Number</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={editForm.mobileNumber || ''}
                    onChange={e => setEditForm({ ...editForm, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Appointment Date</label>
                  <input
                    type="date"
                    value={editForm.date || ''}
                    onChange={e => setEditForm({ ...editForm, date: e.target.value, timeSlot: '' })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* Department + Doctor + Slots, matching the New Online Booking
                    pickers. These used to be plain selects: the doctor list was
                    unfiltered and the slot list was a hardcoded TIME_SLOTS array
                    that ignored the doctor's real schedule and existing bookings. */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Department</label>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                    {departmentOptions.length === 0 && (
                      <p className="text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center">
                        No departments configured.
                      </p>
                    )}
                    {departmentOptions.map(dept => (
                      <div
                        key={dept}
                        onClick={() => setEditForm({ ...editForm, department: dept, doctor: '', timeSlot: '' })}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                          editForm.department === dept
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-slate-100 hover:border-slate-200 text-slate-600'
                        }`}
                      >
                        <Building2 className={`w-4 h-4 shrink-0 ${editForm.department === dept ? 'text-primary' : 'text-slate-400'}`} />
                        <span className="font-semibold text-sm">{dept}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">
                    Doctor
                    {editForm.department && editForm.date && (
                      <span className="ml-2 text-[10px] text-slate-400 font-normal normal-case">
                        available on {new Date(editForm.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
                      </span>
                    )}
                  </label>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                    {!editForm.department ? (
                      <div className="min-h-[100px] border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-sm font-medium">
                        Select a department first
                      </div>
                    ) : editDoctors.length === 0 ? (
                      <div className="min-h-[100px] border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-center text-slate-400 text-sm font-medium p-4">
                        No doctors in this department. Add them in Doctor Master.
                      </div>
                    ) : (
                      editDoctors.map(({ name, available }) => (
                        <div
                          key={name}
                          onClick={() => available && setEditForm({ ...editForm, doctor: name, timeSlot: '' })}
                          className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                            !available
                              ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                              : editForm.doctor === name
                              ? 'border-primary bg-primary/5 text-primary cursor-pointer'
                              : 'border-slate-100 hover:border-slate-200 text-slate-600 cursor-pointer'
                          }`}
                        >
                          <Stethoscope className={`w-4 h-4 shrink-0 ${
                            !available ? 'text-slate-300' : editForm.doctor === name ? 'text-primary' : 'text-slate-400'
                          }`} />
                          <span className="font-semibold text-sm flex-1">{name}</span>
                          {!available && (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                              <AlertCircle className="w-3 h-3" /> Not available
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Time Slot</label>
                  {!editForm.doctor ? (
                    <div className="py-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-sm font-medium">
                      Select a doctor to see their slots
                    </div>
                  ) : editSlots.length === 0 ? (
                    <div className="py-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-sm font-medium px-4">
                      No slots — this doctor has no session times configured. Set them in Doctor Schedules.
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {editSlots.map(time => {
                        // The slot this booking already holds stays selectable,
                        // otherwise reopening an appointment shows its own slot
                        // as taken and the user cannot save without moving it.
                        const isBooked = editBookedSlots.has(time) && time !== editItem.timeSlot;
                        const isPast = isSlotInPast(editForm.date || '', time);
                        const isSelected = editForm.timeSlot === time;
                        const disabled = isBooked || isPast;
                        return (
                          <div
                            key={time}
                            onClick={() => !disabled && setEditForm({ ...editForm, timeSlot: time })}
                            title={isBooked ? 'Already booked' : isPast ? 'This time has passed' : ''}
                            className={`py-2 px-1 text-center rounded-lg border-2 text-xs font-semibold transition-all select-none ${
                              isBooked
                                ? 'bg-red-700 border-red-700 text-white cursor-not-allowed opacity-85'
                                : isPast
                                ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed line-through'
                                : isSelected
                                ? 'bg-green-600 border-green-600 text-white shadow-md cursor-pointer scale-105'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-primary hover:shadow-sm cursor-pointer'
                            }`}
                          >
                            <div className="flex flex-col items-center gap-0.5">
                              <Clock className="w-3 h-3 opacity-70" />
                              {time}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Priority</label>
                  <select
                    value={editForm.priority || ''}
                    onChange={e => setEditForm({ ...editForm, priority: e.target.value as AppointmentRecord['priority'] })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-7 py-5 border-t border-slate-100 bg-slate-50/50">
              <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button variant="filled" color="primary" icon={CheckCircle} onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
