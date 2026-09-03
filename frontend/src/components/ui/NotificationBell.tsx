import { useState, useRef, useEffect } from 'react';
import {
  Bell, CheckCheck, Clock, ShieldAlert, FlaskConical,
  Stethoscope, Package, CreditCard, ChevronRight, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  type: 'pro' | 'lab' | 'pharmacy' | 'billing' | 'clinical';
  link?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'PRO Review Pending',
    description: 'Service order OPR-IPD-20260010 requires pre-authorization approval.',
    time: '2m ago',
    unread: true,
    type: 'pro',
    link: '/pro/service-orders',
  },
  {
    id: '2',
    title: 'New Lab Investigation',
    description: 'CBC & Liver Panel ordered for IPD patient UHID-2026-0004.',
    time: '14m ago',
    unread: true,
    type: 'lab',
    link: '/lab/order-list',
  },
  {
    id: '3',
    title: 'Advance Payment Received',
    description: 'Advance payment of ₹4,000 received for UHID-2026-0010.',
    time: '1h ago',
    unread: true,
    type: 'billing',
    link: '/billing/reports',
  },
  {
    id: '4',
    title: 'Pharmacy Stock Alert',
    description: 'Paracetamol 500mg reached minimum threshold (15 strips left).',
    time: '3h ago',
    unread: false,
    type: 'pharmacy',
    link: '/pharmacy/stock',
  },
];

export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => n.unread).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  const handleNotificationClick = (item: NotificationItem) => {
    markAsRead(item.id);
    setOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  const getTypeIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'pro':
        return <ShieldAlert className="w-4 h-4 text-purple-600" />;
      case 'lab':
        return <FlaskConical className="w-4 h-4 text-blue-600" />;
      case 'pharmacy':
        return <Package className="w-4 h-4 text-amber-600" />;
      case 'billing':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      default:
        return <Stethoscope className="w-4 h-4 text-primary" />;
    }
  };

  const getTypeBg = (type: NotificationItem['type']) => {
    switch (type) {
      case 'pro':
        return 'bg-purple-50 border-purple-100';
      case 'lab':
        return 'bg-blue-50 border-blue-100';
      case 'pharmacy':
        return 'bg-amber-50 border-amber-100';
      case 'billing':
        return 'bg-emerald-50 border-emerald-100';
      default:
        return 'bg-primary/10 border-primary/20';
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="relative p-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition-all shadow-sm flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <>
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-rose-600 text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            </span>
          </>
        )}
      </button>

      {/* Notifications Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No notifications</p>
                </div>
              ) : (
                notifications.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer flex items-start gap-3 relative ${
                      item.unread ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${getTypeBg(item.type)}`}>
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`text-xs font-bold truncate ${item.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                          {item.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {item.time}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-snug line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                    {item.unread && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate('/pro/service-orders');
                  }}
                  className="text-xs font-semibold text-slate-600 hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  View all hospital alerts
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
