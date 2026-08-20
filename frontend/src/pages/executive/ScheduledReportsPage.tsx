import { useCallback, useEffect, useState, useMemo } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { DateFilter } from '../../components/ui/DateFilter';
import { Calendar, Clock, Plus, Check, FileText, Filter, Search, MoreVertical, ShieldAlert, History, Activity, X } from 'lucide-react';

type ViewState = 'dashboard' | 'create' | 'history';

const API_BASE = import.meta.env.VITE_API_URL as string;

interface Schedule {
  id: string; scheduleId: number; name: string; description: string;
  category: string; reportTemplate: string; frequency: string; runTime: string;
  deliveryMethod: string; recipients: string; status: string;
  lastRunAt: string | null; nextRunAt: string | null; lastExecStatus: string;
  author: string; createdDate: string | null;
}

interface RunResult {
  runId: number; scheduleCode: string; template: string; status: string;
  durationMs: number; message: string; rows: Record<string, unknown>[];
  delivered: boolean;
}

interface RunLog {
  runId: number; startedAt: string | null; durationMs: number | null;
  status: string; deliveredTo: string; message: string;
  scheduleName: string; scheduleCode: string;
}

const BLANK = {
  name: '', description: '', category: 'Financial', reportTemplate: 'Revenue Report',
  frequency: 'Daily', runTime: '', deliveryMethod: 'Email Attachment', recipients: '',
  status: 'Active',
};

