import { useState, useEffect } from 'react';

interface DateFilterProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (val: string) => void;
  onDateToChange: (val: string) => void;
  onSearch?: () => void;
  onReset?: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
}

export const DateFilter = ({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onSearch,
  onReset
}: DateFilterProps) => {
  // Format local date manually to avoid UTC offset issues
  const formatYYYYMMDD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultFrom = formatYYYYMMDD(firstDay);
  const defaultTo = formatYYYYMMDD(today);

  const [localFrom, setLocalFrom] = useState(defaultFrom);
  const [localTo, setLocalTo] = useState(defaultTo);

  // Force parent to adopt our defaults on mount
  useEffect(() => {
    onDateFromChange(defaultFrom);
    onDateToChange(defaultTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync if props change externally
  useEffect(() => {
    if (dateFrom !== undefined && dateFrom !== localFrom) {
      setLocalFrom(dateFrom || defaultFrom);
    }
    if (dateTo !== undefined && dateTo !== localTo) {
      setLocalTo(dateTo || defaultTo);
    }
  }, [dateFrom, dateTo]);

  const handleSearch = () => {
    onDateFromChange(localFrom);
    onDateToChange(localTo);
    if (onSearch) onSearch();
  };

  const handleReset = () => {
    setLocalFrom(defaultFrom);
    setLocalTo(defaultTo);
    onDateFromChange(defaultFrom);
    onDateToChange(defaultTo);
    if (onReset) onReset();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex flex-wrap items-center gap-2 shadow-sm w-fit">
      <span className="text-slate-400 text-sm font-medium mx-1">From :</span>
      <input
        type="date"
        value={localFrom}
        onChange={(e) => setLocalFrom(e.target.value)}
        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
      />
      <span className="text-slate-400 text-sm font-medium mx-1">to :</span>
      <input
        type="date"
        value={localTo}
        onChange={(e) => setLocalTo(e.target.value)}
        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
      />
      
      <div className="w-px h-6 bg-slate-200 mx-1"></div>
      
      <button
        onClick={handleSearch}
        className="px-4 py-1.5 bg-[#00705a] text-white rounded-lg hover:bg-[#005c4a] transition-colors font-medium text-sm"
      >
        Search
      </button>
      <button
        onClick={handleReset}
        className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm"
      >
        Cancel
      </button>
    </div>
  );
};
