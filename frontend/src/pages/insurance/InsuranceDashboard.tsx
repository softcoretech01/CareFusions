import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, Ban, Clock, CheckCircle, IndianRupee, TrendingUp, X, Search } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

const API_BASE = import.meta.env.VITE_API_URL as string;

interface DashboardData {
  pendingPreAuths: number;
  claimsUnderReview: number;
  pendingAppeals: number;
  reconciledMtd: number;
  totalOutstanding: number;
  byInsurer: { name: string; claims: number; amount: number }[];
  monthly: { month: string; approved: number; denied: number }[];
  recentSettlements: {
    id: string; claimId: string; patient: string; insurer: string;
    claimed: number; settled: number; status: string; date: string;
  }[];
}

const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;


type DrillCol = { key: string; label: string; mono?: boolean };
type DrillRow = Record<string, string | number>;

const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700',
  Submitted: 'bg-blue-100 text-blue-700',
  'In Process': 'bg-purple-100 text-purple-700',
  Approved: 'bg-green-100 text-green-700',
  Settled: 'bg-green-100 text-green-700',
  Reconciled: 'bg-teal-100 text-teal-700',
  Denied: 'bg-red-100 text-red-600',
  Appealing: 'bg-orange-100 text-orange-700',
  Rejected: 'bg-red-100 text-red-600',
};

