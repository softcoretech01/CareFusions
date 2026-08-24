import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  name: string;
  role: string;
  hospitalId: string;
  branchId: string;
  username?: string;
  /** Sent as X-Department so the audit trail can attribute the change. */
  department?: string;
}

export interface PermissionEntry {
  module: string;
  subModule?: string | null;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPrint: boolean;
  canExport: boolean;
  canImport: boolean;
  canApprove: boolean;
  allowApiAccess: boolean;
  allowDataExport: boolean;
  allowBulkOperations: boolean;
  allowAuditLogAccess: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  permissions: PermissionEntry[];
}

// Rehydrate from localStorage or sessionStorage
const persisted: AuthState | null = (() => {
  try {
    let raw = localStorage.getItem('cf_auth');
    if (!raw) raw = sessionStorage.getItem('cf_auth');
    return raw ? (JSON.parse(raw) as AuthState) : null;
  } catch { return null; }
})();

const initialState: AuthState = persisted ?? {
  user: null,
  token: null,
  isAuthenticated: false,
  permissions: [],
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string; permissions?: PermissionEntry[]; rememberMe?: boolean }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.permissions = action.payload.permissions ?? [];
      state.isAuthenticated = true;
      try { 
        if (action.payload.rememberMe) {
          localStorage.setItem('cf_auth', JSON.stringify(state));
        } else {
          sessionStorage.setItem('cf_auth', JSON.stringify(state));
        }
      } catch { /* ignore */ }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.permissions = [];
      state.isAuthenticated = false;
      try { 
        localStorage.removeItem('cf_auth');
        sessionStorage.removeItem('cf_auth');
      } catch { /* ignore */ }
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
