
import { useInvestigations } from '../../contexts/InvestigationContext';
import { X, Printer, FlaskConical, ScanLine, FileText, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ResultViewerProps {
  patientId: string;
  category: 'Lab' | 'Radiology';
  onClose: () => void;
}

export const ResultViewer: React.FC<ResultViewerProps> = ({ patientId, category, onClose }) => {
  const { getOrdersByPatient } = useInvestigations();
  
  const TEST_DEFAULTS: Record<string, { range: string, unit: string }> = {
    'Complete Blood Count (CBC)': { range: '4.5 - 10.0', unit: '10^3/µL' },
    'Lipid Profile': { range: '< 200', unit: 'mg/dL' },
    'Serum Creatinine': { range: '0.7 - 1.3', unit: 'mg/dL' },
    'Hemoglobin': { range: '12.0 - 15.5', unit: 'g/dL' },
    'Fasting Blood Sugar': { range: '70 - 100', unit: 'mg/dL' },
    'Thyroid Profile': { range: '0.4 - 4.0', unit: 'mIU/L' },
  };

  const orders = getOrdersByPatient(patientId)
    .filter(o => o.category === category && (o.status === 'Completed' || o.status === 'Partial' || o.status === 'Verified'));

  const handlePrint = () => {
    toast.success('Printing report...');
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`px-6 py-5 flex items-center justify-between text-white ${category === 'Lab' ? 'bg-blue-600' : 'bg-purple-600'}`}>
          <div className="flex items-center gap-3">
            {category === 'Lab' ? <FlaskConical className="w-6 h-6" /> : <ScanLine className="w-6 h-6" />}
            <div>
              <h2 className="text-xl font-bold tracking-wide">
                {category === 'Lab' ? 'Laboratory Results' : 'Radiology Reports'}
              </h2>
              <p className="text-sm opacity-80">Patient ID: {patientId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
              <Printer className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6 bg-slate-50 print-content">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No completed results available for this patient.
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800">Order: {order.id}</h3>
                    <p className="text-xs text-slate-500">Ordered by {order.orderedBy} on {new Date(order.orderedAt).toLocaleString()}</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-md uppercase flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> {order.status}
                  </span>
                </div>
                
                <div className="divide-y divide-slate-100">
                  {category === 'Lab' ? (
                    <div className="p-0 overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase">
                          <tr>
                            <th className="px-5 py-3">Test Name</th>
                            <th className="px-5 py-3">Result</th>
                            <th className="px-5 py-3">Reference Range</th>
                            <th className="px-5 py-3">Unit</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3 text-center">Attachment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {order.tests.filter(t => t.status === 'Completed' || t.status === 'Verified').map(test => (
                            <tr key={test.id} className="hover:bg-slate-50/50">
                              <td className="px-5 py-3 font-bold text-slate-700">{test.name}</td>
                              <td className={`px-5 py-3 font-mono font-bold ${test.isCritical ? 'text-red-600' : 'text-slate-800'}`}>
                                {test.resultValue || '-'}
                                {test.isCritical && <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase">Critical</span>}
                              </td>
                              <td className="px-5 py-3 text-slate-500 font-mono">{test.normalRange || TEST_DEFAULTS[test.name]?.range || '-'}</td>
                              <td className="px-5 py-3 text-slate-500">{test.unit || TEST_DEFAULTS[test.name]?.unit || '-'}</td>
                              <td className="px-5 py-3">
                                <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> {test.status}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-center">
                                {test.resultFile ? (
                                  <a href="#" onClick={(e) => { e.preventDefault(); window.open('/TechHMS-IPD.pdf', '_blank'); }} className="inline-flex items-center justify-center gap-1.5 p-1.5 px-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-xs" title={test.resultFile}>
                                    <FileText className="w-3.5 h-3.5 shrink-0" /> <span className="truncate max-w-[120px]">{test.resultFile}</span>
                                  </a>
                                ) : (
                                  <span className="text-slate-300">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    order.tests.filter(t => t.status === 'Completed' || t.status === 'Verified').map(test => (
                      <div key={test.id} className="p-5 flex flex-col md:flex-row gap-4">
                        <div className="md:w-1/3">
                          <h4 className="font-bold text-slate-700 flex items-center gap-2">
                            {test.name}
                            {test.isCritical && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase">Critical</span>}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1">Completed: {test.completedAt ? new Date(test.completedAt).toLocaleString() : 'N/A'}</p>
                          <span className="text-xs font-bold text-green-600 flex items-center gap-1 mt-2">
                            <CheckCircle className="w-3 h-3" /> {test.status}
                          </span>
                        </div>
                        <div className="md:w-2/3 space-y-3">
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Radiologist Impression</p>
                            <p className="text-sm font-medium text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100">
                              {test.resultValue || 'No impression entered.'}
                            </p>
                          </div>
                          {test.resultFile && (
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Attached Scan / Report</p>
                              <a href="#" onClick={(e) => { e.preventDefault(); window.open('/TechHMS-IPD.pdf', '_blank'); }} className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-bold hover:bg-purple-100 transition-colors">
                                <FileText className="w-4 h-4" /> {test.resultFile}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
