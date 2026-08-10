import { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavigation } from './TopNavigation';
import { useAppSelector } from '../hooks/redux';
import { usePermissions } from '../hooks/usePermissions';
import { moduleForPath } from '../utils/moduleMap';
import { AccessDenied } from '../pages/AccessDenied';

export const AdminLayout = () => {
  const themeMode = useAppSelector((state) => state.theme.mode);
  const location = useLocation();
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

  // Must be logged in to reach the admin area.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role-based route guard: block modules the role cannot view.
  // (Skipped when no permissions are loaded — legacy/dev session fallback.)
  const module = moduleForPath(location.pathname);
  const denied = permissions.length > 0 && module != null && !canView(module);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <TopNavigation />

        <main className="flex-1 overflow-y-auto px-2 py-4 md:px-4 custom-scrollbar">
          {denied ? <AccessDenied module={module ?? undefined} /> : <Outlet />}
        </main>
      </div>
    </div>
  );
};
