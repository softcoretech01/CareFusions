import { motion } from 'framer-motion';
import { Building2, Users, Stethoscope, Pill, Microscope, ShieldCheck, UserCog, Settings, FileText } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

const kpis = [
  { label: 'Total Hospitals', value: '14', icon: Building2, color: 'text-primary', bg: 'bg-primary/10' },
  { label: 'Total Doctors', value: '1,420', icon: Stethoscope, color: 'text-secondary', bg: 'bg-secondary/10' },
  { label: 'Employees', value: '4,850', icon: Users, color: 'text-success', bg: 'bg-success/10' },
  { label: 'Medicines', value: '12,500', icon: Pill, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { label: 'Lab Tests', value: '850', icon: Microscope, color: 'text-warning', bg: 'bg-warning/10' },
  { label: 'Insurances', value: '120', icon: ShieldCheck, color: 'text-info', bg: 'bg-info/10' },
  { label: 'System Users', value: '8,420', icon: UserCog, color: 'text-danger', bg: 'bg-danger/10' },
  { label: 'Master Configs', value: '45', icon: Settings, color: 'text-slate-500', bg: 'bg-slate-500/10' },
];

const barOptions: ApexOptions = {
  chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter' },
  colors: ['#2563EB'],
  plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
  xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'] },
  dataLabels: { enabled: false },
};

const donutOptions: ApexOptions = {
  chart: { type: 'donut', fontFamily: 'Inter' },
  colors: ['#2563EB', '#22C55E', '#F59E0B', '#06B6D4', '#8b5cf6'],
  labels: ['Doctors', 'Nurses', 'Pharmacists', 'Lab Techs', 'Admins'],
  dataLabels: { enabled: false },
  legend: { position: 'bottom' },
  stroke: { width: 0 }
};

export const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Masters Dashboard</h1>
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
              className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-foreground">{kpi.value}</h3>
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
          className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 shadow-sm"
        >
          <h3 className="font-bold text-lg text-foreground mb-4">Masters Created by Month</h3>
          <Chart options={barOptions} series={[{ name: 'Created', data: [45, 52, 38, 65, 48, 85, 92] }]} type="bar" height={300} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col"
        >
          <h3 className="font-bold text-lg text-foreground mb-4">System Role Distribution</h3>
          <div className="flex-1 flex items-center justify-center">
            <Chart options={donutOptions} series={[44, 55, 13, 22, 10]} type="donut" height={300} />
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-card rounded-2xl border border-border p-6 shadow-sm"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-foreground">Recently Modified Masters</h3>
            <button className="text-primary text-sm font-semibold hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {[
              { title: 'Medicine Database', user: 'Admin User', time: '10 mins ago', type: 'Pharmacy' },
              { title: 'Cardiology Department', user: 'System', time: '1 hour ago', type: 'Organization' },
              { title: 'Dr. John Doe Profile', user: 'HR Admin', time: '3 hours ago', type: 'Employee' },
              { title: 'MRI Scan Pricing', user: 'Billing Admin', time: '5 hours ago', type: 'Radiology' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                <div className="p-3 bg-blue-50 text-primary rounded-xl"><FileText className="w-5 h-5" /></div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-slate-800">{item.title}</h4>
                  <p className="text-xs text-slate-500 font-medium">{item.type} • Modified by {item.user}</p>
                </div>
                <div className="text-xs font-semibold text-slate-400">{item.time}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
          className="bg-card rounded-2xl border border-border p-6 shadow-sm"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-foreground">System Health</h3>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="text-slate-600">Database Synchronization</span>
                <span className="text-success">98%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-success h-2 rounded-full" style={{ width: '98%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="text-slate-600">API Gateway Status</span>
                <span className="text-primary">100%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="text-slate-600">Master Config Migration</span>
                <span className="text-warning">65%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-warning h-2 rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  );
};
