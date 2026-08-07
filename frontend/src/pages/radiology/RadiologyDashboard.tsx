import { useState } from 'react';
import { useInvestigations } from '../../contexts/InvestigationContext';
import { ScanLine, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { DateFilter } from '../../components/ui/DateFilter';

export const RadiologyDashboard = () => {
  const { orders } = useInvestigations();

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const radOrders = orders.filter(o => o.category === 'Radiology');

  const filteredOrders = radOrders.filter(order => {
    if (activeFilter === 'Completed' && order.status !== 'Completed') return false;
    if (activeFilter === 'Pending' && order.status === 'Completed') return false;
    if (activeFilter === 'Critical Findings' && !order.tests.some(t => t.isCritical)) return false;

    if (fromDate && new Date(order.orderedAt) < new Date(fromDate)) return false;
    if (toDate && new Date(order.orderedAt) > new Date(toDate + 'T23:59:59')) return false;

    return true;
  });

  const totalOrders = filteredOrders.length;
  const completedOrders = filteredOrders.filter(o => o.status === 'Completed').length;
  const pendingOrders = filteredOrders.filter(o => o.status !== 'Completed').length;

  const criticalFindings = filteredOrders.reduce((sum, order) => {
    return sum + order.tests.filter(test => test.isCritical).length;
  }, 0);

  const donutOptions = {
    chart: { type: 'donut' as const, fontFamily: 'inherit' },
    colors: ['#a855f7', '#10b981', '#f59e0b'],
    labels: ['Pending', 'Completed', 'Partial'],
    legend: { position: 'bottom' as const },
    dataLabels: { enabled: true },
    plotOptions: { pie: { donut: { size: '65%' } } },
    stroke: { show: false }
  };

  const donutSeries = [
    radOrders.filter(o => o.status === 'Pending').length,
    completedOrders,
    radOrders.filter(o => o.status === 'Partial').length
  ];

  const stats = [
    { label: 'Total Scans', value: totalOrders, icon: ScanLine, color: 'bg-purple-100 text-purple-600' },
    { label: 'Completed', value: completedOrders, icon: CheckCircle, color: 'bg-green-100 text-green-600' },
    { label: 'Pending', value: pendingOrders, icon: Clock, color: 'bg-amber-100 text-amber-600' },
    { label: 'Critical Findings', value: criticalFindings, icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Radiology Dashboard</h1>
        </div>

        <div className="flex justify-end">
          <DateFilter
            dateFrom={fromDate}
            dateTo={toDate}
            onDateFromChange={setFromDate}
            onDateToChange={setToDate}
            onSearch={() => { }}
            onReset={() => { setFromDate(''); setToDate(''); setActiveFilter(null); }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            onClick={() => setActiveFilter(activeFilter === stat.label ? null : stat.label)}
            className={`bg-white p-5 rounded-xl shadow-sm flex items-center justify-between cursor-pointer transition-all duration-200 border ${activeFilter === stat.label ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-300'
              }`}
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
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-base font-bold text-slate-800 mb-4">Worklist Status</h3>
          <div className="flex-1 flex items-center justify-center min-h-[250px]">
            <Chart options={donutOptions as ApexOptions} series={donutSeries} type="donut" width="100%" height={250} />
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
            <h3 className="text-base font-bold text-slate-800">
              {activeFilter ? `${activeFilter} Scans` : 'Recent Scans'}
            </h3>
            {activeFilter && (
              <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md">
                Filtered View
              </span>
            )}
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase">
              <tr>
                <th className="px-6 py-3">Order ID</th>
                <th className="px-6 py-3">Patient</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Scans</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.slice(0, 5).map(order => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono font-medium text-slate-900">{order.id}</td>
                  <td className="px-6 py-3">
                    <div className="text-slate-800 font-medium">{order.patientName}</div>
                    <div className="text-slate-500 text-xs">{order.patientId}</div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase ${order.type === 'IP' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                      {order.type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-500">{order.tests.length} scans</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase ${order.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        order.status === 'Partial' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                      }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">No recent orders</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
