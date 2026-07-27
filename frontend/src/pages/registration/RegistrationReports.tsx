import { useState } from 'react';
import { LineChart, PieChart, Users, FileText, Download, Activity, Heart, Shield } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { usePatients } from '../../contexts/PatientContext';
import { exportToExcel } from '../../utils/exportToExcel';
import ReactApexChart from 'react-apexcharts';
import { DateFilter } from '../../components/ui/DateFilter';

export const RegistrationReports = () => {
  const { patients } = usePatients();
  
  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const [appliedDateFrom, setAppliedDateFrom] = useState(today);
  const [appliedDateTo, setAppliedDateTo] = useState(today);

  const filteredPatients = patients.filter(p => {
    const regDate = p.registrationDate ? p.registrationDate.split('T')[0] : today;
    return (!appliedDateFrom || regDate >= appliedDateFrom) && (!appliedDateTo || regDate <= appliedDateTo);
  });

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

  // Basic stats based on filtered
  const totalPatients = filteredPatients.length;
  const opPatients = filteredPatients.filter(p => p.patientType === 'OP' || p.patientType === 'Walk-In').length;
  const emergencyPatients = filteredPatients.filter(p => p.patientType === 'Emergency').length;
  const ipPatients = filteredPatients.filter(p => p.patientType === 'IP').length;

  const trendOptions: any = {
    chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'inherit' },
    colors: ['#0ea5e9'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], tooltip: { enabled: false } },
    yaxis: { labels: { formatter: (val: number) => val.toFixed(0) } },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } }
  };
  const trendSeries = [{ name: 'Registrations', data: [12, 18, 15, 25, 22, 30, 28] }];

  const demoOptions: any = {
    chart: { type: 'donut', fontFamily: 'inherit' },
    labels: ['OPD', 'Walk-In', 'Emergency', 'IPD'],
    colors: ['#3b82f6', '#8b5cf6', '#ef4444', '#10b981'],
    plotOptions: { donut: { size: '70%' } },
    dataLabels: { enabled: false },
    legend: { position: 'bottom' }
  };
  const demoSeries = [45, 25, 15, 15];

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
          <Button variant="filled" color="primary" icon={Download}>Export PDF</Button>
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
              <ReactApexChart options={trendOptions} series={trendSeries} type="area" height="100%" />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col min-h-[350px]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-slate-800">Patient Demographics</h3>
              <PieChart className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-1 flex items-center justify-center mt-4">
              <ReactApexChart options={demoOptions} series={demoSeries} type="donut" height="100%" />
            </div>
          </div>
        </div>

        {/* Tabular Report Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Recent Registrations List</h3>
            <Button variant="outline" size="sm" icon={FileText} onClick={() => exportToExcel(patients, 'RegistrationReports')}>Export CSV</Button>
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
                {patients.slice(0, 5).map((p, idx) => (
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
                {patients.length === 0 && (
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
