import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AccessDenied = ({ module }: { module?: string }) => {
  const navigate = useNavigate();
  return (
    <div className="h-full min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-5">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-800">Access Denied</h1>
      <p className="text-slate-500 mt-2 max-w-md">
        Your role does not have permission to view
        {module ? <> the <strong>{module}</strong> module</> : ' this page'}.
        Contact an administrator if you believe this is a mistake.
      </p>
      <button
        onClick={() => navigate('/admin')}
        className="mt-6 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        Go to Dashboard
      </button>
    </div>
  );
};
