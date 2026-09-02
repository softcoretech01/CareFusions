import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CheckSquare } from 'lucide-react';
import clsx from 'clsx';

export const PROSidebar = () => {
  const location = useLocation();

  const navItems = [
    {
      title: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      path: '/pro',
    },
    {
      title: 'Pending Approvals',
      icon: <CheckSquare className="w-5 h-5" />,
      path: '/pro/approvals',
    }
  ];

  return (
    <div className="w-64 h-full bg-slate-900 text-white flex flex-col hidden md:flex shrink-0">
      <div className="h-20 flex items-center px-6 border-b border-slate-800">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          PRO Portal
        </h1>
      </div>
      <div className="flex-1 py-6 overflow-y-auto custom-scrollbar px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <div
                className={clsx(
                  'transition-transform duration-200',
                  isActive ? 'scale-110' : 'group-hover:scale-110'
                )}
              >
                {item.icon}
              </div>
              <span className="font-medium text-sm">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
