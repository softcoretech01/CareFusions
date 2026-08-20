import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, Stethoscope, Pill, Microscope, ShieldCheck, UserCog, Settings, FileText, RefreshCw, Search, X } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

const API_BASE = import.meta.env.VITE_API_URL as string;

type Row = Record<string, unknown>;

/** A drill-down column. `key` may list fallbacks separated by `|` — the first
 *  non-empty one wins, which keeps one config working across endpoints whose
 *  field names differ (nurses have `department`, receptionists don't). */
type Col = { key: string; label: string; mono?: boolean };

// Each KPI counts one or more live endpoints (summed). Values are fetched, not
// hardcoded, and the rows are kept so clicking a card can list them.
const KPI_DEFS: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  apis: string[];
  /** Label per API, same order — shown as the "Type" column on merged KPIs. */
  sources?: string[];
  cols: Col[];
}[] = [
  {
    label: 'Total Hospitals', icon: Building2, color: 'text-primary', bg: 'bg-primary/10',
    apis: ['/hospitals/'],
    cols: [
      { key: 'code', label: 'Code', mono: true },
      { key: 'name', label: 'Hospital', },
      { key: 'city', label: 'City' },
      { key: 'contactNumber', label: 'Contact', mono: true },
      { key: 'status', label: 'Status' },
    ],
  },
  {
    label: 'Total Doctors', icon: Stethoscope, color: 'text-secondary', bg: 'bg-secondary/10',
    apis: ['/doctors/'],
    cols: [
      { key: 'doctorId', label: 'Doctor ID', mono: true },
      { key: 'name', label: 'Name' },
      { key: 'specialization', label: 'Specialization' },
      { key: 'department', label: 'Department' },
      { key: 'mobile', label: 'Mobile', mono: true },
      { key: 'status', label: 'Status' },
    ],
  },
  {
    label: 'Employees', icon: Users, color: 'text-success', bg: 'bg-success/10',
    apis: ['/nurses/', '/pharmacists/', '/lab-technicians/', '/receptionists/'],
    sources: ['Nurse', 'Pharmacist', 'Lab Technician', 'Receptionist'],
    cols: [
      { key: '__source', label: 'Role' },
      { key: 'employeeCode', label: 'Emp Code', mono: true },
      { key: 'name', label: 'Name' },
      { key: 'department|pharmacy|laboratory|counter', label: 'Assigned To' },
      { key: 'mobile', label: 'Mobile', mono: true },
      { key: 'status', label: 'Status' },
    ],
  },
  {
    label: 'Medicines', icon: Pill, color: 'text-purple-500', bg: 'bg-purple-500/10',
    apis: ['/medicines/'],
    cols: [
      { key: 'medicineCode', label: 'Code', mono: true },
      { key: 'brandName', label: 'Brand' },
      { key: 'genericName', label: 'Generic' },
      { key: 'category', label: 'Category' },
      { key: 'sellingPrice', label: 'Price', mono: true },
      { key: 'status', label: 'Status' },
    ],
  },
  {
    label: 'Lab Tests', icon: Microscope, color: 'text-warning', bg: 'bg-warning/10',
    apis: ['/tests/'],
    cols: [
      { key: 'testCode', label: 'Code', mono: true },
      { key: 'testName', label: 'Test' },
      { key: 'testCategory', label: 'Category' },
      { key: 'department', label: 'Department' },
      { key: 'testPrice', label: 'Price', mono: true },
      { key: 'status', label: 'Status' },
    ],
  },
  {
    label: 'Insurances', icon: ShieldCheck, color: 'text-info', bg: 'bg-info/10',
    apis: ['/insurance-providers/'],
    cols: [
      { key: 'providerCode', label: 'Code', mono: true },
      { key: 'providerName', label: 'Provider' },
      { key: 'insuranceType', label: 'Type' },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'phoneNumber', label: 'Phone', mono: true },
      { key: 'status', label: 'Status' },
    ],
  },
  {
    label: 'System Users', icon: UserCog, color: 'text-danger', bg: 'bg-danger/10',
    apis: ['/users/'],
    cols: [
      { key: 'userId', label: 'User ID', mono: true },
      { key: 'username', label: 'Username' },
      { key: 'role', label: 'Role' },
      { key: 'department', label: 'Department' },
      { key: 'email', label: 'Email' },
      { key: 'status', label: 'Status' },
    ],
  },
  {
    label: 'Master Configs', icon: Settings, color: 'text-slate-500', bg: 'bg-slate-500/10',
    apis: ['/sms-templates/', '/email-templates/', '/whatsapp-templates/', '/push-templates/', '/reminder-rules/'],
    sources: ['SMS Template', 'Email Template', 'WhatsApp Template', 'Push Template', 'Reminder Rule'],
    cols: [
      { key: '__source', label: 'Type' },
      { key: 'templateCode|ruleCode|code', label: 'Code', mono: true },
      { key: 'templateName|ruleName|name', label: 'Name' },
      { key: 'module|event|category', label: 'Module' },
      { key: 'status', label: 'Status' },
    ],
  },
];

