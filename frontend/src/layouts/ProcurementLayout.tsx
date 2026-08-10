import { Outlet } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { LiveClock } from '../components/ui/LiveClock';
import { ProcurementSidebar } from './ProcurementSidebar';
import { ProcurementProvider } from '../contexts/ProcurementContext';

export const ProcurementLayout = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <ProcurementProvider>
    <div className="flex h-screen bg-slate-50 font-inter overflow-hidden">
      <ProcurementSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
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



          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-700">Procurement Manager</p>
              <p className="text-xs font-medium text-slate-500">Admin</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shadow-sm">
              P
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto custom-scrollbar p-8">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
    </ProcurementProvider>
  );
};
