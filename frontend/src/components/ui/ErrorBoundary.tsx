import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export const ErrorBoundary = () => {
  const error = useRouteError();
  
  let errorMessage = 'An unexpected error occurred.';
  let errorDetails = '';

  if (isRouteErrorResponse(error)) {
    errorMessage = error.data?.message || error.statusText;
    errorDetails = `Status: ${error.status}`;
  } else if (error instanceof Error) {
    errorMessage = error.message;
    errorDetails = error.stack || '';
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100">
        <div className="bg-red-50 p-6 flex flex-col items-center border-b border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">Oops! Something went wrong</h1>
          <p className="text-slate-600 text-center">{errorMessage}</p>
        </div>
        
        {errorDetails && (
          <div className="p-6 bg-slate-50 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Error Details</h3>
            <pre className="bg-slate-800 text-slate-300 p-4 rounded-lg text-xs overflow-x-auto font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
              {errorDetails}
            </pre>
          </div>
        )}

        <div className="p-6 flex items-center justify-center gap-4">
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Page
          </button>
          <Link 
            to="/"
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 font-medium"
          >
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
