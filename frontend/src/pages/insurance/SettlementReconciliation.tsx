import { useState } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { Search, Receipt, CheckCircle, Clock, CheckSquare, Download, Calendar, ArrowRightLeft, X } from 'lucide-react';
import { useInsurance } from '../../contexts/InsuranceContext';
import { alphanumeric, LIMITS } from '../../utils/inputRules';

export const SettlementReconciliation = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const { settlements, reconcileSettlement } = useInsurance();

  // The settlement being posted, plus the UTR typed for it.
  const [posting, setPosting] = useState<{ id: string; claimId: string; net: number } | null>(null);
  const [utr, setUtr] = useState('');

  const filteredSettlements = settlements.filter(settle => {
    const matchesTab = activeTab === 'all' || settle.status.toLowerCase() === activeTab;
    const matchesSearch = settle.patient.toLowerCase().includes(search.toLowerCase()) || 
                          settle.claimId.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg flex items-center gap-1 w-max"><Clock className="w-3 h-3" /> Awaiting Bank Remittance</span>;
      case 'Reconciled':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1 w-max"><CheckCircle className="w-3 h-3" /> Reconciled</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1 w-max">{status}</span>;
    }
  };

  const confirmPost = () => {
    if (!posting) return;
    reconcileSettlement(posting.id, utr.trim() || undefined);
    setPosting(null);
    setUtr('');
  };

  const { page, setPage, pageSize, total, paged } = usePagination(filteredSettlements);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Settlements & Reconciliation</h1>
        </div>
        <button 
          onClick={() => {
            import('react-hot-toast').then(m => m.default.success('Bank format exported successfully'));
          }}
          className="px-5 py-2.5 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          Export Bank Format
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-4 rounded-xl bg-blue-100 text-blue-600">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Total Outstanding</p>
            <p className="text-2xl font-bold text-slate-800">₹5,55,000</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-4 rounded-xl bg-emerald-100 text-emerald-600">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Reconciled MTD</p>
            <p className="text-2xl font-bold text-slate-800">₹1,60,000</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-4 rounded-xl bg-purple-100 text-purple-600">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Avg. Payment Days</p>
            <p className="text-2xl font-bold text-slate-800">14 Days</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <div className="flex gap-2 min-w-max pr-4">
          {['all', 'pending', 'reconciled'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all capitalize whitespace-nowrap ${
                activeTab === tab 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative w-64 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search claim ID or patient..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Settlement ID</th>
                <th className="px-4 py-3 text-left">Claim Ref / Patient</th>
                <th className="px-4 py-3 text-left">Insurer</th>
                <th className="px-4 py-3 text-left">Approved Amt</th>
                <th className="px-4 py-3 text-left">TDS (10%)</th>
                <th className="px-4 py-3 text-left">Net Receivable</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-bold text-primary">{row.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{row.patient}</div>
                    <div className="text-xs text-slate-500">Ref: {row.claimId}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-600">{row.insurer}</td>
                  <td className="px-4 py-3 font-medium text-slate-600">
                    ₹{row.approvedAmt.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-rose-600">
                    -₹{row.tds.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800">
                    <div className="flex items-center gap-1 text-emerald-600">
                      ₹{(row.approvedAmt - row.tds).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(row.status)}
                  </td>
                  <td className="px-4 py-3">
                    {row.status === 'Pending' ? (
                      <button
                        onClick={() => { setPosting({ id: row.id, claimId: row.claimId, net: row.approvedAmt - row.tds }); setUtr(''); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-sm font-bold transition-colors shadow-sm"
                      >
                        <Receipt className="w-4 h-4" /> Post Payment
                      </button>
                    ) : (
                      <button className="text-slate-400 text-sm font-bold flex items-center gap-1 cursor-not-allowed">
                        <CheckCircle className="w-4 h-4" /> Posted
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredSettlements.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    No settlement records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} />
      </div>

      {posting && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">Post Bank Payment</h2>
              <button onClick={() => setPosting(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between">
                <span className="text-sm text-slate-500">Claim {posting.claimId}</span>
                <span className="font-bold text-emerald-600">₹{posting.net.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank / UTR Reference</label>
                {/* The remittance reference that matches the insurer's payment to
                    this settlement. Recorded against the settlement for audit. */}
                <input
                  type="text" value={utr} autoFocus
                  onChange={(e) => setUtr(alphanumeric(e.target.value, LIMITS.reference))}
                  maxLength={LIMITS.reference}
                  placeholder="e.g. UTR-2026-0098421"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <p className="text-[11px] text-slate-400 mt-1">Optional, but recommended so the payment can be traced.</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setPosting(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPost}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Mark Reconciled
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
