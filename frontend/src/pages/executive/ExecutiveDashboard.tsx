import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Bell, Bot, Download, User, Activity, DollarSign, Stethoscope, Settings, Package, ShieldCheck, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { useExecutiveData } from './hooks/useExecutiveData';
import { KPISection } from './components/KPISection';
import { FinancialAnalytics } from './components/FinancialAnalytics';
import { ClinicalAnalytics } from './components/ClinicalAnalytics';
import { OperationalAnalytics } from './components/OperationalAnalytics';
import { InventoryProcurementAnalytics } from './components/InventoryProcurementAnalytics';
import { HRQualityAnalytics } from './components/HRQualityAnalytics';
import { AIInsights } from './components/AIInsights';

export const ExecutiveDashboard = () => {
  const data = useExecutiveData();
  const [activeTab, setActiveTab] = useState('Overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const tabs = [
    { id: 'Overview', icon: Activity },
    { id: 'Financial', icon: DollarSign },
    { id: 'Clinical', icon: Stethoscope },
    { id: 'Operational', icon: Settings },
    { id: 'Inventory & Procurement', icon: Package },
    { id: 'HR & Quality', icon: ShieldCheck },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden font-sans">
      
      {/* Global Header */}
      <header className="bg-primary text-white px-6 py-4 flex items-center justify-between shadow-lg z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold text-xl shadow-inner text-white">
            CF
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide">Care Fusions Command Center</h1>
            <p className="text-xs text-white/70">Enterprise Executive Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-4 bg-white/10 rounded-full px-4 py-1.5 border border-white/20">
            <div className="flex items-center gap-2 border-r border-white/20 pr-4">
              <Building2 className="w-4 h-4 text-white/70" />
              <select className="bg-transparent text-sm focus:outline-none text-white cursor-pointer">
                <option value="main">Main Hospital</option>
                <option value="branch1">North Branch</option>
                <option value="branch2">South Clinic</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white">FY 2026-2027</span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-l border-white/20 pl-6">
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors relative">
              <Bell className="w-5 h-5 text-white/90" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-secondary rounded-full border-2 border-primary"></span>
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Bot className="w-5 h-5 text-secondary" />
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <Download className="w-5 h-5 text-white/90" />
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors border border-white/20 ml-2">
              <User className="w-5 h-5 text-white/90" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Main Dashboard Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 pb-24 scroll-smooth">
          
          {/* Sub Header & AI Insights */}
          <div className="mb-8">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Executive Dashboard</h2>
                <p className="text-slate-500 mt-1">Real-time consolidated intelligence across all hospital modules.</p>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-sm font-medium"
              >
                <Filter className="w-4 h-4" /> Filters
              </button>
            </div>
            
            {/* AI Summary Banner */}
            <AIInsights alerts={data.alerts} />
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide border-b border-slate-200">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-semibold text-sm transition-all whitespace-nowrap border-b-2 ${
                  activeTab === tab.id 
                    ? 'border-primary text-primary bg-primary/5' 
                    : 'border-transparent text-slate-500 hover:text-foreground hover:bg-slate-100'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-primary' : 'text-slate-400'}`} />
                {tab.id}
              </button>
            ))}
          </div>

          {/* Tab Content Rendering */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {activeTab === 'Overview' && (
                <>
                  <KPISection data={data} />
                  <FinancialAnalytics revenue={data.revenue} />
                  <ClinicalAnalytics clinical={data.clinical} />
                </>
              )}
              {activeTab === 'Financial' && <FinancialAnalytics revenue={data.revenue} detailed />}
              {activeTab === 'Clinical' && <ClinicalAnalytics clinical={data.clinical} detailed />}
              {activeTab === 'Operational' && <OperationalAnalytics operational={data.operational} />}
              {activeTab === 'Inventory & Procurement' && <InventoryProcurementAnalytics inventory={data.inventory} />}
              {activeTab === 'HR & Quality' && <HRQualityAnalytics hr={data.hr} />}
            </motion.div>
          </AnimatePresence>

        </main>

        {/* Right Filter Sidebar (Sticky) */}
        <aside className={`w-80 bg-white border-l border-border overflow-y-auto hidden lg:block`}>
          <div className="p-6 sticky top-0">
            <div className="flex items-center gap-2 font-bold text-foreground mb-6">
              <Filter className="w-5 h-5 text-primary" />
              Executive Filters
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Date Range</label>
                <input type="date" className="w-full mb-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
                <input type="date" className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Department</label>
                <select className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-500">
                  <option>All Departments</option>
                  <option>Cardiology</option>
                  <option>Oncology</option>
                  <option>Neurology</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Doctor</label>
                <select className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-500">
                  <option>All Doctors</option>
                  <option>Dr. Sarah Jenkins</option>
                  <option>Dr. Michael Chen</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Insurance</label>
                <select className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-500">
                  <option>All Insurance</option>
                  <option>Star Health</option>
                  <option>HDFC Ergo</option>
                </select>
              </div>
            </div>

            <button className="w-full mt-8 bg-primary text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors">
              Apply Filters
            </button>
            <button className="w-full mt-3 bg-white text-slate-600 font-semibold py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
              Reset
            </button>
          </div>
        </aside>

      </div>
    </div>
  );
};
