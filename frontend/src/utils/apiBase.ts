/**
 * The one place the API base URL is resolved.
 *
 * It used to be re-declared in 146 files, in seven different spellings, with a
 * hardcoded `http://localhost:8000` fallback in nineteen of them — so a build
 * made without VITE_API_URL did not fail, it quietly pointed the whole
 * application at the developer's own machine.
 *
 * The value is relative ("/api/v1") in every deployed environment: the
 * frontend's nginx proxies /api/v1 and /uploads to the backend over the compose
 * network. That is what lets a single built image serve Developer, Tester and
 * Production, and lets a promotion re-tag an image digest instead of rebuilding
 * one per environment.
 */

const configured = import.meta.env.VITE_API_URL as string | undefined;

if (!configured) {
  // Loud, but not fatal. A missing variable means the build was made without
  // it — and the same-origin default below is correct for every deployed
  // environment, so white-screening the application would be the worse
  // failure. The message names the cause rather than the symptom.
  console.error(
    '[apiBase] VITE_API_URL is not set — falling back to the same-origin "/api/v1". ' +
      'If API calls fail, the bundle was built without the VITE_API_URL build arg ' +
      '(see frontend/Dockerfile) or without an .env for this environment.',
  );
}

/** Base for every API call, e.g. "/api/v1". Never has a trailing slash. */
export const API_BASE_URL: string = (configured || '/api/v1').replace(/\/+$/, '');

/**
 * The API origin without the "/api/v1" suffix — where uploaded patient
 * documents are served from. Relative ("") when the base is relative, which
 * resolves to the current origin and is proxied by nginx.
 */
export const API_ROOT_URL: string = API_BASE_URL.replace(/\/api\/v1$/, '');
