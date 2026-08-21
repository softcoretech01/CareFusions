import { useEffect } from 'react';

// Format a local date as YYYY-MM-DD (what <input type="date"> expects).
// Doing this manually avoids the UTC offset shift of toISOString().
export const toInputDate = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Shared defaults for screens that open on a "this month so far" range.
export const monthStart = () => {
  const d = new Date();
  return toInputDate(new Date(d.getFullYear(), d.getMonth(), 1));
};
export const today = () => toInputDate(new Date());

interface DateFilterProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (val: string) => void;
  onDateToChange: (val: string) => void;
  onSearch?: () => void;
  onReset?: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  defaultDateFrom?: string;
  defaultDateTo?: string;
}

export const DateFilter = ({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onSearch,
  onReset,
  defaultDateFrom,
  defaultDateTo,
}: DateFilterProps) => {
  const defaultFrom = defaultDateFrom || toInputDate(new Date());
  const defaultTo = defaultDateTo || toInputDate(new Date());

  // Seed a default range (this month → today) ONLY if the parent hasn't set
  // one. This is a controlled component: the inputs reflect the parent's
  // dateFrom/dateTo directly, and every change is pushed up immediately.
  useEffect(() => {
    if (!dateFrom) onDateFromChange(defaultFrom);
    if (!dateTo) onDateToChange(defaultTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex flex-nowrap whitespace-nowrap items-center gap-2 shadow-sm w-fit">
      <span className="text-slate-400 text-sm font-medium mx-1">From :</span>
      <input
        type="date"
        value={dateFrom}
        max={dateTo || undefined}
        onChange={(e) => onDateFromChange(e.target.value)}
        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
      />
      <span className="text-slate-400 text-sm font-medium mx-1">to :</span>
      <input
        type="date"
        value={dateTo}
        min={dateFrom || undefined}
        onChange={(e) => onDateToChange(e.target.value)}
        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
      />

      <div className="w-px h-6 bg-slate-200 mx-1"></div>

      <button
        onClick={() => onSearch?.()}
        className="px-4 py-1.5 bg-[#00705a] text-white rounded-lg hover:bg-[#005c4a] transition-colors font-medium text-sm"
      >
        Search
      </button>
      <button
        onClick={() => { onDateFromChange(defaultFrom); onDateToChange(defaultTo); onReset?.(); }}
        className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm"
      >
        Cancel
      </button>
    </div>
  );
};
