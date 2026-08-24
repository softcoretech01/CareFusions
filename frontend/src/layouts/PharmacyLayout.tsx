import { useEffect } from 'react';

import { useAppSelector } from '../hooks/redux';
import { TopNavigation } from './TopNavigation';
import { PharmacySidebar } from './PharmacySidebar';
import { useAuthRedirect, ModuleOutlet } from '../components/auth/ModuleGuard';

export const PharmacyLayout = () => {
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
      <div className="print:hidden">
        <PharmacySidebar />
      </div>
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="print:hidden">
          <TopNavigation />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar print:p-0 print:overflow-visible">
          <ModuleOutlet module="Pharmacy" />
        </main>
      </div>
    </div>
  );
};
