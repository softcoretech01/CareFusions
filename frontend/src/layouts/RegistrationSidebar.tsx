import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UserPlus, Zap, Users, CalendarDays, CopyX, Merge, FolderOpen, History, ChevronRight, ChevronDown, BellRing, Activity, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<any>;
  children?: { name: string; to: string; }[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', to: '/registration/reports', icon: LayoutDashboard },
  { name: 'Patient Registration', to: '/registration/new', icon: UserPlus },
  { name: 'Quick Registration', to: '/registration/quick', icon: Zap },
  { name: 'Emergency Registration', to: '/registration/emergency', icon: Activity },
  { name: 'Existing Patients', to: '/registration/patients', icon: Users },
  { name: "Today's Registrations", to: '/registration/today', icon: CalendarDays },
  { name: 'Patient Documents', to: '/registration/documents', icon: FolderOpen },
  { name: 'Patient Alerts', to: '/registration/alerts', icon: BellRing },
  { name: 'Duplicate Patient Check', to: '/registration/duplicate', icon: CopyX },
  { name: 'Patient Merge', to: '/registration/merge', icon: Merge },
  { name: 'Visit History', to: '/registration/history', icon: History },
];

export const RegistrationSidebar = () => {
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const toggleMenu = (name: string) => {
    setOpenMenus(prev =>
      prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]
    );
  };

  return (
    <motion.aside
      initial={{ width: 80 }}
      animate={{ width: 300 }}
      className="h-screen bg-sidebar text-white/90 flex flex-col sticky top-0 overflow-hidden shadow-xl shadow-black/10 z-20"
    >
      <div className="p-6 flex items-center gap-3 border-b border-white/5 bg-sidebar">
        <div className="relative flex items-center justify-center w-10 h-10 bg-white rounded-xl shadow-sm shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="#086450" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          <svg viewBox="0 0 24 24" fill="none" stroke="#D4A62A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-[-1px]">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <div className="flex flex-col justify-center mt-[-2px]">
          <span className="text-xl font-extrabold tracking-wide text-white leading-none mt-1">CareFusions</span>
          <div className="flex items-center gap-1.5 mt-1.5 w-full opacity-90">
            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#D4A62A] to-[#D4A62A] flex-grow rounded-l-full" />
            <span className="text-[#D4A62A] text-[0.55rem] tracking-[0.2em] font-bold uppercase ml-0.5">ERP</span>
            <div className="h-[2px] bg-gradient-to-l from-transparent via-[#D4A62A] to-[#D4A62A] flex-grow rounded-r-full" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-6 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isOpen = openMenus.includes(item.name);

          return (
            <div key={item.name} className="flex flex-col">
              {hasChildren ? (
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={`flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 group ${isOpen
                      ? 'bg-white/10 text-white font-semibold'
                      : 'hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isOpen ? 'text-primary' : 'text-slate-400 group-hover:text-primary transition-colors'}`} />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  {isOpen ? <ChevronDown className="w-4 h-4 opacity-70" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
                </button>
              ) : (
                <NavLink
                  to={item.to!}
                  end={item.to === '/registration'}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 group ${isActive
                      ? 'bg-white/10 text-white shadow-lg shadow-black/10 font-semibold'
                      : 'hover:bg-white/5 hover:text-white text-white/80'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-secondary' : 'text-white/60 group-hover:text-secondary'}`} />
                      <span className="text-sm">{item.name}</span>
                    </div>
                  )}
                </NavLink>
              )}

              <AnimatePresence>
                {hasChildren && isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden ml-4 pl-4 border-l border-white/10 mt-1 space-y-1"
                  >
                    {item.children!.map(child => (
                      <NavLink
                        key={child.name}
                        to={child.to}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                          }`
                        }
                      >
                        <span className="text-sm">{child.name}</span>
                      </NavLink>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-white/5 bg-sidebar">
        <button
          onClick={() => { window.location.href = '/login'; }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-white/10 hover:bg-danger hover:text-white transition-colors group"
        >
          <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
          Sign Out
        </button>
        <div className="text-left pl-3 text-white/40 text-xs mt-2">
          Version 0.01
        </div>
      </div>
    </motion.aside>
  );
};
