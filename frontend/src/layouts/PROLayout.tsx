import { PROSidebar } from '../components/pro/PROSidebar';
import { useAuthRedirect, ModuleOutlet } from '../components/auth/ModuleGuard';

const PROTopBar = () => {
  return (
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm print:hidden">
      <div className="hidden md:block shrink-0"></div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-slate-700">PRO Officer</p>
          <p className="text-xs font-medium text-slate-500">Public Relations</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
          PR
        </div>
      </div>
    </header>
  );
};

export const PROLayout = () => {
  const authRedirect = useAuthRedirect();
  if (authRedirect) return authRedirect;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="print:hidden h-full">
        <PROSidebar />
      </div>
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <PROTopBar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar print:p-0 print:overflow-visible">
          <ModuleOutlet module="PRO" />
        </main>
      </div>
    </div>
  );
};
