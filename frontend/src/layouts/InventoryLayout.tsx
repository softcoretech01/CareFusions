import { TopNavigation } from './TopNavigation';
import { InventorySidebar } from './InventorySidebar';
import { useAuthRedirect, ModuleOutlet } from '../components/auth/ModuleGuard';

export const InventoryLayout = () => {
  const authRedirect = useAuthRedirect();
  if (authRedirect) return authRedirect;

  return (
    <div className="flex h-screen bg-slate-50 font-inter overflow-hidden">
      <InventorySidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavigation />
        <main className="flex-1 overflow-auto custom-scrollbar p-4 md:p-5">
          <div className="max-w-[1600px] mx-auto h-full">
            <ModuleOutlet module="Inventory" />
          </div>
        </main>
      </div>
    </div>
  );
};
