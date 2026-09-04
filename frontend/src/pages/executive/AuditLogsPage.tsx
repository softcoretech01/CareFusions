import { API_BASE_URL } from '@/utils/apiBase';
import { useState, useEffect, useMemo } from 'react';
import { Search, Shield, Activity, AlertTriangle, CheckCircle, X, Download } from 'lucide-react';
import { Pagination } from '../../components/ui/Pagination';
import { exportToExcel } from '../../utils/exportToExcel';

const API_BASE = API_BASE_URL;

interface AuditLog {
  id: number;
  auditId: string;
  timestamp: string;
  userName: string;
  employeeName: string | null;
  role: string | null;
  department: string | null;
  module: string;
  screenName: string;
  action: string;
  recordId: string | null;
  ipAddress: string | null;
  device: string | null;
  browser: string | null;
  operatingSystem: string | null;
  oldValues: string | null;
  newValues: string | null;
  changeSummary: string | null;
  status: string;
  failureReason: string | null;
}

interface Summary {
  totalLogs: number; today: number; successful: number; failed: number;
  creates: number; updates: number; deletes: number; activeUsers: number;
  byModule: { module: string; total: number }[];
}

const actionCls = (a: string) =>
  a === 'Create' ? 'bg-emerald-100 text-emerald-700'
  : a === 'Update' ? 'bg-amber-100 text-amber-700'
  : a === 'Delete' ? 'bg-rose-100 text-rose-700'
  : 'bg-slate-100 text-slate-700';

