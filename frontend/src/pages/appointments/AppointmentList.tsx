import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CalendarPlus, Calendar, Clock, Edit2, Download, X, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { DateFilter } from '../../components/ui/DateFilter';
import { useAppointments } from '../../contexts/AppointmentContext';
import type { AppointmentRecord } from '../../contexts/AppointmentContext';
import { exportToExcel } from '../../utils/exportToExcel';

const STATUS_COLORS: Record<string, string> = {
  Scheduled: 'bg-blue-100 text-blue-700',
  'Checked-In': 'bg-indigo-100 text-indigo-700',
  Waiting: 'bg-amber-100 text-amber-700',
  Consulting: 'bg-purple-100 text-purple-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
  'No-Show': 'bg-slate-100 text-slate-500',
};

const DEPARTMENTS = ['Cardiology', 'General Medicine', 'Orthopedics', 'Pediatrics', 'Dermatology', 'Neurology'];

export const AppointmentList = () => {
  const navigate = useNavigate();
  const { appointments, updateAppointment } = useAppointments();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedFilterDept, setAppliedFilterDept] = useState('');
  const [appliedFilterStatus, setAppliedFilterStatus] = useState('');
  const [appliedDateFrom, setAppliedDateFrom] = useState(today);
  const [appliedDateTo, setAppliedDateTo] = useState(today);

  // Edit modal state
  const [editItem, setEditItem] = useState<AppointmentRecord | null>(null);
  const [editForm, setEditForm] = useState<Partial<AppointmentRecord>>({});

  // Only show Walk-In type appointments — online bookings appear in the Online Booking screen
  const walkInAppointments = appointments.filter(a => a.type === 'Walk-In');

  const filtered = walkInAppointments.filter(a => {
    const matchSearch =
      a.patientName.toLowerCase().includes(appliedSearchTerm.toLowerCase()) ||
      a.uhid.toLowerCase().includes(appliedSearchTerm.toLowerCase()) ||
      a.appointmentNumber.toLowerCase().includes(appliedSearchTerm.toLowerCase()) ||
      a.mobileNumber.includes(appliedSearchTerm);
    const matchDept = !appliedFilterDept || a.department === appliedFilterDept;
    const matchStatus = !appliedFilterStatus || a.status === appliedFilterStatus;
    const matchDate = (!appliedDateFrom || a.date >= appliedDateFrom) && (!appliedDateTo || a.date <= appliedDateTo);
    
    return matchSearch && matchDept && matchStatus && matchDate;
  });

  const handleSearch = () => {
    setAppliedSearchTerm(searchTerm);
    setAppliedFilterDept(filterDept);
    setAppliedFilterStatus(filterStatus);
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
  };

  const handleReset = () => {
    setSearchTerm('');
    setFilterDept('');
    setFilterStatus('');
    setDateFrom('');
    setDateTo('');

    setAppliedSearchTerm('');
    setAppliedFilterDept('');
    setAppliedFilterStatus('');
    setAppliedDateFrom('');
    setAppliedDateTo('');
  };

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
    setEditItem(null);
  };

  const TIME_SLOTS = [
    '09:00 AM', '09:15 AM', '09:30 AM', '09:45 AM',
    '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM',
    '11:00 AM', '11:15 AM', '11:30 AM', '11:45 AM',
    '02:00 PM', '02:15 PM', '02:30 PM', '02:45 PM',
  ];

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Walk-in Booking</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" icon={Download} onClick={() => exportToExcel(filtered, 'Appointments')}>Export</Button>
          <Button variant="filled" color="primary" icon={CalendarPlus} onClick={() => navigate('/appointments/new')}>
            Add New Appointment
          </Button>
        </div>
      </div>

      {/* List Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col flex-1 overflow-hidden">
        {/* Search + Filters Row */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search appointments..."
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          
          <div className="h-8 w-px bg-slate-200 mx-1" />

          <DateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onSearch={handleSearch}
            onReset={handleReset}
          />

          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none min-w-[160px]"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none min-w-[140px]"
          >
            <option value="">All Statuses</option>
            {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <button onClick={handleSearch} className="px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors">
            Search
          </button>
          <button onClick={handleReset} className="px-4 py-2.5 bg-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-300 transition-colors">
            Reset
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold sticky top-0 z-10">
              <tr>
                <th className="px-4 py-4">Appt No.</th>
                <th className="px-4 py-4">UHID</th>
                <th className="px-4 py-4">Patient Name</th>
                <th className="px-4 py-4">Phone No.</th>
                <th className="px-4 py-4">Date &amp; Time</th>
                <th className="px-4 py-4">Doctor</th>
                <th className="px-4 py-4">Department</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-14 text-slate-400">
                    <CalendarPlus className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No appointments found</p>
                  </td>
                </tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-4 font-semibold text-primary text-sm">{item.appointmentNumber}</td>
                    <td className="px-4 py-4 text-slate-500 text-sm">{item.uhid}</td>
                    <td className="px-4 py-4 font-bold text-slate-800 text-sm">{item.patientName}</td>
                    <td className="px-4 py-4 text-slate-600 text-sm">{item.mobileNumber}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-slate-700 text-sm font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {item.date}
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                        <Clock className="w-3 h-3 shrink-0" />
                        {item.timeSlot}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-slate-700">{item.doctor}</td>
                    <td className="px-4 py-4 text-sm text-slate-500">{item.department}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-600'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Edit Appointment"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── EDIT MODAL ── */}
      {editItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Edit Appointment</h2>
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
                    value={editForm.patientName || ''}
                    onChange={e => setEditForm({ ...editForm, patientName: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Mobile Number</label>
                  <input
                    type="text"
                    value={editForm.mobileNumber || ''}
                    onChange={e => setEditForm({ ...editForm, mobileNumber: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Department</label>
                  <select
                    value={editForm.department || ''}
                    onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Doctor</label>
                  <input
                    type="text"
                    value={editForm.doctor || ''}
                    onChange={e => setEditForm({ ...editForm, doctor: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Appointment Date</label>
                  <input
                    type="date"
                    value={editForm.date || ''}
                    onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Time Slot</label>
                  <select
                    value={editForm.timeSlot || ''}
                    onChange={e => setEditForm({ ...editForm, timeSlot: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select slot</option>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Status</label>
                  <select
                    value={editForm.status || ''}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value as AppointmentRecord['status'] })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
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
