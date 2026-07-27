import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/billing/Sidebar';
import { Search, CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { LiveClock } from '../components/ui/LiveClock';

const BillingTopBar = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm print:hidden">
      <div className="flex items-center gap-3 mr-6">
        <div className="relative flex items-center gap-2 text-sm font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
          <CalendarDays className="w-4 h-4 text-primary" />
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-sm font-semibold text-slate-700 cursor-pointer"
          />
        </div>
        <LiveClock />
      </div>
      <div className="flex-1 max-w-xl relative mx-8">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search bills, patients..."
          className="w-full bg-slate-50 border border-slate-200 rounded-full py-2.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm placeholder:text-slate-400 font-medium"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-slate-700">Billing Manager</p>
          <p className="text-xs font-medium text-slate-500">Billing Dept</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
          BM
        </div>
      </div>
    </header>
  );
};

export const BillingLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <BillingTopBar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar print:p-0 print:overflow-visible">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
