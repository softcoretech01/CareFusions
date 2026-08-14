// Single source of truth for Indian-rupee formatting across the inventory
// module. The pages used to each carry their own copy — some with 2 decimals,
// some with 0 — which is why values looked inconsistent screen to screen.
export const inr = (n: number | null | undefined, fractionDigits = 2) =>
  `₹${(n ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;

// Compact form for the big summary cards (e.g. ₹53,000 with no paise).
export const inr0 = (n: number | null | undefined) => inr(n, 0);
