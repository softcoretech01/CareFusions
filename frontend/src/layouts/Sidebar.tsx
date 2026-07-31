import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, Users, UserCog, CalendarClock, Pill, Microscope, ActivitySquare, Receipt, ShieldCheck, PackageSearch, Landmark, Lock, BellRing, Sparkles, History, ChevronRight, ChevronDown, Stethoscope } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navigation = [
  { name: 'Dashboard', to: '/admin', icon: LayoutDashboard },

  {
    name: 'Organization Masters', icon: Building2, children: [
      { name: 'Hospital Master', to: '/admin/masters/hospital' },
      { name: 'Branch Master', to: '/admin/masters/branch' },
      { name: 'Department Master', to: '/admin/masters/department' },
    ]
  },
  {
    name: 'Doctor Masters', icon: Stethoscope, children: [
      { name: 'Doctor Master', to: '/admin/masters/doctor' },
    ]
  },
  {
    name: 'Employee Masters', icon: UserCog, children: [
      { name: 'Nurse Master', to: '/admin/masters/nurse' },
      { name: 'Pharmacist Master', to: '/admin/masters/pharmacist' },
      { name: 'Lab Technician Master', to: '/admin/masters/lab-technician' },
      { name: 'Receptionist Master', to: '/admin/masters/receptionist' },
      { name: 'Facility Management', to: '/admin/masters/facility-management' },
    ]
  },
  {
    name: 'Patient Masters', icon: Users, children: [
      { name: 'Patient Category', to: '/admin/masters/patient-category' },
      { name: 'Blood Group', to: '/admin/masters/blood-group' },
      { name: 'Allergy Master', to: '/admin/masters/allergy' },
      { name: 'Diagnosis Master', to: '/admin/masters/diagnosis' },
      { name: 'Procedure Master', to: '/admin/masters/procedure' },
    ]
  },
  {
    name: 'Appointment Masters', icon: CalendarClock, children: [
      { name: 'Consultation Type', to: '/admin/masters/consultation-type' },
      { name: 'Appointment Status', to: '/admin/masters/appointment-status' },
    ]
  },
  {
    name: 'Pharmacy Masters', icon: Pill, children: [
      { name: 'Medicine Master', to: '/admin/masters/medicine' },
      { name: 'Medicine Category', to: '/admin/masters/medicine-category' },
    ]
  },
  {
    name: 'Laboratory Masters', icon: Microscope, children: [
      { name: 'Test Master', to: '/admin/masters/test' },
      { name: 'Sample Types', to: '/admin/masters/sample-type' },
    ]
  },
  {
    name: 'Radiology Masters', icon: ActivitySquare, children: [
      { name: 'Radiology Services', to: '/admin/masters/radiology-service' },
      { name: 'Equipment Master', to: '/admin/masters/equipment' },
    ]
  },
  {
    name: 'Billing Masters', icon: Receipt, children: [
      { name: 'Service Master', to: '/admin/masters/service' },
      { name: 'Tax Master', to: '/admin/masters/tax' },
      { name: 'Payment Mode', to: '/admin/masters/payment-mode' },
    ]
  },
  {
    name: 'Insurance Masters', icon: ShieldCheck, children: [
      { name: 'Insurance Provider', to: '/admin/masters/insurance-provider' },
      { name: 'TPA Master', to: '/admin/masters/tpa' },
    ]
  },
  {
    name: 'Purchase & Inventory', icon: PackageSearch, children: [
      { name: 'Vendor Master', to: '/admin/masters/vendor' },
      { name: 'Category Master', to: '/admin/masters/category' },
      { name: 'Sub Category Master', to: '/admin/masters/sub-category' },
      { name: 'UOM Master', to: '/admin/masters/uom' },
      { name: 'Item Master', to: '/admin/masters/item' },
      { name: 'Brand Master', to: '/admin/masters/brand' },
      { name: 'Manufacturer Master', to: '/admin/masters/manufacturer' },
      { name: 'Warehouse Master', to: '/admin/masters/warehouse' },
    ]
  },
  {
    name: 'Financial Masters', icon: Landmark, children: [
      { name: 'Chart of Accounts', to: '/admin/masters/coa' },
      { name: 'Cost Centers', to: '/admin/masters/cost-center' },
      { name: 'Profit Centers', to: '/admin/masters/profit-center' },
      { name: 'Payment Terms', to: '/admin/masters/payment-terms' },
      { name: 'Currency', to: '/admin/masters/currency' },
      { name: 'Financial Year', to: '/admin/masters/financial-year' },
      { name: 'Bank Master', to: '/admin/masters/bank' },
      { name: 'Cash Counter', to: '/admin/masters/cash-counter' },
    ]
  },
  {
    name: 'Security Masters', icon: Lock, children: [
      { name: 'Users', to: '/admin/masters/users' },
      { name: 'Roles', to: '/admin/masters/roles' },
      { name: 'Permissions', to: '/admin/masters/permissions' },
    ]
  },
  {
    name: 'Notification Masters', icon: BellRing, children: [
      { name: 'SMS Templates', to: '/admin/masters/sms' },
      { name: 'Email Templates', to: '/admin/masters/email' },
      { name: 'WhatsApp Templates', to: '/admin/masters/whatsapp' },
      { name: 'Push Notification', to: '/admin/masters/push-notification' },
      { name: 'Reminder Rules', to: '/admin/masters/reminder-rules' },
    ]
  },
  {
    name: 'AI Config Masters', icon: Sparkles, children: [
      { name: 'Prompt Templates', to: '/admin/masters/prompts' },
      { name: 'Clinical Rules', to: '/admin/masters/clinical-rules' },
    ]
  },
  { name: 'Audit Trail', to: '/admin/audit', icon: History },
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
                      : 'hover:bg-white/5 hover:text-white text-white/80'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 transition-colors ${isOpen ? 'text-secondary' : 'text-white/60 group-hover:text-secondary'}`} />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  {isOpen ? <ChevronDown className="w-4 h-4 opacity-70" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
                </button>
              ) : (
                <NavLink
                  to={item.to!}
                  end={item.to === '/admin'}
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
                            ? 'bg-white/20 text-secondary font-bold shadow-sm'
                            : 'text-white/70 hover:bg-white/5 hover:text-white'
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
