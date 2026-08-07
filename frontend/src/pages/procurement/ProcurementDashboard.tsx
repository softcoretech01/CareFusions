import { useState, useEffect } from 'react';
import { BarChart2, PieChart, TrendingUp, Activity, ShoppingCart, FileText, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { DateFilter } from '../../components/ui/DateFilter';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

const API_BASE = import.meta.env.VITE_API_URL as string;

export const ProcurementDashboard = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    totalPRs: 0,
    totalPOs: 0,
    totalGRNs: 0,
    totalSpend: 0,
    spendByCategory: [],
    topVendors: [],
    trendSeries: []
  });

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    fetchDashboardData('', '');
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (fDate?: string, tDate?: string) => {
    try {
      setLoading(true);
      const startDate = fDate !== undefined ? fDate : fromDate;
      const endDate = tDate !== undefined ? tDate : toDate;
      
      const params = new URLSearchParams();
      if (startDate) params.append('fromDate', startDate);
      if (endDate) params.append('toDate', endDate);

      const res = await fetch(`${API_BASE}/procurement-dashboard?${params.toString()}`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const totalPRs = data.totalPRs || 0;
  const totalPOs = data.totalPOs || 0;
  const totalGRNs = data.totalGRNs || 0;
  const totalSpend = data.totalSpend || 0;

  const totalCatSpend = data.spendByCategory?.reduce((a: any, b: any) => a + (Number(b.value) || 0), 0) || 1;
  const categoryColors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-slate-400', 'bg-pink-500', 'bg-indigo-500'];
  const spendByCategoryData = (data.spendByCategory || []).map((item: any, index: number) => ({
    label: item.label,
    value: Math.round(((Number(item.value) || 0) / (totalCatSpend as number)) * 100),
    color: categoryColors[index % categoryColors.length]
  }));

  const topVendors = data.topVendors || [];

  const trendOptions: ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, fontFamily: 'Inter' },
    colors: ['#3b82f6', '#10b981'],
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: (data.trendSeries || []).map((t: any) => t.month) },
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
    { name: 'POs Issued', data: (data.trendSeries || []).map((t: any) => t.pos) },
    { name: 'GRNs Received', data: (data.trendSeries || []).map((t: any) => t.grns) }
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
            onSearch={() => fetchDashboardData()}
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
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col min-w-0 overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Monthly Procurement Trend</h3>
              <p className="text-sm text-slate-500">POs Issued vs GRNs Received</p>
            </div>
            <Activity className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1 min-h-[300px] w-full relative">
            <div className="absolute inset-0">
              <Chart options={trendOptions} series={trendSeries} type="area" height="100%" width="100%" />
            </div>
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
              {loading ? (
                <div className="text-sm text-slate-500 text-center py-4">Loading...</div>
              ) : spendByCategoryData.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-4">No data available</div>
              ) : spendByCategoryData.slice(0, 4).map((item: any) => (
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