const dayOf = (iso: string | null) => {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '\u2014'
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const timeOf = (iso: string | null) => {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '\u2014'
    : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const when = (iso: string | null) => {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '\u2014';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

export const ScheduledReportsPage = () => {
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [q, setQ] = useState('');
  
  const [view, setView] = useState<ViewState>('dashboard');
  const [toast, setToast] = useState('');
  
  // Schedules and their run history now live in admin.Sch_Report /
  // admin.Sch_ReportRun. Both used to be arrays hardcoded in this file, so
  // nothing survived a refresh.
  const [reports, setReports] = useState<Schedule[]>([]);
  const [historyLogs, setHistoryLogs] = useState<RunLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...BLANK });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, rRes] = await Promise.all([
        fetch(`${API_BASE}/scheduled-reports/`),
        fetch(`${API_BASE}/scheduled-reports/runs`),
      ]);
      const sData = await sRes.json();
      const rData = await rRes.json();
      setReports(Array.isArray(sData) ? sData : []);
      setHistoryLogs(Array.isArray(rData) ? rData : []);
    } catch (e) {
      console.error('[ScheduledReports] load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredReports = useMemo(() => {
    let res = reports;
    if (fromDate) {
      const from = new Date(fromDate).getTime();
      res = res.filter(r => r.createdDate && new Date(r.createdDate).getTime() >= from);
    }
    if (toDate) {
      const to = new Date(toDate).getTime() + 86400000 - 1;
      res = res.filter(r => r.createdDate && new Date(r.createdDate).getTime() <= to);
    }
    if (q.trim()) {
      const needle = q.toLowerCase();
      res = res.filter(r => 
        (r.name || '').toLowerCase().includes(needle) ||
        (r.author || '').toLowerCase().includes(needle) ||
        (r.category || '').toLowerCase().includes(needle) ||
        (r.id || '').toLowerCase().includes(needle)
      );
    }
    return res;
  }, [reports, fromDate, toDate, q]);

  const { page, setPage, pageSize, total, paged } = usePagination(historyLogs);


  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  // The row whose details are open. "View Details" used to open the blank
  // create form, which showed nothing about the schedule you clicked.
  const [detailId, setDetailId] = useState<string | null>(null);
  // The row being edited, so the form header names it instead of always
  // reading "Create New Schedule".
  const [editId, setEditId] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const toggleStatus = async (id: string) => {
    setActiveMenuId(null);
    const target = reports.find(r => r.id === id);
    if (!target) return;
    const next = target.status === 'Active' ? 'Paused' : 'Active';
    try {
      const res = await fetch(`${API_BASE}/scheduled-reports/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      showToast(`${id} is now ${next}.`);
      load();
    } catch (e) {
      console.error('[ScheduledReports] status change failed', e);
      showToast('Could not update the schedule status.');
    }
  };


  const deleteReport = async (id: string) => {
    setActiveMenuId(null);
    const target = reports.find(r => r.id === id);
    const label = target ? ` (${target.name})` : '';
    if (!window.confirm(`Delete schedule ${id}${label}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/scheduled-reports/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(String(res.status));
      showToast(`${id} deleted.`);
      load();
    } catch (e) {
      console.error('[ScheduledReports] delete failed', e);
      showToast('Could not delete the schedule.');
    }
  };

  // Create or update, depending on whether a schedule is being edited.
  const saveSchedule = async () => {
    if (!form.name.trim()) { showToast('Schedule name is required.'); return; }
    setSaving(true);
    try {
      const res = await fetch(
        editId ? `${API_BASE}/scheduled-reports/${editId}` : `${API_BASE}/scheduled-reports/`,
        {
          method: editId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, createdBy: 'Admin' }),
        },
      );
      if (!res.ok) throw new Error(String(res.status));
      showToast(editId ? `${editId} updated.` : 'Schedule created.');
      setEditId(null);
      setForm({ ...BLANK });
      setView('dashboard');
      load();
    } catch (e) {
      console.error('[ScheduledReports] save failed', e);
      showToast('Could not save the schedule.');
    } finally {
      setSaving(false);
    }
  };

  // Pulls the stored output of a run and saves it as a CSV.
  const downloadRun = async (log: RunLog) => {
    try {
      const res = await fetch(`${API_BASE}/scheduled-reports/runs/${log.runId}/download`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        showToast(err?.detail || 'Nothing to download for this run.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${log.scheduleCode}-${(log.startedAt || '').slice(0, 19).replace(/[:T]/g, '')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('[ScheduledReports] download failed', e);
      showToast('Could not download the report.');
    }
  };

  // Executes the schedule's template query straight away and records the run.
  // Delivery is not implemented, so this generates figures rather than emailing.
  const [running, setRunning] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<RunResult | null>(null);

  const runNow = async (id: string) => {
    setActiveMenuId(null);
    setRunning(id);
    try {
      const res = await fetch(`${API_BASE}/scheduled-reports/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggeredBy: 'Admin' }),
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out?.detail || String(res.status));
      // Show what the report produced. A toast alone told you it ran but not
      // what came back.
      setRunResult(out as RunResult);
      load();
    } catch (e) {
      console.error('[ScheduledReports] run failed', e);
      showToast('Could not run the report.');
    } finally {
      setRunning(null);
    }
  };

  // Open the form with the chosen schedule loaded, or blank for a new one.
  const openForm = (id?: string) => {
    const r = id ? reports.find(x => x.id === id) : null;
    setEditId(r ? r.id : null);
    setForm(r
      ? {
          name: r.name, description: r.description, category: r.category,
          reportTemplate: r.reportTemplate || BLANK.reportTemplate,
          frequency: r.frequency, runTime: r.runTime,
          deliveryMethod: r.deliveryMethod || BLANK.deliveryMethod,
          recipients: r.recipients, status: r.status,
        }
      : { ...BLANK });
    setActiveMenuId(null);
    setDetailId(null);
    setView('create');
  };

  // --- Views ---

  if (view === 'create') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => { setView('dashboard'); setEditId(null); }} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors bg-slate-100">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              {editId ? `Edit Schedule · ${editId}` : 'Create New Schedule'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {editId
                ? 'The fields below are not yet bound to this schedule \u2014 saving is not wired to a backend.'
                : 'Configure a new automated report delivery workflow.'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
          {/* Section 1: Basic Info */}
          <div className="p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">1. Basic Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Schedule Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary text-sm"
                  placeholder="e.g. Daily Executive Revenue Report"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary text-sm h-20"
                  placeholder="Optional notes..."
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Report Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary text-sm"
                >
                  <option>Financial</option>
                  <option>Clinical</option>
                  <option>Operational</option>
                  <option>Inventory</option>
                  <option>HR</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Select Report Template</label>
                <select
                  value={form.reportTemplate}
                  onChange={e => setForm({ ...form, reportTemplate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary text-sm"
                >
                  <option>Revenue Report</option>
                  <option>Bed Occupancy</option>
                  <option>Doctor Performance</option>
                  <option>Cash Flow</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Timing */}
          <div className="p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">2. Execution Schedule</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Frequency</label>
                <select
                  value={form.frequency}
                  onChange={e => setForm({ ...form, frequency: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary text-sm"
                >
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                  <option>Custom CRON Expression</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Run Time</label>
                <input
                  type="time"
                  value={form.runTime}
                  onChange={e => setForm({ ...form, runTime: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Time Zone</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary text-sm">
                  <option>Asia/Kolkata (IST)</option>
                  <option>UTC</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Delivery */}
          <div className="p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">3. Output & Delivery</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Output Format</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary text-sm">
                  <option>PDF Document</option>
                  <option>Excel Spreadsheet</option>
                  <option>CSV Data</option>
                  <option>JSON Payload</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Delivery Method</label>
                <select
                  value={form.deliveryMethod}
                  onChange={e => setForm({ ...form, deliveryMethod: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary text-sm"
                >
                  <option>Email Attachment</option>
                  <option>Internal Portal Notification</option>
                  <option>AWS S3 / Cloud Storage</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Recipients (Email or Roles)</label>
                <input
                  type="text"
                  value={form.recipients}
                  onChange={e => setForm({ ...form, recipients: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary text-sm"
                  placeholder="e.g. ceo@hospital.com, Department Heads"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Security */}
          <div className="p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">4. Security Settings</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300" />
                <span className="text-sm text-slate-700">Password Protect File (Uses User's Login Password)</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300" defaultChecked />
                <span className="text-sm text-slate-700">Add Confidentiality Watermark</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300" defaultChecked />
                <span className="text-sm text-slate-700">Enforce Role-Based Access Control (RBAC) on Download</span>
              </label>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex gap-4 justify-end">
          <button
            onClick={() => { setView('dashboard'); setEditId(null); setForm({ ...BLANK }); }}
            className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={saveSchedule}
            disabled={saving || !form.name.trim()}
            className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving\u2026' : editId ? 'Save Changes' : 'Create Schedule'}
          </button>
        </div>
      </div>
    );
  }

  if (view === 'history') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setView('dashboard')} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors bg-white border border-slate-200 shadow-sm">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Global Execution History</h1>
            <p className="text-sm text-slate-500 mt-1">Audit log of all automated report generations and deliveries.</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-4 px-6">Executed</th>
                  <th className="py-4 px-6">Time</th>
                  <th className="py-4 px-6">Report Name</th>
                  <th className="py-4 px-6">Duration</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Delivered To</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paged.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 text-slate-700 font-medium">{dayOf(log.startedAt)}</td>
                    <td className="py-4 px-6 text-slate-600">{timeOf(log.startedAt)}</td>
                    <td className="py-4 px-6">
                      <div className="text-slate-800 font-medium">{log.scheduleName}</div>
                      <div className="text-xs text-slate-400 font-mono">{log.scheduleCode}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-500">{log.durationMs == null ? '\u2014' : log.durationMs < 1000 ? `${log.durationMs}ms` : `${(log.durationMs / 1000).toFixed(1)}s`}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        log.status === 'Success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600">{log.deliveredTo}</td>
                    <td className="py-4 px-6 text-right">
                      {log.status === 'Success' ? (
                        <button onClick={() => downloadRun(log)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded text-xs font-medium hover:bg-slate-200 transition-colors">Download</button>
                      ) : (
                        <button onClick={() => window.alert(log.message || 'No error detail was recorded.')} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded text-xs font-medium hover:bg-rose-100 transition-colors">View Error</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        <Pagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} />
        </div>
      </div>
    );
  }

  // Dashboard View Default

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <DateFilter
          dateFrom={draftFrom}
          dateTo={draftTo}
          onDateFromChange={setDraftFrom}
          onDateToChange={setDraftTo}
          onSearch={() => {
            setFromDate(draftFrom);
            setToDate(draftTo);
          }}
          onReset={() => {
            setFromDate('');
            setToDate('');
            setDraftFrom('');
            setDraftTo('');
          }}
        />
      </div>
      {toast && (
        <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg text-sm flex items-center gap-3 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
          {toast}
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Scheduled Reports Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Central command for automated data generation and delivery.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setView('history')} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <History className="w-4 h-4" /> Global History
          </button>
          <button onClick={() => openForm()} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create New Schedule
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          // Counted from the rows below. These were fixed literals (124 / 98 /
          // 45 / 2 / 18) that contradicted the five schedules in the table.
          { label: 'Total Scheduled', val: String(reports.length), icon: Calendar, c: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Schedules', val: String(reports.filter(r => r.status === 'Active').length), icon: Activity, c: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Executed Today', val: String(historyLogs.filter(h => (h.startedAt || '').slice(0, 10) === new Date().toISOString().slice(0, 10)).length), icon: Check, c: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Failed Executions', val: String(historyLogs.filter(h => h.status === 'Failed').length), icon: ShieldAlert, c: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Paused', val: String(reports.filter(r => r.status === 'Paused').length), icon: Clock, c: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Last Generated', val: historyLogs[0] ? when(historyLogs[0].startedAt) : '\u2014', icon: History, c: 'text-slate-600', bg: 'bg-slate-100' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className={`w-8 h-8 rounded-lg ${k.bg} ${k.c} flex items-center justify-center mb-3`}>
              <k.icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-slate-800 leading-tight mb-1">{k.val}</div>
            <div className="text-xs font-medium text-slate-500">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search schedules, authors, or categories..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary shadow-sm"
          />
        </div>
        <button className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-visible">
        <div className="overflow-x-auto overflow-y-visible pb-24">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="py-4 px-6">Schedule ID / Name</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Generated By</th>
                <th className="py-4 px-6">Frequency</th>
                <th className="py-4 px-6">Next Run</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="font-bold text-slate-800">{report.id}</div>
                    <div className="text-slate-500 flex items-center gap-1 mt-0.5"><FileText className="w-3 h-3" /> {report.name}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">{report.category}</span>
                  </td>
                  <td className="py-4 px-6 text-slate-600">{report.author}</td>
                  <td className="py-4 px-6 text-slate-600">{report.frequency}</td>
                  <td className="py-4 px-6">
                    <div className="text-slate-800 font-medium">{when(report.nextRunAt)}</div>
                    <div className="text-xs text-slate-400 mt-0.5">Last: {when(report.lastRunAt)}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1 w-max ${
                      report.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {report.status === 'Active' ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> : <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>}
                      {report.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center relative">
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === report.id ? null : report.id)}
                      className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {/* Dropdown Menu */}
                    {activeMenuId === report.id && (
                      <div className="absolute right-8 top-10 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
                        <div className="py-1">
                          <button onClick={() => { setDetailId(report.id); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">View Details</button>
                          <button onClick={() => openForm(report.id)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Edit Schedule</button>
                          <button onClick={() => toggleStatus(report.id)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                            {report.status === 'Active' ? 'Pause Schedule' : 'Resume Schedule'}
                          </button>
                          <button
                            onClick={() => runNow(report.id)}
                            disabled={running === report.id}
                            title="Run this report now and record the execution"
                            className="w-full text-left px-4 py-2 text-sm text-primary font-medium hover:bg-primary/5 disabled:opacity-50 disabled:cursor-wait"
                          >
                            {running === report.id ? 'Running\u2026' : 'Run Now'}
                          </button>
                          <div className="border-t border-slate-100 my-1"></div>
                          <button onClick={() => { setView('history'); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Execution History</button>
                          <div className="border-t border-slate-100 my-1"></div>
                          <button onClick={() => deleteReport(report.id)} className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 font-medium">Delete Schedule</button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && (
            <div className="py-14 text-center text-sm text-slate-400">Loading schedules…</div>
          )}
          {!loading && reports.length === 0 && (
            <div className="py-14 text-center text-sm text-slate-400">
              No schedules yet — use “New Schedule” to create one.
            </div>
          )}
        </div>
      </div>
      
      {/* Background click to close menu */}
      {activeMenuId && (
        <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)}></div>
      )}

      {/* Output of the run that just finished. */}
      {runResult && (() => {
        const cols = runResult.rows.length ? Object.keys(runResult.rows[0]) : [];
        const pretty = (k: string) =>
          k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
        const ok = runResult.status === 'Success';
        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
               onClick={() => setRunResult(null)}>
            <div onClick={e => e.stopPropagation()}
                 className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[88vh]">
              <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
                <div className="min-w-0">
                  <h3 className="font-bold text-lg text-slate-800 truncate">
                    {runResult.template || 'Report'} result
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {runResult.scheduleCode} \u00b7 run #{runResult.runId} \u00b7 {runResult.durationMs}ms
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
                  }`}>{runResult.status}</span>
                  <button onClick={() => setRunResult(null)} title="Close"
                          className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-5 overflow-auto">
                <p className={`text-sm mb-4 ${ok ? 'text-slate-600' : 'text-rose-600'}`}>
                  {runResult.message}
                </p>

                {cols.length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center border border-slate-100 rounded-xl">
                    This run returned no rows.
                  </p>
                ) : (
                  <div className="border border-slate-100 rounded-xl overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                        <tr>{cols.map(c => (
                          <th key={c} className="px-4 py-2.5 whitespace-nowrap">{pretty(c)}</th>
                        ))}</tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {runResult.rows.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50/70">
                            {cols.map(c => {
                              const v = r[c];
                              const num = typeof v === 'number';
                              return (
                                <td key={c} className={`px-4 py-2.5 text-sm text-slate-700 ${num ? 'text-right tabular-nums font-medium' : ''}`}>
                                  {num ? (v as number).toLocaleString('en-IN') : String(v ?? '\u2014')}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!runResult.delivered && (
                  <p className="text-[11px] text-slate-400 mt-3">
                    Generated in-app. No delivery is configured, so nothing was emailed \u2014 use Download to keep a copy.
                  </p>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex justify-end gap-3">
                <button onClick={() => setRunResult(null)}
                        className="px-5 py-2 border border-slate-200 bg-white text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-100 transition-colors">
                  Close
                </button>
                {runResult.rows.length > 0 && (
                  <button
                    onClick={() => downloadRun({
                      runId: runResult.runId,
                      scheduleCode: runResult.scheduleCode,
                      startedAt: new Date().toISOString(),
                    } as RunLog)}
                    className="px-5 py-2 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    Download CSV
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Schedule details. "View Details" used to open an empty create form,
          which told you nothing about the row you clicked. */}
      {detailId && (() => {
        const r = reports.find(x => x.id === detailId);
        if (!r) return null;
        const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{value || '\u2014'}</p>
          </div>
        );
        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
               onClick={() => setDetailId(null)}>
            <div onClick={e => e.stopPropagation()}
                 className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh]">
              <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
                <div className="min-w-0">
                  <h3 className="font-bold text-lg text-slate-800 truncate">{r.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{r.id} \u00b7 {r.category}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    r.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>{r.status}</span>
                  <button onClick={() => setDetailId(null)} title="Close"
                          className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-5 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                  <Field label="Generated By" value={r.author} />
                  <Field label="Category" value={r.category} />
                  <Field label="Frequency" value={r.frequency} />
                  <Field label="Last Run" value={when(r.lastRunAt)} />
                  <Field label="Next Run" value={when(r.nextRunAt)} />
                  <Field label="Last Execution" value={
                    <span className={r.lastExecStatus === 'Failed' ? 'text-rose-600' : 'text-emerald-600'}>
                      {r.lastExecStatus || 'Never run'}
                    </span>
                  } />
                  <Field label="Delivery" value={r.deliveryMethod} />
                  <Field label="Recipients" value={r.recipients} />
                  <Field label="Status" value={r.status} />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex justify-end gap-3">
                <button onClick={() => setDetailId(null)}
                        className="px-5 py-2 border border-slate-200 bg-white text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-100 transition-colors">
                  Close
                </button>
                <button onClick={() => openForm(r.id)}
                        className="px-5 py-2 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-colors">
                  Edit
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
