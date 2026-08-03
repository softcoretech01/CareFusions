import { useAppSelector } from '../hooks/redux';

export const TopNavigation = () => {
  const user = useAppSelector((s) => s.auth.user);
  const name = user?.name || 'Guest';
  const role = user?.role || 'User';
  const initials = name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
      {/* Greeting — the valuable label that replaced the date/time chips */}
      <div className="hidden md:block shrink-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{greeting}</p>
        <p className="text-lg font-bold text-slate-800 leading-tight">{name}</p>
      </div>

      <div className="flex items-center gap-4 ml-8">
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
