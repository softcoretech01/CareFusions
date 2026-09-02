import React, { useState, useEffect } from 'react';
import { Loader, FileText, History, Search, RefreshCw, AlertCircle } from 'lucide-react';

const API = 'http://localhost:8000/api/v1/pro';

const REPORT_TYPES = [
  'Daily PRO Approval Report',
  'OPD Service Report',
  'IPD Service Report',
  'Operations Report',
  'Rejected Service Report',
  'Insurance Authorization Report',
  'Patient Responsibility Report',
  'Payment Pending Report',
  'Service Release Report',
  'PRO Discount Report',
  'Price Modification Report',
];

const ActionBadge = ({ action }: { action?: string }) => {
  const map: Record<string, string> = {
    PRICE_UPDATED: 'bg-blue-100 text-blue-700',
    DISCOUNT_UPDATED: 'bg-purple-100 text-purple-700',
    SERVICE_APPROVED: 'bg-emerald-100 text-emerald-700',
    SERVICE_REJECTED: 'bg-red-100 text-red-700',
    AUTHORIZATION_UPDATED: 'bg-orange-100 text-orange-700',
    SERVICE_RELEASED: 'bg-teal-100 text-teal-700',
  };
  return (
    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[action ?? ''] ?? 'bg-slate-100 text-slate-600'}`}>
      {action?.replace(/_/g, ' ')}
    </span>
  );
};

export const ReportsAudit = () => {
  const [activeTab, setActiveTab] = useState<'reports' | 'audit'>('reports');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState(REPORT_TYPES[0]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/audit`);
      if (!res.ok) throw new Error('Failed to load audit logs');
      setAuditLogs(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') loadAudit();
  }, [activeTab]);

  const filteredLogs = auditLogs.filter(log => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      log.UHID?.toLowerCase().includes(s) ||
      log.PatientName?.toLowerCase().includes(s) ||
      log.Action?.toLowerCase().includes(s) ||
      String(log.ServiceOrderId).includes(s)
    );
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reports & Audit</h1>
        <p className="text-slate-500 text-sm mt-1">Generate PRO reports and track all audit events</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-2 pt-2">
          {([
            { label: 'Reports', value: 'reports', icon: FileText },
            { label: 'Audit Log', value: 'audit', icon: History },
          ] as any[]).map((tab: any) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl transition-colors ${activeTab === tab.value ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="p-6 space-y-6">
            {/* Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Report Type</label>
                <select
                  value={selectedReport}
                  onChange={e => setSelectedReport(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {REPORT_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div className="flex items-end gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-emerald-700 transition-colors">
                  <Search className="w-4 h-4" /> Search
                </button>
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Report List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {REPORT_TYPES.map(report => (
                <button
                  key={report}
                  onClick={() => setSelectedReport(report)}
                  className={`text-left p-4 rounded-xl border transition-all ${selectedReport === report ? 'border-emerald-300 bg-emerald-50 shadow-sm' : 'border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedReport === report ? 'bg-emerald-200' : 'bg-slate-100'}`}>
                      <FileText className={`w-4 h-4 ${selectedReport === report ? 'text-emerald-700' : 'text-slate-500'}`} />
                    </div>
                    <span className={`text-sm font-medium ${selectedReport === report ? 'text-emerald-700' : 'text-slate-600'}`}>{report}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-medium">Select a report and apply filters to view data</p>
              <p className="text-sm">Report generation coming with Phase 2 backend.</p>
            </div>
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === 'audit' && (
          <div>
            <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search audit logs..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <button onClick={loadAudit} className="w-9 h-9 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader className="w-6 h-6 animate-spin text-emerald-500" />
                <span className="ml-3 text-slate-400 text-sm">Loading audit logs...</span>
              </div>
            ) : error ? (
              <div className="m-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">No audit records</p>
                <p className="text-sm">PRO actions will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                      <th className="px-4 py-3 text-left font-semibold">#</th>
                      <th className="px-4 py-3 text-left font-semibold">Order</th>
                      <th className="px-4 py-3 text-left font-semibold">UHID</th>
                      <th className="px-4 py-3 text-left font-semibold">Patient</th>
                      <th className="px-4 py-3 text-left font-semibold">Action</th>
                      <th className="px-4 py-3 text-left font-semibold">Previous</th>
                      <th className="px-4 py-3 text-left font-semibold">New</th>
                      <th className="px-4 py-3 text-left font-semibold">Reason</th>
                      <th className="px-4 py-3 text-left font-semibold">By</th>
                      <th className="px-4 py-3 text-left font-semibold">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log: any, idx: number) => (
                      <tr key={log.LogId} className="border-t border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{log.ServiceOrderId}</td>
                        <td className="px-4 py-3 text-slate-500">{log.UHID ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{log.PatientName ?? '—'}</td>
                        <td className="px-4 py-3"><ActionBadge action={log.Action} /></td>
                        <td className="px-4 py-3 text-slate-500">{log.PreviousValue ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-600 font-medium">{log.NewValue ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate" title={log.Reason}>{log.Reason ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{log.ChangedBy}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {log.CreatedAt ? new Date(log.CreatedAt).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
