import { useState, useEffect } from 'react';
import {
  Search, Filter, Download, FileText, Eye, ShieldAlert,
  Clock, User, Laptop, Info, CheckCircle2, XCircle, RefreshCw, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { exportToExcel } from '../../../utils/exportToExcel';

const API_BASE = import.meta.env.VITE_API_URL as string;

interface AuditLogRecord {
  id: number;
  auditId: string;
  timestamp: string;
  userName: string;
  employeeName: string;
  role: string;
  department: string;
  module: string;
  screenName: string;
  action: string;
  recordId: string;
  transactionNumber: string;
  ipAddress: string;
  device: string;
  browser: string;
  operatingSystem: string;
  sessionId: string;
  oldValues: string;
  newValues: string;
  changeSummary: string;
  status: string;
  failureReason: string;
}

const s = (v: unknown): string => (v == null ? '' : String(v));

const mapApiToRecord = (item: Record<string, unknown>): AuditLogRecord => ({
  id:                item.id as number,
  auditId:           s(item.auditId),
  timestamp:         item.timestamp ? String(item.timestamp).replace('T', ' ').slice(0, 19) : '',
  userName:          s(item.userName),
  employeeName:      s(item.employeeName),
  role:              s(item.role),
  department:        s(item.department),
  module:            s(item.module),
  screenName:        s(item.screenName),
  action:            s(item.action),
  recordId:          s(item.recordId),
  transactionNumber: s(item.transactionNumber),
  ipAddress:         s(item.ipAddress),
  device:            s(item.device),
  browser:           s(item.browser),
  operatingSystem:   s(item.operatingSystem),
  sessionId:         s(item.sessionId),
  oldValues:         s(item.oldValues),
  newValues:         s(item.newValues),
  changeSummary:     s(item.changeSummary),
  status:            s(item.status),
  failureReason:     s(item.failureReason),
});

const PAGE_CAP = 500; // matches the backend MAX_LIMIT

export const AuditLogMaster = () => {
  const [records, setRecords] = useState<AuditLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [capHit, setCapHit] = useState(false);

  // Search & Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modal State
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AuditLogRecord | null>(null);

  const handleViewDetails = (record: AuditLogRecord) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };

  // ── Fetch logs (server-side search + filters) ────────────────
  const fetchLogs = async (f?: {
    search?: string; module?: string; action?: string; status?: string;
    role?: string; from?: string; to?: string;
  }) => {
    setIsLoading(true);
    setApiError(null);
    try {
      const p = new URLSearchParams();
      if (f?.search) p.set('search', f.search);
      if (f?.module) p.set('module_filter', f.module);
      if (f?.action) p.set('action_filter', f.action);
      if (f?.status) p.set('status_filter', f.status);
      if (f?.role) p.set('role_filter', f.role);
      if (f?.from) p.set('from_date', f.from);
      if (f?.to) p.set('to_date', f.to);
      const res = await fetch(`${API_BASE}/audit-logs/?${p.toString()}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: Record<string, unknown>[] = await res.json();
      setRecords(data.map(mapApiToRecord));
      setCapHit(data.length >= PAGE_CAP);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleSearch = () => {
    fetchLogs({
      search: searchTerm, module: filterModule, action: filterAction,
      status: filterStatus, role: filterRole, from: fromDate, to: toDate,
    });
  };

  const handleReset = () => {
    setSearchTerm(''); setFilterModule(''); setFilterAction('');
    setFilterStatus(''); setFilterRole(''); setFromDate(''); setToDate('');
    fetchLogs();
  };

  const handleExportPdf = () => window.print();

  const filteredRecords = records; // server already applied search + filters

  const uniqueModules = Array.from(new Set(records.map(r => r.module).filter(Boolean)));
  const uniqueActions = Array.from(new Set(records.map(r => r.action).filter(Boolean)));
  const uniqueRoles = Array.from(new Set(records.map(r => r.role).filter(Boolean)));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col relative"
    >
      {apiError && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{apiError}</span>
          <button onClick={() => setApiError(null)} className="text-red-500 hover:text-red-700 font-medium">Dismiss</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Audit Log Master</h1>
          <p className="text-slate-500 text-sm mt-1">Read-only, tamper-evident trail — entries cannot be edited or deleted.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" icon={RefreshCw} onClick={() => fetchLogs()}>Refresh</Button>
          <Button variant="outline" icon={FileText} onClick={handleExportPdf} className="text-blue-600 border-blue-200 hover:bg-blue-50">
            Export PDF
          </Button>
          <Button variant="outline" icon={Download} onClick={() => exportToExcel(records, 'AuditLogMaster')} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
            Export Excel
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Audit ID, User Name, Record ID, or IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSearch} className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors">
              Search
            </button>
            <button onClick={handleReset} className="px-4 py-2 bg-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-300 transition-colors">
              Reset
            </button>
          </div>
          <Button
            variant={showFilters ? "filled" : "outline"}
            color="secondary"
            icon={Filter}
            onClick={() => setShowFilters(!showFilters)}
          >
            Advanced Search
          </Button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-slate-200 bg-slate-50/50 p-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="lg:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">From Date</label>
                  <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">To Date</label>
                  <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Module</label>
                  <select value={filterModule} onChange={e => setFilterModule(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">All Modules</option>
                    {uniqueModules.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Role</label>
                  <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">All Roles</option>
                    {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Action Type</label>
                  <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">All Actions</option>
                    {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">All Statuses</option>
                    <option value="Success">Success</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Audit ID</th>
                <th className="px-4 py-3 font-medium">Date & Time</th>
                <th className="px-4 py-3 font-medium">User Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Module</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Record ID</th>
                <th className="px-4 py-3 font-medium">IP Address</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">Loading audit logs…</td></tr>
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{record.auditId}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{record.timestamp}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{record.userName}</td>
                    <td className="px-4 py-3 text-slate-600">{record.role}</td>
                    <td className="px-4 py-3 text-slate-600">{record.module}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium border
                        ${record.action === 'Create' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                        ${record.action === 'Update' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                        ${record.action === 'Delete' ? 'bg-red-50 text-red-700 border-red-200' : ''}
                        ${record.action === 'Login' || record.action === 'Logout' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
                        ${!['Create', 'Update', 'Delete', 'Login', 'Logout'].includes(record.action) ? 'bg-slate-50 text-slate-700 border-slate-200' : ''}
                      `}>
                        {record.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{record.recordId}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{record.ipAddress}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center items-center">
                        {record.status === 'Success' ? (
                          <span title="Success"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></span>
                        ) : (
                          <span title="Failed"><XCircle className="w-5 h-5 text-red-500" /></span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <button 
                          onClick={() => handleViewDetails(record)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors text-xs font-medium"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    No audit records found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {capHit && (
          <div className="px-4 py-2 border-t border-amber-100 bg-amber-50 text-amber-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Showing the most recent {PAGE_CAP} entries. Narrow the date range or filters to see older records.
          </div>
        )}
      </div>

      {/* View Details Modal */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title="Audit Log Details"
        maxWidth="4xl"
      >
        {selectedRecord && (
          <div className="p-2 space-y-6">
            
            {/* Header / Status Banner */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              selectedRecord.status === 'Success' 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                : 'bg-red-50 border-red-100 text-red-800'
            }`}>
              <div className="flex items-center gap-3">
                {selectedRecord.status === 'Success' ? <CheckCircle2 className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                <div>
                  <h3 className="font-bold text-lg">Activity {selectedRecord.status}</h3>
                  {selectedRecord.failureReason && (
                    <p className="text-sm mt-1">{selectedRecord.failureReason}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium opacity-70 uppercase tracking-wider">Audit ID</p>
                <p className="font-mono font-bold text-lg">{selectedRecord.auditId}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User Information */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
                  <User className="w-5 h-5 text-slate-400" />
                  <h4 className="font-bold text-slate-700">User Information</h4>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-slate-500 text-xs">User Name</dt>
                    <dd className="font-medium text-slate-800">{selectedRecord.userName}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 text-xs">Employee Name</dt>
                    <dd className="font-medium text-slate-800">{selectedRecord.employeeName}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 text-xs">Role</dt>
                    <dd className="font-medium text-slate-800">{selectedRecord.role}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 text-xs">Department</dt>
                    <dd className="font-medium text-slate-800">{selectedRecord.department}</dd>
                  </div>
                </dl>
              </div>

              {/* Activity Information */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
                  <Info className="w-5 h-5 text-slate-400" />
                  <h4 className="font-bold text-slate-700">Activity Information</h4>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-slate-500 text-xs">Module</dt>
                    <dd className="font-medium text-slate-800">{selectedRecord.module}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 text-xs">Screen Name</dt>
                    <dd className="font-medium text-slate-800">{selectedRecord.screenName}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 text-xs">Action Type</dt>
                    <dd className="font-medium text-slate-800">{selectedRecord.action}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 text-xs">Record ID</dt>
                    <dd className="font-mono text-slate-800">{selectedRecord.recordId}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-slate-500 text-xs">Transaction Number</dt>
                    <dd className="font-mono text-slate-800">{selectedRecord.transactionNumber || '—'}</dd>
                  </div>
                </dl>
              </div>

              {/* System Information */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 md:col-span-2">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
                  <Laptop className="w-5 h-5 text-slate-400" />
                  <h4 className="font-bold text-slate-700">System Information</h4>
                </div>
                <dl className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-sm">
                  <div className="col-span-2">
                    <dt className="text-slate-500 text-xs">Date & Time</dt>
                    <dd className="font-medium text-slate-800 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400"/> {selectedRecord.timestamp}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 text-xs">IP Address</dt>
                    <dd className="font-medium text-slate-800">{selectedRecord.ipAddress}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 text-xs">Device</dt>
                    <dd className="font-medium text-slate-800">{selectedRecord.device}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 text-xs">Browser</dt>
                    <dd className="font-medium text-slate-800">{selectedRecord.browser}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 text-xs">OS</dt>
                    <dd className="font-medium text-slate-800">{selectedRecord.operatingSystem}</dd>
                  </div>
                  <div className="col-span-2 sm:col-span-3 md:col-span-6 mt-2 pt-2 border-t border-slate-200">
                    <dt className="text-slate-500 text-xs">Session ID</dt>
                    <dd className="font-mono text-xs text-slate-600 break-all">{selectedRecord.sessionId}</dd>
                  </div>
                </dl>
              </div>

              {/* Change Information */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm md:col-span-2">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <h4 className="font-bold text-slate-700">Change Information</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Change Summary</h5>
                    <p className="text-sm text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100">{selectedRecord.changeSummary}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400"></span>
                        Old Values
                      </h5>
                      <pre className="text-xs font-mono text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 overflow-x-auto whitespace-pre-wrap min-h-[80px]">
                        {selectedRecord.oldValues || '—'}
                      </pre>
                    </div>
                    <div>
                      <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        New Values
                      </h5>
                      <pre className="text-xs font-mono text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 overflow-x-auto whitespace-pre-wrap min-h-[80px]">
                        {selectedRecord.newValues || '—'}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
        
        <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 px-6 py-4 border-t border-slate-100 bg-white flex justify-end rounded-b-2xl">
          <Button variant="outline" color="secondary" onClick={() => setIsViewOpen(false)}>
            Close Details
          </Button>
        </div>
      </Modal>

    </motion.div>
  );
};
