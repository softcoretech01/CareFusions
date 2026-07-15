import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Building2, Users, UserCog, CalendarClock, 
  Pill, Microscope, ActivitySquare, Receipt, ShieldCheck, 
  PackageSearch, Landmark, Lock, BellRing, Sparkles, 
  History, Settings, ChevronRight, ChevronDown, Power, Stethoscope
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navigation = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'Organization Masters', icon: Building2, children: [
    { name: 'Hospital Master', to: '/admin/masters/hospital' },
    { name: 'Branch Master', to: '/admin/masters/branch' },
    { name: 'Department Master', to: '/admin/masters/department' },
  ]},
  { name: 'Doctor Masters', icon: Stethoscope, children: [
    { name: 'Doctor Master', to: '/admin/masters/doctor' },
    { name: 'Doctor Specialization', to: '/admin/masters/doctor-specialization' },
  ]},
  { name: 'Employee Masters', icon: UserCog, children: [
    { name: 'Nurse Master', to: '/admin/masters/nurse' },
    { name: 'Pharmacist Master', to: '/admin/masters/pharmacist' },
    { name: 'Lab Technician Master', to: '/admin/masters/lab-technician' },
    { name: 'Receptionist Master', to: '/admin/masters/receptionist' },
    { name: 'Housekeeping Master', to: '/admin/masters/housekeeping' },
  ]},
  { name: 'Patient Masters', icon: Users, children: [
    { name: 'Patient Category', to: '/admin/masters/patient-category' },
    { name: 'Blood Group', to: '/admin/masters/blood-group' },
  ]},
  { name: 'Appointment Masters', icon: CalendarClock, children: [
    { name: 'Consultation Type', to: '/admin/masters/consultation-type' },
    { name: 'Appointment Status', to: '/admin/masters/appointment-status' },
  ]},
  { name: 'Pharmacy Masters', icon: Pill, children: [
    { name: 'Medicine Master', to: '/admin/masters/medicine' },
    { name: 'Medicine Category', to: '/admin/masters/medicine-category' },
  ]},
  { name: 'Laboratory Masters', icon: Microscope, children: [
    { name: 'Test Master', to: '/admin/masters/test' },
    { name: 'Sample Types', to: '/admin/masters/sample-type' },
  ]},
  { name: 'Radiology Masters', icon: ActivitySquare, children: [
    { name: 'Radiology Services', to: '/admin/masters/radiology-service' },
    { name: 'Equipment Master', to: '/admin/masters/equipment' },
  ]},
  { name: 'Billing Masters', icon: Receipt, children: [
    { name: 'Service Master', to: '/admin/masters/service' },
    { name: 'Tax Master', to: '/admin/masters/tax' },
    { name: 'Payment Mode', to: '/admin/masters/payment-mode' },
  ]},
  { name: 'Insurance Masters', icon: ShieldCheck, children: [
    { name: 'Insurance Provider', to: '/admin/masters/insurance-provider' },
    { name: 'TPA Master', to: '/admin/masters/tpa' },
  ]},
  { name: 'Purchase & Inventory', icon: PackageSearch, children: [
    { name: 'Vendor Master', to: '/admin/masters/vendor' },
    { name: 'Item Category', to: '/admin/masters/item-category' },
    { name: 'Warehouse Master', to: '/admin/masters/warehouse' },
  ]},
  { name: 'Financial Masters', icon: Landmark, children: [
    { name: 'Chart of Accounts', to: '/admin/masters/coa' },
    { name: 'Cost Centers', to: '/admin/masters/cost-center' },
  ]},
  { name: 'Security Masters', icon: Lock, children: [
    { name: 'Users', to: '/admin/masters/users' },
    { name: 'Roles', to: '/admin/masters/roles' },
    { name: 'Permissions', to: '/admin/masters/permissions' },
  ]},
  { name: 'Notification Masters', icon: BellRing, children: [
    { name: 'SMS Templates', to: '/admin/masters/sms' },
    { name: 'Email Templates', to: '/admin/masters/email' },
  ]},
  { name: 'AI Config Masters', icon: Sparkles, children: [
    { name: 'Prompt Templates', to: '/admin/masters/prompts' },
    { name: 'Clinical Rules', to: '/admin/masters/clinical-rules' },
  ]},
  { name: 'Audit Trail', to: '/admin/audit', icon: History },
  { name: 'Settings', to: '/admin/settings', icon: Settings },
];

export const Sidebar = () => {
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
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
          <div className="relative">
            <svg className="w-7 h-7 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
               <span className="text-white text-[10px] font-bold">+</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-wide text-white flex items-center">
            CareFusions
          </span>
          <div className="flex items-center gap-2 -mt-1">
            <div className="h-[1px] w-4 bg-secondary"></div>
            <span className="text-secondary text-[10px] tracking-[0.2em] font-bold uppercase">ERP</span>
            <div className="h-[1px] w-4 bg-secondary"></div>
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
                              ? 'bg-white/20 text-white font-bold shadow-sm' 
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
            // Implement Redux logout here when ready
            // dispatch(logout());
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
