import { RadiologySidebar } from './RadiologySidebar';
import { useAuthRedirect, ModuleOutlet } from '../components/auth/ModuleGuard';

export const RadiologyLayout = () => {
  const authRedirect = useAuthRedirect();

  if (authRedirect) return authRedirect;

  return (
    <div className="flex h-screen bg-bg-light overflow-hidden font-sans">
      <RadiologySidebar />
      <main className="flex-1 overflow-y-auto custom-scrollbar relative">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
          <div className="hidden md:block shrink-0"></div>



          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-700">Radiologist</p>
              <p className="text-xs font-medium text-slate-500">Radiology (RIS)</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              RD
            </div>
          </div>
        </header>
        
        <div className="p-8">
          <ModuleOutlet module="Radiology" />
        </div>
      </main>
    </div>
  );
};
