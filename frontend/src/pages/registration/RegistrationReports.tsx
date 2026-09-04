import { API_BASE_URL } from '@/utils/apiBase';
import { useState } from 'react';
import { LineChart, PieChart, Users, Activity, Heart, Shield, Pill, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { DateFilter } from '../../components/ui/DateFilter';

export const RegistrationReports = () => {
  const todayDate = new Date();
  const today = todayDate.toISOString().split('T')[0];

  const firstDayStr = `${today.split('-')[0]}-${today.split('-')[1]}-01`;

  const [dateFrom, setDateFrom] = useState(firstDayStr);
  const [dateTo, setDateTo] = useState(today);

  const [appliedDateFrom, setAppliedDateFrom] = useState(firstDayStr);
  const [appliedDateTo, setAppliedDateTo] = useState(today);

  const [reportData, setReportData] = useState<any>(null);
  const [activeView, setActiveView] = useState<'NONE' | 'TOTAL' | 'OP' | 'EMERGENCY' | 'IP'>('NONE');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeView, appliedDateFrom, appliedDateTo]);

  const API_BASE = API_BASE_URL;

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
    setDateFrom(firstDayStr);
    setDateTo(today);
    setAppliedDateFrom(firstDayStr);
    setAppliedDateTo(today);
  };

  const totalPatients = reportData?.kpis?.totalRegistrations || 0;
  const opPatients = reportData?.kpis?.opPatients || 0;
  const emergencyPatients = reportData?.kpis?.emergencyPatients || 0;
  const ipPatients = reportData?.kpis?.ipPatients || 0;
  const pharmacyBills = reportData?.kpis?.pharmacyBills || 0;

  const trendLabels = reportData?.trends?.map((t: any) => {
    if (!t.date) return '';
    const d = new Date(t.date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  let currentItems = reportData?.recent || [];
  if (activeView === 'OP') {
    currentItems = currentItems.filter((r: any) => r.patientType === 'OP' || r.patientType === 'Walk-In');
  } else if (activeView === 'EMERGENCY') {
    currentItems = currentItems.filter((r: any) => r.patientType === 'Emergency');
  } else if (activeView === 'IP') {
    currentItems = currentItems.filter((r: any) => r.patientType === 'IP' || r.patientType === 'IPD');
  }

  const itemsPerPage = 5;
  const totalPages = Math.ceil(currentItems.length / itemsPerPage);
  const paginatedItems = currentItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 xl:gap-6">
          <div 
            onClick={() => setActiveView(activeView === 'TOTAL' ? 'NONE' : 'TOTAL')}
            className={`bg-white rounded-3xl p-6 border ${activeView === 'TOTAL' ? 'border-blue-500 ring-4 ring-blue-50' : 'border-slate-100'} shadow-sm flex items-center gap-3 xl:gap-4 hover:shadow-md transition-all cursor-pointer`}
          >
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-6 h-6 xl:w-7 xl:h-7" />
            </div>
            <div>
              <div className="text-slate-500 text-sm font-medium mb-1">Total Registrations</div>
              <div className="text-3xl font-bold text-slate-800">{totalPatients}</div>
            </div>
          </div>

          <div 
            onClick={() => setActiveView(activeView === 'OP' ? 'NONE' : 'OP')}
            className={`bg-white rounded-3xl p-6 border ${activeView === 'OP' ? 'border-emerald-500 ring-4 ring-emerald-50' : 'border-slate-100'} shadow-sm flex items-center gap-3 xl:gap-4 hover:shadow-md transition-all cursor-pointer`}
          >
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-6 h-6 xl:w-7 xl:h-7" />
            </div>
            <div>
              <div className="text-slate-500 text-sm font-medium mb-1">OPD Patients</div>
              <div className="text-3xl font-bold text-slate-800">{opPatients}</div>
            </div>
          </div>

          <div 
            onClick={() => setActiveView(activeView === 'EMERGENCY' ? 'NONE' : 'EMERGENCY')}
            className={`bg-white rounded-3xl p-6 border ${activeView === 'EMERGENCY' ? 'border-orange-500 ring-4 ring-orange-50' : 'border-slate-100'} shadow-sm flex items-center gap-3 xl:gap-4 hover:shadow-md transition-all cursor-pointer`}
          >
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Heart className="w-6 h-6 xl:w-7 xl:h-7" />
            </div>
            <div>
              <div className="text-slate-500 text-sm font-medium mb-1">Emergency</div>
              <div className="text-3xl font-bold text-slate-800">{emergencyPatients}</div>
            </div>
          </div>

          <div 
            onClick={() => setActiveView(activeView === 'IP' ? 'NONE' : 'IP')}
            className={`bg-white rounded-3xl p-6 border ${activeView === 'IP' ? 'border-purple-500 ring-4 ring-purple-50' : 'border-slate-100'} shadow-sm flex items-center gap-3 xl:gap-4 hover:shadow-md transition-all cursor-pointer`}
          >
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Shield className="w-6 h-6 xl:w-7 xl:h-7" />
            </div>
            <div>
              <div className="text-slate-500 text-sm font-medium mb-1">IP Admissions</div>
              <div className="text-3xl font-bold text-slate-800">{ipPatients}</div>
            </div>
          </div>

          {/* Not clickable like the others: the list below holds registrations, and a pharmacy
              bill has no registration row to filter it down to. */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-3 xl:gap-4">
            <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Pill className="w-6 h-6 xl:w-7 xl:h-7" />
            </div>
            <div>
              <div className="text-slate-500 text-sm font-medium mb-1">Pharmacy Bills</div>
              <div className="text-3xl font-bold text-slate-800">{pharmacyBills}</div>
            </div>
          </div>
        </div>

        {/* Charts Mockup Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col min-h-[350px]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-slate-800">Registration Trends</h3>
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

        {activeView !== 'NONE' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {activeView === 'TOTAL' ? 'Total Registrations Details' :
                   activeView === 'OP' ? 'OPD Patients Details' :
                   activeView === 'EMERGENCY' ? 'Emergency Details' : 'IP Admissions Details'}
                </h3>
              </div>
              <button onClick={() => setActiveView('NONE')} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
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
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        No {activeView === 'IP' ? 'IP Admissions' : activeView === 'EMERGENCY' ? 'Emergency' : activeView === 'OP' ? 'OPD' : ''} registrations found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((p: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-slate-600">{p.registrationDate}</td>
                        <td className="px-6 py-4 font-semibold text-primary">{p.uhid}</td>
                        <td className="px-6 py-4 font-medium text-slate-800">{p.patientName || p.firstName}</td>
                        <td className="px-6 py-4 text-slate-600">{p.patientType || 'OP'}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${p.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                            }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-sm text-slate-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, currentItems.length)} of {currentItems.length} records
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabular Report Section */}
        {activeView === 'NONE' && (
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
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        No recent registrations.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((p: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-slate-600">{p.registrationDate}</td>
                        <td className="px-6 py-4 font-semibold text-primary">{p.uhid}</td>
                        <td className="px-6 py-4 font-medium text-slate-800">{p.patientName || p.firstName}</td>
                        <td className="px-6 py-4 text-slate-600">{p.patientType || 'OP'}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${p.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                            }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-sm text-slate-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, currentItems.length)} of {currentItems.length} records
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
