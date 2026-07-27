import { useState } from 'react';
import { DateFilter } from '../../components/ui/DateFilter';
import { ShieldAlert, Activity, Download, Database, AlertTriangle, Search, X, Lock, Laptop, CheckCircle2, ListFilter, Shield, ArrowRight, Save } from 'lucide-react';

// --- MOCK DATA GENERATOR ---
const generateLogs = (count: number) => {
  const users = ['System Admin', 'Dr. Sarah Connor', 'Dr. James Smith', 'Finance Manager', 'Procurement Dept', 'Nurse Lisa', 'HR Admin'];
  const roles = ['Administrator', 'Chief Medical Officer', 'Surgeon', 'Finance Head', 'Purchase Officer', 'Head Nurse', 'HR Manager'];
  const depts = ['IT', 'Cardiology', 'Orthopedics', 'Finance', 'Procurement', 'ICU', 'Human Resources'];
  const modules = ['Settings', 'Patient Registration', 'Appointments', 'Finance', 'Purchase Orders', 'IPD', 'Payroll'];
  const actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT', 'APPROVE', 'FAILED_LOGIN'];
  const risks = ['Low', 'Low', 'Low', 'Medium', 'Medium', 'High', 'Critical'];
  
  return Array.from({ length: count }).map((_, i) => {
    const idx = i % 7;
    const actIdx = Math.floor(Math.random() * 7);
    const time = new Date(Date.now() - Math.random() * 864000000).toISOString(); // Random time within last 10 days
    return {
      id: `LOG-26${String(8000 + i).padStart(4, '0')}`,
      timestamp: time.replace('T', ' ').substring(0, 19),
      user: users[idx],
      empId: `EMP-${100 + idx}`,
      role: roles[idx],
      department: depts[idx],
      module: modules[idx],
      screen: `${modules[idx]} Dashboard`,
      action: actions[actIdx],
      recordId: `REC-${Math.floor(Math.random() * 99999)}`,
      ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
      device: Math.random() > 0.5 ? 'Windows PC' : 'MacBook Pro',
      browser: 'Chrome 114',
      os: 'Windows 11',
      location: 'Internal Network',
      duration: `${Math.floor(Math.random() * 500)}ms`,
      status: actions[actIdx] === 'FAILED_LOGIN' ? 'Failed' : 'Success',
      risk: actions[actIdx] === 'DELETE' ? 'High' : actions[actIdx] === 'FAILED_LOGIN' ? 'Critical' : risks[actIdx],
      oldData: actions[actIdx] === 'UPDATE' ? JSON.stringify({ status: 'Pending', value: 100 }, null, 2) : '{}',
      newData: actions[actIdx] === 'UPDATE' ? JSON.stringify({ status: 'Approved', value: 150 }, null, 2) : '{}',
    };
  });
};

const mockLogs = generateLogs(520).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

