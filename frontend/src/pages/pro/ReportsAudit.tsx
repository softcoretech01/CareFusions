import React, { useState, useEffect } from 'react';
import { Loader, FileText, History, Search, RefreshCw, AlertCircle, Calendar, X } from 'lucide-react';

const API = (import.meta.env.VITE_API_URL as string || 'http://localhost:8000/api/v1') + '/pro';



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
  const [approvedOrders, setApprovedOrders] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const currentDate = now.toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(currentMonthStart);
  const [dateTo, setDateTo] = useState(currentDate);

  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const res = await fetch(`${API}/orders?status=APPROVED`);
      if (res.ok) setApprovedOrders(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setReportsLoading(false);
    }
  };

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
    else if (activeTab === 'reports') loadReports();
  }, [activeTab]);

  const filteredOrders = approvedOrders.filter(o => {
    if (dateFrom && o.OrderDate < dateFrom) return false;
    if (dateTo && o.OrderDate > dateTo + 'T23:59:59') return false;
    return true;
  });

  const filteredLogs = auditLogs.filter(log => {
    if (dateFrom && log.CreatedAt < dateFrom) return false;
    if (dateTo && log.CreatedAt > dateTo + 'T23:59:59') return false;
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports & Audit</h1>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm shrink-0">
          <span className="text-slate-500 text-sm font-medium">From :</span>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <span className="text-slate-500 text-sm font-medium ml-1">to :</span>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          <button className="bg-[#086450] text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-[#075342] transition-colors">
            Search
          </button>
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="bg-slate-100 text-slate-700 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
        </div>
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

            {reportsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader className="w-6 h-6 animate-spin text-emerald-500" />
                <span className="ml-3 text-slate-400 text-sm">Loading reports...</span>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">No approved services found</p>
                <p className="text-sm">Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                      <th className="px-4 py-3 text-left font-semibold">S.No</th>
                      <th className="px-4 py-3 text-left font-semibold">Patient</th>
                      <th className="px-4 py-3 text-left font-semibold">UHID</th>
                      <th className="px-4 py-3 text-left font-semibold">Doctor</th>
                      <th className="px-4 py-3 text-left font-semibold">Department</th>
                      <th className="px-4 py-3 text-left font-semibold">Type</th>
                      <th className="px-4 py-3 text-left font-semibold">Order Date</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount (₹)</th>
                      <th className="px-4 py-3 text-center font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((o: any, idx: number) => {
                      const amount = (o.Items || []).reduce((sum: number, it: any) => sum + (parseFloat(it.PROPrice ?? it.MasterPrice ?? 0) * (it.Quantity ?? 1)), 0);
                      return (
                        <tr key={o.ServiceOrderId} className="border-t border-slate-50 hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-slate-700">{o.PatientName || '—'}</td>
                          <td className="px-4 py-3 font-mono text-slate-600">{o.UHID}</td>
                          <td className="px-4 py-3 text-slate-600">{o.DoctorName || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{o.DepartmentName || '—'}</td>
                          <td className="px-4 py-3"><span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{o.SourceModule}</span></td>
                          <td className="px-4 py-3 text-slate-500">{new Date(o.OrderDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-700">{amount.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setViewOrder(o)}
                              className="text-emerald-600 hover:text-emerald-700 text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors"
                            >
                              View Tests
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === 'audit' && (
          <div>
            <div className="px-4 py-3 border-b border-slate-50 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-[300px]">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search audit logs..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button onClick={loadAudit} className="w-9 h-9 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-full px-3 py-1 text-xs font-semibold">
                {filteredLogs.length} Total
              </span>
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
                      <th className="px-4 py-3 text-left font-semibold">S.No</th>
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

      {viewOrder && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Test Details</h2>
              <button onClick={() => setViewOrder(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Patient</p>
                  <p className="text-sm font-semibold text-slate-800">{viewOrder.PatientName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">UHID</p>
                  <p className="text-sm font-semibold text-slate-800">{viewOrder.UHID}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Doctor</p>
                  <p className="text-sm font-semibold text-slate-800">{viewOrder.DoctorName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Department</p>
                  <p className="text-sm font-semibold text-slate-800">{viewOrder.DepartmentName || '—'}</p>
                </div>
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="px-4 py-2 border text-left font-semibold">Test Name</th>
                    <th className="px-4 py-2 border text-right font-semibold">Price (₹)</th>
                    <th className="px-4 py-2 border text-right font-semibold">Qty</th>
                    <th className="px-4 py-2 border text-right font-semibold">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewOrder.Items || []).map((it: any) => {
                    const price = parseFloat(it.PROPrice ?? it.MasterPrice ?? 0);
                    const qty = it.Quantity ?? 1;
                    return (
                      <tr key={it.ServiceOrderItemId} className="border hover:bg-slate-50/50">
                        <td className="px-4 py-2 border font-medium text-slate-700">{it.ItemDescription}</td>
                        <td className="px-4 py-2 border text-right text-slate-600">{price.toFixed(2)}</td>
                        <td className="px-4 py-2 border text-right text-slate-600">{qty}</td>
                        <td className="px-4 py-2 border text-right font-semibold text-slate-700">{(price * qty).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
