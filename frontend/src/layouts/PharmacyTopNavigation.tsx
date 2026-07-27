import { Search, CalendarDays } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LiveClock } from '../components/ui/LiveClock';

export const PharmacyTopNavigation = () => {
  const navigate = useNavigate();
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

      <div className="flex-1 max-w-xl mx-8 relative hidden md:block">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search medicine, bill..."
          className="w-full bg-slate-50 border border-slate-200 rounded-full py-2.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm placeholder:text-slate-400"
        />
      </div>

      <div className="flex items-center gap-4">

        
        <div className="h-8 w-[1px] bg-border mx-2"></div>

        <div 
          className="flex items-center gap-3 cursor-pointer p-1.5 rounded-xl hover:bg-hover transition-colors"
          onClick={() => navigate('/login')}
          title="Sign Out"
        >
          <div className="text-right hidden md:block mr-2">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-0.5">Pharmacist</p>
            <p className="text-sm font-semibold text-foreground leading-none">Test Pharmacy</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold shadow-sm">
            TP
          </div>
        </div>
      </div>
    </header>
  );
};