/** Drill-down list for one KPI card, rendered inline above the charts. */
const DetailsPanel = ({
  label, icon: Icon, color, bg, cols, rows, onClose,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  cols: DrillCol[];
  rows: DrillRow[];
  onClose: () => void;
}) => {
  const [q, setQ] = useState('');

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(r => cols.some(c => String(r[c.key] ?? '').toLowerCase().includes(needle)));
  }, [rows, q, cols]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100">
        <div className={`p-2.5 rounded-xl ${bg} ${color} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-slate-800">{label}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {shown.length === rows.length
              ? `${rows.length} record${rows.length === 1 ? '' : 's'}`
              : `${shown.length} of ${rows.length} records`}
          </p>
        </div>
        <div className="relative w-60 hidden sm:block">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <button onClick={onClose} title="Close" className="p-2 hover:bg-slate-100 rounded-xl transition-colors shrink-0">
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <div className="overflow-auto max-h-[380px]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold sticky top-0 z-10">
            <tr>
              <th className="px-5 py-3 w-12">#</th>
              {cols.map(c => <th key={c.key} className="px-5 py-3 whitespace-nowrap">{c.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.length === 0 ? (
              <tr>
                <td colSpan={cols.length + 1} className="text-center py-12 text-slate-400 text-sm">
                  No records to show.
                </td>
              </tr>
            ) : shown.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3 text-xs text-slate-400 tabular-nums">{i + 1}</td>
                {cols.map(c => {
                  const v = String(r[c.key] ?? '—');
                  return (
                    <td key={c.key} className="px-5 py-3 text-sm">
                      {c.key === 'status' ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[v] || 'bg-slate-100 text-slate-600'}`}>{v}</span>
                      ) : (
                        <span className={`text-slate-700 ${c.mono ? 'font-mono text-xs' : ''}`}>{v}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const InsuranceDashboard = () => {
  const today = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [data, setData] = useState<DashboardData | null>(null);

  // The dashboard endpoint returns counts only, so pull the underlying lists
  // too — that is what a KPI card opens when you click it.
  const [preAuths, setPreAuths] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [appeals, setAppeals] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [drill, setDrill] = useState<string | null>(null);

  // Real KPIs and charts — every figure on this page used to be hardcoded.
  useEffect(() => {
    fetch(`${API_BASE}/insurance/dashboard`)
      .then(r => r.json())
      .then(setData)
      .catch(e => console.error('[Insurance] dashboard load failed', e));

    const list = (path: string, set: (v: any[]) => void) =>
      fetch(`${API_BASE}/insurance/${path}`)
        .then(r => r.json())
        .then(d => set(Array.isArray(d) ? d : []))
        .catch(e => console.error(`[Insurance] ${path} load failed`, e));

    list('pre-auths', setPreAuths);
    list('claims', setClaims);
    list('appeals', setAppeals);
    list('settlements', setSettlements);
  }, []);

  const kpis = [
    { key: 'preAuths', label: 'Pending Pre-Auths', value: String(data?.pendingPreAuths ?? 0), icon: ClipboardCheck, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { key: 'claims', label: 'Claims Under Review', value: String(data?.claimsUnderReview ?? 0), icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { key: 'appeals', label: 'Pending Appeals', value: String(data?.pendingAppeals ?? 0), icon: Ban, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { key: 'reconciled', label: 'Reconciled MTD', value: inr(data?.reconciledMtd ?? 0), icon: IndianRupee, color: 'text-teal-500', bg: 'bg-teal-500/10' },
  ];

  // Each drill-down repeats the exact filter its KPI query uses, so the list
  // length always matches the number on the card.
  const now = new Date();
  const isThisMonth = (iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };

  const DRILLS: Record<string, { label: string; icon: typeof Clock; color: string; bg: string; cols: DrillCol[]; rows: DrillRow[] }> = {
    preAuths: {
      label: 'Pending Pre-Authorizations', icon: ClipboardCheck, color: 'text-amber-500', bg: 'bg-amber-500/10',
      cols: [
        { key: 'id', label: 'Pre-Auth ID', mono: true },
        { key: 'uhid', label: 'UHID', mono: true },
        { key: 'patient', label: 'Patient' },
        { key: 'insurer', label: 'Insurer' },
        { key: 'diagnosis', label: 'Diagnosis' },
        { key: 'amount', label: 'Requested' },
        { key: 'date', label: 'Raised' },
        { key: 'status', label: 'Status' },
      ],
      rows: preAuths.filter(p => p.status === 'Pending').map(p => ({
        id: p.id, uhid: p.uhid, patient: p.patient, insurer: p.insurer,
        diagnosis: p.diagnosis, amount: inr(p.amount),
        date: String(p.date ?? '').split('T')[0], status: p.status,
      })),
    },
    claims: {
      label: 'Claims Under Review', icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10',
      cols: [
        { key: 'id', label: 'Claim ID', mono: true },
        { key: 'uhid', label: 'UHID', mono: true },
        { key: 'patient', label: 'Patient' },
        { key: 'insurer', label: 'Insurer' },
        { key: 'claimedAmount', label: 'Claimed' },
        { key: 'approvedAmount', label: 'Approved' },
        { key: 'date', label: 'Filed' },
        { key: 'status', label: 'Status' },
      ],
      rows: claims.filter(c => c.status === 'Submitted' || c.status === 'In Process').map(c => ({
        id: c.id, uhid: c.uhid, patient: c.patient, insurer: c.insurer,
        claimedAmount: inr(c.claimedAmount), approvedAmount: inr(c.approvedAmount),
        date: String(c.date ?? '').split('T')[0], status: c.status,
      })),
    },
    appeals: {
      label: 'Pending Appeals', icon: Ban, color: 'text-orange-500', bg: 'bg-orange-500/10',
      cols: [
        { key: 'id', label: 'Appeal ID', mono: true },
        { key: 'claimId', label: 'Claim ID', mono: true },
        { key: 'patient', label: 'Patient' },
        { key: 'insurer', label: 'Insurer' },
        { key: 'reason', label: 'Reason' },
        { key: 'status', label: 'Status' },
      ],
      rows: appeals.filter(a => a.status === 'Denied' || a.status === 'Appealing').map(a => ({
        id: a.id ?? a.appealId, claimId: a.claimId, patient: a.patient, insurer: a.insurer,
        reason: a.reason ?? a.denialReason, status: a.status,
      })),
    },
    reconciled: {
      label: 'Reconciled This Month', icon: IndianRupee, color: 'text-teal-500', bg: 'bg-teal-500/10',
      cols: [
        { key: 'id', label: 'Settlement ID', mono: true },
        { key: 'claimId', label: 'Claim ID', mono: true },
        { key: 'patient', label: 'Patient' },
        { key: 'insurer', label: 'Insurer' },
        { key: 'billedAmt', label: 'Billed' },
        { key: 'netReceivable', label: 'Net Received' },
        { key: 'utrReference', label: 'UTR', mono: true },
        { key: 'reconciledDate', label: 'Reconciled' },
        { key: 'status', label: 'Status' },
      ],
      rows: settlements
        .filter(x => x.status === 'Reconciled' && isThisMonth(x.reconciledDate))
        .map(x => ({
          id: x.id, claimId: x.claimId, patient: x.patient, insurer: x.insurer,
          billedAmt: inr(x.billedAmt), netReceivable: inr(x.netReceivable),
          utrReference: x.utrReference,
          reconciledDate: String(x.reconciledDate ?? '').split('T')[0], status: x.status,
        })),
    },
  };

  const monthLabel = (m: string) => {
    const [y, mm] = m.split('-');
    return new Date(Number(y), Number(mm) - 1, 1).toLocaleDateString('en-US', { month: 'short' });
  };

  const barOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter' },
    colors: ['#22C55E', '#EF4444'],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
    xaxis: { categories: (data?.monthly ?? []).map(m => monthLabel(m.month)) },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    legend: { position: 'top' },
  };

  const barSeries = [
    { name: 'Settled Claims', data: (data?.monthly ?? []).map(m => m.approved) },
    { name: 'Denied Claims', data: (data?.monthly ?? []).map(m => m.denied) },
  ];

  // Volume = number of claims per insurer, straight from the API. The series
  // used to be hardcoded [35,25,20,15,5], which is why insurers with no data
  // showed as "series-2 … series-5".
  const byInsurer = data?.byInsurer ?? [];
  const donutSeries = byInsurer.map(i => i.claims);
  const donutOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'Inter' },
    colors: ['#2563EB', '#8b5cf6', '#F59E0B', '#06B6D4', '#22C55E'],
    labels: byInsurer.map(i => i.name),
    dataLabels: { enabled: false },
    legend: { position: 'bottom' },
    stroke: { width: 0 },
    tooltip: { y: { formatter: (v: number) => `${v} claim${v === 1 ? '' : 's'}` } },
  };

  // Real approval rate: settled ÷ (settled + denied) across the charted months.
  // The badge used to always read "+12%".
  const totalApproved = (data?.monthly ?? []).reduce((s, m) => s + m.approved, 0);
  const totalDenied = (data?.monthly ?? []).reduce((s, m) => s + m.denied, 0);
  const decided = totalApproved + totalDenied;
  const approvalRate = decided > 0 ? Math.round((totalApproved / decided) * 100) : null;

  const handleClearFilters = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setFromDate(todayStr);
    setToDate(todayStr);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Insurance & Claims Dashboard</h1>
        </div>
        <div className="flex flex-col items-end gap-3">
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
      
      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
              key={kpi.label}
              onClick={() => DRILLS[kpi.key].rows.length > 0 && setDrill(drill === kpi.key ? null : kpi.key)}
              disabled={DRILLS[kpi.key].rows.length === 0}
              title={DRILLS[kpi.key].rows.length > 0 ? `View ${kpi.label.toLowerCase()}` : 'Nothing to list'}
              className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-left w-full transition-all group enabled:hover:shadow-md enabled:hover:border-primary/30 enabled:cursor-pointer disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color} group-enabled:group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-slate-800">{kpi.value}</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">{kpi.label}</p>
              </div>
            </motion.button>
          )
        })}
      </div>

      {drill && DRILLS[drill] && (
        <DetailsPanel
          key={drill}
          label={DRILLS[drill].label}
          icon={DRILLS[drill].icon}
          color={DRILLS[drill].color}
          bg={DRILLS[drill].bg}
          cols={DRILLS[drill].cols}
          rows={DRILLS[drill].rows}
          onClose={() => setDrill(null)}
        />
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-800">Approval vs Denial Trends</h3>
            {approvalRate !== null && (
              <span className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {approvalRate}% Approval Rate
              </span>
            )}
          </div>
          <Chart options={barOptions} series={barSeries} type="bar" height={300} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col"
        >
          <h3 className="font-bold text-lg text-slate-800 mb-4">Top TPAs / Insurers by Volume</h3>
          <div className="flex-1 flex items-center justify-center">
            {donutSeries.length > 0 ? (
              <Chart options={donutOptions} series={donutSeries} type="donut" height={300} />
            ) : (
              <p className="text-sm text-slate-400 py-12">No claims recorded yet.</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800">Recent Claim Settlements</h3>
          <button className="text-primary text-sm font-bold hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left">Claim ID</th>
                <th className="px-6 py-3 text-left">Patient Name</th>
                <th className="px-6 py-3 text-left">Insurer</th>
                <th className="px-6 py-3 text-left">Claimed Amt</th>
                <th className="px-6 py-3 text-left">Settled Amt</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.recentSettlements ?? []).map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-bold text-primary">{row.claimId}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800">{row.patient}</td>
                  <td className="px-4 py-3 font-medium text-slate-600">{row.insurer}</td>
                  <td className="px-4 py-3 text-slate-600">{inr(row.claimed)}</td>
                  <td className="px-4 py-3 font-bold text-emerald-600">{inr(row.settled)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 w-max ${
                      row.status === 'Reconciled' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      <CheckCircle className="w-3 h-3" />
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
