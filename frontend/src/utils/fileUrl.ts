import { API_BASE_URL } from '@/utils/apiBase';
// Absolute URL for a file served by the API's /uploads mount.
//
// Document previews used to hardcode `http://localhost:8000`, so every uploaded
// photo, signature and certificate broke the moment the app talked to any other
// host. The origin is derived from VITE_API_URL instead, which means pointing
// the app at a different server is a one-line .env change.

const API_URL = API_BASE_URL;

/** The API origin, without the /api/v1 suffix. */
export const FILE_BASE = API_URL.replace(/\/api\/v1\/?$/, '');

/**
 * Build an absolute URL for a stored file path (e.g. "/uploads/abc.jpeg").
 * Returns '' for anything that is not a non-empty string — the document fields
 * come out of loosely-typed form state, so a boolean or array means "no file".
 */
export const fileUrl = (path?: unknown): string => {
  if (typeof path !== 'string' || !path) return '';
  if (/^https?:\/\//i.test(path)) return path;   // already absolute
  return `${FILE_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
};
