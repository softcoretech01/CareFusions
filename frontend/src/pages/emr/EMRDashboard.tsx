import { useState } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { Users, BedDouble, Siren, Activity } from 'lucide-react';
import { MOCK_EMR_RECORDS } from '../../data/mockEMRData';
import { DateFilter } from '../../components/ui/DateFilter';
import { WeeklyEMRTrendCard } from '../../components/emr/WeeklyEMRTrendCard';

export const EMRDashboard = () => {
  const [searchText, setSearchText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filteredRecords = MOCK_EMR_RECORDS.filter(r => {
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
    const matchesFrom = !startDate || visitDate >= startDate;
    const matchesTo = !endDate || visitDate <= endDate;

    return matchesSearch && matchesFrom && matchesTo;
  });

  const opCount = filteredRecords.filter(r => r.visitType === 'OP').length;
  const ipCount = filteredRecords.filter(r => r.visitType === 'IP').length;
  const emCount = filteredRecords.filter(r => r.visitType === 'Emergency').length;
  const totalRecords = filteredRecords.length;
  const donutSeries = [opCount, ipCount, emCount];

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', toolbar: { show: false }, fontFamily: 'Inter' },
    labels: ['OP', 'IP', 'Emergency'],
    colors: ['#38bdf8', '#818cf8', '#f87171'],
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">EMR Dashboard</h1>
      </div>
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
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

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
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

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
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

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
              <Siren className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Emergency Records</p>
            <h3 className="text-3xl font-bold text-slate-800">{emCount}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <WeeklyEMRTrendCard />
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
    </div>
  );
};
