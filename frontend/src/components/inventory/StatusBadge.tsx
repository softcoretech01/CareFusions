import type { ReactNode } from 'react';

// Reference uses small, uppercase, pill-shaped status chips in a handful of
// tones. One component + one tone map keeps every inventory screen consistent.
export type BadgeTone = 'green' | 'amber' | 'orange' | 'blue' | 'rose' | 'slate';

const TONE: Record<BadgeTone, string> = {
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  orange: 'bg-orange-100 text-orange-700',
  blue: 'bg-sky-100 text-sky-700',
  rose: 'bg-rose-100 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
};

// Map the document/stock status strings seen in the reference to a tone.
export const toneForStatus = (status: string): BadgeTone => {
  const s = status.trim().toUpperCase();
  if (['IN STOCK', 'COMPLETED', 'POSTED', 'APPROVED', 'STOCK IN'].includes(s)) return 'green';
  if (['IN TRANSIT'].includes(s)) return 'blue';
  if (['PENDING', 'REORDER REQUIRED', 'LOW STOCK'].includes(s)) return 'amber';
  if (['CRITICAL LOW'].includes(s)) return 'orange';
  if (['REJECTED', 'OUT OF STOCK', 'STOCK OUT', 'RECEIVED', 'CANCELLED', 'EXPIRED'].includes(s)) return 'rose';
  return 'slate';
};

interface StatusBadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export const StatusBadge = ({ children, tone = 'slate', className = '' }: StatusBadgeProps) => (
  <span
    className={`inline-block px-2.5 py-1 text-[11px] font-bold rounded-md tracking-wide uppercase ${TONE[tone]} ${className}`}
  >
    {children}
  </span>
);

// Convenience wrapper that colours itself from the status text.
export const AutoStatusBadge = ({ status, className }: { status: string; className?: string }) => (
  <StatusBadge tone={toneForStatus(status)} className={className}>{status}</StatusBadge>
);
