import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { EMRSidebar } from './EMRSidebar';
import { ClipboardList } from 'lucide-react';
import { useAppSelector } from '../hooks/redux';

const EMRTopBar = () => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = 'Admin User';

  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
      <div className="hidden md:block shrink-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{greeting}</p>
        <p className="text-lg font-bold text-slate-800 leading-tight">{name}</p>
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
