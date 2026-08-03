import { useAppSelector } from './redux';
import type { PermissionEntry } from '../redux/slices/authSlice';

export type PermissionAction =
  | 'view' | 'create' | 'edit' | 'delete'
  | 'print' | 'export' | 'import' | 'approve';

const ACTION_KEY: Record<PermissionAction, keyof PermissionEntry> = {
  view: 'canView', create: 'canCreate', edit: 'canEdit', delete: 'canDelete',
  print: 'canPrint', export: 'canExport', import: 'canImport', approve: 'canApprove',
};

/**
 * Role-based permission helper. Reads the logged-in user's permissions (loaded at
 * login from the Permissions master) and answers can(module, action).
 */
export const usePermissions = () => {
  const permissions = useAppSelector((s) => s.auth.permissions) as PermissionEntry[];
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  const entry = (module: string) => permissions.find((p) => p.module === module);

  const can = (module: string, action: PermissionAction = 'view'): boolean => {
    const e = entry(module);
    return !!e && !!e[ACTION_KEY[action]];
  };

  const canView = (module: string) => can(module, 'view');

  return { permissions, isAuthenticated, can, canView };
};
