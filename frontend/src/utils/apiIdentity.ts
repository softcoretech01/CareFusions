/**
 * Attaches the signed-in user's identity to every API request.
 *
 * The backend's AuditLogMiddleware records one row for every POST/PUT/PATCH/
 * DELETE under /api/v1 and reads the actor from X-User-Name / X-User-Role /
 * X-Employee-Name / X-Department, falling back to the literal "Admin" when the
 * headers are absent. Nothing in the frontend ever sent them, so the entire
 * audit trail was attributed to "Admin" regardless of who was logged in — which
 * makes it useless as an accountability record.
 *
 * Rather than touch the ~200 places that call `fetch` directly (and the axios
 * calls too), this installs one global fetch/axios interceptor at startup. It
 * only adds headers on requests to our own API base, so third-party requests
 * are untouched.
 *
 * The Authorization header is sent too. No backend route requires it yet, but
 * sending it now means enabling auth server-side does not need another frontend
 * sweep.
 */
import { API_BASE_URL } from '@/utils/apiBase';
import axios from 'axios';
import { store } from '../redux/store';

const API_BASE = API_BASE_URL;

const identityHeaders = (): Record<string, string> => {
  const { user, token } = store.getState().auth;
  if (!user) return {};

  const h: Record<string, string> = {
    'X-User-Name': user.username || user.name || '',
    'X-Employee-Name': user.name || '',
    'X-User-Role': user.role || '',
    'X-Department': user.department || '',
  };
  if (token) h['Authorization'] = `Bearer ${token}`;
  // Drop empties so we never overwrite a real value with a blank string.
  return Object.fromEntries(Object.entries(h).filter(([, v]) => v !== ''));
};

/** True for requests aimed at our own API (absolute or relative). */
const isOwnApi = (url: string): boolean => {
  if (!url) return false;
  if (API_BASE && url.startsWith(API_BASE)) return true;
  return url.startsWith('/api/v1');
};

let installed = false;

export const installApiIdentity = () => {
  if (installed) return;
  installed = true;

  // ── fetch ────────────────────────────────────────────────────────────
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string' ? input
      : input instanceof URL ? input.toString()
      : input.url;

    if (!isOwnApi(url)) return nativeFetch(input, init);

    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    for (const [k, v] of Object.entries(identityHeaders())) {
      // A caller that set the header explicitly wins.
      if (!headers.has(k)) headers.set(k, v);
    }
    return nativeFetch(input, { ...init, headers });
  };

  // ── axios (IPD, Discharges and a few other screens use it) ───────────
  axios.interceptors.request.use((config) => {
    const url = `${config.baseURL ?? ''}${config.url ?? ''}`;
    if (!isOwnApi(url)) return config;
    for (const [k, v] of Object.entries(identityHeaders())) {
      if (config.headers.get(k) == null) config.headers.set(k, v);
    }
    return config;
  });
};
