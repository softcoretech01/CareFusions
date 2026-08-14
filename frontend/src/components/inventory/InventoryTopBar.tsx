import { useEffect, useState } from 'react';
import { Calendar, Clock, Search } from 'lucide-react';
import { useAppSelector } from '../../hooks/redux';

// Inventory-only top bar matching the reference: a date chip and a live clock
// on the left, a wide search box in the middle, and the user block on the
// right. Kept local to the inventory module so the shared TopNavigation (used
// by every other module) is untouched.
const fmtDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}-${d.toLocaleString('en-US', { month: 'short' })}-${d.getFullYear()}`;

const fmtTime = (d: Date) =>
  d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

export const InventoryTopBar = () => {
  const user = useAppSelector((s) => s.auth.user);
  const name = user?.name || 'Inventory Manager';
  const role = user?.role || 'Admin';
  const initials = name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'I';

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const chip = 'flex items-center gap-2 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm';

  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center gap-4 px-6 sticky top-0 z-10 shadow-sm">
      {/* Date + live clock */}
      <div className="flex items-center gap-3 shrink-0">
        <div className={chip}>
          <Calendar className="w-4 h-4 text-primary" />
          {fmtDate(now)}
        </div>
        <div className={`${chip} hidden sm:flex`}>
          <Clock className="w-4 h-4 text-primary" />
          {fmtTime(now)}
        </div>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-2xl mx-auto">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search inventory..."
            className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-full text-sm text-slate-600 focus:outline-none focus:border-primary focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* User */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden md:block">
          <p className="text-sm font-bold text-slate-800 leading-tight">{name}</p>
          <p className="text-xs font-semibold text-primary leading-tight">{role}</p>
        </div>
        <div className="w-11 h-11 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold shadow-sm">
          {initials}
        </div>
      </div>
    </header>
  );
};
