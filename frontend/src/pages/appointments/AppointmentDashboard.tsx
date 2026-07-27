import { useEffect, useState } from 'react';
import { Calendar, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAppointments } from '../../contexts/AppointmentContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { DateFilter } from '../../components/ui/DateFilter';

export const AppointmentDashboard = () => {
  const { appointments, addAppointment } = useAppointments();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.pendingQuickBooking) {
      const patient = location.state.pendingQuickBooking;
      
      const newAppt = {
        id: Math.max(...appointments.map(a => a.id), 0) + 1,
        appointmentNumber: `APT${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        uhid: patient.uhid || 'UHID-PENDING',
        patientName: patient.patientName || 'Unknown',
        mobileNumber: patient.mobileNumber || '',
        department: patient.department || 'General',
        doctor: patient.doctor || 'Unassigned',
        date: new Date().toISOString().split('T')[0],
        timeSlot: 'Pending Allocation',
        durationMinutes: 15,
        type: 'Walk-In',
        priority: patient.priority || 'Normal',
        status: 'Scheduled'
      };
      
      // @ts-ignore
      addAppointment(newAppt);
      
      // Clear state so it doesn't run again on refresh
      navigate('/appointments/dashboard', { replace: true, state: {} });
    }
  }, [location.state, appointments, addAppointment, navigate]);

  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [appliedDateFrom, setAppliedDateFrom] = useState(today);
  const [appliedDateTo, setAppliedDateTo] = useState(today);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const dateFilteredAppointments = appointments.filter(a => 
    (!appliedDateFrom || a.date >= appliedDateFrom) && (!appliedDateTo || a.date <= appliedDateTo)
  );
  
  const scheduled = dateFilteredAppointments.filter(a => a.status === 'Scheduled').length;
  const checkedIn = dateFilteredAppointments.filter(a => a.status === 'Checked-In' || a.status === 'Waiting').length;

  const completed = dateFilteredAppointments.filter(a => a.status === 'Completed').length;
  const cancelled = dateFilteredAppointments.filter(a => a.status === 'Cancelled' || a.status === 'No-Show').length;

  const tableAppointments = dateFilteredAppointments.filter(a => {
    let matchStatus = true;
    if (statusFilter === 'Scheduled') matchStatus = a.status === 'Scheduled';
    if (statusFilter === 'Waiting') matchStatus = a.status === 'Checked-In' || a.status === 'Waiting';
    if (statusFilter === 'Completed') matchStatus = a.status === 'Completed';
    if (statusFilter === 'Cancelled') matchStatus = a.status === 'Cancelled' || a.status === 'No-Show';

    return matchStatus;
  });

  const handleSearch = () => {
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
  };

  const handleReset = () => {
    setDateFrom(today);
    setDateTo(today);
    setAppliedDateFrom(today);
    setAppliedDateTo(today);
    setStatusFilter(null);
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Appointment Dashboard</h1>
        </div>
        
        {/* Filter Bar exactly like screenshot */}
        <DateFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onSearch={handleSearch}
          onReset={handleReset}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div 
          className={`bg-white rounded-2xl p-6 border ${statusFilter === null ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-100'} shadow-sm flex flex-col cursor-pointer transition-all hover:shadow-md`}
          onClick={() => setStatusFilter(null)}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
            <span className="font-semibold text-slate-600">Total Appointments</span>
          </div>
          <span className="text-3xl font-bold text-slate-800">{dateFilteredAppointments.length}</span>
        </div>

        <div 
          className={`bg-white rounded-2xl p-6 border ${statusFilter === 'Scheduled' ? 'border-orange-500 ring-1 ring-orange-500' : 'border-slate-100'} shadow-sm flex flex-col cursor-pointer transition-all hover:shadow-md`}
          onClick={() => setStatusFilter('Scheduled')}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-orange-500" />
            </div>
            <span className="font-semibold text-slate-600">Scheduled</span>
          </div>
          <span className="text-3xl font-bold text-slate-800">{scheduled}</span>
        </div>

        <div 
          className={`bg-white rounded-2xl p-6 border ${statusFilter === 'Waiting' ? 'border-purple-500 ring-1 ring-purple-500' : 'border-slate-100'} shadow-sm flex flex-col cursor-pointer transition-all hover:shadow-md`}
          onClick={() => setStatusFilter('Waiting')}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-purple-500" />
            </div>
            <span className="font-semibold text-slate-600">Waiting</span>
          </div>
          <span className="text-3xl font-bold text-slate-800">{checkedIn}</span>
        </div>

        <div 
          className={`bg-white rounded-2xl p-6 border ${statusFilter === 'Completed' ? 'border-green-500 ring-1 ring-green-500' : 'border-slate-100'} shadow-sm flex flex-col cursor-pointer transition-all hover:shadow-md`}
          onClick={() => setStatusFilter('Completed')}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <span className="font-semibold text-slate-600">Completed</span>
          </div>
          <span className="text-3xl font-bold text-slate-800">{completed}</span>
        </div>

        <div 
          className={`bg-white rounded-2xl p-6 border ${statusFilter === 'Cancelled' ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-100'} shadow-sm flex flex-col cursor-pointer transition-all hover:shadow-md`}
          onClick={() => setStatusFilter('Cancelled')}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <span className="font-semibold text-slate-600">Cancelled/No-Show</span>
          </div>
          <span className="text-3xl font-bold text-slate-800">{cancelled}</span>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">
            {statusFilter ? `${statusFilter} Appointments` : 'All Appointments'}
          </h2>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Patient</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Doctor</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableAppointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No appointments found matching the criteria.
                  </td>
                </tr>
              ) : (
                tableAppointments.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot)).map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{appt.timeSlot} <span className="text-xs text-slate-400 block">{appt.date}</span></td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{appt.patientName}</div>
                      <div className="text-xs text-slate-500">{appt.uhid}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{appt.type}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{appt.doctor}</td>
                    <td className="px-6 py-4 text-slate-600">{appt.department}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        appt.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        appt.status === 'Consulting' ? 'bg-blue-100 text-blue-700' :
                        appt.status === 'Waiting' || appt.status === 'Checked-In' ? 'bg-purple-100 text-purple-700' :
                        appt.status === 'Scheduled' ? 'bg-slate-100 text-slate-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {appt.status}
                      </span>
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
