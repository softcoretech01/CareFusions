import { TopNavigation } from './TopNavigation';
import { LabSidebar } from './LabSidebar';
import { useAuthRedirect, ModuleOutlet } from '../components/auth/ModuleGuard';

export const LabLayout = () => {
  const authRedirect = useAuthRedirect();
  if (authRedirect) return authRedirect;

  return (
    <div className="flex h-screen bg-bg-light overflow-hidden font-sans">
      <LabSidebar />
      <main className="flex-1 overflow-y-auto custom-scrollbar relative">
        <TopNavigation />
        <div className="p-4 md:p-6">
          <ModuleOutlet module="Laboratory" />
        </div>
      </main>
    </div>
  );
};
