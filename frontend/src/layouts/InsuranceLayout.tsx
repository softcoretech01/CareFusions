import { InsuranceSidebar } from './InsuranceSidebar';
import { InsuranceTopBar } from './InsuranceTopBar';
import { useAuthRedirect, ModuleOutlet } from '../components/auth/ModuleGuard';

export const InsuranceLayout = () => {
  const authRedirect = useAuthRedirect();
  if (authRedirect) return authRedirect;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <InsuranceSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <InsuranceTopBar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <ModuleOutlet module="Insurance" />
        </main>
      </div>
    </div>
  );
};
