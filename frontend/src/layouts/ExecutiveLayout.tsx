import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, DollarSign, Stethoscope, Settings, ShoppingCart, Package, Users, TrendingUp, Calendar, FileText, Building2, User, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch } from '../hooks/redux';
import { logout } from '../redux/slices/authSlice';

const API_BASE = import.meta.env.VITE_API_URL as string;

interface BranchOption { id: number; code: string; name: string; }

const executiveNav = [
  { name: 'Executive Overview', to: '/executive/overview', icon: LayoutDashboard },
  { name: 'Financial Analytics', to: '/executive/financial', icon: DollarSign },
  { name: 'Clinical Analytics', to: '/executive/clinical', icon: Stethoscope },
  { name: 'Operational Analytics', to: '/executive/operational', icon: Settings },
  { name: 'Procurement Analytics', to: '/executive/procurement', icon: ShoppingCart },
  { name: 'Inventory Analytics', to: '/executive/inventory', icon: Package },
  { name: 'HR Analytics', to: '/executive/hr', icon: Users },
  { name: 'Predictive Analytics', to: '/executive/predictive', icon: TrendingUp },
  { name: 'Scheduled Reports', to: '/executive/scheduled-reports', icon: Calendar },
  { name: 'Report Builder', to: '/executive/report-builder', icon: FileText },
];

export const ExecutiveLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Branches come from admin.Master_Branch. The three options here used to be
  // hardcoded ("Main Hospital / North Branch / South Clinic") and matched
  // nothing in the database.
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [branchId, setBranchId] = useState<string>('all');

  useEffect(() => {
    fetch(`${API_BASE}/branches/`)
      .then(r => r.json())
      .then(d => setBranches(
        (Array.isArray(d) ? d : [])
          .filter((b: any) => !b.status || b.status === 'Active')
          .map((b: any) => ({ id: b.id, code: b.code, name: b.name })),
      ))
      .catch(e => console.error('[Executive] branch list failed', e));
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 bg-sidebar border-r border-white/10 flex flex-col h-full overflow-hidden"
          >
            {/* Branding */}
            <div className="p-6 flex items-center gap-3 border-b border-white/10 bg-sidebar">
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

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
              {executiveNav.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
            
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
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Sticky Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shadow-sm shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-800 hidden sm:block">Executive Command Center</h2>
          </div>

          <div className="flex items-center gap-4 lg:gap-6">
            <div className="hidden md:flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Building2 className="w-4 h-4 text-slate-400" />
              <select
                value={branchId}
                onChange={e => setBranchId(e.target.value)}
                title="Branch data is not recorded against transactions yet, so this does not filter the figures"
                className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="all">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={String(b.id)}>{b.name || b.code}</option>
                ))}
              </select>
            </div>
            
            <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">FY 2026-2027</span>
            </div>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-4 lg:pl-6">
              <button className="p-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-full transition-colors ml-2">
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-auto bg-slate-50 p-4 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
