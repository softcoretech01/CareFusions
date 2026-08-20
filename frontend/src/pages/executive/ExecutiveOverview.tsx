import { useState, useEffect } from 'react';
import {
  IndianRupee, Users, BedDouble, CalendarCheck, Package, FlaskConical,
  AlertTriangle, ShieldCheck, Receipt,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL as string;
const inr = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

interface Overview {
  pharmacyRevenueToday: number; pharmacyRevenueMonth: number; salesToday: number;
  insuranceReconciledMonth: number; insuranceOutstanding: number; claimsInProcess: number;
  stockValue: number; labOrdersToday: number;
  hospitalBilledMonth: number; hospitalCollectedMonth: number; hospitalBillsMonth: number;
  alerts: { type: string; message: string }[];
}
interface Clinical {
  admissionsToday: number; dischargesToday: number; currentInpatients: number;
  appointmentsToday: number; registrationsToday: number;
  occupiedBeds: number; totalBeds: number; bedOccupancyPct: number;
}

const KPI = ({ title, value, sub, icon: Icon, cls }: any) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${cls}`}>
      <Icon className="w-5 h-5" />
    </div>
    <p className="text-2xl font-bold text-slate-800">{value}</p>
    <p className="text-xs text-slate-500 mt-0.5">{title}</p>
    {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
  </div>
);

export const ExecutiveOverview = () => {
  const [ov, setOv] = useState<Overview | null>(null);
  const [cl, setCl] = useState<Clinical | null>(null);
  const [loading, setLoading] = useState(true);

  // Every tile below is a live aggregate. The prototype hardcoded most of these
  // directly in JSX — patients 1452, admissions 124, occupancy 82%, ICU 92% —
  // which is why three screens disagreed about bed occupancy.
  useEffect(() => {
    Promise.allSettled([
      fetch(`${API_BASE}/executive/overview`).then(r => r.json()),
      fetch(`${API_BASE}/executive/clinical`).then(r => r.json()),
    ]).then(([o, c]) => {
      if (o.status === 'fulfilled' && o.value && !o.value.detail) setOv(o.value);
      if (c.status === 'fulfilled' && c.value && !c.value.detail) setCl(c.value);
      setLoading(false);
    });
  }, []);

  const alertCls = (t: string) =>
    t === 'critical' ? 'bg-rose-50 border-rose-200 text-rose-800'
    : t === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800'
    : 'bg-blue-50 border-blue-200 text-blue-800';

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Executive Overview</h1>
        <p className="text-xs text-slate-500">Live hospital activity across the connected modules</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <KPI title="Registrations Today" value={cl?.registrationsToday ?? 0} icon={Users} cls="text-blue-600 bg-blue-50" />
        <KPI title="Appointments Today" value={cl?.appointmentsToday ?? 0} icon={CalendarCheck} cls="text-indigo-600 bg-indigo-50" />
        <KPI title="Admissions Today" value={cl?.admissionsToday ?? 0} sub={`${cl?.dischargesToday ?? 0} discharges`} icon={Users} cls="text-purple-600 bg-purple-50" />
        <KPI title="Current Inpatients" value={cl?.currentInpatients ?? 0} icon={BedDouble} cls="text-teal-600 bg-teal-50" />
        <KPI title="Bed Occupancy" value={`${cl?.bedOccupancyPct ?? 0}%`} sub={`${cl?.occupiedBeds ?? 0} of ${cl?.totalBeds ?? 0}`} icon={BedDouble} cls="text-amber-600 bg-amber-50" />
        <KPI title="Lab Orders Today" value={ov?.labOrdersToday ?? 0} icon={FlaskConical} cls="text-cyan-600 bg-cyan-50" />
        <KPI title="Pharmacy Sales Today" value={inr(ov?.pharmacyRevenueToday ?? 0)} sub={`${ov?.salesToday ?? 0} bills`} icon={IndianRupee} cls="text-emerald-600 bg-emerald-50" />
        <KPI title="Stock Value" value={inr(ov?.stockValue ?? 0)} icon={Package} cls="text-slate-600 bg-slate-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-600" /> Billed Revenue (Month)
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Pharmacy retail</span>
              <span className="font-bold text-slate-800">{inr(ov?.pharmacyRevenueMonth ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">
                OP / IP bills
                {!!ov?.hospitalBillsMonth && (
                  <span className="text-slate-400"> ({ov.hospitalBillsMonth})</span>
                )}
              </span>
              <span className="font-bold text-slate-800">{inr(ov?.hospitalBilledMonth ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Insurance reconciled</span>
              <span className="font-bold text-slate-800">{inr(ov?.insuranceReconciledMonth ?? 0)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2">
              <span className="text-slate-600 font-semibold">Total captured</span>
              <span className="font-bold text-emerald-600">
                {inr((ov?.pharmacyRevenueMonth ?? 0)
                  + (ov?.hospitalBilledMonth ?? 0)
                  + (ov?.insuranceReconciledMonth ?? 0))}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Billed through the system: OP/IP bills, pharmacy sales and settled claims.
            {!!ov?.hospitalCollectedMonth && ` ${inr(ov.hospitalCollectedMonth)} of the bills is collected.`}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" /> Insurance Position
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Claims in process</span>
              <span className="font-bold text-slate-800">{ov?.claimsInProcess ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Awaiting remittance</span>
              <span className="font-bold text-amber-600">{inr(ov?.insuranceOutstanding ?? 0)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" /> Live Alerts
          </h3>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {(ov?.alerts ?? []).map((a, i) => (
              <div key={i} className={`text-xs border rounded-lg px-3 py-2 ${alertCls(a.type)}`}>
                {a.message}
              </div>
            ))}
            {(!ov?.alerts || ov.alerts.length === 0) && (
              <p className="text-sm text-slate-400 py-6 text-center">
                {loading ? 'Loading…' : 'No active alerts.'}
              </p>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Raised from ward capacity, reorder levels, expiry windows and unacknowledged critical results.
          </p>
        </div>
      </div>

    </div>
  );
};
