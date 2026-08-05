import { useState } from 'react';
import { DateFilter } from '../../components/ui/DateFilter';
import { useExecutiveData } from './hooks/useExecutiveData';
import { TrendingUp, AlertTriangle, Zap, Activity } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { NoDataNotice } from './components/NoDataNotice';

export const PredictiveAnalyticsPage = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const data = useExecutiveData();
  const predictive = data.predictive;

  const lineOptions: ApexOptions = {
    chart: { type: 'line', toolbar: { show: false }, fontFamily: 'Inter' },
    colors: ['#64748b', '#01684c'],
    stroke: { curve: 'smooth', width: [2, 3], dashArray: [0, 5] },
    dataLabels: { enabled: false },
    xaxis: { categories: ['Mar', 'Apr', 'May', 'Jun (Current)', 'Jul (Predicted)', 'Aug (Predicted)'], labels: { style: { colors: '#64748b' } } },
    yaxis: { labels: { formatter: (val) => `₹${(val / 100000).toFixed(0)}L`, style: { colors: '#64748b' } } },
    legend: { position: 'top' },
    annotations: {
      xaxis: [{
        x: 'Jun (Current)',
        borderColor: '#94a3b8',
        label: { style: { color: '#fff', background: '#94a3b8' }, text: 'Today' }
      }]
    }
  };

  const formatINR = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6">
      <NoDataNotice
        title="Revenue and occupancy forecasts"
        needs="Billing history + a forecasting model"
        detail="The figures and the 85% / 92% confidence badges are fixed literals, and the forecast chart is pinned to Mar-Aug so it labels June as current regardless of today's date."
      />
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
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Predictive Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Forecast future revenue, patient volumes, and resource demands.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-primary/50 transition-colors group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 rounded-lg bg-slate-50 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold text-primary">
              85% Confidence
            </div>
          </div>
          <h4 className="text-slate-500 text-sm font-medium mb-1">Projected Revenue (Next 30 Days)</h4>
          <span className="text-2xl font-bold text-slate-800">{formatINR(predictive.revenueNextMonth)}</span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-primary/50 transition-colors group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 rounded-lg bg-slate-50 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <Activity className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold text-primary">
              92% Confidence
            </div>
          </div>
          <h4 className="text-slate-500 text-sm font-medium mb-1">Projected Bed Occupancy</h4>
          <span className="text-2xl font-bold text-slate-800">{predictive.projectedBedOccupancy}%</span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-primary/50 transition-colors group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 rounded-lg bg-rose-50 text-rose-500 transition-colors">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <h4 className="text-slate-500 text-sm font-medium mb-1">Predicted Demand Spike</h4>
          <span className="text-lg font-bold text-slate-800 leading-tight">{predictive.demandSpike}</span>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-primary/50 transition-colors group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-500 transition-colors">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <h4 className="text-slate-500 text-sm font-medium mb-1">High Workload Risk Depts</h4>
          <span className="text-lg font-bold text-slate-800 leading-tight">{predictive.highWorkloadDepts.join(', ')}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Revenue Forecast Model</h3>
        <Chart 
          options={lineOptions} 
          series={[
            { name: 'Historical Revenue', data: [31200000, 32500000, 33100000, 34500000, null, null] },
            { name: 'Predicted Revenue', data: [null, null, null, 34500000, 36200000, 38100000] }
          ]} 
          type="line" 
          height={400} 
        />
      </div>

    </div>
  );
};
