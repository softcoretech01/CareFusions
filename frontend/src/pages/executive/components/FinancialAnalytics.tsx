
import Chart from 'react-apexcharts';
import { CreditCard, ArrowUpRight, Wallet, Receipt } from 'lucide-react';

const FinCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
    <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
      <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-').replace('-500', '-600')}`} />
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
      <h4 className="text-xl font-bold text-slate-800">
        ₹{(value / 100000).toFixed(2)}L
      </h4>
    </div>
  </div>
);

export const FinancialAnalytics = ({ revenue, detailed = false }: { revenue: any, detailed?: boolean }) => {
  const trendOptions = {
    chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false }, sparkline: { enabled: !detailed } },
    colors: ['#4f46e5'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: revenue.trend.map((t: any) => t.date), labels: { show: detailed } },
    yaxis: { show: detailed },
    grid: { show: detailed, borderColor: '#f1f5f9', strokeDashArray: 4 },
    tooltip: { theme: 'light' }
  };

  const deptOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    colors: ['#6366f1'],
    plotOptions: { bar: { borderRadius: 4, horizontal: true } },
    dataLabels: { enabled: false },
    xaxis: { categories: revenue.byDepartment.map((d: any) => d.name) },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
  };

  const paymentOptions = {
    chart: { type: 'donut' },
    labels: revenue.byPaymentMode.map((p: any) => p.name),
    colors: ['#4f46e5', '#10b981', '#f59e0b', '#6366f1'],
    plotOptions: { pie: { donut: { size: '70%' } } },
    dataLabels: { enabled: false },
    legend: { position: 'bottom' }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-800">Financial Performance</h3>
        {detailed && (
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">Export PDF</button>
          </div>
        )}
      </div>

      {detailed && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FinCard title="Total Collections" value={revenue.collections} icon={Wallet} color="bg-emerald-500" />
          <FinCard title="Outstanding" value={revenue.outstanding} icon={Receipt} color="bg-rose-500" />
          <FinCard title="Insurance Pending" value={revenue.insurancePending} icon={ShieldCheck} color="bg-amber-500" />
          <FinCard title="Operating Expenses" value={revenue.operatingExpenses} icon={CreditCard} color="bg-blue-500" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h4 className="font-bold text-slate-800">Revenue Trend (30 Days)</h4>
              <p className="text-sm text-slate-500">Actual vs Target</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-slate-800">₹{(revenue.thisMonth / 10000000).toFixed(2)}Cr</span>
              <div className="flex items-center gap-1 text-emerald-500 text-sm font-bold justify-end">
                <ArrowUpRight className="w-4 h-4" /> 10.5%
              </div>
            </div>
          </div>
          <div className="h-72 w-full">
            <Chart options={trendOptions as any} series={[{ name: 'Revenue', data: revenue.trend.map((t: any) => t.value) }]} type="area" height="100%" />
          </div>
        </div>

        {/* Payment Modes / Distribution */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <h4 className="font-bold text-slate-800 mb-6">Revenue by Payment Mode</h4>
          <div className="flex-1 flex items-center justify-center">
            <Chart options={paymentOptions as any} series={revenue.byPaymentMode.map((p: any) => p.value)} type="donut" width="100%" />
          </div>
        </div>

        {/* Department Performance */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <h4 className="font-bold text-slate-800 mb-6">Department Revenue Analysis</h4>
          <div className="h-80 w-full">
            <Chart options={deptOptions as any} series={[{ name: 'Revenue', data: revenue.byDepartment.map((d: any) => d.value) }]} type="bar" height="100%" />
          </div>
        </div>

      </div>
    </div>
  );
};
// Add a temporary import fix for ShieldCheck in FinCard usage
import { ShieldCheck } from 'lucide-react';
