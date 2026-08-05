import { AlertTriangle } from 'lucide-react';
import { useIPD } from '../../contexts/IPDContext';

/** Shows any IPD API error (failed admit/transfer/discharge) from the context. */
export const IpdErrorBanner = () => {
  const { apiError, clearError } = useIPD();
  if (!apiError) return null;
  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span className="flex-1">{apiError}</span>
      <button onClick={clearError} className="text-red-500 hover:text-red-700 font-medium">Dismiss</button>
    </div>
  );
};
