import { useState } from 'react';
import { DateFilter } from '../../components/ui/DateFilter';
import { useExecutiveData } from './hooks/useExecutiveData';
import { TrendingUp, TrendingDown, Users, Bed, Clock, Heart, ShieldCheck, Activity } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

// Minimal KPI Card without background colors/gradients
const ClinicalKPICard = ({ title, value, subValue, trend, trendValue, icon: Icon }: any) => (
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

export const ClinicalAnalyticsPage = () => {
  const data = useExecutiveData();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const clinical = data.clinical;

  const barOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter' },
    colors: ['#01684c'],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: clinical.bedOccupancy.map((b: any) => b.name) },
    legend: { position: 'top' },
    stroke: { width: 0 }
  };

  const lineOptions: ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, fontFamily: 'Inter' },
    colors: ['#01684c', '#0ea5e9', '#f5a623'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.2, opacityTo: 0.05, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { 
      categories: clinical.admissionsTrend.map((t: any) => t.date).filter((_, i) => i % 5 === 0),
      labels: { style: { colors: '#64748b' } } 
    },
    yaxis: { labels: { style: { colors: '#64748b' } } }
  };

  const departments = [
    { name: 'Cardiology', patients: 1240, alos: '4.2', mortality: '1.8%', status: 'Excellent' },
    { name: 'Neurology', patients: 850, alos: '6.5', mortality: '2.1%', status: 'Good' },
    { name: 'Orthopedics', patients: 1420, alos: '3.1', mortality: '0.4%', status: 'Excellent' },
    { name: 'Oncology', patients: 620, alos: '7.8', mortality: '4.5%', status: 'Warning' },
    { name: 'General Medicine', patients: 2840, alos: '2.5', mortality: '0.8%', status: 'Good' },
  ];

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
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Clinical Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Deep dive into patient volumes, bed occupancy, and clinical outcomes.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            Export PDF
          </button>
          <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
            Generate Report
          </button>
        </div>
      </div>

      {/* Top 6 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ClinicalKPICard title="Total Patients (Today)" value={clinical.opVisitsToday + clinical.admissionsToday} trend="up" trendValue={4.2} icon={Users} />
        <ClinicalKPICard title="Admissions Today" value={clinical.admissionsToday} subValue={`vs ${clinical.dischargesToday} Discharges`} trend="up" trendValue={2.1} icon={Bed} />
        <ClinicalKPICard title="Overall Bed Occupancy" value="85%" trend="down" trendValue={1.5} icon={Heart} />
        <ClinicalKPICard title="Avg Length of Stay" value={`${clinical.averageLengthOfStay} Days`} trend="down" trendValue={0.5} icon={Clock} />
        <ClinicalKPICard title="Avg Emergency Wait" value={`${clinical.emergencyResponseTime} Mins`} trend="down" trendValue={12.4} icon={Activity} />
        <ClinicalKPICard title="Surgery Success Rate" value={`${clinical.operationSuccessRate}%`} trend="up" trendValue={0.2} icon={ShieldCheck} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Patient Volume Trend (Last 30 Days)</h3>
          <Chart 
            options={lineOptions} 
            series={[
              { name: 'OPD Visits', data: clinical.admissionsTrend.map((t: any) => t.opd) },
              { name: 'IPD Admissions', data: clinical.admissionsTrend.map((t: any) => t.ipd) },
              { name: 'Emergency', data: clinical.admissionsTrend.map((t: any) => t.emergency) }
            ]} 
            type="area" 
            height={320} 
          />
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Bed Occupancy Breakdown</h3>
          <Chart 
            options={barOptions} 
            series={[
              { name: 'Occupied', data: clinical.bedOccupancy.map((b: any) => b.occupied) }
            ]} 
            type="bar" 
            height={320} 
          />
        </div>
      </div>

      {/* Clinical Performance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-800">Top Departments by Clinical Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="py-4 px-6">Department</th>
                <th className="py-4 px-6">Patient Volume</th>
                <th className="py-4 px-6">Avg Length of Stay (Days)</th>
                <th className="py-4 px-6">Mortality Rate</th>
                <th className="py-4 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((dept, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 font-medium text-slate-800">{dept.name}</td>
                  <td className="py-4 px-6 text-slate-600">{dept.patients.toLocaleString()}</td>
                  <td className="py-4 px-6 text-slate-600">{dept.alos}</td>
                  <td className="py-4 px-6 text-slate-600">{dept.mortality}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      dept.status === 'Excellent' ? 'bg-emerald-100 text-emerald-700' :
                      dept.status === 'Good' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {dept.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