export const AuditLogsPage = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activeTab, setActiveTab] = useState<'table' | 'timeline' | 'security' | 'reports'>('table');
  const [search, setSearch] = useState('');
  
  // Drawer State
  const [selectedLog, setSelectedLog] = useState<typeof mockLogs[0] | null>(null);

  // Pagination (Simple mock)
  const [page, setPage] = useState(1);
  const rowsPerPage = 15;
  const filteredLogs = mockLogs.filter(l => l.user.toLowerCase().includes(search.toLowerCase()) || l.action.toLowerCase().includes(search.toLowerCase()));
  const currentLogs = filteredLogs.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col relative overflow-hidden -mx-4 -my-4 lg:-mx-8 lg:-my-8 bg-slate-50">
      
      {/* Drawer */}
      {selectedLog && (
        <div className="absolute inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm animate-in fade-in">
          <div className="w-[800px] h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right-16">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-slate-50 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Audit Detail: {selectedLog.id}</h2>
                <div className="text-xs text-slate-500">{selectedLog.timestamp}</div>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-800">{selectedLog.user}</div>
                  <div className="text-xs text-slate-500">{selectedLog.role} • {selectedLog.department}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-800">{selectedLog.action} <span className="text-slate-400 font-normal">on</span> {selectedLog.module}</div>
                  <div className="text-xs text-slate-500">Record ID: {selectedLog.recordId}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Network & Device</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">IP Address:</span> <span className="font-medium text-slate-700">{selectedLog.ip}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Device:</span> <span className="font-medium text-slate-700">{selectedLog.device}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Browser:</span> <span className="font-medium text-slate-700">{selectedLog.browser}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">OS:</span> <span className="font-medium text-slate-700">{selectedLog.os}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Location:</span> <span className="font-medium text-slate-700">{selectedLog.location}</span></div>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Execution Meta</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Status:</span> 
                      <span className={`font-bold ${selectedLog.status === 'Success' ? 'text-emerald-600' : 'text-rose-600'}`}>{selectedLog.status}</span>
                    </div>
                    <div className="flex justify-between"><span className="text-slate-500">Risk Level:</span> 
                      <span className={`font-bold ${
                        selectedLog.risk === 'Critical' ? 'text-rose-600' : 
                        selectedLog.risk === 'High' ? 'text-orange-600' : 
                        selectedLog.risk === 'Medium' ? 'text-amber-600' : 'text-blue-600'
                      }`}>{selectedLog.risk}</span>
                    </div>
                    <div className="flex justify-between"><span className="text-slate-500">Duration:</span> <span className="font-medium text-slate-700">{selectedLog.duration}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Session ID:</span> <span className="font-medium text-slate-700">SES-{Math.floor(Math.random() * 999999)}</span></div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Database className="w-3 h-3" /> Data Mutation Diff (JSON View)
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-rose-50/50 border border-rose-200 rounded-lg overflow-hidden flex flex-col">
                    <div className="bg-rose-100/50 px-3 py-1.5 border-b border-rose-200 text-xs font-bold text-rose-800">Old Value</div>
                    <pre className="p-3 text-xs text-slate-700 font-mono overflow-auto">{selectedLog.oldData}</pre>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg overflow-hidden flex flex-col">
                    <div className="bg-emerald-100/50 px-3 py-1.5 border-b border-emerald-200 text-xs font-bold text-emerald-800">New Value</div>
                    <pre className="p-3 text-xs text-slate-700 font-mono overflow-auto">{selectedLog.newData}</pre>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold shadow-sm">Print Record</button>
            </div>
          </div>
        </div>
      )}

      {/* Header & KPI */}
      <div className="bg-white border-b border-slate-200 p-6 shrink-0 z-10 shadow-sm flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2"><Shield className="w-6 h-6 text-emerald-600" /> Enterprise Audit Logs</h1>
            <p className="text-sm text-slate-500 mt-1">Monitor, trace, and audit every activity performed across the HMS.</p>
          </div>
          <div className="flex items-center gap-2">
            <DateFilter
              dateFrom={fromDate}
              dateTo={toDate}
              onDateFromChange={setFromDate}
              onDateToChange={setToDate}
            />
            <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors shadow-sm flex items-center gap-2">
              <Search className="w-4 h-4" /> Global Search
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {[
            { label: 'Total Activities Today', val: '14,293', icon: Activity, c: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Successful', val: '14,102', icon: CheckCircle2, c: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Failed Login Attempts', val: '45', icon: Lock, c: 'text-rose-600', bg: 'bg-rose-50' },
            { label: 'Security Alerts', val: '12', icon: ShieldAlert, c: 'text-rose-600', bg: 'bg-rose-50' },
            { label: 'Data Modifications', val: '2,901', icon: Database, c: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Deleted Records', val: '34', icon: AlertTriangle, c: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Critical Activities', val: '7', icon: AlertTriangle, c: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Active Sessions', val: '298', icon: Laptop, c: 'text-teal-600', bg: 'bg-teal-50' },
          ].map((k, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <div className={`w-7 h-7 rounded-md ${k.bg} ${k.c} flex items-center justify-center`}>
                  <k.icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl font-bold text-slate-800 leading-none">{k.val}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-tight leading-tight">{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-slate-200">
          {[
            { id: 'table', label: 'Enterprise Data Table' },
            { id: 'timeline', label: 'Live Timeline' },
            { id: 'security', label: 'Security Dashboard' },
            { id: 'reports', label: 'Audit Reports & Retention' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === t.id ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {t.label}
              {activeTab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full"></div>}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar (Filters) - Only show on Table view */}
        {activeTab === 'table' && (
          <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto custom-scrollbar p-4 z-0">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4"><ListFilter className="w-4 h-4" /> Advanced Filters</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Search</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search logs..." 
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:border-emerald-500" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Date Range</label>
                <select className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:border-emerald-500"><option>Last 7 Days</option></select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Module</label>
                <select className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:border-emerald-500"><option>All Modules</option></select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Action</label>
                <select className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:border-emerald-500"><option>All Actions</option></select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Risk Level</label>
                <select className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:border-emerald-500"><option>All Risks</option></select>
              </div>
            </div>
            
            <button className="mt-6 w-full py-2 bg-slate-100 text-slate-600 rounded text-xs font-bold hover:bg-slate-200 transition-colors">Reset Filters</button>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-auto bg-slate-50 custom-scrollbar p-6">
          
          {activeTab === 'table' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-full animate-in fade-in">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Log ID</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Module</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">Risk Level</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 group transition-colors">
                        <td className="py-2.5 px-4 text-slate-500 font-mono">{log.timestamp}</td>
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-700">{log.id}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-800">{log.user} <span className="text-slate-400 font-normal">({log.empId})</span></td>
                        <td className="py-2.5 px-4 text-slate-600">{log.role}</td>
                        <td className="py-2.5 px-4 text-slate-600">{log.module}</td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' :
                            log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                            log.action === 'DELETE' ? 'bg-rose-100 text-rose-700' :
                            log.action === 'FAILED_LOGIN' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>{log.action}</span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 font-mono">{log.ip}</td>
                        <td className="py-2.5 px-4">
                          <span className={`flex items-center gap-1 ${
                            log.risk === 'Critical' ? 'text-rose-600 font-bold' : 
                            log.risk === 'High' ? 'text-orange-600 font-bold' : 
                            log.risk === 'Medium' ? 'text-amber-600 font-bold' : 'text-blue-600 font-medium'
                          }`}>
                            {log.risk === 'Critical' && <ShieldAlert className="w-3 h-3" />}
                            {log.risk}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button onClick={() => setSelectedLog(log)} className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded hover:bg-slate-50 transition-colors font-medium shadow-sm">View Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center mt-auto shrink-0">
                <div className="text-sm text-slate-500">Showing {(page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, filteredLogs.length)} of {filteredLogs.length} entries</div>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-slate-200 rounded text-sm font-medium hover:bg-slate-50 disabled:opacity-50">Previous</button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page * rowsPerPage >= filteredLogs.length} className="px-3 py-1.5 border border-slate-200 rounded text-sm font-medium hover:bg-slate-50 disabled:opacity-50">Next</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="max-w-3xl mx-auto animate-in fade-in">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <h2 className="text-xl font-bold text-slate-800 mb-6">Live Activity Timeline</h2>
                <div className="relative pl-6 border-l-2 border-slate-100 space-y-8">
                  {mockLogs.slice(0, 15).map((log, i) => (
                    <div key={i} className="relative">
                      <div className={`absolute -left-[33px] w-4 h-4 rounded-full border-2 border-white ${
                        log.status === 'Failed' ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}></div>
                      <div className="text-xs font-bold text-slate-400 mb-1">{log.timestamp}</div>
                      <div className="text-sm text-slate-800">
                        <span className="font-bold">{log.user}</span> ({log.role}) performed <span className="font-bold">{log.action}</span> on <span className="font-bold">{log.module}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">IP: {log.ip} • Status: {log.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="grid grid-cols-2 gap-6 animate-in fade-in">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-rose-500" /> Critical Alerts</h2>
                <div className="space-y-3">
                  {mockLogs.filter(l => l.risk === 'Critical').slice(0, 5).map((log, i) => (
                    <div key={i} className="p-3 bg-rose-50 border border-rose-100 rounded-lg">
                      <div className="text-sm font-bold text-rose-800">{log.action} ALERT</div>
                      <div className="text-xs text-rose-600 mt-1">{log.user} attempted to access {log.module}. IP: {log.ip}</div>
                      <div className="text-[10px] text-rose-400 mt-2">{log.timestamp}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Lock className="w-5 h-5 text-amber-500" /> Suspicious Logins</h2>
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <div className="text-sm font-bold text-amber-800">Multiple Failed Logins</div>
                    <div className="text-xs text-amber-600 mt-1">5 failed attempts for user "Finance Manager" from IP 192.168.1.45</div>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                    <div className="text-sm font-bold text-amber-800">Access Outside Office Hours</div>
                    <div className="text-xs text-amber-600 mt-1">"Dr. James Smith" accessed IPD Module at 02:30 AM</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4">Generate Audit Reports</h2>
                <div className="grid grid-cols-2 gap-4">
                  {['User Activity Report', 'Module Activity Report', 'Failed Login Report', 'Patient Record Access Report', 'Purchase Audit Report'].map(rep => (
                    <button key={rep} className="p-4 border border-slate-200 rounded-lg hover:border-emerald-500 hover:shadow-md transition-all text-left group">
                      <div className="font-bold text-slate-700 group-hover:text-emerald-700">{rep}</div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">Generate PDF/Excel <ArrowRight className="w-3 h-3" /></div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Save className="w-5 h-5 text-slate-500" /> Retention Policy Configuration</h2>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-bold text-slate-800">Log Retention Period</div>
                      <div className="text-xs text-slate-500 mt-0.5">Determines how long audit logs are kept before being archived forever.</div>
                    </div>
                    <select className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 shadow-sm">
                      <option>90 Days</option>
                      <option>1 Year</option>
                      <option>3 Years</option>
                      <option>5 Years</option>
                      <option>Forever (Never Delete)</option>
                    </select>
                  </div>
                  <button className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold shadow-sm">Save Policy</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
