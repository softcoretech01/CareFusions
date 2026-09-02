import { useState, useEffect } from 'react';
import axios from 'axios';
import { useInvestigations, type InvestigationOrder } from '../../contexts/InvestigationContext';
import { Upload, FileText, CheckCircle, X, Search, MapPin, RefreshCw, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { DateFilter, monthStart, today } from '../../components/ui/DateFilter';

const API_BASE = import.meta.env.VITE_API_URL as string || 'http://localhost:8000/api/v1';

export const RadiologyOrderList = () => {
  const { orders, updateTestResult, fetchRadiologyOrders } = useInvestigations();
  const radOrders = orders.filter(o => o.category === 'Radiology');

  // The worklist opens on "this month so far". Leaving the range empty let
  // DateFilter seed it with today -> today, which hid every scan ordered
  // before this morning behind an otherwise empty-looking table.
  const defaultFrom = monthStart();
  const defaultTo = today();
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Always pull fresh data from the DB when this page mounts
  useEffect(() => { fetchRadiologyOrders(); }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchRadiologyOrders();
    setIsRefreshing(false);
    toast.success('Worklist refreshed');
  };

  const [activeOrder, setActiveOrder] = useState<InvestigationOrder | null>(null);
  const [tempResults, setTempResults] = useState<Record<string, { resultValue: string; resultFile: string; isCritical: boolean; resultSummary: string }>>({});

  const filteredOrders = radOrders.filter(order => {
    // Compare calendar dates, not Date objects: orderedAt carries no zone and
    // parses as local time, while new Date('YYYY-MM-DD') is UTC midnight. On
    // an IST box that gap dropped anything ordered before 05:30 on fromDate.
    const orderedOn = (order.orderedAt || '').slice(0, 10);
    if (fromDate && orderedOn < fromDate) return false;
    if (toDate && orderedOn > toDate) return false;
    if (searchQuery && !order.id.toLowerCase().includes(searchQuery.toLowerCase()) && !order.patientName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => Number(b.id) - Number(a.id));

  const handleUploadClick = (order: InvestigationOrder) => {
    setActiveOrder(order);
    const initialTemp: Record<string, { resultValue: string; resultFile: string; isCritical: boolean; resultSummary: string }> = {};
    order.tests.forEach(test => {
      initialTemp[test.id] = {
        resultValue: test.resultValue || '',
        resultFile: test.resultFile || '',
        resultSummary: test.resultSummary || '',
        isCritical: test.isCritical || false
      };
    });
    setTempResults(initialTemp);
  };

  const handleCloseModal = () => {
    setActiveOrder(null);
    setTempResults({});
  };

  const handleTempChange = (testId: string, field: 'resultValue' | 'resultFile' | 'isCritical' | 'resultSummary', value: string | boolean) => {
    setTempResults(prev => ({
      ...prev,
      [testId]: { ...prev[testId], [field]: value }
    }));
  };

  const handleSaveAll = () => {
    if (!activeOrder) return;
    let updatedCount = 0;
    activeOrder.tests.forEach(test => {
      const temp = tempResults[test.id];
      if (temp && (temp.resultValue !== test.resultValue || temp.resultFile !== test.resultFile || temp.isCritical !== test.isCritical || temp.resultSummary !== test.resultSummary)) {
        updateTestResult(activeOrder.id, test.id, temp.resultValue, temp.resultFile, temp.isCritical, temp.resultSummary);
        updatedCount++;
      }
    });
    if (updatedCount > 0) toast.success('Radiology reports saved successfully!');
    handleCloseModal();
    // Refresh from DB so the updated status is reflected immediately
    fetchRadiologyOrders();
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="shrink-0">
          <h1 className="text-2xl font-bold text-slate-800 whitespace-nowrap">Scan Worklist</h1>
        </div>
        <div className="flex items-center gap-3 flex-nowrap overflow-x-auto pb-1 w-full justify-end">
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="relative w-40 sm:w-64 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Order ID or Patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 shadow-sm"
            />
          </div>
          <div className="hidden sm:block h-6 w-px bg-slate-200 shrink-0" />
          <div className="shrink-0 scale-95 origin-right flex items-center">
            <DateFilter
              dateFrom={fromDate}
              dateTo={toDate}
              onDateFromChange={setFromDate}
              onDateToChange={setToDate}
              onSearch={() => {}}
              onReset={() => { setFromDate(defaultFrom); setToDate(defaultTo); }}
              defaultDateFrom={defaultFrom}
              defaultDateTo={defaultTo}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-5 py-4">Order ID</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4">Patient</th>
              <th className="px-5 py-4">Scan Details / Notes</th>
              <th className="px-5 py-4">Ordered By</th>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-14 text-center text-slate-400">
                  {radOrders.length === 0
                    ? 'No scan orders found.'
                    : 'No scan orders match the current search or date range.'}
                </td>
              </tr>
            ) : filteredOrders.map(order => (
              <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-4 font-mono font-semibold text-slate-900">{order.id}</td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${order.type === 'IP' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {order.type}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="text-slate-700 font-medium">{order.patientName}</div>
                  <div className="text-xs text-slate-500">{order.patientId}</div>
                </td>

                {/* ── Scan Details / Notes column ── */}
                <td className="px-5 py-4 max-w-[220px]">
                  <div className="space-y-1.5">
                    {order.tests.map(test => (
                      <div key={test.id}>
                        <div className="text-xs font-semibold text-slate-700">{test.name}</div>
                        {test.bodyPart && test.bodyPart !== test.name && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-purple-500 shrink-0" />
                            <span className="text-[11px] font-medium text-purple-700 truncate">{test.bodyPart}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </td>

                <td className="px-5 py-4 text-slate-500 text-xs">{order.orderedBy}</td>
                <td className="px-5 py-4 text-slate-500 text-xs">{order.orderedAt?.split('T')[0] || '-'}</td>
                <td className="px-5 py-4">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                    order.status === 'Completed' ? 'bg-green-100 text-green-700' :
                    order.status === 'Partial' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-center">
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

      {/* ── Upload Result Modal ── */}
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
                <div key={test.id} className="border border-slate-200 rounded-xl overflow-hidden">

                  {/* ── Test header with scan name + body part note ── */}
                  <div className="bg-purple-50 border-b border-purple-100 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                          <h4 className="font-bold text-slate-800 text-sm">{test.name}</h4>
                        </div>
                        {/* Body part / note — always visible when present */}
                        {test.bodyPart && test.bodyPart !== test.name && (
                          <div className="flex items-center gap-1.5 mt-1.5 pl-6">
                            <MapPin className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            <span className="text-sm font-semibold text-purple-700">{test.bodyPart}</span>
                            <span className="text-xs text-purple-400 italic">· Specific area / note from doctor</span>
                          </div>
                        )}
                      </div>
                      {test.status === 'Completed' && (
                        <span className="text-green-600 text-xs font-bold flex items-center gap-1 bg-green-50 border border-green-100 px-2 py-1 rounded-lg shrink-0">
                          <CheckCircle className="w-3.5 h-3.5" /> Completed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Result input fields ── */}
                  <div className="p-4 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Radiologist Impression</label>
                        <input
                          type="text"
                          value={tempResults[test.id]?.resultValue || ''}
                          onChange={(e) => handleTempChange(test.id, 'resultValue', e.target.value)}
                          placeholder="Brief summary (e.g., Normal study)"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 mb-3 bg-slate-50"
                          maxLength={1000}
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
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Result Summary</label>
                        <textarea
                          value={tempResults[test.id]?.resultSummary || ''}
                          onChange={(e) => handleTempChange(test.id, 'resultSummary', e.target.value)}
                          placeholder="Enter a short summary..."
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 mb-3 bg-slate-50 resize-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Upload Report / Images</label>
                        <div className="flex items-center gap-2">
                          <label className="flex-1 cursor-pointer bg-slate-50 border border-slate-200 hover:bg-white px-3 py-2 rounded-lg text-sm text-slate-600 flex items-center justify-between transition-colors group overflow-hidden">
                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                              <FileText className="w-4 h-4 text-purple-400 shrink-0 group-hover:text-purple-500" />
                              <span className="truncate flex-1" title={tempResults[test.id]?.resultFile || 'Choose file...'}>
                                {tempResults[test.id]?.resultFile || 'Choose file...'}
                              </span>
                            </div>
                            <Upload className="w-4 h-4 text-slate-400 shrink-0 ml-2 group-hover:text-purple-500" />
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png,.dcm"
                              onChange={async (e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  const file = e.target.files[0];
                                  if (activeOrder?.patientId) {
                                    const formData = new FormData();
                                    formData.append('uhid', activeOrder.patientId);
                                    formData.append('documentType', 'Radiology Report');
                                    formData.append('file', file);
                                    try {
                                      await axios.post(`${API_BASE}/documents/`, formData, {
                                        headers: { 'Content-Type': 'multipart/form-data' }
                                      });
                                      toast.success('File uploaded successfully');
                                      handleTempChange(test.id, 'resultFile', file.name);
                                    } catch (err) {
                                      toast.error('Failed to upload file');
                                      handleTempChange(test.id, 'resultFile', file.name); // Keep for UI mockup
                                    }
                                  } else {
                                    handleTempChange(test.id, 'resultFile', file.name); // Keep for UI mockup
                                  }
                                }
                              }}
                            />
                          </label>

                          {tempResults[test.id]?.resultFile && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => window.open(`${API_BASE.replace('/api/v1', '')}/uploads/${encodeURIComponent(activeOrder.patientId + '_' + tempResults[test.id].resultFile)}`, '_blank')}
                                title="View Uploaded File"
                                className="p-2.5 bg-purple-50 border border-purple-200 text-purple-600 hover:bg-purple-100 hover:border-purple-300 rounded-lg transition-colors flex items-center justify-center shadow-sm"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTempChange(test.id, 'resultFile', '')}
                                title="Clear Selection"
                                className="p-2.5 border border-transparent text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
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
