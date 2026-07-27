
import Chart from 'react-apexcharts';
import { CalendarX, Clock, FlaskConical, Receipt } from 'lucide-react';

export const OperationalAnalytics = ({ operational }: { operational: any }) => {
  const patientFlowOptions = {
    chart: { type: 'area', toolbar: { show: false } },
    colors: ['#0ea5e9'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 100] } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: operational.patientFlow.map((t: any) => t.hour) },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    tooltip: { theme: 'light' }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-800">Operational Efficiency</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 text-sm font-medium">Wait Time</p>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h4 className="text-2xl font-bold text-slate-800">{operational.waitingPatients}</h4>
            <p className="text-xs text-slate-400 mt-1">Patients in queue</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 text-sm font-medium">Cancellations</p>
            <CalendarX className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h4 className="text-2xl font-bold text-slate-800">{operational.cancelledAppointments}</h4>
            <p className="text-xs text-slate-400 mt-1">Appointments cancelled</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 text-sm font-medium">Lab TAT</p>
            <FlaskConical className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <h4 className="text-2xl font-bold text-slate-800">{operational.labTurnaroundTime}m</h4>
            <p className="text-xs text-slate-400 mt-1">Avg turnaround time</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 text-sm font-medium">Billing TAT</p>
            <Receipt className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h4 className="text-2xl font-bold text-slate-800">{operational.averageBillingTime}m</h4>
            <p className="text-xs text-slate-400 mt-1">Avg billing processing</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <h4 className="font-bold text-slate-800 mb-6">Patient Flow Analysis (Peak Hours)</h4>
        <div className="h-80 w-full">
          <Chart 
            options={patientFlowOptions as any} 
            series={[{ name: 'Patient Volume', data: operational.patientFlow.map((t: any) => t.patients) }]} 
            type="area" 
            height="100%" 
          />
        </div>
      </div>
    </div>
  );
};
