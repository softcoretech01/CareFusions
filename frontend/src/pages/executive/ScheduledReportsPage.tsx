import { useState } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { DateFilter } from '../../components/ui/DateFilter';
import { Calendar, Clock, Plus, Check, FileText, Filter, Search, MoreVertical, ShieldAlert, History, Activity, X } from 'lucide-react';

type ViewState = 'dashboard' | 'create' | 'history';

export const ScheduledReportsPage = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [view, setView] = useState<ViewState>('dashboard');
  const [toast, setToast] = useState('');
  
  // Execution history is still sample data — there is no report_run table yet.
  // Declared here (not inside the history branch) so the pagination hook runs
  // unconditionally; it previously sat after two early returns, which broke the
  // Rules of Hooks and left `paged` referenced before its declaration.
  const historyLogs = [
    { date: 'Today', time: '08:00:05 AM', report: 'Daily Executive Financial Summary', duration: '2.4s', status: 'Success', deliveredTo: '3 Email(s)' },
    { date: 'Today', time: '06:00:12 AM', report: 'Night Shift ER Incident Report', duration: '1.2s', status: 'Success', deliveredTo: 'Internal Portal' },
    { date: 'Yesterday', time: '08:00:04 AM', report: 'Daily Executive Financial Summary', duration: '2.3s', status: 'Success', deliveredTo: '3 Email(s)' },
    { date: 'Jul 15, 2026', time: '09:00:45 AM', report: 'Weekly Clinical Bottlenecks', duration: '4.8s', status: 'Success', deliveredTo: '5 Email(s)' },
    { date: 'Jul 01, 2026', time: '10:00:02 AM', report: 'Monthly Board Presentation', duration: '45.1s', status: 'Failed', deliveredTo: 'None (Timeout)' },
  ];
  const { page, setPage, pageSize, total, paged } = usePagination(historyLogs);

  // Dashboard State
  const [reports, setReports] = useState([
    { id: 'SR-1021', name: 'Daily Executive Financial Summary', category: 'Financial', author: 'Dr. Sarah Connor (CFO)', frequency: 'Daily (08:00 AM)', lastRun: 'Today, 08:00 AM', nextRun: 'Tomorrow, 08:00 AM', delivery: 'Email, Portal', recipients: 3, status: 'Active', lastExec: 'Success' },
    { id: 'SR-1022', name: 'Weekly Clinical Bottlenecks', category: 'Clinical', author: 'Dr. James Smith (CMO)', frequency: 'Weekly (Mon 09:00 AM)', lastRun: 'Jul 15, 09:00 AM', nextRun: 'Jul 22, 09:00 AM', delivery: 'Email', recipients: 5, status: 'Active', lastExec: 'Success' },
    { id: 'SR-1023', name: 'Monthly Board Presentation', category: 'Operational', author: 'Alan Turing (CEO)', frequency: 'Monthly (1st 10:00 AM)', lastRun: 'Jul 01, 10:00 AM', nextRun: 'Aug 01, 10:00 AM', delivery: 'Cloud Storage', recipients: 12, status: 'Active', lastExec: 'Failed' },
    { id: 'SR-1024', name: 'Night Shift ER Incident Report', category: 'Quality', author: 'System Admin', frequency: 'Daily (06:00 AM)', lastRun: 'Today, 06:00 AM', nextRun: 'Paused', delivery: 'Internal Portal', recipients: 2, status: 'Paused', lastExec: 'Success' },
    { id: 'SR-1025', name: 'Inventory Expiry Warning List', category: 'Inventory', author: 'Procurement Dept', frequency: 'Weekly (Fri 04:00 PM)', lastRun: 'Jul 19, 04:00 PM', nextRun: 'Jul 26, 04:00 PM', delivery: 'Email, API', recipients: 4, status: 'Active', lastExec: 'Success' },
  ]);

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const toggleStatus = (id: string) => {
    setReports(reports.map(r => 
      r.id === id ? { ...r, status: r.status === 'Active' ? 'Paused' : 'Active' } : r
    ));
    showToast(`Report schedule status updated.`);
    setActiveMenuId(null);
  };

  const runNow = (id: string) => {
    showToast(`Executing report ${id}... You will be notified when complete.`);
    setActiveMenuId(null);
  };

  const deleteReport = (id: string) => {
    setReports(reports.filter(r => r.id !== id));
    showToast(`Schedule ${id} deleted successfully.`);
    setActiveMenuId(null);
  };

  // --- Views ---

  if (view === 'create') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setView('dashboard')} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors bg-slate-100">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Create New Schedule</h1>
            <p className="text-sm text-slate-500 mt-1">Configure a new automated report delivery workflow.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
          {/* Section 1: Basic Info */}
          <div className="p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">1. Basic Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Schedule Name</label>
                <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary text-sm" placeholder="e.g. Daily Executive Revenue Report" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary text-sm h-20" placeholder="Optional notes..."></textarea>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Report Category</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary text-sm">
                  <option>Financial</option>
                  <option>Clinical</option>
                  <option>Operational</option>
                  <option>Inventory</option>
                  <option>HR</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Select Report Template</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary text-sm">
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
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary text-sm">
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                  <option>Custom CRON Expression</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Run Time</label>
                <input type="time" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary text-sm" />
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
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary text-sm">
                  <option>Email Attachment</option>
                  <option>Internal Portal Notification</option>
                  <option>AWS S3 / Cloud Storage</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Recipients (Email or Roles)</label>
                <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-primary text-sm" placeholder="e.g. ceo@hospital.com, Department Heads" />
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
          <button onClick={() => setView('dashboard')} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={() => { showToast('Draft saved successfully.'); setView('dashboard'); }} className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors">
            Save Draft
          </button>
          <button onClick={() => { showToast('New report scheduled successfully.'); setView('dashboard'); }} className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
            Schedule Report
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
                  <th className="py-4 px-6">Execution Date</th>
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
                    <td className="py-4 px-6 text-slate-700 font-medium">{log.date}</td>
                    <td className="py-4 px-6 text-slate-600">{log.time}</td>
                    <td className="py-4 px-6 text-slate-800 font-medium">{log.report}</td>
                    <td className="py-4 px-6 text-slate-500">{log.duration}</td>
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
                        <button onClick={() => showToast('Downloading artifact...')} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded text-xs font-medium hover:bg-slate-200 transition-colors">Download</button>
                      ) : (
                        <button onClick={() => showToast('Viewing error trace...')} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded text-xs font-medium hover:bg-rose-100 transition-colors">View Error</button>
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
          dateFrom={fromDate}
          dateTo={toDate}
          onDateFromChange={setFromDate}
          onDateToChange={setToDate}
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
          <button onClick={() => setView('create')} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create New Schedule
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Scheduled', val: '124', icon: Calendar, c: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Schedules', val: '98', icon: Activity, c: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Executed Today', val: '45', icon: Check, c: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Failed Executions', val: '2', icon: ShieldAlert, c: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Upcoming', val: '18', icon: Clock, c: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Last Generated', val: '12m ago', icon: History, c: 'text-slate-600', bg: 'bg-slate-100' },
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
          <input type="text" placeholder="Search schedules, authors, or categories..." className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary shadow-sm" />
        </div>
        <button className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-visible pb-24">
        <div className="overflow-x-auto overflow-y-visible">
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
              {reports.map((report) => (
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
                    <div className="text-slate-800 font-medium">{report.nextRun}</div>
                    <div className="text-xs text-slate-400 mt-0.5">Last: {report.lastRun}</div>
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
                          <button onClick={() => { setView('create'); setActiveMenuId(null); showToast('Opened in View mode'); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">View Details</button>
                          <button onClick={() => { setView('create'); setActiveMenuId(null); showToast('Opened in Edit mode'); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Edit Schedule</button>
                          <button onClick={() => toggleStatus(report.id)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                            {report.status === 'Active' ? 'Pause Schedule' : 'Resume Schedule'}
                          </button>
                          <button onClick={() => runNow(report.id)} className="w-full text-left px-4 py-2 text-sm text-primary font-medium hover:bg-primary/5">Run Now</button>
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
        </div>
      </div>
      
      {/* Background click to close menu */}
      {activeMenuId && (
        <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)}></div>
      )}

    </div>
  );
};
