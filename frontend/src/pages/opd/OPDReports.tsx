import { useState, useEffect } from 'react';
import { useOPDVisits } from '../../contexts/OPDVisitContext';
import { Download, Search, Eye, Printer } from 'lucide-react';
import { VisitDetailsModal } from '../../components/opd/VisitDetailsModal';
import { exportToExcel } from '../../utils/exportToExcel';
import { DateFilter } from '../../components/ui/DateFilter';

export const OPDReports = () => {
  const { visits } = useOPDVisits();
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [printVisit, setPrintVisit] = useState<any>(null);
  const today = new Date().toISOString().split('T')[0];
  
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [dept, setDept] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [appliedDateFrom, setAppliedDateFrom] = useState(today);
  const [appliedDateTo, setAppliedDateTo] = useState(today);
  const [appliedDept, setAppliedDept] = useState('All');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');

  const departments = ['All', ...Array.from(new Set(visits.map(v => v.department))).sort()];

  const completedVisits = visits.filter(v => {
    // Only show completed
    if (v.status !== 'Completed') return false;
    
    // Date filter
    if (appliedDateFrom && v.date < appliedDateFrom) return false;
    if (appliedDateTo && v.date > appliedDateTo) return false;

    // Dept filter
    if (appliedDept !== 'All' && v.department !== appliedDept) return false;

    // Search filter
    if (appliedSearchQuery) {
      const q = appliedSearchQuery.toLowerCase();
      if (!v.patientName.toLowerCase().includes(q) && !v.uhid.toLowerCase().includes(q) && !v.visitNumber.toLowerCase().includes(q)) {
        return false;
      }
    }

    return true;
  });

  const handleSearch = () => {
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
    setAppliedSearchQuery(searchQuery);
    setAppliedDept(dept);
  };

  const handleReset = () => {
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
    setDept('All');
    setAppliedDateFrom('');
    setAppliedDateTo('');
    setAppliedSearchQuery('');
    setAppliedDept('All');
  };

  useEffect(() => {
    if (!printVisit) return;
    const timer = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(timer);
  }, [printVisit]);

  useEffect(() => {
    const clearPrint = () => setPrintVisit(null);
    window.addEventListener('afterprint', clearPrint);
    return () => window.removeEventListener('afterprint', clearPrint);
  }, []);

  const inputCls = 'px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">OPD Reports</h1>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-10rem)]">
        {/* Filter bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4 flex-wrap bg-slate-50/50">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search patient or visit no..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`${inputCls} pl-9 w-full`} 
            />
          </div>
          
          <div className="h-8 w-px bg-slate-200 mx-2" />

          <div className="h-8 w-px bg-slate-200 mx-2" />

          <DateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onSearch={handleSearch}
            onReset={handleReset}
          />
          
          <select value={dept} onChange={e => setDept(e.target.value)} className={inputCls}>
            {departments.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
          </select>
          
          <div className="flex-1" />

          <button onClick={() => exportToExcel(completedVisits, 'OPDReports')} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full">
            <thead className="bg-white sticky top-0 z-10 shadow-sm outline outline-1 outline-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">Visit No.</th>
                <th className="px-6 py-4 text-left">Date & Time</th>
                <th className="px-6 py-4 text-left">Patient Details</th>
                <th className="px-6 py-4 text-left">Department</th>
                <th className="px-6 py-4 text-left">Doctor</th>
                <th className="px-6 py-4 text-left">Billing Status</th>
                <th className="px-6 py-4 text-left">Rx Count</th>
                <th className="px-6 py-4 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {completedVisits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    No completed consultations found for the selected filters.
                  </td>
                </tr>
              ) : (
                completedVisits.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono font-bold text-primary">{v.visitNumber}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-700">{v.date}</div>
                      <div className="text-xs text-slate-400">{v.timeSlot}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-sm">{v.patientName}</div>
                      <div className="text-xs text-slate-500">{v.uhid} · {v.age}y {v.gender}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {v.department}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{v.doctorName}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${v.billingStatus === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-700'}`}>
                        {v.billingStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${v.prescriptions.length > 0 ? 'bg-blue-50 text-blue-600' : 'text-slate-400'}`}>
                        {v.prescriptions.length} items
                      </span>
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <button
                        onClick={() => setSelectedVisit(v)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      <button
                        onClick={() => v.billingStatus === 'Completed' && setPrintVisit(v)}
                        disabled={v.billingStatus !== 'Completed'}
                        className={`flex items-center justify-center w-10 h-10 rounded-lg text-xs font-bold transition-colors ${v.billingStatus === 'Completed' ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        title={v.billingStatus === 'Completed' ? 'Print Visit' : 'Print disabled until billing is completed'}
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer stats */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-sm font-bold text-slate-600 flex justify-between">
          <span>Total Completed: {completedVisits.length}</span>
        </div>
      </div>
      
      <VisitDetailsModal visit={selectedVisit} onClose={() => setSelectedVisit(null)} />

      {printVisit && (
        <div id="opd-print-area" className="hidden print:block">
          <div className="p-8 bg-white min-h-screen text-slate-900">
            <div className="max-w-3xl mx-auto border border-slate-200 rounded-3xl p-8">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold">CARE FUSIONS</h1>
                <p className="text-sm text-slate-600">OPD Visit Printout</p>
                <p className="text-xs text-slate-500 mt-1">Visit No: {printVisit.visitNumber}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <p className="text-xs uppercase text-slate-500">Patient</p>
                  <p className="font-bold text-slate-800">{printVisit.patientName}</p>
                  <p className="text-xs text-slate-600">{printVisit.uhid} · {printVisit.age}y {printVisit.gender}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Doctor</p>
                  <p className="font-bold text-slate-800">{printVisit.doctorName}</p>
                  <p className="text-xs text-slate-600">{printVisit.department}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Date & Time</p>
                  <p className="font-bold text-slate-800">{printVisit.date}</p>
                  <p className="text-xs text-slate-600">{printVisit.timeSlot}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Billing Status</p>
                  <p className="font-bold text-slate-800">{printVisit.billingStatus}</p>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-4 text-sm text-slate-700">
                <p className="font-semibold mb-2">Prescription Count</p>
                <p>{printVisit.prescriptions.length} item(s)</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #opd-print-area, #opd-print-area * { visibility: visible !important; }
          #opd-print-area { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
};
