import { useState } from 'react';
import { useIPD } from '../../contexts/IPDContext';
import { BedDouble, Users, UserPlus, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { DateFilter } from '../../components/ui/DateFilter';

export const IPDDashboard = () => {
  const { patients, beds, admissionRequests, wards } = useIPD();

  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const handleSearch = () => {
  };

  const handleReset = () => {
    setDateFrom('');
    setDateTo('');
  };

  const activePatients = patients.filter(p => p.status === 'Admitted');
  const occupiedBeds = beds.filter(b => b.status === 'Occupied').length;
  const totalBeds = beds.length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  
  const pendingAdmissions = admissionRequests.filter(r => r.status === 'Pending').length;

  // Analytics Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const admissionsToday = patients.filter(p => p.admissionDate.startsWith(todayStr)).length;
  const dischargesToday = patients.filter(p => p.status === 'Discharged' /* && date check */).length; // Dummy
  
  // ALOS Calculation
  const alos = 4.2; // Dummy calculation
  
  const expectedDischarges = patients.filter(p => p.status === 'Admitted' && p.expectedStayDays <= 1).length;

  // Chart Options
  const barOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter' },
    colors: ['#22C55E', '#EF4444'],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
    xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    dataLabels: { enabled: false },
    legend: { show: false },
    stroke: { show: true, width: 2, colors: ['transparent'] }
  };

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'Inter' },
    colors: ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981'],
    labels: wards.map(w => w.name),
    dataLabels: { enabled: false },
    legend: { position: 'bottom' },
    stroke: { width: 0 }
  };

  const wardOccupancyData = wards.map(w => {
    const wBeds = beds.filter(b => b.wardId === w.id);
    const occ = wBeds.filter(b => b.status === 'Occupied').length;
    return occ;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">IPD Analytics Dashboard</h1>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-start justify-between">
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Total Inpatients</p>
            <h3 className="text-4xl font-bold text-slate-800">{activePatients.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-start justify-between">
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Bed Occupancy</p>
            <h3 className="text-4xl font-bold text-slate-800">{occupancyRate}%</h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">{occupiedBeds} / {totalBeds} Beds Full</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <BedDouble className="w-6 h-6 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-start justify-between">
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Pending Admissions</p>
            <h3 className="text-4xl font-bold text-slate-800">{pendingAdmissions}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-amber-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-start justify-between">
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Expected Discharges (24h)</p>
            <h3 className="text-4xl font-bold text-slate-800">{expectedDischarges}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
            <Clock className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-800">Admissions vs Discharges</h3>
            <div className="flex gap-4 text-sm font-bold">
              <div className="flex items-center gap-1 text-green-600"><ArrowUpRight className="w-4 h-4"/> Admissions ({admissionsToday} today)</div>
              <div className="flex items-center gap-1 text-red-500"><ArrowDownRight className="w-4 h-4"/> Discharges ({dischargesToday} today)</div>
            </div>
          </div>
          <div className="flex-1 w-full min-h-[300px]">
            <Chart 
              options={barOptions} 
              series={[
                { name: 'Admissions', data: [12, 18, 15, 22, 14, 25, admissionsToday] },
                { name: 'Discharges', data: [10, 15, 12, 20, 15, 18, dischargesToday] }
              ]} 
              type="bar" 
              height="100%" 
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col overflow-hidden">
          <h3 className="font-bold text-lg text-slate-800 mb-4">Occupancy by Ward</h3>
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            <Chart options={donutOptions} series={wardOccupancyData} type="donut" height="100%" width="100%" />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center text-sm font-bold text-slate-600 mb-1">
              <span>Average Length of Stay</span>
              <span className="text-primary">{alos} Days</span>
            </div>
            <p className="text-xs text-slate-400">Across all wards this month</p>
          </div>
        </div>
      </div>
    </div>
  );
};
