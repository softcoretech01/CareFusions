import type { WardTransferRecord } from '../../contexts/IPDContext';
import { useIPD } from '../../contexts/IPDContext';

interface WardTransferHistoryProps {
  transfers: WardTransferRecord[];
}

export const WardTransferHistory = ({ transfers }: WardTransferHistoryProps) => {
  const { wards, beds } = useIPD();

  if (transfers.length === 0) {
    return (
      <div className="bg-slate-50 rounded-lg p-6 text-center">
        <p className="text-slate-500 text-sm">No ward transfers recorded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-800">Ward Transfer History</h3>
      <div className="space-y-3">
        {transfers.map((transfer, index) => {
          const fromWard = wards.find(w => w.id === transfer.fromWardId);
          const toWard = wards.find(w => w.id === transfer.toWardId);
          const fromBed = beds.find(b => b.id === transfer.fromBedId);
          const toBed = beds.find(b => b.id === transfer.toBedId);

          return (
            <div key={transfer.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Transfer #{index + 1}</p>
                  <p className="text-xs text-slate-600">
                    {new Date(transfer.transferDate).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 items-center text-sm">
                {/* From */}
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <p className="text-xs font-semibold text-red-700 mb-1">FROM</p>
                  <p className="font-medium text-red-900">{fromWard?.name || 'Unknown'}</p>
                  <p className="text-xs text-red-700">Bed: {fromBed?.bedNumber || 'N/A'}</p>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="text-slate-400 text-2xl">→</div>
                </div>

                {/* To */}
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <p className="text-xs font-semibold text-green-700 mb-1">TO</p>
                  <p className="font-medium text-green-900">{toWard?.name || 'Unknown'}</p>
                  <p className="text-xs text-green-700">Bed: {toBed?.bedNumber || 'N/A'}</p>
                </div>
              </div>

              {transfer.transferReason && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 mb-1">Reason</p>
                  <p className="text-sm text-slate-700">{transfer.transferReason}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
