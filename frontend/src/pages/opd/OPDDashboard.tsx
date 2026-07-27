import { useState } from 'react';
import { useOPDVisits } from '../../contexts/OPDVisitContext';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, Activity, ArrowRight, CalendarDays, Hash, ScanLine } from 'lucide-react';
import { DateFilter } from '../../components/ui/DateFilter';

export const OPDDashboard = () => {
  const { visits } = useOPDVisits();
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  
  const [appliedDateFrom, setAppliedDateFrom] = useState(today);
  const [appliedDateTo, setAppliedDateTo] = useState(today);

  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const todaysVisits = visits.filter(v => (!appliedDateFrom || v.date >= appliedDateFrom) && (!appliedDateTo || v.date <= appliedDateTo));

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

  const stats = {
    total: todaysVisits.length,
    waiting: todaysVisits.filter(v => ['Waiting for Doctor', 'Nursing Assessment', 'Investigation Pending'].includes(v.status)).length,
    consulting: todaysVisits.filter(v => v.status === 'Consulting').length,
    completed: todaysVisits.filter(v => v.status === 'Completed').length,
  };

  const statsArray = [
    { label: 'Total Scheduled', value: stats.total, icon: CalendarDays, color: 'bg-blue-100 text-blue-600' },
    { label: 'Waiting Area', value: stats.waiting, icon: Clock, color: 'bg-amber-100 text-amber-600' },
    { label: 'Currently Consulting', value: stats.consulting, icon: Activity, color: 'bg-purple-100 text-purple-600' },
    { label: 'Completed Today', value: stats.completed, icon: CheckCircle, color: 'bg-green-100 text-green-600' },
  ];

  // Only show active or completed patients for the list
  const activeVisits = [...todaysVisits]
    .filter(v => v.status !== 'No Show')
    .filter(v => {
      if (activeFilter === 'Waiting Area' && !['Waiting for Doctor', 'Nursing Assessment', 'Investigation Pending'].includes(v.status)) return false;
      if (activeFilter === 'Currently Consulting' && v.status !== 'Consulting') return false;
      if (activeFilter === 'Completed Today' && v.status !== 'Completed') return false;
      return true;
    })
  const ALL_DEPARTMENTS = ['Cardiology', 'General Medicine', 'Orthopedics', 'Pediatrics', 'Dermatology', 'Neurology'];
  
  const deptCounts = todaysVisits.reduce((acc, v) => {
    acc[v.department] = (acc[v.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topDepts = ALL_DEPARTMENTS.map(dept => [dept, deptCounts[dept] || 0] as [string, number])
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Doctor's Dashboard</h1>
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

      {/* Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsArray.map((stat) => (
          <div 
            key={stat.label} 
            onClick={() => setActiveFilter(activeFilter === stat.label ? null : stat.label)}
            className={`bg-white p-5 rounded-xl border ${activeFilter === stat.label ? 'border-primary shadow-md ring-1 ring-primary' : 'border-slate-200 shadow-sm'} flex items-center justify-between cursor-pointer hover:border-primary/50 transition-all`}
          >
            <div>
              <p className="text-xs font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</p>
            </div>
            <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Side Panel: Quick Access & Links */}
        <div className="space-y-6 flex flex-col h-full">
          {/* Quick Department Access */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col h-72">
            <h2 className="text-lg font-bold text-slate-800 mb-4 shrink-0">Quick Department Access</h2>
            <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 pr-2">
              {topDepts.map(([dept, count]) => (
                <button
                  key={dept}
                  onClick={() => navigate(`/opd/consultations/${dept.toLowerCase().replace(' ', '-')}`)}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:border-primary/50 hover:bg-slate-50 transition-all group text-left"
                >
                  <div>
                    <div className="font-bold text-slate-800 group-hover:text-primary transition-colors text-sm">{dept}</div>
                    <div className="text-xs text-slate-500">{count} patients</div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
              {topDepts.length === 0 && (
                <div className="text-sm text-slate-400 text-center py-4">No departments active today</div>
              )}
            </div>
          </div>
          {/* Investigation Quick Links */}
          <div className="grid grid-cols-2 gap-4 shrink-0">
            <div
              onClick={() => navigate('/opd/lab-orders')}
              className="bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-3xl p-5 text-white cursor-pointer hover:shadow-xl hover:shadow-indigo-500/20 transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
              <div>
                <h3 className="text-base font-bold mb-0.5">Lab Results</h3>
                <p className="text-white/80 text-[10px]">Review lab reports</p>
              </div>
            </div>

            <div
              onClick={() => navigate('/opd/radiology')}
              className="bg-gradient-to-br from-purple-600 to-purple-500 rounded-3xl p-5 text-white cursor-pointer hover:shadow-xl hover:shadow-purple-500/20 transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <ScanLine className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
              <div>
                <h3 className="text-base font-bold mb-0.5">Radiology Results</h3>
                <p className="text-white/80 text-[10px]">Review radio reports</p>
              </div>
            </div>
          </div>
        </div>

        {/* Patient Queue List */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
            <h2 className="text-lg font-bold text-slate-800">
              {activeFilter ? `${activeFilter} Queue` : 'My Patient Queue'}
            </h2>
            {activeFilter && (
              <span className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-bold">Filtered by: {activeFilter}</span>
            )}
          </div>
          <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left">Token</th>
                <th className="px-6 py-3 text-left">Patient</th>
                <th className="px-6 py-3 text-left">Department</th>
                <th className="px-6 py-3 text-left">Time</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeVisits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No active visits today.
                  </td>
                </tr>
              ) : (
                activeVisits.map(visit => (
                  <tr key={visit.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3">
                      <span className="font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg text-sm flex items-center gap-1 w-max">
                        <Hash className="w-3 h-3" />{visit.queueToken}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="font-bold text-slate-800 text-sm">{visit.patientName}</div>
                      <div className="text-xs text-slate-400">{visit.uhid}</div>
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-600 font-medium">{visit.department}</td>
                    <td className="px-6 py-3 text-sm font-medium text-slate-700">{visit.timeSlot}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        visit.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        visit.status === 'Consulting' ? 'bg-purple-100 text-purple-700' :
                        ['Waiting for Doctor', 'Nursing Assessment', 'Investigation Pending'].includes(visit.status) ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {visit.status === 'Nursing Assessment' ? 'Triage' : visit.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <button 
                        onClick={() => navigate(`/opd/visit/${visit.id}`)}
                        className="px-4 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        {visit.status === 'Completed' ? 'View EMR' : 'Consult'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  );
};
