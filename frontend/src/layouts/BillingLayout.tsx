import { Sidebar } from '../components/billing/Sidebar';
import { useAuthRedirect, ModuleOutlet } from '../components/auth/ModuleGuard';
import { NotificationBell } from '../components/ui/NotificationBell';

const BillingTopBar = () => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = 'Billing Manager';
  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm print:hidden">
      <div className="hidden md:block shrink-0"></div>

      <div className="flex items-center gap-4">
        <NotificationBell />
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-700">Billing Manager</p>
            <p className="text-xs font-medium text-slate-500">Billing Dept</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
            BM
          </div>
        </div>
      </div>
    </header>
  );
};

export const BillingLayout = () => {
  const authRedirect = useAuthRedirect();
  if (authRedirect) return authRedirect;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <BillingTopBar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar print:p-0 print:overflow-visible">
          <ModuleOutlet module="Billing" />
        </main>
      </div>
    </div>
  );
};
