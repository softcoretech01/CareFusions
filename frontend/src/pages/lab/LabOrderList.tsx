import { useState } from 'react';
import { useInvestigations, type InvestigationOrder, type InvestigationTest } from '../../contexts/InvestigationContext';
import { Upload, FileText, X, Beaker, CheckSquare, AlertTriangle, ShieldCheck, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { DateFilter } from '../../components/ui/DateFilter';

export const LabOrderList = () => {
  const { orders, updateTestResult, updateTestStatus, verifyTest } = useInvestigations();
  const labOrders = orders.filter(o => o.category === 'Lab');

  const [activeOrder, setActiveOrder] = useState<InvestigationOrder | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = labOrders.filter(order => {
    if (fromDate && new Date(order.orderedAt) < new Date(fromDate)) return false;
    if (toDate && new Date(order.orderedAt) > new Date(toDate + 'T23:59:59')) return false;
    if (searchQuery && !order.id.toLowerCase().includes(searchQuery.toLowerCase()) && !order.patientName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleActionClick = (order: InvestigationOrder) => {
    setActiveOrder(order);
  };

  const handleCloseModal = () => {
    setActiveOrder(null);
  };

  const handleSaveResult = async (testId: string, resultValue: string, resultFile?: string) => {
    if (!activeOrder) return;

    // Abnormal/critical flagging is decided by the backend from the test's own
    // reference range and its critical-value flag in the test master, so the
    // result of the save tells us whether to warn.
    updateTestResult(activeOrder.id, testId, resultValue, resultFile);

    const test = activeOrder.tests.find(t => t.id === testId);
    const range = test?.normalRange;
    const value = parseFloat(resultValue);
    const bounds = range?.match(/^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/);
    if (bounds && !isNaN(value) && (value < parseFloat(bounds[1]) || value > parseFloat(bounds[2]))) {
      toast.error(`Out of reference range (${range})`, { icon: '⚠️' });
    }
    toast.success('Result saved successfully');
  };

  const handleUpdateStatus = (testId: string, status: InvestigationTest['status']) => {
    if (!activeOrder) return;
    updateTestStatus(activeOrder.id, testId, status);
    toast.success(`Status updated to ${status}`);

    // Update local state to reflect immediately in the modal
    setActiveOrder(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        tests: prev.tests.map(t => t.id === testId ? { ...t, status } : t)
      };
    });
  };

  const handleVerify = (testId: string) => {
    if (!activeOrder) return;
    verifyTest(activeOrder.id, testId, 'Dr. Smith');
    toast.success('Test verified');

    setActiveOrder(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        tests: prev.tests.map(t => t.id === testId ? { ...t, status: 'Verified' as const } : t)
      };
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Test Orders</h1>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search Order ID or Patient..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 shadow-sm"
          />
        </div>
        <div className="flex items-center">
          <DateFilter
            dateFrom={fromDate}
            dateTo={toDate}
            onDateFromChange={setFromDate}
            onDateToChange={setToDate}
            onSearch={() => {}}
            onReset={() => { setFromDate(''); setToDate(''); }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Order ID</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Ordered By</th>
              <th className="px-4 py-3">Test Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-14 text-center text-slate-400">
                  No lab orders found.
                </td>
              </tr>
            ) : filteredOrders.map(order => (
              <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-slate-900">{order.id}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${order.type === 'IP' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {order.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-slate-700 font-medium">{order.patientName}</div>
                  <div className="text-xs text-slate-500">{order.patientId}</div>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{order.orderedBy}</td>
                <td className="px-4 py-3 text-slate-700 text-sm font-medium">{order.tests.map(t => t.name).join(', ')}</td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${order.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      order.status === 'Partial' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                    }`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleActionClick(order)}
                    className="px-3 py-1.5 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors flex items-center gap-1.5 mx-auto"
                  >
                    <Upload className="w-3.5 h-3.5" /> Manage Tests
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Upload Results</h3>
                <p className="text-xs text-slate-500 mt-0.5">Order {activeOrder.id} • {activeOrder.patientName} ({activeOrder.patientId})</p>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
              {activeOrder.tests.map(test => (
                <div key={test.id} className={`p-4 border rounded-xl ${test.isCritical ? 'border-red-200 bg-red-50/30' : 'border-slate-200 bg-slate-50/50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" /> {test.name}
                      {test.isCritical && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    </h4>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${test.status === 'Pending' ? 'bg-slate-200 text-slate-700' :
                          test.status === 'Sample Collected' ? 'bg-purple-100 text-purple-700' :
                            test.status === 'Sample Accepted' ? 'bg-blue-100 text-blue-700' :
                              test.status === 'Completed' ? 'bg-amber-100 text-amber-700' :
                                test.status === 'Verified' ? 'bg-green-100 text-green-700' :
                                  'bg-slate-100 text-slate-600'
                        }`}>
                        {test.status}
                      </span>
                    </div>
                  </div>

                  {/* Actions based on status */}
                  <div className="mt-4 pt-4 border-t border-slate-200/60">
                    {test.status === 'Pending' && (
                      <button
                        onClick={() => handleUpdateStatus(test.id, 'Sample Collected')}
                        className="px-4 py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 font-bold text-xs rounded-lg flex items-center gap-2"
                      >
                        <Beaker className="w-4 h-4" /> Mark Sample Collected
                      </button>
                    )}

                    {test.status === 'Sample Collected' && (
                      <button
                        onClick={() => handleUpdateStatus(test.id, 'Sample Accepted')}
                        className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-xs rounded-lg flex items-center gap-2"
                      >
                        <CheckSquare className="w-4 h-4" /> Accept Sample in Lab
                      </button>
                    )}

                    {(test.status === 'Sample Collected' || test.status === 'Sample Accepted' || test.status === 'Completed' || test.status === 'Verified') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Result Value</label>
                          <input
                            type="text"
                            defaultValue={test.resultValue}
                            placeholder="Enter value"
                            disabled={test.status === 'Verified'}
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-blue-500 ${test.status === 'Verified' ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200'}`}
                            onBlur={(e) => {
                              if (e.target.value !== test.resultValue) {
                                handleSaveResult(test.id, e.target.value, test.resultFile);
                              }
                            }}
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Upload Report (PDF/IMG)</label>
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              disabled={test.status === 'Verified'}
                              className={`w-full px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:border-blue-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${test.status === 'Verified' ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white border-slate-200'}`}
                              onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  handleSaveResult(test.id, test.resultValue || '', e.target.files[0].name);
                                }
                              }}
                            />
                            {test.resultFile && <p className="text-xs text-blue-600 mt-1 font-medium">Uploaded: {test.resultFile}</p>}
                          </div>
                          {test.status === 'Completed' && (
                            <button
                              onClick={() => handleVerify(test.id)}
                              className="px-4 py-2 h-[38px] bg-green-600 text-white hover:bg-green-700 font-bold text-xs rounded-lg flex items-center gap-2 transition-colors shrink-0"
                            >
                              <ShieldCheck className="w-4 h-4" /> Verify
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={handleCloseModal} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-colors">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
