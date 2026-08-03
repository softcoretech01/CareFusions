import { useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { AppointmentSidebar } from './AppointmentSidebar';
import { AppointmentTopNavigation } from './AppointmentTopNavigation';
import { useAppSelector } from '../hooks/redux';
import { usePermissions } from '../hooks/usePermissions';
import { AccessDenied } from '../pages/AccessDenied';

export const AppointmentLayout = () => {
  const themeMode = useAppSelector((state) => state.theme.mode);
  const { isAuthenticated, permissions, canView } = usePermissions();

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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  const denied = permissions.length > 0 && !canView('Appointments');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppointmentSidebar />
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <AppointmentTopNavigation />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
          {denied ? <AccessDenied module="Appointments" /> : <Outlet />}
        </main>
      </div>
    </div>
  );
};
