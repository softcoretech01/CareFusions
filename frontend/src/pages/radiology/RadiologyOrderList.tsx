import { useState } from 'react';
import { useInvestigations, type InvestigationOrder } from '../../contexts/InvestigationContext';
import { Upload, FileText, CheckCircle, X, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { DateFilter } from '../../components/ui/DateFilter';

export const RadiologyOrderList = () => {
  const { orders, updateTestResult } = useInvestigations();
  const radOrders = orders.filter(o => o.category === 'Radiology');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [activeOrder, setActiveOrder] = useState<InvestigationOrder | null>(null);
  const [tempResults, setTempResults] = useState<Record<string, { resultValue: string; resultFile: string; isCritical: boolean }>>({});

  const filteredOrders = radOrders.filter(order => {
    if (fromDate && new Date(order.orderedAt) < new Date(fromDate)) return false;
    if (toDate && new Date(order.orderedAt) > new Date(toDate + 'T23:59:59')) return false;
    if (searchQuery && !order.id.toLowerCase().includes(searchQuery.toLowerCase()) && !order.patientName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleUploadClick = (order: InvestigationOrder) => {
    setActiveOrder(order);

    // Initialize temp results with existing data
    const initialTemp: Record<string, { resultValue: string; resultFile: string; isCritical: boolean }> = {};
    order.tests.forEach(test => {
      initialTemp[test.id] = {
        resultValue: test.resultValue || '',
        resultFile: test.resultFile || '',
        isCritical: test.isCritical || false
      };
    });
    setTempResults(initialTemp);
  };

  const handleCloseModal = () => {
    setActiveOrder(null);
    setTempResults({});
  };

  const handleTempChange = (testId: string, field: 'resultValue' | 'resultFile' | 'isCritical', value: string | boolean) => {
    setTempResults(prev => ({
      ...prev,
      [testId]: {
        ...prev[testId],
        [field]: value
      }
    }));
  };

  const handleSaveAll = () => {
    if (!activeOrder) return;

    let updatedCount = 0;
    activeOrder.tests.forEach(test => {
      const temp = tempResults[test.id];
      if (temp && (temp.resultValue !== test.resultValue || temp.resultFile !== test.resultFile || temp.isCritical !== test.isCritical)) {
        updateTestResult(activeOrder.id, test.id, temp.resultValue, temp.resultFile, temp.isCritical);
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      toast.success('Radiology reports saved successfully!');
    }

    handleCloseModal();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Scan Worklist</h1>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search Order ID or Patient..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 shadow-sm"
          />
        </div>
        <div className="flex items-center">
          <DateFilter
            dateFrom={fromDate}
            dateTo={toDate}
            onDateFromChange={setFromDate}
            onDateToChange={setToDate}
            onSearch={() => { }}
            onReset={() => { setFromDate(''); setToDate(''); }}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Order ID</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Patient</th>
              <th className="px-6 py-4">Ordered By</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {radOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-14 text-center text-slate-400">
                  No scan orders found.
                </td>
              </tr>
            ) : filteredOrders.map(order => (
              <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-6 py-4 font-mono font-semibold text-slate-900">{order.id}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${order.type === 'IP' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {order.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-slate-700 font-medium">{order.patientName}</div>
                  <div className="text-xs text-slate-500">{order.patientId}</div>
                </td>
                <td className="px-6 py-4 text-slate-500 text-xs">{order.orderedBy}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${order.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      order.status === 'Partial' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                    }`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleUploadClick(order)}
                    className="px-3 py-1.5 text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors flex items-center gap-1.5 mx-auto"
                  >
                    <Upload className="w-3.5 h-3.5" /> {order.status === 'Completed' ? 'View/Edit' : 'Upload Report'}
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
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Upload Radiology Report</h3>
                <p className="text-xs text-slate-500 mt-0.5">Order {activeOrder.id} • {activeOrder.patientName} ({activeOrder.patientId})</p>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
              {activeOrder.tests.map(test => (
                <div key={test.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-500" /> {test.name}
                    </h4>
                    {test.status === 'Completed' && (
                      <span className="text-green-600 text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Completed</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Radiologist Impression</label>
                      <input
                        type="text"
                        value={tempResults[test.id]?.resultValue || ''}
                        onChange={(e) => handleTempChange(test.id, 'resultValue', e.target.value)}
                        placeholder="Brief summary (e.g., Normal study)"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 mb-3"
                      />
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tempResults[test.id]?.isCritical || false}
                          onChange={(e) => handleTempChange(test.id, 'isCritical', e.target.checked)}
                          className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                        />
                        <span className="text-sm font-bold text-red-600">Mark as Critical Finding</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Upload Report / Images</label>
                      <div className="flex items-center gap-2">
                        <label className="flex-1 cursor-pointer bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-lg text-sm text-slate-600 flex items-center justify-between transition-colors">
                          <span className="truncate">{tempResults[test.id]?.resultFile || 'Choose file...'}</span>
                          <Upload className="w-4 h-4 text-slate-400" />
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.dcm"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                handleTempChange(test.id, 'resultFile', e.target.files[0].name);
                              }
                            }}
                          />
                        </label>
                        {tempResults[test.id]?.resultFile && (
                          <button
                            type="button"
                            onClick={() => handleTempChange(test.id, 'resultFile', '')}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={handleSaveAll} className="px-6 py-2 bg-purple-600 text-white font-bold rounded-xl text-sm hover:bg-purple-700 transition-colors">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
