// Absolute URL for a file held by the API.
//
// Document previews used to hardcode `http://localhost:8000`, so every uploaded
// photo, signature and certificate broke the moment the app talked to any other
// host. The origin is derived from VITE_API_URL instead, which means pointing
// the app at a different server is a one-line .env change.
//
// Files are no longer served by a public /uploads mount — that made every
// scanned ID proof and insurance card downloadable by anyone who could reach
// the server. They now stream from /api/v1/files, which verifies a token on
// every request. Because `window.open` and `<img src>` cannot set an
// Authorization header, the token is carried in the query string; the endpoint
// accepts either form.

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000/api/v1';

/** The API origin, without the /api/v1 suffix. */
export const FILE_BASE = API_URL.replace(/\/api\/v1\/?$/, '');

/** The token the user logged in with, read straight from where auth persists it. */
const authToken = (): string => {
  try {
    const raw = localStorage.getItem('cf_auth') ?? sessionStorage.getItem('cf_auth');
    return raw ? (JSON.parse(raw)?.token ?? '') : '';
  } catch {
    return '';
  }
};

/**
 * Build a URL for a stored file.
 *
 * Accepts what the API stores — "/uploads/abc.jpeg" — as well as a bare file
 * name, and points both at the authenticated endpoint. Returns '' for anything
 * that is not a non-empty string: the document fields come out of loosely-typed
 * form state, so a boolean or an array means "no file".
 */
export const fileUrl = (path?: unknown): string => {
  if (typeof path !== 'string' || !path) return '';
  if (/^https?:\/\//i.test(path)) return path;   // already absolute

  // Everything after the last slash: the stored path is "/uploads/<name>", and
  // the endpoint addresses files by name alone.
  const name = path.split('/').filter(Boolean).pop();
  if (!name) return '';

  const token = authToken();
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${API_URL.replace(/\/$/, '')}/files/${encodeURIComponent(name)}${query}`;
};

/**
 * URL for a result attachment recorded against a lab or radiology test.
 *
 * `resultFile` has two historical shapes and both are still in the data:
 *
 *   legacy  "scan.pdf"                    — a bare display name. The file was
 *                                           stored as "<UHID>_<name>", so the
 *                                           path has to be reconstructed.
 *   current "/uploads/<random>.pdf"       — the path the upload returned, which
 *                                           is used as-is.
 *
 * Keeping the branch in one place stops the four call sites drifting apart, and
 * means the legacy form can be dropped later by deleting one arm.
 */
export const resultFileUrl = (patientRef?: unknown, resultFile?: unknown): string => {
  if (typeof resultFile !== 'string' || !resultFile) return '';
  const looksLikeStoredPath = resultFile.includes('/');
  if (looksLikeStoredPath) return fileUrl(resultFile);

  const ref = typeof patientRef === 'string' ? patientRef : '';
  if (!ref) return fileUrl(resultFile);
  return fileUrl(resultFile.startsWith(ref) ? resultFile : `${ref}_${resultFile}`);
};
