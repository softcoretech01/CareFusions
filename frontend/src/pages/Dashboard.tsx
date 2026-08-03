import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, Stethoscope, Pill, Microscope, ShieldCheck, UserCog, Settings, FileText, RefreshCw } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

const API_BASE = import.meta.env.VITE_API_URL as string;

// Each KPI counts one or more live endpoints (summed). Values are fetched, not hardcoded.
const KPI_DEFS = [
  { label: 'Total Hospitals', icon: Building2,   color: 'text-primary',     bg: 'bg-primary/10',      apis: ['/hospitals/'] },
  { label: 'Total Doctors',   icon: Stethoscope, color: 'text-secondary',   bg: 'bg-secondary/10',    apis: ['/doctors/'] },
  { label: 'Employees',       icon: Users,       color: 'text-success',     bg: 'bg-success/10',      apis: ['/nurses/', '/pharmacists/', '/lab-technicians/', '/receptionists/'] },
  { label: 'Medicines',       icon: Pill,        color: 'text-purple-500',  bg: 'bg-purple-500/10',   apis: ['/medicines/'] },
  { label: 'Lab Tests',       icon: Microscope,  color: 'text-warning',     bg: 'bg-warning/10',      apis: ['/tests/'] },
  { label: 'Insurances',      icon: ShieldCheck, color: 'text-info',        bg: 'bg-info/10',         apis: ['/insurance-providers/'] },
  { label: 'System Users',    icon: UserCog,     color: 'text-danger',      bg: 'bg-danger/10',       apis: ['/users/'] },
  { label: 'Master Configs',  icon: Settings,    color: 'text-slate-500',   bg: 'bg-slate-500/10',    apis: ['/sms-templates/', '/email-templates/', '/whatsapp-templates/', '/push-templates/', '/reminder-rules/'] },
];

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

const countArray = async (path: string): Promise<number> => {
  try {
    const r = await fetch(`${API_BASE}${path}`);
    if (!r.ok) return 0;
    const d = await r.json();
    return Array.isArray(d) ? d.length : 0;
  } catch { return 0; }
};

export const Dashboard = () => {
  const [kpiValues, setKpiValues] = useState<(number | null)[]>(KPI_DEFS.map(() => null));
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    const values = await Promise.all(
      KPI_DEFS.map(async (k) => (await Promise.all(k.apis.map(countArray))).reduce((a, b) => a + b, 0))
    );
    setKpiValues(values);

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
          <p className="text-sm text-slate-500 mt-1">Live counts across all master data.</p>
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
          const val = kpiValues[idx];
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
              key={kpi.label}
              className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${kpi.bg} ${kpi.color} group-hover:scale-110 transition-transform`}>
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
            </motion.div>
          );
        })}
      </div>

      {/* Recent Activity + Role Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 shadow-sm"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-foreground">Recent Activity</h3>
            <span className="text-xs font-medium text-slate-400">from audit trail</span>
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
