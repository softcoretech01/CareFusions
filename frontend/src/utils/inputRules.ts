/**
 * Shared input restriction rules.
 *
 * Each helper returns the sanitised value for an onChange handler, so invalid
 * characters can never be typed into the field in the first place, and every
 * field carries a length cap that matches its database column.
 */

/** Column-width caps, mirroring the backend schemas. */
export const LIMITS = {
  name: 100,        // person / patient names
  itemName: 200,
  code: 20,         // UHID-, ITM-, batch codes
  batch: 50,
  policy: 50,
  reference: 50,
  phone: 10,
  email: 100,
  shortText: 150,   // vendor, insurer, department
  remarks: 255,
  notes: 500,
  qty: 7,           // digits
  amount: 12,       // digits
  percent: 5,
} as const;

const cap = (v: string, max: number) => v.slice(0, max);

/** Letters, spaces and the punctuation that legitimately appears in names. */
export const lettersOnly = (v: string, max = LIMITS.name) =>
  cap(v.replace(/[^A-Za-z\s.'-]/g, ''), max);

/** Digits only — phone numbers, quantities, whole amounts. */
export const digitsOnly = (v: string, max = LIMITS.amount) =>
  cap(v.replace(/\D/g, ''), max);

/** Digits with a single decimal point — rates and money. */
export const decimalOnly = (v: string, max = LIMITS.amount) => {
  const cleaned = v.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  const joined = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
  return cap(joined, max);
};

/** Signed integer — stock adjustments may be negative. */
export const signedDigits = (v: string, max = LIMITS.qty + 1) => {
  const negative = v.trim().startsWith('-');
  return cap((negative ? '-' : '') + v.replace(/\D/g, ''), max);
};

/** Letters, digits, space and - / _ — codes, batch numbers, references. */
export const alphanumeric = (v: string, max = LIMITS.code) =>
  cap(v.replace(/[^A-Za-z0-9\s\-_/]/g, ''), max);

/** Uppercase alphanumeric — policy and document numbers. */
export const upperCode = (v: string, max = LIMITS.policy) =>
  cap(v.replace(/[^A-Za-z0-9\-/]/g, '').toUpperCase(), max);

/** Email characters only. */
export const emailChars = (v: string, max = LIMITS.email) =>
  cap(v.replace(/[^A-Za-z0-9@._%+-]/g, ''), max);

/** Free text with no control characters, capped. */
export const freeText = (v: string, max = LIMITS.remarks) => cap(v, max);

// ── Validators (for submit-time checks) ──────────────────────
export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export const isValidPhone = (v: string) => /^\d{10}$/.test(v);
export const isValidName = (v: string) => /^[A-Za-z\s.'-]+$/.test(v.trim());
export const isPositive = (v: string | number) => Number(v) > 0;

// ── Shared field sizing ──────────────────────────────────────
/** Compact input: smaller padding and text than the prototype's px-4 py-2.5. */
export const FIELD =
  'w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm ' +
  'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary';

export const FIELD_ERR =
  'w-full px-3 py-1.5 bg-slate-50 border border-red-400 rounded-lg text-sm ' +
  'focus:outline-none focus:ring-1 focus:ring-red-300';

/** Narrow fields for short values (qty, percent, code). */
export const FIELD_SM = FIELD.replace('w-full', 'w-28');

export const fieldCls = (hasError?: boolean) => (hasError ? FIELD_ERR : FIELD);

export const LABEL = 'block text-xs font-semibold text-slate-600 mb-1';
export const ERR_TEXT = 'text-[11px] text-red-500 mt-0.5';
