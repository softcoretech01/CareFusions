import { Outlet } from 'react-router-dom';
import { InventoryTopBar } from '../components/inventory/InventoryTopBar';
import { InventorySidebar } from './InventorySidebar';

export const InventoryLayout = () => {
  return (
    <div className="flex h-screen bg-slate-50 font-inter overflow-hidden">
      <InventorySidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <InventoryTopBar />
        <main className="flex-1 overflow-auto custom-scrollbar p-4 md:p-5">
          <div className="max-w-[1600px] mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
