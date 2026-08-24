import { useEffect } from 'react';

import { IPDSidebar } from './IPDSidebar';
import { TopNavigation } from './TopNavigation';
import { useAppSelector } from '../hooks/redux';
import { useAuthRedirect, ModuleOutlet } from '../components/auth/ModuleGuard';

export const IPDLayout = () => {
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
      <IPDSidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <TopNavigation />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
          <ModuleOutlet module="IPD" />
        </main>
      </div>
    </div>
  );
};
