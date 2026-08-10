import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowDownToLine, ArrowRightLeft, ArrowUpFromLine, CalendarClock, AlertTriangle, BookOpen, CornerDownLeft, SlidersHorizontal, Building2, FileBarChart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppDispatch } from '../hooks/redux';
import { logout } from '../redux/slices/authSlice';

const navigation = [
  { name: 'Dashboard', to: '/inventory', icon: LayoutDashboard },
  { name: 'Current Stock', to: '/inventory/stock', icon: Package },
  { name: 'Stock In', to: '/inventory/stock-in', icon: ArrowDownToLine },
  { name: 'Stock Out', to: '/inventory/stock-issue', icon: ArrowUpFromLine },
  { name: 'Stock Return', to: '/inventory/stock-return', icon: CornerDownLeft },
  { name: 'Stock Transfer', to: '/inventory/transfer', icon: ArrowRightLeft },
  { name: 'Stock Adjustment', to: '/inventory/adjustment', icon: SlidersHorizontal },
  { name: 'Batch & Expiry', to: '/inventory/batch-expiry', icon: CalendarClock },
  { name: 'Low Stock Monitor', to: '/inventory/low-stock', icon: AlertTriangle },
  { name: 'Stock Ledger', to: '/inventory/ledger', icon: BookOpen },
  { name: 'Category Ledger', to: '/inventory/category-ledger', icon: BookOpen },
  { name: 'Dept Consumption', to: '/inventory/consumption', icon: Building2 },
  { name: 'Reports', to: '/inventory/reports', icon: FileBarChart },
];

export const InventorySidebar = () => {
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
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-6 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            end={item.to === '/inventory'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive
                ? 'bg-white/10 text-white shadow-lg shadow-black/10 font-semibold'
                : 'hover:bg-white/5 hover:text-white text-white/80'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-secondary' : 'text-white/60 group-hover:text-secondary'}`} />
                <span className="text-sm">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Sign out */}
      <div className="p-4 border-t border-white/5 bg-sidebar">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-white/10 hover:bg-danger hover:text-white transition-colors group"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 group-hover:scale-110 transition-transform">
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
