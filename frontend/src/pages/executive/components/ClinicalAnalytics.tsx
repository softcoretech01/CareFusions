
import Chart from 'react-apexcharts';
import { Users, BedDouble, Activity, HeartPulse } from 'lucide-react';

export const ClinicalAnalytics = ({ clinical, detailed = false }: { clinical: any, detailed?: boolean }) => {
  const admissionTrendOptions = {
    chart: { type: 'area', toolbar: { show: false } },
    colors: ['#4f46e5', '#ec4899', '#f59e0b'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: clinical.admissionsTrend.map((t: any) => t.date), labels: { show: detailed } },
    yaxis: { show: detailed },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    legend: { position: 'top' },
    tooltip: { theme: 'light' }
  };

  const bedOccupancyOptions = {
    chart: { type: 'bar', stacked: true, toolbar: { show: false } },
    colors: ['#10b981', '#f1f5f9'],
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    dataLabels: { enabled: false },
    xaxis: { categories: clinical.bedOccupancy.map((b: any) => b.name) },
    grid: { show: false },
    legend: { show: false }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-800">Clinical & Patient Outcomes</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1">Mortality Rate</p>
            <h4 className="text-2xl font-bold text-slate-800">{clinical.mortalityRate}%</h4>
          </div>
          <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center"><Activity className="w-6 h-6 text-rose-500" /></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1">Avg Length of Stay</p>
            <h4 className="text-2xl font-bold text-slate-800">{clinical.averageLengthOfStay} Days</h4>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center"><BedDouble className="w-6 h-6 text-blue-500" /></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1">Operation Success</p>
            <h4 className="text-2xl font-bold text-slate-800">{clinical.operationSuccessRate}%</h4>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center"><HeartPulse className="w-6 h-6 text-emerald-500" /></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1">Discharges Today</p>
            <h4 className="text-2xl font-bold text-slate-800">{clinical.dischargesToday}</h4>
          </div>
          <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center"><Users className="w-6 h-6 text-purple-500" /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Admission Trends */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h4 className="font-bold text-slate-800 mb-6">Patient Inflow Trend</h4>
          <div className="h-80 w-full">
            <Chart 
              options={admissionTrendOptions as any} 
              series={[
                { name: 'OPD', data: clinical.admissionsTrend.map((t: any) => t.opd) },
                { name: 'IPD', data: clinical.admissionsTrend.map((t: any) => t.ipd) },
                { name: 'Emergency', data: clinical.admissionsTrend.map((t: any) => t.emergency) }
              ]} 
              type="area" 
              height="100%" 
            />
          </div>
        </div>

        {/* Bed Occupancy */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <h4 className="font-bold text-slate-800 mb-6">Bed Occupancy Status</h4>
          <div className="flex-1 w-full">
            <Chart 
              options={bedOccupancyOptions as any} 
              series={[
                { name: 'Occupied', data: clinical.bedOccupancy.map((b: any) => b.occupied) },
                { name: 'Available', data: clinical.bedOccupancy.map((b: any) => b.total - b.occupied) }
              ]} 
              type="bar" 
              height="100%" 
            />
          </div>
        </div>

      </div>
    </div>
  );
};