export const AuditLogsPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [selected, setSelected] = useState<AuditLog | null>(null);

  // Real audit trail — the prototype generated 520 rows with Math.random() at
  // module load, while the admin screen was already consuming this endpoint.
  useEffect(() => {
    Promise.allSettled([
      fetch(`${API_BASE}/audit-logs/?limit=500`).then(r => r.json()),
      fetch(`${API_BASE}/executive/audit-summary`).then(r => r.json()),
    ]).then(([l, s]) => {
      if (l.status === 'fulfilled' && Array.isArray(l.value)) setLogs(l.value);
      else console.error('[Executive] audit logs load failed', l);
      if (s.status === 'fulfilled' && s.value && !Array.isArray(s.value)) setSummary(s.value);
      setLoading(false);
    });
  }, []);

  const modules = useMemo(
    () => Array.from(new Set(logs.map(l => l.module).filter(Boolean))).sort(),
    [logs]);

  const rows = useMemo(() => logs.filter(l => {
    const s = search.trim().toLowerCase();
    if (s && !((l.userName || '').toLowerCase().includes(s)
      || (l.action || '').toLowerCase().includes(s)
      || (l.screenName || '').toLowerCase().includes(s)
      || (l.auditId || '').toLowerCase().includes(s))) return false;
    if (module && l.module !== module) return false;
    if (action && l.action !== action) return false;
    return true;
  }), [logs, search, module, action]);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(1); }, [page, totalPages]);
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const kpis = [
    { label: 'Total Activities', value: summary?.totalLogs ?? 0, icon: Activity, cls: 'text-blue-600 bg-blue-50' },
    { label: 'Today', value: summary?.today ?? 0, icon: Activity, cls: 'text-indigo-600 bg-indigo-50' },
    { label: 'Successful', value: summary?.successful ?? 0, icon: CheckCircle, cls: 'text-emerald-600 bg-emerald-50' },
    { label: 'Failed', value: summary?.failed ?? 0, icon: AlertTriangle, cls: 'text-rose-600 bg-rose-50' },
    { label: 'Records Created', value: summary?.creates ?? 0, icon: Shield, cls: 'text-teal-600 bg-teal-50' },
    { label: 'Records Updated', value: summary?.updates ?? 0, icon: Shield, cls: 'text-amber-600 bg-amber-50' },
    { label: 'Records Deleted', value: summary?.deletes ?? 0, icon: Shield, cls: 'text-rose-600 bg-rose-50' },
    { label: 'Active Users', value: summary?.activeUsers ?? 0, icon: Shield, cls: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Audit Logs</h1>
          <p className="text-xs text-slate-500">Every recorded create, update and delete across the system</p>
        </div>
        <button
          onClick={() => exportToExcel(rows.map(l => ({
            'Audit ID': l.auditId, Timestamp: l.timestamp, User: l.userName,
            Module: l.module, Screen: l.screenName, Action: l.action,
            Record: l.recordId || '', Status: l.status, IP: l.ipAddress || '',
            Device: l.device || '', Browser: l.browser || '', Summary: l.changeSummary || '',
          })), 'audit_logs')}
          disabled={rows.length === 0}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 flex items-center gap-2 disabled:opacity-40 w-max">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {kpis.map(k => (
          <div key={k.label} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1.5 ${k.cls}`}>
              <k.icon className="w-4 h-4" />
            </div>
            <p className="text-lg font-bold text-slate-800">{k.value.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-slate-500">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2.5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search user, action, screen or audit id..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-primary" />
        </div>
        <select value={module} onChange={e => setModule(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
          <option value="">All Modules</option>
          {modules.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={action} onChange={e => setAction(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
          <option value="">All Actions</option>
          <option>Create</option><option>Update</option><option>Delete</option>
        </select>
        <button onClick={() => { setSearch(''); setModule(''); setAction(''); }}
          className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200">Clear</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">Audit ID</th>
                <th className="px-3 py-2 text-left">Timestamp</th>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Module / Screen</th>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-center">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-3 py-2 font-mono text-xs text-primary">{l.auditId}</td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                    {new Date(l.timestamp).toLocaleString('en-GB', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-800">{l.userName || '—'}</div>
                    {l.role && <div className="text-xs text-slate-500">{l.role}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-slate-700">{l.module}</div>
                    <div className="text-xs text-slate-500">{l.screenName}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 text-[11px] font-bold rounded-lg w-max block ${actionCls(l.action)}`}>
                      {l.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {l.ipAddress || '—'}{l.device ? ` · ${l.device}` : ''}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 text-[11px] font-bold rounded-lg w-max block ${
                      l.status === 'Success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => setSelected(l)}
                      className="text-primary text-xs font-bold hover:underline">View</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                  {loading ? 'Loading audit trail…' : 'No audit entries match the current filters.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} totalItems={rows.length} onPageChange={setPage} />
      </div>

      {selected && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] overflow-y-auto">
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0">
              <h2 className="text-lg font-bold text-slate-800">{selected.auditId}</h2>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-slate-200 rounded-full">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {[
                  ['Timestamp', new Date(selected.timestamp).toLocaleString('en-GB')],
                  ['User', selected.userName], ['Role', selected.role || '—'],
                  ['Department', selected.department || '—'],
                  ['Module', selected.module], ['Screen', selected.screenName],
                  ['Action', selected.action], ['Record', selected.recordId || '—'],
                  ['Status', selected.status], ['IP Address', selected.ipAddress || '—'],
                  ['Device', selected.device || '—'],
                  ['Browser', `${selected.browser || '—'}${selected.operatingSystem ? ` / ${selected.operatingSystem}` : ''}`],
                ].map(([k, v]) => (
                  <div key={k as string}>
                    <p className="text-xs text-slate-500">{k}</p>
                    <p className="font-medium text-slate-800 break-words">{v as string}</p>
                  </div>
                ))}
              </div>
              {selected.changeSummary && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-slate-700">Change summary</p>
                  <p className="text-sm text-slate-600">{selected.changeSummary}</p>
                </div>
              )}
              {selected.failureReason && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-rose-800">Failure reason</p>
                  <p className="text-sm text-rose-700">{selected.failureReason}</p>
                </div>
              )}
              {(selected.oldValues || selected.newValues) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selected.oldValues && (
                    <div>
                      <p className="text-xs font-bold text-slate-700 mb-1">Before</p>
                      <pre className="bg-slate-900 text-slate-100 text-[11px] p-3 rounded-xl overflow-x-auto max-h-52">
                        {selected.oldValues}
                      </pre>
                    </div>
                  )}
                  {selected.newValues && (
                    <div>
                      <p className="text-xs font-bold text-slate-700 mb-1">After</p>
                      <pre className="bg-slate-900 text-slate-100 text-[11px] p-3 rounded-xl overflow-x-auto max-h-52">
                        {selected.newValues}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
