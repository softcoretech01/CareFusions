import { useState } from 'react';
import { 
  Search, Filter, Download, FileText, Eye, ShieldAlert,
  Clock, User, Laptop, Info, CheckCircle2, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';

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

const mockData: AuditLogRecord[] = [
  {
    id: 1,
    auditId: 'ADT-20231024-001',
    timestamp: '2023-10-24 09:15:22',
    userName: 'johndoe',
    employeeName: 'John Doe',
    role: 'System Administrator',
    department: 'IT',
    module: 'Security',
    screenName: 'Login Screen',
    action: 'Login',
    recordId: 'USR-042',
    transactionNumber: '-',
    ipAddress: '192.168.1.45',
    device: 'Desktop',
    browser: 'Chrome 118.0',
    operatingSystem: 'Windows 11',
    sessionId: 'sess_9f8e7d6c5b',
    oldValues: '-',
    newValues: '-',
    changeSummary: 'User logged into the system successfully.',
    status: 'Success',
    failureReason: ''
  },
  {
    id: 2,
    auditId: 'ADT-20231024-002',
    timestamp: '2023-10-24 10:05:11',
    userName: 'drsmith',
    employeeName: 'Dr. Sarah Smith',
    role: 'Doctor',
    department: 'Cardiology',
    module: 'Appointment',
    screenName: 'Appointment Booking',
    action: 'Create',
    recordId: 'APT-9092',
    transactionNumber: 'TXN-4492',
    ipAddress: '10.0.4.11',
    device: 'Mobile',
    browser: 'Safari 16.5',
    operatingSystem: 'iOS 16.5',
    sessionId: 'sess_1a2b3c4d5e',
    oldValues: 'None',
    newValues: '{"patientId": "PAT-1002", "date": "2023-10-25"}',
    changeSummary: 'New appointment created for patient PAT-1002.',
    status: 'Success',
    failureReason: ''
  },
  {
    id: 3,
    auditId: 'ADT-20231024-003',
    timestamp: '2023-10-24 11:30:45',
    userName: 'nurse_j',
    employeeName: 'Jane Williams',
    role: 'Nurse',
    department: 'Emergency',
    module: 'Pharmacy',
    screenName: 'Medicine Issue',
    action: 'Delete',
    recordId: 'ISS-404',
    transactionNumber: '-',
    ipAddress: '192.168.2.12',
    device: 'Tablet',
    browser: 'Edge 117.0',
    operatingSystem: 'Windows 10',
    sessionId: 'sess_5e4d3c2b1a',
    oldValues: '{"status": "Pending"}',
    newValues: 'Deleted',
    changeSummary: 'Attempted to delete a medicine issue record.',
    status: 'Failed',
    failureReason: 'Insufficient permissions to delete records in Pharmacy module.'
  }
];

export const AuditLogMaster = () => {
  const [records] = useState<AuditLogRecord[]>(mockData); // Read-only state
  
  // Search & Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Applied Filter States
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedFilterModule, setAppliedFilterModule] = useState('');
  const [appliedFilterAction, setAppliedFilterAction] = useState('');
  const [appliedFilterStatus, setAppliedFilterStatus] = useState('');
  const [appliedFilterRole, setAppliedFilterRole] = useState('');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');

  // Modal State
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AuditLogRecord | null>(null);

  const handleViewDetails = (record: AuditLogRecord) => {
    setSelectedRecord(record);
    setIsViewOpen(true);
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.auditId.toLowerCase().includes(appliedSearchTerm.toLowerCase()) ||
      record.userName.toLowerCase().includes(appliedSearchTerm.toLowerCase()) ||
      record.ipAddress.includes(appliedSearchTerm) ||
      record.recordId.toLowerCase().includes(appliedSearchTerm.toLowerCase());
    
    const matchesModule = !appliedFilterModule || record.module === appliedFilterModule;
    const matchesAction = !appliedFilterAction || record.action === appliedFilterAction;
    const matchesStatus = !appliedFilterStatus || record.status === appliedFilterStatus;
    const matchesRole = !appliedFilterRole || record.role === appliedFilterRole;

    // Date logic (simplified for mockup, just string compare)
    const matchesDate = (!appliedFromDate || record.timestamp >= appliedFromDate) && 
                        (!appliedToDate || record.timestamp <= appliedToDate + ' 23:59:59');

    return matchesSearch && matchesModule && matchesAction && matchesStatus && matchesRole && matchesDate;
  });

  const handleSearch = () => {
    setAppliedSearchTerm(searchTerm);
    setAppliedFilterModule(filterModule);
    setAppliedFilterAction(filterAction);
    setAppliedFilterStatus(filterStatus);
    setAppliedFilterRole(filterRole);
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
  };

  const handleReset = () => {
    setSearchTerm('');
    setFilterModule('');
    setFilterAction('');
    setFilterStatus('');
    setFilterRole('');
    setFromDate('');
    setToDate('');

    setAppliedSearchTerm('');
    setAppliedFilterModule('');
    setAppliedFilterAction('');
    setAppliedFilterStatus('');
    setAppliedFilterRole('');
    setAppliedFromDate('');
    setAppliedToDate('');
  };

  const uniqueModules = Array.from(new Set(records.map(r => r.module)));
  const uniqueActions = Array.from(new Set(records.map(r => r.action)));
  const uniqueRoles = Array.from(new Set(records.map(r => r.role)));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col relative"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Audit Log Master</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" icon={FileText} className="text-blue-600 border-blue-200 hover:bg-blue-50">
            Export PDF
          </Button>
          <Button variant="outline" icon={Download} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
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
              {filteredRecords.length > 0 ? (
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
      </div>

      {/* View Details Modal */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title="Audit Log Details"
        maxWidth="4xl"
      >
        {selectedRecord && (
          <div className="p-2 space-y-6 max-h-[70vh] overflow-y-auto">
            
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
                    <dd className="font-mono text-slate-800">{selectedRecord.transactionNumber}</dd>
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
                        {selectedRecord.oldValues}
                      </pre>
                    </div>
                    <div>
                      <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        New Values
                      </h5>
                      <pre className="text-xs font-mono text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 overflow-x-auto whitespace-pre-wrap min-h-[80px]">
                        {selectedRecord.newValues}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
        
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0 mt-4">
          <Button variant="outline" color="secondary" onClick={() => setIsViewOpen(false)}>
            Close Details
          </Button>
        </div>
      </Modal>

    </motion.div>
  );
};
