import { useEffect } from 'react';

import { OPDSidebar } from './OPDSidebar';
import { OPDTopBar } from './OPDTopBar';
import { useAppSelector } from '../hooks/redux';
import { useAuthRedirect, ModuleOutlet } from '../components/auth/ModuleGuard';

export const OPDLayout = () => {
  const authRedirect = useAuthRedirect();
  const themeMode = useAppSelector((state) => state.theme.mode);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (themeMode === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(themeMode);
    }
  }, [themeMode]);

  if (authRedirect) return authRedirect;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <OPDSidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <OPDTopBar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
          <ModuleOutlet module="OPD" />
        </main>
      </div>
    </div>
  );
};
