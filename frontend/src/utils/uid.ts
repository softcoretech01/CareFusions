/**
 * Generate a unique id that works everywhere the app is served.
 *
 * `crypto.randomUUID()` only exists in a *secure context* (HTTPS or localhost).
 * When the app is opened over plain HTTP on a LAN IP (e.g. http://100.86.181.18),
 * `crypto.randomUUID` is undefined and throws. `crypto.getRandomValues`, by
 * contrast, is available in insecure contexts too, so we fall back to building
 * an RFC-4122 v4 UUID from it, and to a timestamp+random string as a last resort.
 */
export const uid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; // version 4
    b[8] = (b[8] & 0x3f) | 0x80; // variant 10
    const h = Array.from(b, x => x.toString(16).padStart(2, '0'));
    return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`;
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};
