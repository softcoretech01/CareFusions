import React from 'react';
import { FileText } from 'lucide-react';

const AdvancePayments = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Advance Payments</h1>
          <p className="text-slate-500 text-sm mt-1">Manage PRO approved orders pending for advance payment.</p>
        </div>
      </div>

      {/* Empty state for now */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">No Advance Payments Pending</h3>
        <p className="text-slate-500 mt-2 max-w-md">
          There are currently no PRO approved orders waiting for advance payment. When a PRO approves an order, it will appear here.
        </p>
      </div>
    </div>
  );
};

export default AdvancePayments;
