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

  const activePatients = patients.filter(p => p.status === 'Admitted' || p.status === 'Discharge Requested');
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
    chart: { 
      type: 'bar', 
      toolbar: { show: false }, 
      fontFamily: 'Inter',
      dropShadow: {
        enabled: true,
        color: '#000',
        top: 2,
        left: 0,
        blur: 4,
        opacity: 0.05
      }
    },
    colors: ['#047857', '#E11D48'],
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.5,
        gradientToColors: ['#34D399', '#FB7185'],
        inverseColors: true,
        opacityFrom: 1,
        opacityTo: 0.85,
        stops: [0, 100]
      }
    },
    plotOptions: { 
      bar: { 
        borderRadius: 6, 
        columnWidth: '40%',
        borderRadiusApplication: 'end'
      } 
    },
    xaxis: { 
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: '#94a3b8', fontWeight: 500 } }
    },
    yaxis: {
      labels: { style: { colors: '#94a3b8', fontWeight: 500 } }
    },
    grid: {
      borderColor: '#f1f5f9',
      strokeDashArray: 4,
      yaxis: { lines: { show: true } }
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    stroke: { show: true, width: 3, colors: ['transparent'] },
    tooltip: {
      theme: 'light',
      y: { formatter: (val) => `${val} patients` },
      style: { fontSize: '12px', fontFamily: 'Inter' }
    }
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
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-800">Admissions vs Discharges</h3>
            <div className="flex gap-4 text-sm font-bold">
              <div className="flex items-center gap-1 text-green-600"><ArrowUpRight className="w-4 h-4"/> Admissions ({admissionsToday} today)</div>
              <div className="flex items-center gap-1 text-red-500"><ArrowDownRight className="w-4 h-4"/> Discharges ({dischargesToday} today)</div>
            </div>
          </div>
          <Chart 
            options={barOptions} 
            series={[
              { name: 'Admissions', data: [12, 18, 15, 22, 14, 25, admissionsToday] },
              { name: 'Discharges', data: [10, 15, 12, 20, 15, 18, dischargesToday] }
            ]} 
            type="bar" 
            height={300} 
            width="100%"
          />
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
