
import { RotateCcw } from 'lucide-react';

export const ReturnsExpire = () => {
  return (
    <div className="h-full flex flex-col space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Returns & Expire</h2>
        <p className="text-slate-500 text-sm">Manage returned items and track expiring medicines</p>
      </div>
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
        <RotateCcw className="w-16 h-16 text-slate-200 mb-4" />
        <p className="text-slate-500 font-medium text-lg">Returns & Expiry Module Coming Soon</p>
        <p className="text-slate-400 text-sm mt-2">This feature is currently under development.</p>
      </div>
    </div>
  );
};
