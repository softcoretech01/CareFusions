import { Search, Zap, CalendarDays } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LiveClock } from '../components/ui/LiveClock';

export const RegistrationTopNavigation = () => {
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

      <div className="flex-1 max-w-xl relative mx-8">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search patient by UHID, Name, Mobile, or Scan QR..."
          className="w-full bg-slate-50 border border-slate-200 rounded-full py-2.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm placeholder:text-slate-400 font-medium"
        />
      </div>

      <div className="flex items-center gap-4">
        
        {/* Quick Registration Button */}
        <button 
          onClick={() => navigate('/registration/quick')}
          className="flex items-center gap-2 bg-secondary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-secondary/90 transition-colors mr-2"
        >
          <Zap className="w-4 h-4 fill-white" />
          Quick Reg
        </button>




        <div className="flex items-center gap-3 cursor-pointer p-1.5 rounded-xl hover:bg-hover transition-colors">
          <div className="text-right hidden md:block mr-2">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">Registration Desk</p>
            <p className="text-sm font-semibold text-foreground leading-none">Sarah Jenkins</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold shadow-sm">
            SJ
          </div>
        </div>
      </div>
    </header>
  );
};
