import { Search, Filter, X, Download } from 'lucide-react';
import type { ReactNode } from 'react';

interface MasterToolbarProps {
  /** current search text */
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  /** filter panel toggle — omit onToggleFilters to hide the filter button */
  showFilters?: boolean;
  onToggleFilters?: () => void;
  /** clear search + filters */
  onClear: () => void;
  /** export current rows to Excel */
  onExport: () => void;
  /** optional right-aligned content (e.g. "Show N entries") */
  right?: ReactNode;
}

/**
 * Standard master-page toolbar: Search · Filter · Cancel (red) · Excel (green).
 * Shared across every master list so the UI is consistent.
 */
export const MasterToolbar = ({
  search, onSearch, placeholder = 'Search...',
  showFilters, onToggleFilters, onClear, onExport, right,
}: MasterToolbarProps) => (
  <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
    <div className="flex items-center gap-3">
      <div className="relative w-72 max-w-full">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
        />
      </div>

      {onToggleFilters && (
        <button
          onClick={onToggleFilters}
          title="Filters"
          className={`p-2 border rounded-lg transition-colors ${showFilters ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
        >
          <Filter className="w-4 h-4" />
        </button>
      )}

      <button
        onClick={onClear}
        title="Clear search & filters"
        className="p-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <button
        onClick={onExport}
        title="Export to Excel"
        className="p-2 border border-emerald-200 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
      >
        <Download className="w-4 h-4" />
      </button>
    </div>

    {right && <div className="flex items-center gap-2 text-sm text-slate-500">{right}</div>}
  </div>
);
