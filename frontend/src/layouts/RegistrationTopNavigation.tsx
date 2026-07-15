import { Search, Bell, Settings, Moon, Sun, Monitor, MapPin, Building, Zap } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setTheme } from '../redux/slices/themeSlice';
import { useNavigate } from 'react-router-dom';

export const RegistrationTopNavigation = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const themeMode = useAppSelector((state) => state.theme.mode);

  const cycleTheme = () => {
    if (themeMode === 'light') dispatch(setTheme('dark'));
    else if (themeMode === 'dark') dispatch(setTheme('system'));
    else dispatch(setTheme('light'));
  };

  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
      
      <div className="flex items-center gap-6">
        {/* Hospital Selector (Mock) */}
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
          <Building className="w-4 h-4 text-primary" />
          Central General Hospital
        </div>
        
        {/* Branch Selector (Mock) */}
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
          <MapPin className="w-4 h-4 text-primary" />
          Main Campus
        </div>
      </div>

      <div className="flex-1 max-w-xl relative mx-8">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search patient by UHID, Name, Mobile, or Scan QR..."
          className="w-full bg-slate-50 border border-slate-200 rounded-full py-2.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm placeholder:text-slate-400 font-medium"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
           <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded shadow-sm bg-white">Ctrl</span>
           <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded shadow-sm bg-white">K</span>
        </div>
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

        <button 
          onClick={cycleTheme}
          className="p-2.5 rounded-xl hover:bg-hover text-gray-500 hover:text-primary transition-colors"
          title={`Theme: ${themeMode}`}
        >
          {themeMode === 'light' && <Sun className="w-5 h-5" />}
          {themeMode === 'dark' && <Moon className="w-5 h-5" />}
          {themeMode === 'system' && <Monitor className="w-5 h-5" />}
        </button>

        <button className="p-2.5 rounded-xl hover:bg-hover text-gray-500 hover:text-primary transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-danger rounded-full border-2 border-card"></span>
        </button>
        
        <button className="p-2.5 rounded-xl hover:bg-hover text-gray-500 hover:text-primary transition-colors">
          <Settings className="w-5 h-5" />
        </button>

        <div className="h-8 w-[1px] bg-border mx-2"></div>

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
