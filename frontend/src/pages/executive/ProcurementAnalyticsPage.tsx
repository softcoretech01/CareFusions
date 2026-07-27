import { useState } from 'react';
import { DateFilter } from '../../components/ui/DateFilter';
import { useExecutiveData } from './hooks/useExecutiveData';
import { TrendingUp, TrendingDown, ShoppingCart, Truck, Clock, DollarSign } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

const ProcurementKPICard = ({ title, value, subValue, trend, trendValue, icon: Icon }: any) => (
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

export const ProcurementAnalyticsPage = () => {
  const data = useExecutiveData();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const procurement = data.inventory.procurement;

  const lineOptions: ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, fontFamily: 'Inter' },
    colors: ['#01684c'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.2, opacityTo: 0.05, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], labels: { style: { colors: '#64748b' } } },
    yaxis: { labels: { formatter: (val) => `${val} Days`, style: { colors: '#64748b' } } }
  };

  const topVendors = [
    { name: 'Apollo Pharmacy Supplies', spend: 14500000, items: 1420, performance: 98, status: 'Premium' },
    { name: 'Medtronic India', spend: 8200000, items: 45, performance: 95, status: 'Premium' },
    { name: 'Johnson & Johnson', spend: 6400000, items: 120, performance: 92, status: 'Standard' },
    { name: 'GE Healthcare', spend: 4500000, items: 12, performance: 96, status: 'Premium' },
    { name: 'Local Surgicals Pvt Ltd', spend: 1200000, items: 850, performance: 78, status: 'Warning' },
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Procurement Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Supply chain efficiency, vendor performance, and purchase cycles.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <ProcurementKPICard title="Pending PRs" value={procurement.pendingPR} trend="down" trendValue={4.2} icon={ShoppingCart} />
        <ProcurementKPICard title="Pending POs" value={procurement.pendingPO} trend="down" trendValue={2.1} icon={Truck} />
        <ProcurementKPICard title="Vendor Performance" value={`${procurement.vendorPerformance}%`} trend="up" trendValue={1.5} icon={TrendingUp} />
        <ProcurementKPICard title="Avg Procurement Cycle" value={`${procurement.averageCycle} Days`} trend="down" trendValue={1.2} icon={Clock} />
        <ProcurementKPICard title="Purchase Savings" value={formatINR(procurement.purchaseSavings)} trend="up" trendValue={8.4} icon={DollarSign} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Average Cycle Time (YTD)</h3>
          <Chart options={lineOptions} series={[{ name: 'Days', data: [18, 16, 17, 15, 14, 14] }]} type="area" height={320} />
        </div>
        
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-800">Top Vendors by Spend</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-4 px-6">Vendor Name</th>
                  <th className="py-4 px-6">Total Spend (YTD)</th>
                  <th className="py-4 px-6">Items Supplied</th>
                  <th className="py-4 px-6">Performance %</th>
                  <th className="py-4 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topVendors.map((vendor, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 font-medium text-slate-800">{vendor.name}</td>
                    <td className="py-4 px-6 text-slate-600">{formatINR(vendor.spend)}</td>
                    <td className="py-4 px-6 text-slate-600">{vendor.items.toLocaleString()}</td>
                    <td className="py-4 px-6 text-slate-600">{vendor.performance}%</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        vendor.status === 'Premium' ? 'bg-emerald-100 text-emerald-700' :
                        vendor.status === 'Standard' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {vendor.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
