import { useState } from 'react';
import { LineChart, PieChart, Users, Activity, Heart, Shield } from 'lucide-react';
import { useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { DateFilter } from '../../components/ui/DateFilter';

export const RegistrationReports = () => {
const todayDate = new Date();
  const today = todayDate.toISOString().split('T')[0];
  
  const lastWeekDate = new Date();
  lastWeekDate.setDate(todayDate.getDate() - 7);
  const lastWeek = lastWeekDate.toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(lastWeek);
  const [dateTo, setDateTo] = useState(today);

  const [appliedDateFrom, setAppliedDateFrom] = useState(lastWeek);
  const [appliedDateTo, setAppliedDateTo] = useState(today);
  
  const [reportData, setReportData] = useState<any>(null);
  
  const API_BASE = import.meta.env.VITE_API_URL as string;

  useEffect(() => {
    const fetchReports = async () => {
      try {
        let url = `${API_BASE}/patients/reports?`;
        if (appliedDateFrom) url += `start_date=${appliedDateFrom}&`;
        if (appliedDateTo) url += `end_date=${appliedDateTo}`;
        
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setReportData(data);
        }
      } catch (err) {
        console.error("Failed to fetch reports", err);
      }
    };
    fetchReports();
  }, [appliedDateFrom, appliedDateTo, API_BASE]);

  const handleSearch = () => {
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
  };

  const handleReset = () => {
    setDateFrom('');
    setDateTo('');
    setAppliedDateFrom('');
    setAppliedDateTo('');
  };

  const totalPatients = reportData?.kpis?.totalRegistrations || 0;
  const opPatients = reportData?.kpis?.opPatients || 0;
  const emergencyPatients = reportData?.kpis?.emergencyPatients || 0;
  const ipPatients = reportData?.kpis?.ipPatients || 0;

const trendLabels = reportData?.trends?.map((t: any) => {
    if (!t.date) return '';
    const d = new Date(t.date);
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  }) || [];
  const trendValues = reportData?.trends?.map((t: any) => t.count) || [];
  
  const trendOptions: any = {
    chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'inherit' },
    colors: ['#0ea5e9'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: trendLabels, tooltip: { enabled: false } },
    yaxis: { labels: { formatter: (val: number) => val.toFixed(0) } },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } }
  };
  
  const trendSeries = [{ name: 'Registrations', data: trendValues }];

  const demoLabels = reportData?.demographics ? Object.keys(reportData.demographics) : [];
  // Object.values on an index-signature-less shape widens to unknown[]; the
  // donut series must be number[], so coerce each bucket count explicitly.
  const demoValues: number[] = reportData?.demographics
    ? Object.values(reportData.demographics).map(v => Number(v) || 0)
    : [];

  const demoOptions: any = {
    chart: { type: 'donut', fontFamily: 'inherit' },
    labels: demoLabels,
    colors: ['#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b'],
    plotOptions: { donut: { size: '70%' } },
    dataLabels: { enabled: false },
    legend: { position: 'bottom' }
  };
  const demoSeries = demoValues.length > 0 ? demoValues : [];

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Registration Analytics</h1>
        </div>
        <div className="flex items-center gap-3">
          <DateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onSearch={handleSearch}
            onReset={handleReset}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <div className="text-slate-500 text-sm font-medium mb-1">Total Registrations</div>
              <div className="text-3xl font-bold text-slate-800">{totalPatients}</div>
            </div>
          </div>
          
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <div className="text-slate-500 text-sm font-medium mb-1">OPD Patients</div>
              <div className="text-3xl font-bold text-slate-800">{opPatients}</div>
            </div>
          </div>
          
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Heart className="w-7 h-7" />
            </div>
            <div>
              <div className="text-slate-500 text-sm font-medium mb-1">Emergency</div>
              <div className="text-3xl font-bold text-slate-800">{emergencyPatients}</div>
            </div>
          </div>
          
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <div className="text-slate-500 text-sm font-medium mb-1">IP Admissions</div>
              <div className="text-3xl font-bold text-slate-800">{ipPatients}</div>
            </div>
          </div>
        </div>

        {/* Charts Mockup Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col min-h-[350px]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-slate-800">Registration Trends (7 Days)</h3>
              <LineChart className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-1 mt-4">
              {reportData ? <ReactApexChart options={trendOptions} series={trendSeries} type="area" height="100%" /> : <div className="animate-pulse bg-slate-100 w-full h-full rounded-xl"></div>}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col min-h-[350px]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-slate-800">Patient Demographics</h3>
              <PieChart className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-1 flex items-center justify-center mt-4">
              {reportData ? <ReactApexChart options={demoOptions} series={demoSeries} type="donut" height="100%" /> : <div className="animate-pulse bg-slate-100 w-full h-full rounded-full"></div>}
            </div>
          </div>
        </div>

        {/* Tabular Report Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Recent Registrations List</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">UHID</th>
                  <th className="px-6 py-4 font-medium">Patient Name</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(reportData?.recent || []).slice(0, 5).map((p: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-slate-600">{p.registrationDate}</td>
                    <td className="px-6 py-4 font-semibold text-primary">{p.uhid}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{p.patientName || p.firstName}</td>
                    <td className="px-6 py-4 text-slate-600">{p.patientType || 'OP'}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                        p.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!(reportData?.recent?.length > 0) && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No recent registrations.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
