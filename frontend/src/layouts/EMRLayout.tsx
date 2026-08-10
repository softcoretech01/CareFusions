import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { EMRSidebar } from './EMRSidebar';
import { ClipboardList, CalendarDays } from 'lucide-react';
import { LiveClock } from '../components/ui/LiveClock';
import { useAppSelector } from '../hooks/redux';

const EMRTopBar = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  return (
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
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-800">Admin User</p>
            <p className="text-[10px] font-bold tracking-wider text-primary uppercase">EMR Coordinator</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  );
};

export const EMRLayout = () => {
  const themeMode = useAppSelector((state) => state.theme.mode);
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (themeMode === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(themeMode);
    }
  }, [themeMode]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <EMRSidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <EMRTopBar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
