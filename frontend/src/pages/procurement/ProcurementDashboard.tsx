import { useState } from 'react';
import { BarChart2, PieChart, TrendingUp, Activity, ShoppingCart, FileText, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { DateFilter } from '../../components/ui/DateFilter';
import { initialPRs } from './PurchaseRequisitions';
import { initialPOs } from './PurchaseOrders';
import { initialGRNs } from './GoodsReceipt';
import { mockData as itemsMock } from '../admin/purchase-inventory/ItemMaster';
import { useLocalStorage } from '../../utils/useLocalStorage';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

export const ProcurementDashboard = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
  };

  const [prs] = useLocalStorage('procurement_prs', initialPRs);
  const [pos] = useLocalStorage('procurement_pos', initialPOs);
  const [grns] = useLocalStorage('procurement_grns', initialGRNs);

  const totalPRs = prs.length;
  const totalPOs = pos.length;
  const totalGRNs = grns.length;
  const totalSpend = pos.reduce((sum: number, po: any) => sum + po.totalAmount, 0);

  // Spend by Category
  const categorySpend = pos.reduce((acc: any, po: any) => {
    po.items.forEach((item: any) => {
      const itm = itemsMock.find((i: any) => i.id === item.itemId);
      const cat = itm?.category || 'Other';
      acc[cat] = (acc[cat] || 0) + item.amount;
    });
    return acc;
  }, {});

  const totalCatSpend = Object.values(categorySpend).reduce((a: any, b: any) => a + b, 0) || 1;
  const categoryColors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-slate-400', 'bg-pink-500', 'bg-indigo-500'];
  const spendByCategoryData = Object.entries(categorySpend)
    .sort((a: any, b: any) => b[1] - a[1])
    .map(([label, value]: [string, any], index) => ({
      label,
      value: Math.round(((value as number) / (totalCatSpend as number)) * 100),
      color: categoryColors[index % categoryColors.length]
    }));

  // Vendor Performance
  const vendorStats = pos.reduce((acc: any, po: any) => {
    if (!acc[po.vendorName]) {
      acc[po.vendorName] = { name: po.vendorName, po: 0, fulfill: 95 + Math.floor(Math.random() * 5), qs: (4.0 + Math.random()).toFixed(1) };
    }
    acc[po.vendorName].po += 1;
    return acc;
  }, {});
  const topVendors = Object.values(vendorStats).sort((a: any, b: any) => b.po - a.po).slice(0, 5);

  const trendOptions: ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, fontFamily: 'Inter' },
    colors: ['#3b82f6', '#10b981'],
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] },
    dataLabels: { enabled: false },
    legend: { position: 'top' },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 100]
      }
    }
  };
  
  const trendSeries = [
    { name: 'POs Issued', data: [12, 19, 15, 25, 22, 30] },
    { name: 'GRNs Received', data: [10, 15, 14, 20, 20, 28] }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col overflow-auto">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center text-sm text-slate-500 mb-2">
            <span>Procurement</span>
            <span className="mx-2">/</span>
            <span className="text-primary font-medium">Dashboard</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Procurement Dashboard</h1>
        </div>
        <div className="flex flex-col items-end gap-3">
          <DateFilter
            dateFrom={fromDate}
            dateTo={toDate}
            onDateFromChange={setFromDate}
            onDateToChange={setToDate}
            onSearch={() => {}}
            onReset={handleClearFilters}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-blue-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="flex justify-between items-start mb-2 relative z-10">
            <FileText className="w-6 h-6 text-blue-500" />
            <div className="flex items-end gap-1 h-6">
              {[40, 70, 45, 90, 65, 85].map((h, i) => <div key={i} className="w-1.5 bg-blue-200 rounded-t-sm" style={{height: `${h}%`}}></div>)}
            </div>
          </div>
          <h3 className="text-xs font-medium text-slate-500 relative z-10">Total PRs Created</h3>
          <div className="text-2xl font-bold text-slate-800 mt-1 relative z-10">{totalPRs}</div>
          <div className="flex items-center gap-1 text-xs text-emerald-500 mt-1 font-medium relative z-10">
            <TrendingUp className="w-3 h-3" /> Based on local data
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-purple-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="flex justify-between items-start mb-2 relative z-10">
            <ShoppingCart className="w-6 h-6 text-purple-500" />
            <div className="flex items-end gap-1 h-6">
              {[30, 50, 40, 60, 80, 75].map((h, i) => <div key={i} className="w-1.5 bg-purple-200 rounded-t-sm" style={{height: `${h}%`}}></div>)}
            </div>
          </div>
          <h3 className="text-xs font-medium text-slate-500 relative z-10">Purchase Orders Issued</h3>
          <div className="text-2xl font-bold text-slate-800 mt-1 relative z-10">{totalPOs}</div>
          <div className="flex items-center gap-1 text-xs text-emerald-500 mt-1 font-medium relative z-10">
            <TrendingUp className="w-3 h-3" /> Based on local data
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="flex justify-between items-start mb-2 relative z-10">
            <Package className="w-6 h-6 text-emerald-500" />
            <div className="flex items-end gap-1 h-6">
              {[20, 40, 60, 50, 70, 90].map((h, i) => <div key={i} className="w-1.5 bg-emerald-200 rounded-t-sm" style={{height: `${h}%`}}></div>)}
            </div>
          </div>
          <h3 className="text-xs font-medium text-slate-500 relative z-10">Goods Received (GRN)</h3>
          <div className="text-2xl font-bold text-slate-800 mt-1 relative z-10">{totalGRNs}</div>
          <div className="flex items-center gap-1 text-xs text-emerald-500 mt-1 font-medium relative z-10">
            <TrendingUp className="w-3 h-3" /> Based on local data
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-20 h-20 bg-amber-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <div className="flex justify-between items-start mb-2 relative z-10">
            <Activity className="w-6 h-6 text-amber-500" />
            <div className="flex items-end gap-1 h-6">
              {[80, 60, 90, 70, 85, 95].map((h, i) => <div key={i} className="w-1.5 bg-amber-200 rounded-t-sm" style={{height: `${h}%`}}></div>)}
            </div>
          </div>
          <h3 className="text-xs font-medium text-slate-500 relative z-10">Total Spend (₹)</h3>
          <div className="text-2xl font-bold text-slate-800 mt-1 relative z-10">{totalSpend.toLocaleString()}</div>
          <div className="flex items-center gap-1 text-xs text-emerald-500 mt-1 font-medium relative z-10">
            <TrendingUp className="w-3 h-3" /> Based on local data
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Monthly Procurement Trend</h3>
              <p className="text-sm text-slate-500">POs Issued vs GRNs Received</p>
            </div>
            <Activity className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1 min-h-[300px]">
            <Chart options={trendOptions} series={trendSeries} type="area" height="100%" />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Top Vendor Performance</h3>
              <PieChart className="w-5 h-5 text-slate-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th className="text-left pb-3 font-medium">Vendor</th>
                    <th className="text-right pb-3 font-medium">POs</th>
                    <th className="text-right pb-3 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {topVendors.length === 0 ? (
                    <tr><td colSpan={3} className="py-4 text-center text-sm text-slate-500">No vendor data available</td></tr>
                  ) : topVendors.map((v: any) => (
                    <tr key={v.name}>
                      <td className="py-3 font-medium text-slate-700">{v.name}</td>
                      <td className="py-3 text-right">{v.po}</td>
                      <td className="py-3 text-right text-emerald-600 font-medium">{v.qs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Spend by Category</h3>
              <BarChart2 className="w-5 h-5 text-slate-400" />
            </div>
            <div className="space-y-4">
              {spendByCategoryData.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-4">No data available</div>
              ) : spendByCategoryData.slice(0, 4).map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 truncate pr-2">{item.label}</span>
                    <span className="text-slate-500 shrink-0">{item.value}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
