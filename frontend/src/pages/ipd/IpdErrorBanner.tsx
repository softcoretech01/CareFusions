import { AlertTriangle } from 'lucide-react';
import { useIPD } from '../../contexts/IPDContext';

/** Shows any IPD API error (failed admit/transfer/discharge) from the context. */
export const IpdErrorBanner = () => {
  const { apiError, clearError } = useIPD();
  if (!apiError) return null;

  // Discharge blockers come as "Cannot discharge: <reason>\n• blocker1\n• blocker2".
  // Split on newline so each reason renders on its own line.
  const lines = apiError.split('\n').filter(Boolean);

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1">
        {lines.map((line, i) => (
          <p key={i} className={i === 0 ? 'font-semibold' : 'mt-0.5'}>{line}</p>
        ))}
      </div>
      <button onClick={clearError} className="text-red-500 hover:text-red-700 font-medium shrink-0">Dismiss</button>
    </div>
  );
};
