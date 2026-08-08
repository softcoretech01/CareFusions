import { useState, useEffect } from 'react';
import { useInvestigations } from '../../contexts/InvestigationContext';
import { Download, Search, X, Eye } from 'lucide-react';
import { DateFilter } from '../../components/ui/DateFilter';
import { Pagination } from '../../components/ui/Pagination';
import { usePagination } from '../../hooks/usePagination';

export const LabReports = () => {
  const { orders, refresh } = useInvestigations();
  const labOrders = orders.filter(o => o.category === 'Lab');

  // Load orders on open; no-op once the shared context already has them.
  useEffect(() => { refresh(); }, [refresh]);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const filteredOrders = labOrders.filter(order => {
    if (fromDate && new Date(order.orderedAt) < new Date(fromDate)) return false;
    if (toDate && new Date(order.orderedAt) > new Date(toDate + 'T23:59:59')) return false;
    if (searchQuery && !order.id.toLowerCase().includes(searchQuery.toLowerCase()) && !order.patientName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // 10 rows per page; the hook snaps back to page 1 when a search shrinks the list.
  const { page, setPage, pageSize, total, paged } = usePagination(filteredOrders);

  const handleExportExcel = () => {
    const csvContent = [
      ['Order ID', 'Patient Name', 'UHID', 'Ordered By', 'Test Count', 'Date', 'Status'],
      ...filteredOrders.map(order => [
        order.id,
        `"${order.patientName}"`,
        order.patientId,
        `"${order.orderedBy}"`,
        order.tests.length.toString(),
        new Date(order.orderedAt).toLocaleDateString(),
        order.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'laboratory_reports.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    import('react-hot-toast').then(m => m.default.success('Report exported to Excel successfully'));
  };





  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Laboratory Reports</h2>
        </div>
        <button 
          onClick={handleExportExcel}
          className="px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-blue-100 transition-colors"
        >
          <Download className="w-4 h-4" /> Export Excel
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
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
            onSearch={() => { }}
            onReset={() => { setFromDate(''); setToDate(''); }}
          />
        </div>
      </div>




      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[300px]">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">Lab Test Report List</h3>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase sticky top-0">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Patient Name</th>
                <th className="px-4 py-3">Ordered By</th>
                <th className="px-4 py-3">Test Count</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No records found for the selected criteria.
                  </td>
                </tr>
              ) : paged.map(order => (
                <tr key={order.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 font-mono font-bold text-slate-800">{order.id}</td>
                  <td className="px-6 py-3">
                    <div className="font-medium text-slate-800">{order.patientName}</div>
                    <div className="text-xs text-slate-500">{order.patientId}</div>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{order.orderedBy}</td>
                  <td className="px-6 py-3 text-slate-600">{order.tests.length}</td>
                  <td className="px-6 py-3 text-slate-600">{new Date(order.orderedAt).toLocaleDateString()}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${order.status === 'Completed' || order.status === 'Verified' ? 'bg-green-100 text-green-700' :
                        order.status === 'Partial' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                      }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} />
      </div>
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">Patient Details</h3>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-slate-500 font-medium mb-1">Patient Name</span>
                  <span className="font-bold text-slate-800">{selectedOrder.patientName}</span>
                </div>
                <div>
                  <span className="block text-slate-500 font-medium mb-1">UHID</span>
                  <span className="font-bold text-slate-800">{selectedOrder.patientId}</span>
                </div>
                <div>
                  <span className="block text-slate-500 font-medium mb-1">Order ID</span>
                  <span className="font-bold text-slate-800">{selectedOrder.id}</span>
                </div>
                <div>
                  <span className="block text-slate-500 font-medium mb-1">Ordered By</span>
                  <span className="font-bold text-slate-800">{selectedOrder.orderedBy}</span>
                </div>
                <div>
                  <span className="block text-slate-500 font-medium mb-1">Date</span>
                  <span className="font-bold text-slate-800">{new Date(selectedOrder.orderedAt).toLocaleDateString()}</span>
                </div>

                <div className="pt-4 border-t border-slate-100 col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-slate-500 font-medium mb-1">Age / Gender</span>
                    <span className="font-bold text-slate-800">34 Yrs / Male</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 font-medium mb-1">Contact</span>
                    <span className="font-bold text-slate-800">+91 9876543210</span>
                  </div>
                </div>

                <div>
                  <span className="block text-slate-500 font-medium mb-1">Patient Type</span>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-md w-max inline-block ${selectedOrder.type === 'OP' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                    {selectedOrder.type === 'OP' ? 'Outpatient (OPD)' : 'Inpatient (IPD)'}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 font-medium mb-1">Category</span>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-md w-max inline-block bg-blue-100 text-blue-700 border border-blue-200">
                    {selectedOrder.category}
                  </span>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setSelectedOrder(null)} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-300 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
