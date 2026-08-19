import { Outlet } from 'react-router-dom';
import { ProcurementSidebar } from './ProcurementSidebar';
import { ProcurementProvider } from '../contexts/ProcurementContext';

export const ProcurementLayout = () => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = 'Procurement Manager';

  return (
    <ProcurementProvider>
    <div className="flex h-screen bg-slate-50 font-inter overflow-hidden">
      <ProcurementSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
          <div className="hidden md:block shrink-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{greeting}</p>
            <p className="text-lg font-bold text-slate-800 leading-tight">{name}</p>
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
