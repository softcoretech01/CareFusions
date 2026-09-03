import { useMemo, useState } from 'react';
import { useIPD } from '../../contexts/IPDContext';
import { BedDouble, Users, UserPlus, ArrowUpRight, ArrowDownRight, Clock, X, Search } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { DateFilter } from '../../components/ui/DateFilter';


type DrillCol = { key: string; label: string; mono?: boolean };
type DrillRow = Record<string, string | number>;

const STATUS_STYLES: Record<string, string> = {
  Admitted: 'bg-green-100 text-green-700',
  'Discharge Requested': 'bg-amber-100 text-amber-700',
  Discharged: 'bg-slate-100 text-slate-500',
  Occupied: 'bg-indigo-100 text-indigo-700',
  Available: 'bg-green-100 text-green-700',
  Pending: 'bg-amber-100 text-amber-700',
  Cancelled: 'bg-red-100 text-red-600',
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
        <div className={`w-10 h-10 rounded-2xl ${bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${color}`} />
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

export const IPDDashboard = () => {
  const { patients, beds, admissionRequests, wards } = useIPD();

  const today = new Date().toISOString().split('T')[0];
  const firstDay = `${today.split('-')[0]}-${today.split('-')[1]}-01`;
  const [dateFrom, setDateFrom] = useState(firstDay);
  const [dateTo, setDateTo] = useState(today);
  const [appliedDateFrom, setAppliedDateFrom] = useState(firstDay);
  const [appliedDateTo, setAppliedDateTo] = useState(today);

  const handleSearch = () => {
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
  };

  const handleReset = () => {
    setDateFrom(firstDay);
    setDateTo(today);
    setAppliedDateFrom(firstDay);
    setAppliedDateTo(today);
  };

  const isDateInRange = (dateString?: string) => {
    if (!dateString) return true;
    const d = dateString.split('T')[0];
    return d >= appliedDateFrom && d <= appliedDateTo;
  };

  const activePatients = patients.filter(p => (p.status === 'Admitted' || p.status === 'Discharge Requested') && isDateInRange(p.admissionDate));
  const occupiedBeds = beds.filter(b => b.status === 'Occupied').length;
  const totalBeds = beds.length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  
  const pendingAdmissions = admissionRequests.filter(r => r.status === 'Pending' && isDateInRange(String(r.requestDate))).length;

  // Analytics Calculations
  const admissionsInPeriod = patients.filter(p => isDateInRange(p.admissionDate)).length;
  const dischargesInPeriod = patients.filter(p => p.status === 'Discharged' && (p.dischargeInfo?.dischargeDate ? isDateInRange(p.dischargeInfo.dischargeDate) : isDateInRange(p.admissionDate))).length;
  
  // ALOS Calculation
  const alos = 4.2; // Dummy calculation
  
  const expectedDischarges = patients.filter(p => p.status === 'Admitted' && p.expectedStayDays <= 1).length;

  // ── KPI drill-downs ────────────────────────────────────────
  const [drill, setDrill] = useState<string | null>(null);

  const wardName = (id: number | null) => wards.find(w => w.id === id)?.name ?? '—';
  const bedLabel = (id: number | null) => {
    const b = beds.find(x => x.id === id);
    return b ? `${b.roomNumber} / ${b.bedNumber}` : '—';
  };

  const dischargeSoon = patients.filter(p => p.status === 'Admitted' && p.expectedStayDays <= 1);

  const DRILLS: Record<string, { label: string; icon: typeof Users; color: string; bg: string; cols: DrillCol[]; rows: DrillRow[] }> = {
    inpatients: {
      label: 'Total Inpatients', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50',
      cols: [
        { key: 'admissionNumber', label: 'Admission No.', mono: true },
        { key: 'uhid', label: 'UHID', mono: true },
        { key: 'patientName', label: 'Patient' },
        { key: 'age', label: 'Age / Gender' },
        { key: 'ward', label: 'Ward' },
        { key: 'bed', label: 'Room / Bed' },
        { key: 'admittingDoctor', label: 'Doctor' },
        { key: 'status', label: 'Status' },
      ],
      rows: activePatients.map(p => ({
        admissionNumber: p.admissionNumber, uhid: p.uhid, patientName: p.patientName,
        age: `${p.age} / ${p.gender}`, ward: wardName(p.currentWardId), bed: bedLabel(p.currentBedId),
        admittingDoctor: p.admittingDoctor, status: p.status,
      })),
    },
    occupancy: {
      label: 'Occupied Beds', icon: BedDouble, color: 'text-indigo-600', bg: 'bg-indigo-50',
      cols: [
        { key: 'ward', label: 'Ward' },
        { key: 'roomNumber', label: 'Room' },
        { key: 'bedNumber', label: 'Bed' },
        { key: 'patientName', label: 'Occupied By' },
        { key: 'uhid', label: 'UHID', mono: true },
        { key: 'status', label: 'Status' },
      ],
      rows: beds.filter(b => b.status === 'Occupied').map(b => {
        const p = patients.find(x => x.currentBedId === b.id);
        return {
          ward: wardName(b.wardId), roomNumber: b.roomNumber, bedNumber: b.bedNumber,
          patientName: p?.patientName ?? '—', uhid: p?.uhid ?? '—', status: b.status,
        };
      }),
    },
    pending: {
      label: 'Pending Admissions', icon: UserPlus, color: 'text-amber-600', bg: 'bg-amber-50',
      cols: [
        { key: 'requestDate', label: 'Requested' },
        { key: 'uhid', label: 'UHID', mono: true },
        { key: 'patientName', label: 'Patient' },
        { key: 'specialty', label: 'Specialty' },
        { key: 'admissionType', label: 'Type' },
        { key: 'priority', label: 'Priority' },
        { key: 'requestedBy', label: 'Requested By' },
        { key: 'status', label: 'Status' },
      ],
      rows: admissionRequests.filter(r => r.status === 'Pending' && isDateInRange(String(r.requestDate))).map(r => ({
        requestDate: String(r.requestDate).split('T')[0], uhid: r.uhid, patientName: r.patientName,
        specialty: r.specialty, admissionType: r.admissionType, priority: r.priority,
        requestedBy: r.requestedBy, status: r.status,
      })),
    },
    discharges: {
      label: 'Expected Discharges (24h)', icon: Clock, color: 'text-green-600', bg: 'bg-green-50',
      cols: [
        { key: 'admissionNumber', label: 'Admission No.', mono: true },
        { key: 'patientName', label: 'Patient' },
        { key: 'ward', label: 'Ward' },
        { key: 'bed', label: 'Room / Bed' },
        { key: 'admittingDoctor', label: 'Doctor' },
        { key: 'expectedStayDays', label: 'Days Left' },
        { key: 'status', label: 'Status' },
      ],
      rows: dischargeSoon.map(p => ({
        admissionNumber: p.admissionNumber, patientName: p.patientName,
        ward: wardName(p.currentWardId), bed: bedLabel(p.currentBedId),
        admittingDoctor: p.admittingDoctor, expectedStayDays: p.expectedStayDays, status: p.status,
      })),
    },
  };

  // Chart Options
  const barOptions: ApexOptions = {
    chart: { 
      type: 'bar', 
      toolbar: { show: false }, 
      fontFamily: 'Inter',
      dropShadow: {
        enabled: true,
        color: '#000',
        top: 2,
        left: 0,
        blur: 4,
        opacity: 0.05
      }
    },
    colors: ['#047857', '#E11D48'],
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.5,
        gradientToColors: ['#34D399', '#FB7185'],
        inverseColors: true,
        opacityFrom: 1,
        opacityTo: 0.85,
        stops: [0, 100]
      }
    },
    plotOptions: { 
      bar: { 
        borderRadius: 6, 
        columnWidth: '40%',
        borderRadiusApplication: 'end'
      } 
    },
    xaxis: { 
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: '#94a3b8', fontWeight: 500 } }
    },
    yaxis: {
      labels: { style: { colors: '#94a3b8', fontWeight: 500 } }
    },
    grid: {
      borderColor: '#f1f5f9',
      strokeDashArray: 4,
      yaxis: { lines: { show: true } }
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    stroke: { show: true, width: 3, colors: ['transparent'] },
    tooltip: {
      theme: 'light',
      y: { formatter: (val) => `${val} patients` },
      style: { fontSize: '12px', fontFamily: 'Inter' }
    }
  };

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'Inter' },
    colors: ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981'],
    labels: wards.map(w => w.name),
    dataLabels: { enabled: false },
    legend: { position: 'bottom' },
    stroke: { width: 0 }
  };

  const wardOccupancyData = wards.map(w => {
    const wBeds = beds.filter(b => b.wardId === w.id);
    const occ = wBeds.filter(b => b.status === 'Occupied').length;
    return occ;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">IPD Analytics Dashboard</h1>
        </div>
        <DateFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onSearch={handleSearch}
          onReset={handleReset}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => DRILLS.inpatients.rows.length > 0 && setDrill(drill === 'inpatients' ? null : 'inpatients')}
          disabled={DRILLS.inpatients.rows.length === 0}
          title={DRILLS.inpatients.rows.length > 0 ? 'View list' : 'Nothing to list'}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-start justify-between w-full text-left transition-all enabled:hover:shadow-md enabled:hover:border-primary/30 enabled:cursor-pointer disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Total Inpatients</p>
            <h3 className="text-4xl font-bold text-slate-800">{activePatients.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => DRILLS.occupancy.rows.length > 0 && setDrill(drill === 'occupancy' ? null : 'occupancy')}
          disabled={DRILLS.occupancy.rows.length === 0}
          title={DRILLS.occupancy.rows.length > 0 ? 'View list' : 'Nothing to list'}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-start justify-between w-full text-left transition-all enabled:hover:shadow-md enabled:hover:border-primary/30 enabled:cursor-pointer disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Bed Occupancy</p>
            <h3 className="text-4xl font-bold text-slate-800">{occupancyRate}%</h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">{occupiedBeds} / {totalBeds} Beds Full</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <BedDouble className="w-6 h-6 text-indigo-600" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => DRILLS.pending.rows.length > 0 && setDrill(drill === 'pending' ? null : 'pending')}
          disabled={DRILLS.pending.rows.length === 0}
          title={DRILLS.pending.rows.length > 0 ? 'View list' : 'Nothing to list'}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-start justify-between w-full text-left transition-all enabled:hover:shadow-md enabled:hover:border-primary/30 enabled:cursor-pointer disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Pending Admissions</p>
            <h3 className="text-4xl font-bold text-slate-800">{pendingAdmissions}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-amber-600" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => DRILLS.discharges.rows.length > 0 && setDrill(drill === 'discharges' ? null : 'discharges')}
          disabled={DRILLS.discharges.rows.length === 0}
          title={DRILLS.discharges.rows.length > 0 ? 'View list' : 'Nothing to list'}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-start justify-between w-full text-left transition-all enabled:hover:shadow-md enabled:hover:border-primary/30 enabled:cursor-pointer disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Expected Discharges (24h)</p>
            <h3 className="text-4xl font-bold text-slate-800">{expectedDischarges}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
            <Clock className="w-6 h-6 text-green-600" />
          </div>
        </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-800">Admissions vs Discharges</h3>
            <div className="flex gap-4 text-sm font-bold">
              <div className="flex items-center gap-1 text-green-600"><ArrowUpRight className="w-4 h-4"/> Admissions ({admissionsInPeriod} in period)</div>
              <div className="flex items-center gap-1 text-red-500"><ArrowDownRight className="w-4 h-4"/> Discharges ({dischargesInPeriod} in period)</div>
            </div>
          </div>
          <Chart 
            options={barOptions} 
            series={[
              { name: 'Admissions', data: [12, 18, 15, 22, 14, 25, admissionsInPeriod] },
              { name: 'Discharges', data: [10, 15, 12, 20, 15, 18, dischargesInPeriod] }
            ]} 
            type="bar" 
            height={300} 
            width="100%"
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col overflow-hidden">
          <h3 className="font-bold text-lg text-slate-800 mb-4">Occupancy by Ward</h3>
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            <Chart options={donutOptions} series={wardOccupancyData} type="donut" height="100%" width="100%" />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center text-sm font-bold text-slate-600 mb-1">
              <span>Average Length of Stay</span>
              <span className="text-primary">{alos} Days</span>
            </div>
            <p className="text-xs text-slate-400">Across all wards this month</p>
          </div>
        </div>
      </div>
    </div>
  );
};
