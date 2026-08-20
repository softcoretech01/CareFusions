import { useState, useEffect } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { Users, BedDouble, Activity, Loader2, X } from 'lucide-react';
import { DateFilter } from '../../components/ui/DateFilter';
import { WeeklyEMRTrendCard } from '../../components/emr/WeeklyEMRTrendCard';
import type { EMRRecord } from '../../components/emr/EMRPrintTemplate';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

export const EMRDashboard = () => {
  const [searchText, setSearchText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [records, setRecords] = useState<EMRRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'NONE' | 'TOTAL' | 'OP' | 'IP'>('NONE');

  useEffect(() => {
    const fetchAllRecords = async () => {
      setIsLoading(true);
      try {
        const [opRes, ipRes] = await Promise.all([
          fetch(`${API_BASE}/opd-visits/schedule`),
          fetch(`${API_BASE}/ipd-visits/schedule`)
        ]);

        let merged: EMRRecord[] = [];

        if (opRes.ok) {
          const opData = await opRes.json();
          const opMapped: EMRRecord[] = opData.map((d: any) => ({
            uhid: d.uhid,
            patientName: d.patientName,
            age: d.age || 0,
            gender: d.gender || 'Unknown',
            bloodGroup: 'Unknown',
            contact: d.mobileNumber || '',
            visitType: d.visitType || 'OP', // Will be OP, Walk-In, Follow-Up, or Emergency
            visitId: d.id?.toString() || '',
            visitDate: d.date ? new Date(d.date).toLocaleDateString('en-GB') : '',
            visitDateValue: d.date || '',
            doctor: d.doctorName || 'Unassigned',
            specialty: d.department || '',
            department: d.department || '',
            dischargeStatus: '',
            billingStatus: d.billingStatus || 'Pending',
            chiefComplaint: '',
            diagnosis: '',
            clinicalNotes: '',
            vitals: {},
            investigations: [],
            prescriptions: []
          }));
          merged = [...merged, ...opMapped];
        }

        if (ipRes.ok) {
          const ipData = await ipRes.json();
          const ipMapped: EMRRecord[] = ipData.map((d: any) => ({
            uhid: d.uhid,
            patientName: d.patientName,
            age: d.age || 0,
            gender: d.gender || 'Unknown',
            bloodGroup: 'Unknown',
            contact: '',
            visitType: 'IP',
            visitId: d.admissionId?.toString() || d.id?.toString() || '',
            visitDate: d.admissionDate ? new Date(d.admissionDate).toLocaleDateString('en-GB') : '',
            visitDateValue: d.admissionDate || '',
            doctor: d.doctorName || 'Unassigned',
            specialty: d.department || '',
            department: d.department || '',
            dischargeStatus: d.status === 'Discharged' ? 'Discharged' : 'Admitted',
            billingStatus: 'Pending',
            chiefComplaint: '',
            diagnosis: '',
            clinicalNotes: '',
            vitals: {},
            investigations: [],
            prescriptions: []
          }));
          merged = [...merged, ...ipMapped];
        }

        setRecords(merged);
      } catch (e) {
        console.error("Failed to fetch dashboard records", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllRecords();
  }, []);

  const filteredRecords = records.filter(r => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch === '' ||
      r.patientName.toLowerCase().includes(normalizedSearch) ||
      r.uhid.toLowerCase().includes(normalizedSearch) ||
      r.visitId.toLowerCase().includes(normalizedSearch) ||
      r.doctor.toLowerCase().includes(normalizedSearch) ||
      r.department?.toLowerCase().includes(normalizedSearch) ||
      r.gender.toLowerCase().includes(normalizedSearch);

    const visitDate = new Date(r.visitDateValue || r.visitDate);
    const startDate = fromDate ? new Date(fromDate) : null;
    const endDate = toDate ? new Date(toDate) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);

    const matchesFrom = !startDate || (visitDate && visitDate >= startDate);
    const matchesTo = !endDate || (visitDate && visitDate <= endDate);

    return matchesSearch && matchesFrom && matchesTo;
  });

  // OP consists of anything not IP and not Emergency
  const opCount = filteredRecords.filter(r => r.visitType !== 'IP' && r.visitType !== 'Emergency').length;
  const ipCount = filteredRecords.filter(r => r.visitType === 'IP').length;
  const totalRecords = opCount + ipCount;
  const donutSeries = [opCount, ipCount];

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', toolbar: { show: false }, fontFamily: 'Inter' },
    labels: ['OP', 'IP'],
    colors: ['#38bdf8', '#818cf8'],
    legend: { position: 'bottom', horizontalAlign: 'center', markers: { width: 10, height: 10 } } as any,
    dataLabels: { enabled: false },
    plotOptions: { pie: { donut: { size: '65%' } } },
    responsive: [{ breakpoint: 640, options: { chart: { width: '100%' }, legend: { position: 'bottom' } } }],
  };

  const handleClearFilters = () => {
    setSearchText('');
    setSearchQuery('');
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="space-y-6 relative min-h-[500px]">
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-20 rounded-3xl">
          <div className="flex flex-col items-center gap-2 text-indigo-600">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm font-semibold">Loading Live Data...</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="shrink-0">
          <h1 className="text-2xl font-bold text-slate-800 whitespace-nowrap">EMR Dashboard</h1>
        </div>

        <div className="flex items-center gap-3 flex-nowrap overflow-x-auto pb-1 w-full justify-end">
          <div className="shrink-0 scale-95 origin-right">
            <DateFilter
              dateFrom={fromDate}
              dateTo={toDate}
              onDateFromChange={setFromDate}
              onDateToChange={setToDate}
              onSearch={() => setSearchQuery(searchText)}
              onReset={handleClearFilters}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
        <div
          onClick={() => setActiveView(activeView === 'TOTAL' ? 'NONE' : 'TOTAL')}
          className={`bg-white rounded-3xl border ${activeView === 'TOTAL' ? 'border-primary ring-4 ring-primary/10' : 'border-slate-100'} p-6 shadow-sm hover:shadow-md transition-all cursor-pointer`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary" />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Total Records</p>
            <h3 className="text-3xl font-bold text-slate-800">{totalRecords}</h3>
          </div>
        </div>

        <div
          onClick={() => setActiveView(activeView === 'OP' ? 'NONE' : 'OP')}
          className={`bg-white rounded-3xl border ${activeView === 'OP' ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-100'} p-6 shadow-sm hover:shadow-md transition-all cursor-pointer`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">OP Records</p>
            <h3 className="text-3xl font-bold text-slate-800">{opCount}</h3>
          </div>
        </div>

        <div
          onClick={() => setActiveView(activeView === 'IP' ? 'NONE' : 'IP')}
          className={`bg-white rounded-3xl border ${activeView === 'IP' ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-slate-100'} p-6 shadow-sm hover:shadow-md transition-all cursor-pointer`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <BedDouble className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">IP Records</p>
            <h3 className="text-3xl font-bold text-slate-800">{ipCount}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <WeeklyEMRTrendCard records={records} />
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Visit Distribution</h2>
              <p className="text-sm text-slate-500">Current record mix by visit type</p>
            </div>
          </div>
          <Chart options={donutOptions} series={donutSeries} type="donut" height={330} />
        </div>
      </div>

      {activeView !== 'NONE' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {activeView === 'TOTAL' ? 'Total Records Details' :
                  activeView === 'OP' ? 'OP Records Details' : 'IP Records Details'}
              </h3>
              {/* <p className="text-sm text-slate-500 mt-0.5">
                {fromDate && toDate ? `${fromDate} to ${toDate}` : fromDate ? `Since ${fromDate}` : toDate ? `Until ${toDate}` : 'All time records'}
              </p> */}
            </div>
            <button onClick={() => setActiveView('NONE')} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-white sticky top-0 z-10 border-b border-slate-100 shadow-sm">
                <tr>
                  <th className="px-6 py-3 font-semibold text-slate-600">UHID</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Patient Name</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Age/Gender</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Visit Date</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Visit Type</th>
                  <th className="px-6 py-3 font-semibold text-slate-600">Doctor & Dept</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRecords
                  .filter(r =>
                    activeView === 'TOTAL' ? true :
                      activeView === 'OP' ? (r.visitType !== 'IP' && r.visitType !== 'Emergency') :
                        (r.visitType === 'IP')
                  )
                  .map((item: EMRRecord, i: number) => (
                    <tr key={`${item.visitType}-${item.uhid}-${item.visitId || i}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-800">{item.uhid}</td>
                      <td className="px-6 py-3 text-slate-700 font-medium">{item.patientName}</td>
                      <td className="px-6 py-3 text-slate-600">{item.age} Yrs / {item.gender}</td>
                      <td className="px-6 py-3 text-slate-600">{item.visitDate}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold ${item.visitType === 'IP' ? 'bg-indigo-100 text-indigo-700' :
                            item.visitType === 'Emergency' ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                          }`}>
                          {item.visitType}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        <div className="font-medium text-slate-800">{item.doctor}</div>
                        <div className="text-xs text-slate-500">{item.department}</div>
                      </td>
                    </tr>
                  ))}
                {filteredRecords.filter(r => activeView === 'TOTAL' ? true : activeView === 'OP' ? (r.visitType !== 'IP' && r.visitType !== 'Emergency') : (r.visitType === 'IP')).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No records found for the selected criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