/** First non-empty value across the `|`-separated fallback keys. */
const cell = (row: Row, key: string): string => {
  for (const k of key.split('|')) {
    const v = row[k];
    if (v !== null && v !== undefined && v !== '') return String(v);
  }
  return '—';
};

const relTime = (iso: string) => {
  const t = new Date(iso.replace(' ', 'T')).getTime();
  if (isNaN(t)) return '';
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m} min${m > 1 ? 's' : ''} ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24); return `${d} day${d > 1 ? 's' : ''} ago`;
};

type AuditRow = {
  auditId: string; timestamp: string; userName: string;
  module: string; screenName: string; action: string;
};

/** Recent Activity, expanded into the same drill-down table as the KPI cards. */
const AUDIT_DEF = {
  label: 'Recent Activity',
  icon: FileText,
  color: 'text-primary',
  bg: 'bg-primary/10',
  cols: [
    { key: 'when', label: 'When' },
    { key: 'timestamp', label: 'Timestamp', mono: true },
    { key: 'action', label: 'Action' },
    { key: 'screenName|module', label: 'Screen' },
    { key: 'module', label: 'Module' },
    { key: 'userName', label: 'User' },
  ] as Col[],
};

const STATUS_STYLES: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  Inactive: 'bg-slate-100 text-slate-500',
  Suspended: 'bg-amber-100 text-amber-700',
  Blocked: 'bg-red-100 text-red-600',
};

/** Everything the drill-down table needs to render — a KPI def satisfies this,
 *  and so does the audit-trail def below. */
type TableDef = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  cols: Col[];
};

/** Drill-down list for one card, rendered inline above the Recent Activity
 *  grid rather than as an overlay. Rows are already in memory from the
 *  dashboard load, so opening this costs no extra request. */
