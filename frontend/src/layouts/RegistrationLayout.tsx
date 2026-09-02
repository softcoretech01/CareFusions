import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { RegistrationSidebar } from './RegistrationSidebar';
import { RegistrationTopNavigation } from './RegistrationTopNavigation';
import { useAppSelector } from '../hooks/redux';
import { motion } from 'framer-motion';
import { useAuthRedirect, ModuleOutlet } from '../components/auth/ModuleGuard';

export const RegistrationLayout = () => {
  const authRedirect = useAuthRedirect();
  const themeMode = useAppSelector((state) => state.theme.mode);
  const location = useLocation();
  const isQuickRegistration = location.pathname.includes('/registration/quick');

  // Apply theme to document element
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
      {!isQuickRegistration && <RegistrationSidebar />}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <RegistrationTopNavigation />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full"
          >
            <ModuleOutlet module="Registration" />
          </motion.div>
        </main>
      </div>
    </div>
  );
};
