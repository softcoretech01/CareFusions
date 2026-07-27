import { useState } from 'react';
import { DateFilter } from '../../components/ui/DateFilter';
import { useExecutiveData } from './hooks/useExecutiveData';
import { TrendingUp, TrendingDown, DollarSign, Activity, Users, Bed, AlertTriangle, ShieldCheck, Heart, Crosshair } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

const OverviewKPICard = ({ title, value, subValue, trend, trendValue, icon: Icon }: any) => (
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

const formatINR = (value: number) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
};

export const ExecutiveOverview = () => {
  const data = useExecutiveData();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const radialOptions: ApexOptions = {
    chart: { type: 'radialBar', fontFamily: 'Inter' },
    plotOptions: {
      radialBar: {
        hollow: { size: '65%' },
        dataLabels: {
          name: { offsetY: -10, color: '#64748b', fontSize: '14px', fontWeight: 500 },
          value: { color: '#1e293b', fontSize: '36px', fontWeight: 800, show: true }
        }
      }
    },
    colors: ['#01684c'],
    labels: ['Hospital Score'],
  };

  const lineOptions: ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, fontFamily: 'Inter' },
    colors: ['#01684c'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.2, opacityTo: 0.05, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], labels: { style: { colors: '#64748b' } } },
    yaxis: { labels: { formatter: (val) => `₹${(val / 100000).toFixed(0)}L`, style: { colors: '#64748b' } } }
  };

  const stackedBarOptions: ApexOptions = {
    chart: { type: 'bar', stacked: true, toolbar: { show: false }, fontFamily: 'Inter' },
    colors: ['#01684c', '#0ea5e9', '#f5a623', '#8b5cf6'],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], labels: { style: { colors: '#64748b' } } },
    legend: { position: 'top' },
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
      
      {/* 8 Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewKPICard title="Today's Revenue" value={formatINR(data.revenue.today)} trend="up" trendValue={12.4} icon={DollarSign} />
        <OverviewKPICard title="Monthly Revenue" value={formatINR(data.revenue.thisMonth)} trend="up" trendValue={14.2} icon={Activity} />
        <OverviewKPICard title="Total Patients Today" value={1452} trend="up" trendValue={4.1} icon={Users} />
        <OverviewKPICard title="Admissions Today" value={124} trend="up" trendValue={2.1} icon={Bed} />
        <OverviewKPICard title="Bed Occupancy" value="82%" subValue="Total" trend="down" trendValue={1.5} icon={Heart} />
        <OverviewKPICard title="ICU Occupancy" value="92%" subValue="Critical" trend="up" trendValue={3.2} icon={AlertTriangle} />
        <OverviewKPICard title="OT Utilization" value="76%" subValue="Average" trend="up" trendValue={5.4} icon={Crosshair} />
        <OverviewKPICard title="Net Profit (MTD)" value={formatINR(data.revenue.netProfit)} trend="up" trendValue={8.5} icon={ShieldCheck} />
      </div>

      {/* Hospital Performance & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Radial */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Hospital Performance</h3>
          <p className="text-sm text-slate-500 mb-4">Overall aggregate score across all modules.</p>
          <div className="flex-1 flex items-center justify-center -my-4">
            <Chart options={radialOptions} series={[94]} type="radialBar" height={300} />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-slate-50 p-3 rounded-lg text-center">
              <p className="text-xs font-medium text-slate-500 mb-1">Financial</p>
              <p className="font-bold text-slate-800">96%</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg text-center">
              <p className="text-xs font-medium text-slate-500 mb-1">Clinical</p>
              <p className="font-bold text-slate-800">92%</p>
            </div>
          </div>
        </div>

        {/* AI Summary */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">AI Executive Summary</h3>
            <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-md">Powered by CF-AI</span>
          </div>
          <div className="flex-1 space-y-4">
            <ul className="space-y-3">
              {[
                "Revenue increased by 12% compared to last month.",
                "Emergency admissions increased by 6%.",
                "ICU occupancy reached 92%.",
                "Cardiology generated the highest revenue.",
                "Pharmacy expiry loss reduced by 18%.",
                "Procurement spending remained within budget."
              ].map((insight, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0"></div>
                  <p className="text-sm text-slate-600 leading-relaxed">{insight}</p>
                </li>
              ))}
            </ul>
          </div>
          <button className="w-full mt-6 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg text-sm hover:bg-slate-50 transition-colors">
            View Detailed Insights
          </button>
        </div>

        {/* Critical Alerts */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Critical Monitoring</h3>
          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {data.alerts.map(alert => (
              <div key={alert.id} className="p-3 border border-slate-100 rounded-lg bg-slate-50 hover:bg-white transition-colors cursor-pointer group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${alert.type === 'critical' ? 'bg-rose-500' : alert.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                    <span className={`text-xs font-bold uppercase ${alert.type === 'critical' ? 'text-rose-600' : alert.type === 'warning' ? 'text-amber-600' : 'text-blue-600'}`}>
                      {alert.type}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">10m ago</span>
                </div>
                <p className="text-sm font-medium text-slate-700 mt-2">{alert.message}</p>
                <div className="flex justify-between items-center mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">ICU Dept</span>
                  <span className="text-xs text-primary font-semibold">View Details &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Revenue Trend</h3>
          <Chart options={lineOptions} series={[{ name: 'Revenue', data: [12500000, 14200000, 13800000, 16500000, 18200000, 21500000] }]} type="area" height={320} />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Patient Flow</h3>
          <Chart 
            options={stackedBarOptions} 
            series={[
              { name: 'OP Visits', data: [850, 920, 880, 950, 1020, 750, 680] },
              { name: 'Admissions', data: [120, 140, 130, 150, 145, 90, 85] },
              { name: 'Emergency', data: [45, 55, 50, 60, 65, 80, 85] }
            ]} 
            type="bar" 
            height={320} 
          />
        </div>
      </div>

    </div>
  );
};
