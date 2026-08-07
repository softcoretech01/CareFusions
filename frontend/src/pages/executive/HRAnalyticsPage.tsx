import { useState, useEffect } from 'react';
import { Users, Stethoscope, Pill, FlaskConical } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { NoDataNotice } from '../../components/ui/NoDataNotice';

const API_BASE = import.meta.env.VITE_API_URL as string;

interface Headcount {
  totalEmployees: number;
  byRole: { role: string; count: number }[];
}

const KPI = ({ title, value, icon: Icon, cls }: any) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${cls}`}>
      <Icon className="w-5 h-5" />
    </div>
    <p className="text-2xl font-bold text-slate-800">{value}</p>
    <p className="text-xs text-slate-500 mt-0.5">{title}</p>
  </div>
);

export const HRAnalyticsPage = () => {
  const [d, setD] = useState<Headcount | null>(null);
  const [loading, setLoading] = useState(true);

  // Headcount is real — it comes from the staff masters. Payroll, attendance
  // and attrition are not shown because no HR module records them; the
  // prototype displayed ₹8.5 Cr payroll and 94.5% attendance regardless.
  useEffect(() => {
    fetch(`${API_BASE}/executive/headcount`)
      .then(r => r.json())
      .then(x => { if (!x.detail) setD(x); setLoading(false); })
      .catch(e => { console.error('[Executive] headcount load failed', e); setLoading(false); });
  }, []);

  const roles = (d?.byRole ?? []).filter(r => r.count > 0);
  const donutOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'Inter' },
    labels: roles.map(r => r.role),
    colors: ['#2563EB', '#8b5cf6', '#10b981', '#F59E0B', '#06B6D4', '#f43f5e'],
    dataLabels: { enabled: false },
    legend: { position: 'bottom' },
    stroke: { width: 0 },
  };

  const get = (role: string) => d?.byRole.find(r => r.role === role)?.count ?? 0;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Workforce</h1>
        <p className="text-xs text-slate-500">Headcount from the employee masters</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI title="Total Staff" value={d?.totalEmployees ?? 0} icon={Users} cls="text-blue-600 bg-blue-50" />
        <KPI title="Doctors" value={get('Doctors')} icon={Stethoscope} cls="text-indigo-600 bg-indigo-50" />
        <KPI title="Pharmacists" value={get('Pharmacists')} icon={Pill} cls="text-emerald-600 bg-emerald-50" />
        <KPI title="Lab Technicians" value={get('Lab Technicians')} icon={FlaskConical} cls="text-cyan-600 bg-cyan-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-bold text-slate-800 mb-2">Staff Distribution</h3>
          {roles.length > 0
            ? <Chart options={donutOptions} series={roles.map(r => r.count)} type="donut" height={260} />
            : <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">
                {loading ? 'Loading…' : 'No staff records yet.'}
              </div>}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Headcount by Role</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-right">Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(d?.byRole ?? []).map(r => (
                <tr key={r.role} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2 font-medium text-slate-800">{r.role}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800">{r.count}</td>
                </tr>
              ))}
              {!d && (
                <tr><td colSpan={2} className="px-3 py-8 text-center text-slate-400">
                  {loading ? 'Loading…' : 'No staff records.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NoDataNotice
        title="Payroll, attendance, leave and attrition"
        needs="HR / Payroll"
        detail="Headcount above is real. The prototype also showed ₹8.5 Cr monthly payroll, 94.5% attendance and 4.2% attrition, none of which any service records."
      />
    </div>
  );
};
