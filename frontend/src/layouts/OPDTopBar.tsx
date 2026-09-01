import { Stethoscope } from 'lucide-react';

export const OPDTopBar = () => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = 'Dr. Michael Chen';

  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
      <div className="hidden md:block shrink-0"></div>

      <div className="flex items-center gap-4">

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-slate-800">Dr. Michael Chen</p>
            <p className="text-[10px] font-bold tracking-wider text-primary uppercase">General Medicine</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary border border-primary/20">
            <Stethoscope className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  );
};
