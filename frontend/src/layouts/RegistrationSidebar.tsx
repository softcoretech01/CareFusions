import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, UserPlus, Zap, Users, CalendarDays, 
  CopyX, Merge, Users2, Phone, ShieldPlus, Building, 
  FileSignature, FolderOpen, Camera, LineChart, History, 
  Settings, ChevronRight, ChevronDown, Power, UserSquare2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navigation = [
  { name: 'Dashboard', to: '/registration', icon: LayoutDashboard },
  { name: 'Patient Registration', to: '/registration/new', icon: UserPlus },
  { name: 'Quick Registration', to: '/registration/quick', icon: Zap },
  { name: 'Existing Patients', to: '/registration/patients', icon: Users },
  { name: "Today's Registrations", to: '/registration/today', icon: CalendarDays },
  { name: 'Patient Deduplication', icon: CopyX, children: [
    { name: 'Duplicate Detection', to: '/registration/duplicate' },
    { name: 'Patient Merge', to: '/registration/merge' },
  ]},
  { name: 'Related Contacts', icon: Users2, children: [
    { name: 'Family Members', to: '/registration/family' },
    { name: 'Emergency Contacts', to: '/registration/emergency' },
  ]},
  { name: 'Sponsored Patients', icon: ShieldPlus, children: [
    { name: 'Insurance Patients', to: '/registration/insurance' },
    { name: 'Corporate Patients', to: '/registration/corporate' },
  ]},
  { name: 'Compliance', icon: FileSignature, children: [
    { name: 'Consent Management', to: '/registration/consent' },
    { name: 'Document Center', to: '/registration/documents' },
    { name: 'Photo Capture', to: '/registration/photo' },
  ]},
  { name: 'Registration Reports', to: '/registration/reports', icon: LineChart },
  { name: 'Audit Trail', to: '/registration/audit', icon: History },
  { name: 'Settings', to: '/registration/settings', icon: Settings },
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
      className="h-screen bg-sidebar text-slate-300 flex flex-col sticky top-0 overflow-hidden shadow-xl shadow-black/10 z-20"
    >
      <div className="p-6 flex items-center gap-3 border-b border-white/5 bg-sidebar">
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-sm">
          <UserSquare2 className="w-6 h-6 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-wide text-white flex items-center">
            TechHMS
          </span>
          <span className="text-primary text-[9px] tracking-[0.2em] font-bold uppercase -mt-1">Patient Registration</span>
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
                  className={`flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 group ${
                    isOpen 
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
                    `flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-200 group ${
                      isActive 
                        ? 'bg-primary text-white shadow-lg shadow-primary/20 font-semibold' 
                        : 'hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                    <span className="text-sm">{item.name}</span>
                  </div>
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
                          `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                            isActive 
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

      <div className="p-4 border-t border-white/5 space-y-1 bg-sidebar">
        <button 
          onClick={() => {
            window.location.href = '/login';
          }}
          className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm text-danger hover:bg-danger/10 font-semibold transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Power className="w-5 h-5 text-danger group-hover:scale-110 transition-transform" />
            Sign Out
          </div>
        </button>
      </div>
    </motion.aside>
  );
};
