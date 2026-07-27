import { useState } from 'react';
import { Search, Ban, CheckCircle, Clock, FileText, AlertTriangle, MessageSquare, RotateCcw, X } from 'lucide-react';
import { useInsurance } from '../../contexts/InsuranceContext';

export const AppealsManagement = () => {
  const [activeTab, setActiveTab] = useState('denied');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  const handleClearFilters = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
  };
  const [showEob, setShowEob] = useState<any>(null);
  const { appeals, fileAppeal, resolveAppeal } = useInsurance();

  const filteredAppeals = appeals.filter(appeal => {
    const matchesTab = activeTab === 'all' || appeal.status.toLowerCase() === activeTab;
    const matchesSearch = appeal.patient.toLowerCase().includes(search.toLowerCase()) || 
                          appeal.claimId.toLowerCase().includes(search.toLowerCase()) ||
                          appeal.uhid.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Denied':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-lg flex items-center gap-1 w-max"><Ban className="w-3 h-3" /> Denied</span>;
      case 'Appealing':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg flex items-center gap-1 w-max"><Clock className="w-3 h-3" /> Under Appeal</span>;
      case 'Resolved':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1 w-max"><CheckCircle className="w-3 h-3" /> Resolved</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1 w-max">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Denials & Appeals</h1>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-600 font-medium"
                />
                <span className="text-slate-400 text-sm font-medium">to</span>
                <input 
                  type="date" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-600 font-medium"
                />
              </div>
              <div className="h-6 w-px bg-slate-200"></div>
              <div className="flex items-center gap-2">
                <button className="px-5 py-1.5 bg-primary text-white rounded-xl text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors">
                  Search
                </button>
                <button 
                  onClick={handleClearFilters}
                  className="px-5 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-72 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search claim ID or patient..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'denied', 'appealing', 'resolved'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all capitalize ${
                activeTab === tab 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {tab === 'appealing' ? 'Under Appeal' : tab}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">Claim ID</th>
                <th className="px-6 py-4 text-left">Patient Details</th>
                <th className="px-6 py-4 text-left">Insurer</th>
                <th className="px-6 py-4 text-left">Denial Reason</th>
                <th className="px-6 py-4 text-left">Denied Amount</th>
                <th className="px-6 py-4 text-left">Date</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAppeals.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-primary">{row.claimId}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{row.patient}</div>
                    <div className="text-xs text-slate-500">{row.uhid}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-600">{row.insurer}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2 text-rose-700 font-medium text-sm">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="max-w-[200px] leading-tight">{row.denialReason}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-800">
                    ₹{row.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{row.date}</td>
                  <td className="px-6 py-4">
                    {getStatusBadge(row.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setShowEob(row)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Explanation of Benefits (EOB)"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      {row.status === 'Denied' && (
                        <button 
                          onClick={() => {
                          fileAppeal(row.id);
                        }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-xs font-bold transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" /> File Appeal
                        </button>
                      )}
                      {row.status === 'Appealing' && (
                        <button 
                          onClick={() => {
                          resolveAppeal(row.id, row.amount);
                        }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 rounded-lg text-xs font-bold transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" /> Resolve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredAppeals.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    No denials found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EOB Modal */}
      {showEob && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Explanation of Benefits (EOB)</h2>
                  <p className="text-sm font-medium text-slate-500">Ref: {showEob.claimId}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEob(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Patient</p>
                  <p className="font-bold text-slate-800">{showEob.patient} <span className="text-sm font-normal text-slate-500">({showEob.uhid})</span></p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Insurer</p>
                  <p className="font-bold text-slate-800">{showEob.insurer}</p>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Denial Details</h3>
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-800 mb-1">{showEob.denialReason}</p>
                      <p className="text-sm text-rose-700 leading-relaxed">
                        The insurer has declined payment for this claim based on the policy terms. Detailed code: <span className="font-mono bg-rose-200 px-1 rounded">PR-96</span>. 
                        Please gather the required medical necessity justification and submit an appeal if applicable.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Financial Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-slate-500">Total Billed Amount</span>
                    <span className="font-bold text-slate-800">₹{showEob.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-slate-500">Allowed Amount</span>
                    <span className="font-bold text-slate-800">₹0</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-slate-100 pt-3">
                    <span className="font-bold text-slate-800">Patient Responsibility (Denied)</span>
                    <span className="font-bold text-rose-600 text-lg">₹{showEob.amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowEob(null)}
                className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
