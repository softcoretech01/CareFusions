import { useState } from 'react';
import { DateFilter } from '../../components/ui/DateFilter';
import { useExecutiveData } from './hooks/useExecutiveData';
import { TrendingUp, TrendingDown, Clock, Crosshair, Users, Activity } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

const OperationalKPICard = ({ title, value, subValue, trend, trendValue, icon: Icon }: any) => (
  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-primary/50 transition-colors group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2.5 rounded-lg bg-slate-50 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-sm font-semibold ${trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {trendValue}%
        </div>
      )}
    </div>
    
    <div>
      <h4 className="text-slate-500 text-sm font-medium mb-1">{title}</h4>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-800">{value}</span>
        {subValue && <span className="text-sm font-medium text-slate-400">{subValue}</span>}
      </div>
    </div>
  </div>
);

export const OperationalAnalyticsPage = () => {
  const data = useExecutiveData();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const operational = data.operational;

  const heatMapOptions: ApexOptions = {
    chart: { type: 'heatmap', toolbar: { show: false }, fontFamily: 'Inter' },
    colors: ['#01684c'],
    dataLabels: { enabled: true },
    xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }
  };

  const heatmapSeries = [
    { name: '08:00', data: [120, 110, 140, 150, 120, 80, 75] },
    { name: '10:00', data: [250, 240, 260, 275, 230, 150, 140] },
    { name: '12:00', data: [310, 290, 320, 340, 305, 200, 180] },
    { name: '14:00', data: [220, 210, 240, 250, 215, 140, 130] },
    { name: '16:00', data: [280, 265, 295, 310, 275, 160, 150] },
    { name: '18:00', data: [190, 180, 200, 215, 185, 110, 100] },
    { name: '20:00', data: [80, 75, 85, 95, 75, 50, 45] },
  ].reverse();

  const barOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter' },
    colors: ['#01684c'],
    plotOptions: { bar: { borderRadius: 4, horizontal: true } },
    dataLabels: { enabled: false },
    xaxis: { categories: ['Cardio OT', 'Neuro OT', 'Ortho OT', 'General OT', 'Emergency OT'] }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <DateFilter
          dateFrom={fromDate}
          dateTo={toDate}
          onDateFromChange={setFromDate}
          onDateToChange={setToDate}
        />
      </div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Operational Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor throughput, efficiency, and hospital operations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <OperationalKPICard title="ER Wait Time" value={`${operational.averageBillingTime + 7}m`} trend="down" trendValue={12} icon={Clock} />
        <OperationalKPICard title="Lab Turnaround" value={`${operational.labTurnaroundTime}m`} trend="down" trendValue={4} icon={Activity} />
        <OperationalKPICard title="Pharmacy Dispensing" value={`${operational.pharmacyDispensingTime}m`} trend="down" trendValue={2} icon={Clock} />
        <OperationalKPICard title="Appointments" value={operational.appointmentsToday} trend="up" trendValue={1.5} icon={Users} />
        <OperationalKPICard title="OT Utilization" value={`${operational.otUtilization}%`} trend="up" trendValue={5.4} icon={Crosshair} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Patient Flow Heatmap (Time of Day vs Day of Week)</h3>
          <Chart options={heatMapOptions} series={heatmapSeries} type="heatmap" height={400} />
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">OT Utilization by Theatre</h3>
          <Chart 
            options={barOptions} 
            series={[{ name: 'Utilization %', data: [88, 76, 92, 65, 45] }]} 
            type="bar" 
            height={400} 
          />
        </div>
      </div>
    </div>
  );
};
