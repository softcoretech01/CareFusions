
import { useInvestigations } from '../../contexts/InvestigationContext';
import { X, Printer, FlaskConical, ScanLine, FileText, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { OrderSourceTag, orderSource } from './OrderSourceTag';

interface ResultViewerProps {
  patientId: string;
  category: 'Lab' | 'Radiology';
  onClose: () => void;
}

export const ResultViewer: React.FC<ResultViewerProps> = ({ patientId, category, onClose }) => {
  const { getOrdersByPatient } = useInvestigations();
  const orders = getOrdersByPatient(patientId)
    .filter(o => o.category === category && (o.status === 'Completed' || o.status === 'Partial' || o.status === 'Verified'));

  const handlePrint = () => {
    toast.success('Printing report...');
    window.print();
  };

  return (
    <div className="print-isolated fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 print:p-0 print:absolute print:inset-0 print:bg-white print:z-[99999] print:block">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] print:max-w-none print:w-full print:h-auto print:max-h-none print:shadow-none print:rounded-none print:border-none print:block">
        
        {/* UI Header (Hidden in Print) */}
        <div className={`px-6 py-5 flex items-center justify-between text-white print:hidden ${category === 'Lab' ? 'bg-blue-600' : 'bg-purple-600'}`}>
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

        {/* Print Content Area */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6 bg-slate-50 print:p-8 print:bg-white print:overflow-visible print:block print:space-y-8 print:text-black">
          
          {/* Professional Print Header (Only visible in Print) */}
          <div className="hidden print:block border-b-4 border-slate-800 pb-6 mb-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold uppercase tracking-widest text-slate-900">CareFusions Hospital</h1>
              <p className="text-sm text-slate-600 mt-1">123 Health Avenue, Medical District • Contact: +1 234 567 8900</p>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 uppercase mb-2">
                  {category === 'Lab' ? 'Official Laboratory Report' : 'Official Radiology Report'}
                </h2>
                <div className="flex gap-8 text-sm font-medium">
                  <p><span className="text-slate-500 mr-1">Patient ID:</span> {patientId}</p>
                </div>
              </div>
              <div className="text-right text-sm font-medium">
                <p><span className="text-slate-500 mr-1">Report Printed:</span> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12 text-slate-400 print:text-black print:font-bold">
              No completed results available for this patient.
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm print:shadow-none print:border-none print:rounded-none print:mb-12">
                
                {/* Order Header */}
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between print:bg-transparent print:px-0 print:border-b-2 print:border-slate-800 print:pb-3 print:mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 print:text-lg">Order ID: {order.id}</h3>
                      {/* Badge on screen; the printed report carries the same
                          fact in the line below, so it is hidden for print. */}
                      <OrderSourceTag source={orderSource(order.type)} className="print:hidden" />
                    </div>
                    <p className="text-xs text-slate-500 print:text-sm print:mt-1">
                      Ordered by <span className="font-bold text-slate-800">{order.orderedBy}</span>
                      {' '}from <span className="font-bold text-slate-800">{orderSource(order.type)}</span>
                      {' '}on {new Date(order.orderedAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-md uppercase flex items-center gap-1 print:hidden">
                    <CheckCircle className="w-3 h-3" /> {order.status === 'Verified' ? 'Completed' : order.status}
                  </span>
                </div>
                
                <div className="divide-y divide-slate-100 print:divide-slate-300">
                  {category === 'Lab' ? (
                    <div className="p-0 overflow-x-auto print:overflow-visible">
                      <table className="w-full text-sm text-left print:text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase print:bg-slate-100 print:text-slate-900 print:border-b-2 print:border-slate-300">
                          <tr>
                            <th className="px-5 py-3 print:py-3 print:px-2">Test Name</th>
                            <th className="px-5 py-3 print:py-3 print:px-2">Result</th>
                            <th className="px-5 py-3 print:py-3 print:px-2">Status</th>
                            <th className="px-5 py-3 text-center print:hidden">Attachment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                          {order.tests.filter(t => t.status === 'Completed' || t.status === 'Verified').map(test => (
                            <tr key={test.id} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                              <td className="px-5 py-3 font-bold text-slate-700 print:py-3 print:px-2 print:text-slate-900">{test.name}</td>
                              <td className={`px-5 py-3 font-mono font-bold print:py-3 print:px-2 ${test.isCritical ? 'text-red-600 print:text-red-700' : 'text-slate-800 print:text-slate-900'}`}>
                                {test.resultValue || '-'}
                                {test.isCritical && <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase print:bg-transparent print:border print:border-red-600 print:text-red-700">Critical</span>}
                              </td>
                              <td className="px-5 py-3 print:py-3 print:px-2">
                                <span className="text-xs font-bold text-green-600 flex items-center gap-1 print:text-slate-800 print:font-semibold">
                                  <CheckCircle className="w-3 h-3 print:hidden" /> {test.status === 'Verified' ? 'Completed' : test.status}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-center print:hidden">
                                {test.resultFile ? (
                                  <a href="#" onClick={(e) => { 
                                    e.preventDefault(); 
                                    const baseUrl = (import.meta.env.VITE_API_URL as string || 'http://localhost:8000').replace('/api/v1', '');
                                    const rf = test.resultFile ?? '';
                                    const filename = rf.startsWith(patientId) ? rf : `${patientId}_${rf}`;
                                    window.open(`${baseUrl}/uploads/${filename}`, '_blank'); 
                                  }} className="inline-flex items-center justify-center gap-1.5 p-1.5 px-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-xs" title={test.resultFile}>
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
                      <div key={test.id} className="p-5 flex flex-col md:flex-row gap-4 print:p-0 print:py-6 print:block">
                        <div className="md:w-1/3 print:w-full print:mb-4">
                          <h4 className="font-bold text-slate-700 print:text-lg print:text-slate-900 flex items-center gap-2">
                            {test.name}
                            {test.isCritical && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase print:border print:border-red-600 print:bg-transparent">Critical</span>}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1 print:text-sm print:text-slate-600">Completed: {test.completedAt ? new Date(test.completedAt).toLocaleString() : 'N/A'}</p>
                        </div>
                        <div className="md:w-2/3 space-y-3 print:w-full">
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1 print:text-slate-600">Radiologist Impression</p>
                            <p className="text-sm font-medium text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100 print:bg-transparent print:border-0 print:p-0 print:text-base print:leading-relaxed">
                              {test.resultValue || 'No impression entered.'}
                            </p>
                          </div>
                          {test.resultFile && (
                            <div className="print:hidden">
                              <p className="text-xs font-bold text-slate-400 uppercase mb-1">Attached Scan / Report</p>
                              <a href="#" onClick={(e) => { 
                                e.preventDefault(); 
                                const baseUrl = (import.meta.env.VITE_API_URL as string || 'http://localhost:8000').replace('/api/v1', '');
                                const rf = test.resultFile ?? '';
                                const filename = rf.startsWith(patientId) ? rf : `${patientId}_${rf}`;
                                window.open(`${baseUrl}/uploads/${filename}`, '_blank'); 
                              }} className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-bold hover:bg-purple-100 transition-colors">
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

          {/* Professional Footer (Only visible in Print) */}
          <div className="hidden print:block mt-16 pt-8 border-t-2 border-slate-200">
            <div className="flex justify-between items-end">
              <div className="text-sm text-slate-500">
                <p>This is a computer-generated report.</p>
                <p>Please consult your doctor for interpretation.</p>
              </div>
              <div className="text-center">
                <div className="w-48 border-b border-slate-400 mb-2"></div>
                <p className="font-bold text-slate-700">Authorized Signature</p>
                <p className="text-xs text-slate-500">Laboratory Director</p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};
