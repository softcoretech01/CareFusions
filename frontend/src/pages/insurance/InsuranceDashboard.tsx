import { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, Ban, Clock, CheckCircle, IndianRupee, TrendingUp } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

const kpis = [
  { label: 'Pending Pre-Auths', value: '18', icon: ClipboardCheck, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { label: 'Claims Under Review', value: '124', icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { label: 'Pending Appeals', value: '8', icon: Ban, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { label: 'Total Revenue MTD', value: '₹4.2M', icon: IndianRupee, color: 'text-teal-500', bg: 'bg-teal-500/10' },
];

const barOptions: ApexOptions = {
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter' },
  colors: ['#22C55E', '#EF4444'],
  plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
  xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] },
  dataLabels: { enabled: false },
  stroke: { show: true, width: 2, colors: ['transparent'] },
  legend: { position: 'top' },
};

const barSeries = [
  { name: 'Approved Claims', data: [120, 150, 180, 160, 210, 190] },
  { name: 'Denied Claims', data: [15, 20, 12, 25, 18, 14] }
];

const donutOptions: ApexOptions = {
  chart: { type: 'donut', fontFamily: 'Inter' },
  colors: ['#2563EB', '#8b5cf6', '#F59E0B', '#06B6D4', '#22C55E'],
  labels: ['Star Health', 'HDFC ERGO', 'ICICI Lombard', 'Care Health', 'Others'],
  dataLabels: { enabled: false },
  legend: { position: 'bottom' },
  stroke: { width: 0 }
};

export const InsuranceDashboard = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Insurance & Claims Dashboard</h1>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-600 font-medium"
              />
              <span className="text-slate-400 text-sm font-medium">to</span>
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-600 font-medium"
              />
            </div>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <button className="px-5 py-1.5 bg-primary text-white rounded-xl text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors">
                Search
              </button>
              <button 
                onClick={handleClearFilters}
                className="px-5 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
              key={kpi.label}
              className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-slate-800">{kpi.value}</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">{kpi.label}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-800">Approval vs Denial Trends</h3>
            <span className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +12% Approval Rate
            </span>
          </div>
          <Chart options={barOptions} series={barSeries} type="bar" height={300} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col"
        >
          <h3 className="font-bold text-lg text-slate-800 mb-4">Top TPAs / Insurers by Volume</h3>
          <div className="flex-1 flex items-center justify-center">
            <Chart options={donutOptions} series={[35, 25, 20, 15, 5]} type="donut" height={300} />
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800">Recent Claim Settlements</h3>
          <button className="text-primary text-sm font-bold hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left">Claim ID</th>
                <th className="px-6 py-3 text-left">Patient Name</th>
                <th className="px-6 py-3 text-left">Insurer</th>
                <th className="px-6 py-3 text-left">Claimed Amt</th>
                <th className="px-6 py-3 text-left">Settled Amt</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { id: 'CLM-2023-0891', patient: 'Rahul Sharma', insurer: 'Star Health', claimed: '₹45,000', settled: '₹42,500', status: 'Settled' },
                { id: 'CLM-2023-0885', patient: 'Priya Patel', insurer: 'HDFC ERGO', claimed: '₹1,20,000', settled: '₹1,10,000', status: 'Settled' },
                { id: 'CLM-2023-0882', patient: 'Amit Kumar', insurer: 'ICICI Lombard', claimed: '₹35,000', settled: '₹35,000', status: 'Settled' },
                { id: 'CLM-2023-0879', patient: 'Sneha Gupta', insurer: 'Care Health', claimed: '₹85,000', settled: '₹80,000', status: 'Settled' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-primary">{row.id}</span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800">{row.patient}</td>
                  <td className="px-6 py-4 font-medium text-slate-600">{row.insurer}</td>
                  <td className="px-6 py-4 text-slate-600">{row.claimed}</td>
                  <td className="px-6 py-4 font-bold text-emerald-600">{row.settled}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg flex items-center gap-1 w-max">
                      <CheckCircle className="w-3 h-3" />
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
