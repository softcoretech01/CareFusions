import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { AccessDenied } from '../../pages/AccessDenied';

/**
 * Shared access control for the portal layouts (Registration, OPD, IPD, EMR,
 * Pharmacy, Lab, Radiology, Billing, Insurance, Procurement, Inventory,
 * Executive).
 *
 * Before this existed only AdminLayout and AppointmentLayout checked anything,
 * so every other module was reachable by typing its URL while logged out — the
 * login screen was decorative for 12 of the 14 portals.
 *
 * Two separate rules:
 *
 *  1. Authentication is HARD. No session -> bounce to /login, remembering where
 *     the user was headed so the login can send them back.
 *
 *  2. Authorisation is EXPLICIT-DENY. A role is blocked from a module only when
 *     the Permissions master actually has a row for that (role, module) pair and
 *     it says canView = false. A role with no row for the module is let through.
 *     That grandfathering matters because the portal modules were never part of
 *     the Permissions master vocabulary until now, so no existing role has rows
 *     for them; a strict check would lock every user out of every portal on the
 *     first deploy. Once the rows are seeded the check tightens automatically.
 */
const useModuleAccess = (module: string) => {
  const { isAuthenticated, permissions, canView } = usePermissions();

  // Does the Permissions master say anything at all about this module for this role?
  const governed = permissions.some((p) => p.module === module);

  return { isAuthenticated, denied: governed && !canView(module) };
};

/**
 * Returns a <Navigate> to /login when there is no session, or null when the user
 * may proceed. Call it unconditionally at the top of a layout and bail out on a
 * non-null result:
 *
 *     const authRedirect = useAuthRedirect();
 *     ...other hooks...
 *     if (authRedirect) return authRedirect;
 */
export const useAuthRedirect = (): ReactNode | null => {
  const location = useLocation();
  const { isAuthenticated } = usePermissions();

  if (isAuthenticated) return null;
  return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
};

/**
 * Drop-in replacement for <Outlet /> inside a guarded layout. Renders the child
 * route normally, or the Access Denied page when the role cannot view `module`.
 * Kept separate from RequireAuth so the denial still renders inside the module's
 * own chrome (sidebar + top bar) instead of on a blank page.
 */
export const ModuleOutlet = ({ module }: { module: string }) => {
  const { denied } = useModuleAccess(module);
  return denied ? <AccessDenied module={module} /> : <Outlet />;
};