const DetailsPanel = ({
  def,
  rows,
  onClose,
}: {
  def: TableDef;
  rows: Row[];
  onClose: () => void;
}) => {
  const [q, setQ] = useState('');
  const Icon = def.icon;

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    // Match against the rendered columns, so what you search is what you see.
    return rows.filter(r => def.cols.some(c => cell(r, c.key).toLowerCase().includes(needle)));
  }, [rows, q, def.cols]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100">
        <div className={`p-2.5 rounded-xl ${def.bg} ${def.color} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-foreground">{def.label}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {shown.length === rows.length
              ? `${rows.length} record${rows.length === 1 ? '' : 's'}`
              : `${shown.length} of ${rows.length} records`}
          </p>
        </div>
        <div className="relative w-64 hidden sm:block">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <button
          onClick={onClose}
          title="Close"
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Table — capped so the panel never pushes Recent Activity off-screen */}
      <div className="overflow-auto max-h-[420px]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold sticky top-0 z-10">
            <tr>
              <th className="px-5 py-3 w-12">#</th>
              {def.cols.map(c => <th key={c.key} className="px-5 py-3 whitespace-nowrap">{c.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.length === 0 ? (
              <tr>
                <td colSpan={def.cols.length + 1} className="text-center py-14 text-slate-400 text-sm">
                  No records match “{q}”.
                </td>
              </tr>
            ) : (
              shown.map((r, i) => (
                <tr key={(r.id ?? r.auditId ?? i) as string | number} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3 text-xs text-slate-400 tabular-nums">{i + 1}</td>
                  {def.cols.map(c => {
                    const v = cell(r, c.key);
                    return (
                      <td key={c.key} className="px-5 py-3 text-sm">
                        {c.key === 'status' ? (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[v] || 'bg-slate-100 text-slate-600'}`}>
                            {v}
                          </span>
                        ) : (
                          <span className={`text-slate-700 ${c.mono ? 'font-mono text-xs' : ''}`}>{v}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

/** Fetch a list endpoint, tagging every row with the source label so merged
 *  KPIs can show which endpoint a row came from. */
const fetchArray = async (path: string, source?: string): Promise<Row[]> => {
  try {
    const r = await fetch(`${API_BASE}${path}`);
    if (!r.ok) return [];
    const d = await r.json();
    if (!Array.isArray(d)) return [];
    return source ? d.map((x: Row) => ({ ...x, __source: source })) : d;
  } catch { return []; }
};

export const Dashboard = () => {
  const [kpiRows, setKpiRows] = useState<(Row[] | null)[]>(KPI_DEFS.map(() => null));
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drillIdx, setDrillIdx] = useState<number | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const rows = await Promise.all(
      KPI_DEFS.map(async (k) =>
        (await Promise.all(k.apis.map((a, i) => fetchArray(a, k.sources?.[i])))).flat()
      )
    );
    setKpiRows(rows);

    // Role distribution — grouped from the actual users (active only)
    try {
      const r = await fetch(`${API_BASE}/users/`);
      if (r.ok) {
        const data = await r.json();
        setUserRoles((Array.isArray(data) ? data : [])
          .filter((u: Record<string, unknown>) => !u.status || u.status === 'Active')
          .map((u: Record<string, unknown>) => ((u.role as string) || 'Unassigned')));
      }
    } catch { /* ignore */ }

    // Recent activity (audit trail)
    try {
      const r = await fetch(`${API_BASE}/audit-logs/`);
      if (r.ok) {
        const data = await r.json();
        setAudits((Array.isArray(data) ? data : []).map((x: Record<string, unknown>) => ({
          auditId: x.auditId as string,
          timestamp: String(x.timestamp ?? ''),
          userName: (x.userName as string) ?? '',
          module: (x.module as string) ?? '',
          screenName: (x.screenName as string) ?? '',
          action: (x.action as string) ?? '',
        })));
      }
    } catch { /* ignore */ }

    setLoading(false);
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  // ── Donut: role distribution (from actual users) ──
  const roleDist = useMemo(() => {
    const m = new Map<string, number>();
    userRoles.forEach(r => m.set(r, (m.get(r) ?? 0) + 1));
    const entries = [...m.entries()].sort((a, b) => b[1] - a[1]);
    return { labels: entries.map(e => e[0]), series: entries.map(e => e[1]) };
  }, [userRoles]);

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'Inter' },
    colors: ['#2563EB', '#22C55E', '#F59E0B', '#06B6D4', '#8b5cf6', '#ec4899', '#64748b'],
    labels: roleDist.labels,
    dataLabels: { enabled: false },
    legend: { position: 'bottom' },
    stroke: { width: 0 },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        </div>
        <button
          onClick={loadAll}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPI_DEFS.map((kpi, idx) => {
          const Icon = kpi.icon;
          const rows = kpiRows[idx];
          const val = rows === null ? null : rows.length;
          return (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
              key={kpi.label}
              onClick={() => { if (rows && rows.length > 0) { setShowAudit(false); setDrillIdx(idx); } }}
              disabled={!rows || rows.length === 0}
              title={rows && rows.length > 0 ? `View ${kpi.label.toLowerCase()}` : 'Nothing to list yet'}
              className="bg-card p-5 rounded-2xl border border-border shadow-sm text-left transition-all group enabled:hover:shadow-md enabled:hover:border-primary/30 enabled:cursor-pointer disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color} group-enabled:group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div>
                {val === null ? (
                  <div className="h-9 w-16 rounded bg-slate-100 animate-pulse" />
                ) : (
                  <h3 className="text-3xl font-bold text-foreground">{val.toLocaleString()}</h3>
                )}
                <p className="text-sm font-medium text-slate-500 mt-1">{kpi.label}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Drill-down — opens in the page flow, right above Recent Activity.
          The `key` forces a remount when you switch cards, so the search box
          and scroll position never carry over from the previous entity. */}
      {drillIdx !== null && kpiRows[drillIdx] && (
        <DetailsPanel
          key={`kpi-${drillIdx}`}
          def={KPI_DEFS[drillIdx]}
          rows={kpiRows[drillIdx] as Row[]}
          onClose={() => setDrillIdx(null)}
        />
      )}

      {showAudit && (
        <DetailsPanel
          key="audit"
          def={AUDIT_DEF}
          rows={audits.map(a => ({ ...a, when: relTime(a.timestamp) }))}
          onClose={() => setShowAudit(false)}
        />
      )}

      {/* Recent Activity + Role Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 shadow-sm"
        >
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-baseline gap-3">
              <h3 className="font-bold text-lg text-foreground">Recent Activity</h3>
              <span className="text-xs font-medium text-slate-400">from audit trail</span>
            </div>
            {audits.length > 0 && (
              <button
                onClick={() => { setDrillIdx(null); setShowAudit(true); }}
                className="text-xs font-bold text-primary hover:underline"
              >
                View all ({audits.length})
              </button>
            )}
          </div>
          <div className="space-y-4">
            {audits.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No recorded activity yet.</p>
            ) : (
              audits.slice(0, 6).map((item) => (
                <div key={item.auditId} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                  <div className="p-3 bg-blue-50 text-primary rounded-xl"><FileText className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-slate-800 truncate">{item.action} · {item.screenName || item.module}</h4>
                    <p className="text-xs text-slate-500 font-medium truncate">{item.module} • by {item.userName}</p>
                  </div>
                  <div className="text-xs font-semibold text-slate-400 whitespace-nowrap">{relTime(item.timestamp)}</div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-card rounded-2xl border border-border p-6 shadow-sm flex flex-col"
        >
          <h3 className="font-bold text-lg text-foreground mb-4">System Role Distribution</h3>
          <div className="flex-1 flex items-center justify-center">
            {roleDist.series.length > 0 ? (
              <Chart options={donutOptions} series={roleDist.series} type="donut" height={300} />
            ) : (
              <p className="text-sm text-slate-400 text-center px-4">No active users yet — add users to see the role split.</p>
            )}
          </div>
        </motion.div>
      </div>

    </div>
  );
};
