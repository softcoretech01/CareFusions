import { Search } from 'lucide-react';
import { useAppSelector } from '../hooks/redux';

export const IPDTopBar = () => {
  const user = useAppSelector((s) => s.auth.user);
  const name = user?.name || 'Guest';
  const role = user?.role || 'IPD Coordinator';
  const initials = name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
      {/* Greeting — the valuable label that replaced the date/time chips */}
      <div className="hidden md:block shrink-0"></div>

      <div className="flex-1 max-w-xl relative mx-8">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search patient by UHID, Name, or IPD No..."
          className="w-full bg-slate-50 border border-slate-200 rounded-full py-2.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm placeholder:text-slate-400 font-medium"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 cursor-pointer p-1.5 rounded-xl hover:bg-hover transition-colors">
          <div className="text-right hidden md:block mr-2">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-0.5">{role}</p>
            <p className="text-sm font-semibold text-foreground leading-none">
              {user?.username || name}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold shadow-sm">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
};
