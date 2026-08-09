import { Outlet } from 'react-router-dom';
import { TopNavigation } from './TopNavigation';
import { LabSidebar } from './LabSidebar';

export const LabLayout = () => {
  return (
    <div className="flex h-screen bg-bg-light overflow-hidden font-sans">
      <LabSidebar />
      <main className="flex-1 overflow-y-auto custom-scrollbar relative">
        <TopNavigation />
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
