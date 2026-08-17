import { NavLink, useNavigate } from 'react-router-dom';
import { Users, BedDouble, Siren, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppDispatch } from '../hooks/redux';
import { logout } from '../redux/slices/authSlice';

const navigation = [
  { name: 'Dashboard', to: '/emr', icon: LayoutDashboard, end: true },
  { name: 'OP Patients', to: '/emr/op', icon: Users },
  { name: 'IP Patients', to: '/emr/ip', icon: BedDouble },
];

export const EMRSidebar = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <motion.aside
      initial={{ width: 80 }}
      animate={{ width: 300 }}
      className="h-screen bg-sidebar text-white/90 flex flex-col sticky top-0 overflow-hidden shadow-xl shadow-black/10 z-20"
    >
      {/* Brand */}
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

      {/* Nav */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-6 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive
                  ? 'bg-primary/20 text-white shadow-sm ring-1 ring-primary/30'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="font-semibold tracking-wide">{item.name}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/5 bg-sidebar">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-danger hover:bg-danger/10 font-semibold transition-colors group"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-danger group-hover:scale-110 transition-transform">
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
            <line x1="12" y1="2" x2="12" y2="12"></line>
          </svg>
          Sign Out
        </button>
        <div className="text-left pl-3 text-white/40 text-xs mt-2">
          Version 0.01
        </div>
      </div>
    </motion.aside>
  );
};
