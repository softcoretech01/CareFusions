/**
 * Laboratory worklist and results entry.
 *
 * This screen now matches Radiology's, deliberately: the two benches do the same
 * job and there was no reason for the results dialog to behave differently in
 * each. Edits are staged in `tempResults` and written by one Done button, and
 * every field stays editable so a result can be corrected in place.
 *
 * Two things it used to get wrong:
 *
 *  - Saved results did not appear. Every save had been failing server-side (a
 *    malformed JOIN in the completion check rolled the transaction back), so the
 *    fields were genuinely empty; on top of that the dialog rendered a verified
 *    result as a set of disabled inputs with no way to amend it.
 *  - Five statuses were on show -- Pending, Sample Collected, Sample Accepted,
 *    Completed, Verified -- with "Completed" relabelled "Result Entered" and
 *    "Verified" relabelled "Completed", so the same word meant two different
 *    things depending on where it appeared. The bench has one question: is the
 *    result in? So there are two states, Pending and Completed.
 */
import { useState, useEffect } from 'react';
import { useInvestigations, type InvestigationOrder } from '../../contexts/InvestigationContext';
import { Upload, FileText, X, AlertTriangle, Search, Eye, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { DateFilter, monthStart, today } from '../../components/ui/DateFilter';
import { Pagination } from '../../components/ui/Pagination';
import { usePagination } from '../../hooks/usePagination';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL as string || 'http://localhost:8000/api/v1';

/** Laboratory shows two states, not five.
 *
 * Anything that has been resulted (the table's Completed or Verified) reads
 * Completed; everything else reads Pending.
 */
const labStatus = (status?: string): 'Completed' | 'Pending' =>
  status === 'Completed' || status === 'Verified' ? 'Completed' : 'Pending';

/** An order is done when every test on it has a result. */
const orderStatus = (order: InvestigationOrder): 'Completed' | 'Pending' =>
  order.tests.length > 0 && order.tests.every(t => labStatus(t.status) === 'Completed')
    ? 'Completed'
    : 'Pending';

const statusChip = (status: 'Completed' | 'Pending') =>
  status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700';

type Draft = { resultValue: string; resultFile: string; resultSummary: string };

export const LabOrderList = () => {
  const { orders, updateTestResult, refresh } = useInvestigations();
  const labOrders = orders.filter(o => o.category === 'Lab' && !o.isBlocked);

  // Pull orders when this screen opens. `refresh` is guarded by hasLoaded, so
  // this is a no-op once the data is already in the shared context — it just
  // means landing here directly is no longer an empty table.
  useEffect(() => { refresh(); }, [refresh]);

  const [activeOrder, setActiveOrder] = useState<InvestigationOrder | null>(null);
  const [tempResults, setTempResults] = useState<Record<string, Draft>>({});
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(today());
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = labOrders.filter(order => {
    // Compare calendar dates, not Date objects: orderedAt carries no zone and
    // parses as local time, while new Date('YYYY-MM-DD') is UTC midnight. On an
    // IST box that gap dropped anything ordered before 05:30 on fromDate.
    const orderedOn = (order.orderedAt || '').slice(0, 10);
    if (fromDate && orderedOn < fromDate) return false;
    if (toDate && orderedOn > toDate) return false;
    if (searchQuery
        && !order.id.toLowerCase().includes(searchQuery.toLowerCase())
        && !order.patientName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // 10 rows per page; snaps back to page 1 when a search shrinks the list.
  const { page, setPage, pageSize, total, paged } = usePagination(filteredOrders);

  /** Seed the draft from what is stored, so the dialog opens showing the saved
   *  result rather than empty boxes. */
  const handleActionClick = async (order: InvestigationOrder) => {
    setActiveOrder(order);
    const seed: Record<string, Draft> = {};
    order.tests.forEach(test => {
      seed[test.id] = {
        resultValue: test.resultValue || '',
        resultFile: test.resultFile || '',
        resultSummary: test.resultSummary || '',
      };
    });
    setTempResults(seed);

    if (order.category === 'Lab' && order.orderId) {
      try {
        const res = await axios.get(`${API_BASE}/lab/orders/${order.orderId}`);
        if (res.data && res.data.tests) {
          const freshSeed: Record<string, Draft> = {};
          res.data.tests.forEach((t: any) => {
            const tId = t.order_test_id ? `TEST-${t.order_test_id}` : (t.id || '');
            freshSeed[tId] = {
              resultValue: t.resultValue || '',
              resultFile: t.resultFile || '',
              resultSummary: t.resultSummary || '',
            };
          });
          setTempResults(prev => ({ ...prev, ...freshSeed }));
        }
      } catch (e) { console.error('Failed to fetch fresh order details', e); }
    }
  };

  const handleCloseModal = () => {
    setActiveOrder(null);
    setTempResults({});
  };

  const handleTempChange = (testId: string, field: keyof Draft, value: string) => {
    setTempResults(prev => ({ ...prev, [testId]: { ...prev[testId], [field]: value } }));
  };

  /** Save every test whose draft differs from what is stored. */
  const handleSaveAll = async () => {
    if (!activeOrder) return;

    const changed = activeOrder.tests.filter(test => {
      const draft = tempResults[test.id];
      return draft && (
        draft.resultValue !== (test.resultValue || '') ||
        draft.resultFile !== (test.resultFile || '') ||
        draft.resultSummary !== (test.resultSummary || '')
      );
    });

    if (changed.length === 0) {
      handleCloseModal();
      return;
    }

    await Promise.all(changed.map(test => {
      const draft = tempResults[test.id];
      return Promise.resolve(
        updateTestResult(activeOrder.id, test.id, draft.resultValue, draft.resultFile,
                         undefined, draft.resultSummary)
      );
    }));

    // Abnormal/critical flagging is the backend's call, made from the test's own
    // reference range and the master's critical-value flag. This is only a
    // heads-up at the bench for a plainly numeric out-of-range value.
    changed.forEach(test => {
      const bounds = test.normalRange?.match(/^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/);
      const value = parseFloat(tempResults[test.id].resultValue);
      if (bounds && !isNaN(value) && (value < parseFloat(bounds[1]) || value > parseFloat(bounds[2]))) {
        toast.error(`${test.name}: outside reference range (${test.normalRange})`, { icon: '⚠️' });
      }
    });

    toast.success(`${changed.length} result${changed.length === 1 ? '' : 's'} saved`);
    handleCloseModal();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="shrink-0">
          <h1 className="text-2xl font-bold text-slate-800 whitespace-nowrap">Test Orders</h1>
        </div>

        <div className="flex items-center gap-3 flex-nowrap overflow-x-auto pb-1 w-full justify-end">
          <div className="relative w-40 sm:w-64 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Order ID or Patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 shadow-sm"
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
              onReset={() => { setFromDate(monthStart()); setToDate(today()); }}
            />
          </div>
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
            ) : paged.map(order => (
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
                <td className="px-4 py-3 min-w-[200px]">
                  <div className="flex flex-col gap-1.5">
                    {order.tests.map(test => (
                      <div key={test.id} className="text-slate-700 font-medium bg-slate-100/50 px-2 py-1 rounded inline-block w-fit">
                        {test.name}
                        {test.bodyPart && (
                          <span className="block text-xs text-slate-500 font-normal mt-0.5">Note: {test.bodyPart}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${statusChip(orderStatus(order))}`}>
                    {orderStatus(order)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleActionClick(order)}
                    title={['Completed', 'Verified'].includes(order.status) ? "View the results, or edit them" : "Enter results"}
                    className="px-3 py-1.5 text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-lg transition-colors flex items-center gap-1.5 mx-auto"
                  >
                    {['Completed', 'Verified'].includes(order.status) ? (
                      <>
                        <Eye className="w-3.5 h-3.5" /> View/Edit
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" /> Enter Result
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} />
      </div>

      {/* ── Results modal ── */}
      {activeOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Lab Results</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order {activeOrder.id} • {activeOrder.patientName} ({activeOrder.patientId})
                </p>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
              {activeOrder.tests.map(test => (
                <div key={test.id} className="border border-slate-200 rounded-xl overflow-hidden">

                  {/* ── Test header ── */}
                  <div className="bg-purple-50 border-b border-purple-100 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                          <h4 className="font-bold text-slate-800 text-sm">{test.name}</h4>
                          {test.isCritical && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                        </div>
                        {test.normalRange && (
                          <p className="text-xs text-purple-700 mt-1.5 pl-6">
                            Reference range: <span className="font-semibold">{test.normalRange}</span>
                            {test.unit ? ` ${test.unit}` : ''}
                          </p>
                        )}
                      </div>
                      {labStatus(test.status) === 'Completed' && (
                        <span className="text-green-600 text-xs font-bold flex items-center gap-1 bg-green-50 border border-green-100 px-2 py-1 rounded-lg shrink-0">
                          <CheckCircle className="w-3.5 h-3.5" /> Completed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Result fields ── */}
                  <div className="p-4 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                          Result Value{test.unit ? ` (${test.unit})` : ''}
                        </label>
                        <input
                          type="text"
                          value={tempResults[test.id]?.resultValue || ''}
                          onChange={(e) => handleTempChange(test.id, 'resultValue', e.target.value)}
                          placeholder="Enter value"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 bg-slate-50"
                          maxLength={1000}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Result Summary</label>
                        <textarea
                          value={tempResults[test.id]?.resultSummary || ''}
                          onChange={(e) => handleTempChange(test.id, 'resultSummary', e.target.value)}
                          placeholder="Enter a short summary..."
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 bg-slate-50 resize-none"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Upload Report (PDF/IMG)</label>
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
                              accept=".pdf,.png,.jpg,.jpeg"
                              onChange={async (e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  const file = e.target.files[0];
                                  if (activeOrder?.patientId) {
                                    const formData = new FormData();
                                    formData.append('uhid', activeOrder.patientId);
                                    formData.append('documentType', 'Lab Result');
                                    formData.append('file', file);
                                    try {
                                      await axios.post(`${API_BASE}/documents/`, formData, {
                                        headers: { 'Content-Type': 'multipart/form-data' },
                                      });
                                      toast.success('File uploaded successfully');
                                    } catch (err) {
                                      toast.error('Failed to upload file');
                                    }
                                  }
                                  handleTempChange(test.id, 'resultFile', file.name);
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
              <button
                onClick={handleSaveAll}
                className="px-6 py-2 bg-purple-600 text-white font-bold rounded-xl text-sm hover:bg-purple-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
