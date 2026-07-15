import { Search, Bell, Settings, Moon, Sun, Monitor } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setTheme } from '../redux/slices/themeSlice';

export const TopNavigation = () => {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.theme.mode);

  const cycleTheme = () => {
    if (themeMode === 'light') dispatch(setTheme('dark'));
    else if (themeMode === 'dark') dispatch(setTheme('system'));
    else dispatch(setTheme('light'));
  };

  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
      <div className="flex-1 max-w-2xl relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search patient, visit, invoice..."
          className="w-full bg-slate-50 border border-slate-200 rounded-full py-2.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm placeholder:text-slate-400"
        />
      </div>

      <div className="flex items-center gap-4 ml-8">
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
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-0.5">Master Administration</p>
            <p className="text-sm font-semibold text-foreground leading-none">Dr. John Doe</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold shadow-sm">
            JD
          </div>
        </div>
      </div>
    </header>
  );
};
