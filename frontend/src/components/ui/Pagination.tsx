import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({ page, pageSize, totalItems, onPageChange }: PaginationProps) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  // Compact window of page numbers around the current page.
  const from = Math.max(1, page - 2);
  const to = Math.min(totalPages, page + 2);
  const pages: number[] = [];
  for (let i = from; i <= to; i++) pages.push(i);

  const btn = 'min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium border transition-colors';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100">
      <span className="text-sm text-slate-500">
        Showing {start}–{end} of {totalItems}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {from > 1 && (
          <>
            <button onClick={() => onPageChange(1)} className={`${btn} border-slate-200 text-slate-600 hover:bg-slate-50`}>1</button>
            {from > 2 && <span className="px-1 text-slate-400">…</span>}
          </>
        )}

        {pages.map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`${btn} ${p === page ? 'bg-primary text-white border-primary' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {p}
          </button>
        ))}

        {to < totalPages && (
          <>
            {to < totalPages - 1 && <span className="px-1 text-slate-400">…</span>}
            <button onClick={() => onPageChange(totalPages)} className={`${btn} border-slate-200 text-slate-600 hover:bg-slate-50`}>{totalPages}</button>
          </>
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
