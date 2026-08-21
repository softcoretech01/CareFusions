import { useState, useEffect } from 'react';
import { useOPDVisits } from '../../contexts/OPDVisitContext';
import { useIPD } from '../../contexts/IPDContext';
import { Download, Eye, Printer } from 'lucide-react';
import { VisitDetailsModal } from '../../components/opd/VisitDetailsModal';
import { exportToExcel } from '../../utils/exportToExcel';
import { DateFilter } from '../../components/ui/DateFilter';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL as string;

export const OPDReports = () => {
  const { visits } = useOPDVisits();
  const { patients } = useIPD();
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [printVisit, setPrintVisit] = useState<any>(null);
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const today = `${yyyy}-${mm}-${dd}`;

  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [dept, setDept] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [appliedDateFrom, setAppliedDateFrom] = useState(today);
  const [appliedDateTo, setAppliedDateTo] = useState(today);
  const [appliedDept, setAppliedDept] = useState('All');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');

  const [masterDepts, setMasterDepts] = useState<any[]>([]);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await axios.get(`${API_BASE}/departments/`);
        const activeDepts = res.data.filter((d: any) => d.status === 'Active');
        setMasterDepts(activeDepts);
      } catch (err) {
        console.error("Failed to fetch departments", err);
      }
    };
    fetchDepts();
  }, []);

  const departments = ['All', ...Array.from(new Set(masterDepts.map(d => d.departmentName))).sort()];

  const parseDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dStr;
  };

  const completedVisits = visits.filter(v => {
    // Only show completed
    if (v.status !== 'Completed') return false;

    const vDate = parseDate(v.date);
    // Date filter
    if (appliedDateFrom && vDate < appliedDateFrom) return false;
    if (appliedDateTo && vDate > appliedDateTo) return false;

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
  }).sort((a, b) => b.id - a.id);

  const handleSearch = () => {
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
    setAppliedSearchQuery(searchQuery);
    setAppliedDept(dept);
  };

  const handleReset = () => {
    setDateFrom(today);
    setDateTo(today);
    setSearchQuery('');
    setDept('All');
    setAppliedDateFrom(today);
    setAppliedDateTo(today);
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
      <div className="flex items-center justify-between gap-4">
        <div className="shrink-0">
          <h1 className="text-2xl font-bold text-slate-800 whitespace-nowrap">OPD Reports</h1>
        </div>

        <div className="flex items-center gap-3 flex-nowrap overflow-x-auto pb-1 w-full justify-end">
          {/* <div className="relative w-40 md:w-56 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search patient..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`${inputCls} pl-9 w-full`} 
            />
          </div>
          
          <div className="hidden md:block h-6 w-px bg-slate-200 shrink-0" /> */}

          <div className="shrink-0 scale-95 origin-right">
            <DateFilter
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              onSearch={handleSearch}
              onReset={handleReset}
            />
          </div>

          <select 
            value={dept} 
            onChange={e => {
              setDept(e.target.value);
              setAppliedDept(e.target.value);
            }} 
            className={`${inputCls} w-36 shrink-0`}
          >
            {departments.map(d => <option key={d} value={d}>{d === 'All' ? 'All Depts' : d}</option>)}
          </select>

          <button onClick={() => exportToExcel(completedVisits, 'OPDReports')} className="shrink-0 flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-10rem)]">

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full">
            <thead className="bg-white sticky top-0 z-10 shadow-sm outline outline-1 outline-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">Visit No.</th>
                <th className="px-6 py-4 text-left whitespace-nowrap">Date & Time</th>
                <th className="px-6 py-4 text-left">Patient Details</th>
                <th className="px-6 py-4 text-left">Department</th>
                <th className="px-6 py-4 text-left">Doctor</th>
                <th className="px-6 py-4 text-left">Billing Status</th>
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
                    <td className="px-6 py-4 whitespace-nowrap">
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
                      {patients?.some(p => p.uhid === v.uhid && p.status === 'Admitted') ? (
                        <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                          Admitted IPD
                        </span>
                      ) : (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${v.billingStatus === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-700'}`}>
                          {v.billingStatus || 'Pending'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <button
                        onClick={() => setSelectedVisit(v)}
                        className="flex items-center justify-center w-10 h-10 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
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
        <div id="opd-print-area" className="hidden print:block print-isolated bg-white w-full h-full text-black print:p-0">
          <div className="max-w-[210mm] mx-auto bg-white min-h-screen">
            {/* Professional Hospital Header */}
            <div className="border-b-4 border-slate-800 pb-6 mb-8 text-center pt-8">
              <h1 className="text-4xl font-extrabold tracking-tight uppercase text-slate-900">CareFusions Hospital</h1>
              <p className="text-sm text-slate-600 mt-2 font-medium">123 Health Avenue, Medical District, City, Country - 10001</p>
              <p className="text-sm text-slate-600">Phone: +1 234 567 8900 | Email: contact@carefusions.com</p>
              <div className="mt-6 inline-block bg-slate-100 px-6 py-2 border border-slate-300">
                <h2 className="text-lg font-bold tracking-widest uppercase text-slate-800">Official OPD Visit Record</h2>
              </div>
            </div>

            {/* Visit & Patient Details Grid */}
            <div className="border border-slate-300 mb-8 flex flex-col">
              <div className="grid grid-cols-2 divide-x divide-slate-300 border-b border-slate-300">
                <div className="p-4 flex gap-4">
                  <div className="w-32 text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Name:</div>
                  <div className="font-bold text-slate-900">{printVisit.patientName}</div>
                </div>
                <div className="p-4 flex gap-4">
                  <div className="w-32 text-xs font-bold text-slate-500 uppercase tracking-wider">Visit Number:</div>
                  <div className="font-bold text-slate-900">{printVisit.visitNumber}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-300 border-b border-slate-300 bg-slate-50/50">
                <div className="p-4 flex gap-4">
                  <div className="w-32 text-xs font-bold text-slate-500 uppercase tracking-wider">UHID:</div>
                  <div className="font-bold text-slate-900">{printVisit.uhid}</div>
                </div>
                <div className="p-4 flex gap-4">
                  <div className="w-32 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time:</div>
                  <div className="font-bold text-slate-900">{printVisit.date} · {printVisit.timeSlot}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-300">
                <div className="p-4 flex gap-4">
                  <div className="w-32 text-xs font-bold text-slate-500 uppercase tracking-wider">Age / Gender:</div>
                  <div className="font-bold text-slate-900">{printVisit.age} Y / {printVisit.gender}</div>
                </div>
                <div className="p-4 flex gap-4">
                  <div className="w-32 text-xs font-bold text-slate-500 uppercase tracking-wider">Consulting Dr:</div>
                  <div className="font-bold text-slate-900">{printVisit.doctorName} <span className="text-xs text-slate-500 font-normal">({printVisit.department})</span></div>
                </div>
              </div>
            </div>

            {/* Billing Status */}
            <div className="border border-slate-300 p-6 flex justify-between items-center bg-slate-50 mb-12">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Billing Status</p>
                <p className="text-xl font-bold text-slate-900">{printVisit.billingStatus || 'Pending'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Generated On</p>
                <p className="text-sm font-bold text-slate-900">{new Date().toLocaleString()}</p>
              </div>
            </div>

            {/* Signatures */}
            <div className="mt-24 pt-8 flex justify-between">
              <div className="text-center w-64">
                <div className="border-t border-slate-400 pt-2 text-sm font-bold text-slate-700">Patient / Attendant Signature</div>
              </div>
              <div className="text-center w-64">
                <div className="border-t border-slate-400 pt-2 text-sm font-bold text-slate-700">Authorized Signatory</div>
                <div className="text-xs text-slate-500 mt-1">CareFusions Hospital</div>
              </div>
            </div>

            {/* Footer Disclaimer */}
            <div className="mt-16 text-center text-[10px] text-slate-400 border-t border-slate-200 pt-4 pb-8">
              This is a computer-generated document and does not require a physical signature if printed from a verified source.
              <br />For any queries, please contact the hospital administration.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
