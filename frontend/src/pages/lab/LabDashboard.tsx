import { useState } from 'react';
import { useInvestigations } from '../../contexts/InvestigationContext';
import { FlaskConical, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { DateFilter } from '../../components/ui/DateFilter';

export const LabDashboard = () => {
  const { orders } = useInvestigations();
  
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const labOrders = orders.filter(o => o.category === 'Lab');
  
  const totalOrders = labOrders.length;
  const completedOrders = labOrders.filter(o => o.status === 'Completed').length;
  const pendingOrders = labOrders.filter(o => o.status !== 'Completed').length;

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'inherit' },
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
    labels: ['Pending', 'Completed', 'Partial', 'Collected'],
    legend: { position: 'bottom' },
    dataLabels: { enabled: true },
    plotOptions: { pie: { donut: { size: '65%' } } },
    stroke: { show: false }
  };

  const donutSeries = [
    labOrders.filter(o => o.status === 'Pending').length,
    completedOrders,
    labOrders.filter(o => o.status === 'Partial').length,
    labOrders.filter(o => o.status === 'Sample Collected' || o.status === 'Sample Accepted').length
  ];

  const tatOptions: ApexOptions = {
    chart: { type: 'bar', fontFamily: 'inherit', toolbar: { show: false } },
    colors: ['#6366f1'],
    plotOptions: { bar: { borderRadius: 4, horizontal: true } },
    dataLabels: { enabled: false },
    xaxis: { categories: ['Hematology', 'Biochemistry', 'Microbiology', 'Pathology'] }
  };

  const tatSeries = [{ name: 'Avg TAT (Hours)', data: [4.2, 2.5, 24.0, 6.5] }];

  const volumeOptions: ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, fontFamily: 'inherit' },
    colors: ['#6366f1'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.1, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }
  };
  const volumeSeries = [{ name: 'Test Volume', data: [15, 25, 20, 30, 45, 35, 10] }];

  const criticalAlerts = labOrders.flatMap(order => 
    order.tests.filter(test => test.isCritical).map(test => ({
      orderId: order.id,
      patientName: order.patientName,
      testName: test.name,
      value: test.resultValue,
      time: test.completedAt
    }))
  );

  const stats = [
    { label: 'Total Orders', value: totalOrders, icon: FlaskConical, color: 'bg-blue-100 text-blue-600' },
    { label: 'Completed', value: completedOrders, icon: CheckCircle, color: 'bg-green-100 text-green-600' },
    { label: 'Pending/Processing', value: pendingOrders, icon: Clock, color: 'bg-amber-100 text-amber-600' },
    { label: 'Critical Alerts', value: criticalAlerts.length, icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
  ];

  const filteredOrders = labOrders.filter(order => {
    if (activeFilter === 'Completed' && order.status !== 'Completed') return false;
    if (activeFilter === 'Pending/Processing' && order.status === 'Completed') return false;
    if (activeFilter === 'Critical Alerts' && !order.tests.some(t => t.isCritical)) return false;
    
    if (fromDate && new Date(order.orderedAt) < new Date(fromDate)) return false;
    if (toDate && new Date(order.orderedAt) > new Date(toDate + 'T23:59:59')) return false;

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Laboratory Dashboard</h1>
        </div>

        <div className="flex justify-end">
          <DateFilter 
            dateFrom={fromDate}
            dateTo={toDate}
            onDateFromChange={setFromDate}
            onDateToChange={setToDate}
            onSearch={() => {}}
            onReset={() => { setFromDate(''); setToDate(''); }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div 
            key={stat.label} 
            onClick={() => setActiveFilter(activeFilter === stat.label ? null : stat.label)}
            className={`bg-white p-5 rounded-xl border ${activeFilter === stat.label ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'border-slate-200 shadow-sm'} flex items-center justify-between cursor-pointer hover:border-indigo-300 transition-all`}
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
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">Order Status</h3>
          <div className="h-64">
            <Chart options={donutOptions} series={donutSeries} type="donut" height="100%" />
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">
              {activeFilter === 'Total Orders' ? 'All Orders' : 
               activeFilter === 'Critical Alerts' ? 'Orders with Critical Alerts' :
               activeFilter ? `${activeFilter} Orders` : 'Recent Orders'}
            </h3>
            {activeFilter && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-bold">Filtered by: {activeFilter}</span>
            )}
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Order ID</th>
                <th className="px-6 py-3">Patient</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Tests</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                    No lab order records were found. Create or import lab orders from the patient visit screens to begin.
                  </td>
                </tr>
              ) : filteredOrders.slice(0, 5).map(order => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono font-medium text-slate-900">{order.id}</td>
                  <td className="px-6 py-3">{order.patientName}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase ${
                      order.type === 'IP' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {order.type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-500">{order.tests.length} tests</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase ${
                      order.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                      order.status === 'Partial' ? 'bg-amber-100 text-amber-700' : 
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">Average Turnaround Time (TAT)</h3>
          <div className="h-64">
            <Chart options={tatOptions} series={tatSeries} type="bar" height="100%" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">Test Volume Trend</h3>
          <div className="h-64">
            <Chart options={volumeOptions} series={volumeSeries} type="area" height="100%" />
          </div>
        </div>
      </div>
    </div>
  );
};
