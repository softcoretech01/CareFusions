import { useState } from 'react';
import { useOPDVisits } from '../../contexts/OPDVisitContext';

import { Search, FlaskConical, Eye } from 'lucide-react';
import { VisitDetailsModal } from '../../components/opd/VisitDetailsModal';
import { useInvestigations } from '../../contexts/InvestigationContext';
import { ResultViewer } from '../../components/investigations/ResultViewer';
import { DateFilter } from '../../components/ui/DateFilter';

export const LabOrders = () => {
  const { visits } = useOPDVisits();
  const { orders: globalOrders } = useInvestigations();

  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const today = `${yyyy}-${mm}-${dd}`;
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  
  const [viewerState, setViewerState] = useState<{ patientId: string; category: 'Lab' | 'Radiology' } | null>(null);

  const [appliedDateFrom, setAppliedDateFrom] = useState(today);
  const [appliedDateTo, setAppliedDateTo] = useState(today);

  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');

  const getLabStatus = (uhid: string, testName: string, defaultStatus: string) => {
    const patientOrders = globalOrders.filter((o: any) => o.patientId === uhid && o.category === 'Lab');
    for (const o of patientOrders) {
      const t = o.tests.find((x: any) => x.name === testName);
      if (t && (t.status === 'Completed' || t.status === 'Verified')) {
        return 'Completed';
      }
    }
    return defaultStatus;
  };

  const parseDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dStr;
  };

  const visitsWithLabs = visits.filter(v => {
    if (v.labOrders.length === 0) return false;
    
    const vDate = parseDate(v.date);
    // Date filter
    if (appliedDateFrom && vDate < appliedDateFrom) return false;
    if (appliedDateTo && vDate > appliedDateTo) return false;

    if (appliedSearchQuery) {
      const q = appliedSearchQuery.toLowerCase();
      if (!v.patientName.toLowerCase().includes(q) && !v.uhid.toLowerCase().includes(q)) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => b.id - a.id);

  const handleSearch = () => {
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
    setAppliedSearchQuery(searchQuery);
  };

  const handleReset = () => {
    setDateFrom(today);
    setDateTo(today);
    setSearchQuery('');
    setAppliedDateFrom(today);
    setAppliedDateTo(today);
    setAppliedSearchQuery('');
  };

  const inputCls = 'px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-primary" />
            Lab Orders
          </h1>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-10rem)]">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search patient or UHID..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`${inputCls} pl-9 w-full`} 
            />
          </div>
          
          <div className="ml-auto">
            <DateFilter
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              onSearch={handleSearch}
              onReset={handleReset}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full">
            <thead className="bg-white sticky top-0 z-10 shadow-sm outline outline-1 outline-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-left">Patient Details</th>
                <th className="px-6 py-4 text-left">Tests Ordered</th>
                <th className="px-6 py-4 text-left">Doctor</th>
                <th className="px-6 py-4 text-left">Result</th>
                <th className="px-6 py-4 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visitsWithLabs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No lab orders found for the selected dates.
                  </td>
                </tr>
              ) : (
                visitsWithLabs.map(visit => (
                  <tr key={visit.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">{visit.date}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-sm">{visit.patientName}</div>
                      <div className="text-xs text-slate-500">{visit.uhid} · {visit.age}y {visit.gender}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {visit.labOrders.map((order: any, idx: number) => {
                          const realStatus = getLabStatus(visit.uhid, order.testName, order.status);
                          return (
                          <div key={order.id || idx} className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700">{order.testName}</span>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              realStatus === 'Ordered' ? 'bg-amber-100 text-amber-700' :
                              realStatus === 'Collected' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {realStatus}
                            </span>
                          </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{visit.doctorName}</td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {visit.labOrders.map((order: any, idx: number) => {
                          const realStatus = getLabStatus(visit.uhid, order.testName, order.status);
                          return (
                          <div key={order.id || idx} className="flex items-center">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                              realStatus === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {realStatus === 'Completed' ? 'Received' : 'Pending'}
                            </span>
                          </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedVisit(visit)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <button
                          onClick={() => setViewerState({ patientId: visit.uhid, category: 'Lab' })}
                          disabled={!visit.labOrders.some((o: any) => getLabStatus(visit.uhid, o.testName, o.status) === 'Completed')}
                          className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
                            visit.labOrders.some((o: any) => getLabStatus(visit.uhid, o.testName, o.status) === 'Completed')
                              ? 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'
                              : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                          }`}
                          title="View Lab Result"
                        >
                          <FlaskConical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {selectedVisit && (
        <VisitDetailsModal
          visit={selectedVisit}
          onClose={() => setSelectedVisit(null)}
          type="Lab"
        />
      )}

      {viewerState && (
        <ResultViewer 
          patientId={viewerState.patientId} 
          category={viewerState.category} 
          onClose={() => setViewerState(null)} 
        />
      )}
    </div>
  );
};
