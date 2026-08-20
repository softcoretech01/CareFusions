import { useState, useEffect } from 'react';
import { IndianRupee, TrendingUp, FileText, CreditCard, CheckCircle, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Chart from 'react-apexcharts';
import { DateFilter } from '../../components/ui/DateFilter';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL as string;

export const BillingDashboard = () => {
  const [bills, setBills] = useState<any[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activeView, setActiveView] = useState<'NONE' | 'TOTAL' | 'OP' | 'IP' | 'PAID' | 'PENDING'>('NONE');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeView, fromDate, toDate]);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const response = await axios.get(`${API_BASE}/billing-reports/`);
      setBills(response.data);
    } catch (error) {
      console.error("Failed to fetch dashboard billing data", error);
    }
  };

  const filteredBills = bills.filter(bill => {
    const billDate = new Date(bill.Date);
    const startDate = fromDate ? new Date(fromDate) : null;
    const endDate = toDate ? new Date(toDate) : null;
    if (startDate) startDate.setHours(0,0,0,0);
    if (endDate) endDate.setHours(23,59,59,999);
    
    const matchesFrom = !startDate || billDate >= startDate;
    const matchesTo = !endDate || billDate <= endDate;
    return matchesFrom && matchesTo;
  });

  const totalBills = filteredBills.length;
  const opBills = filteredBills.filter(b => b.Type === 'OP').length;
  const ipBills = filteredBills.filter(b => b.Type === 'IP').length;
  const paidBills = filteredBills.filter(b => b.PaymentStatus === 'Paid').length;
  const unpaidBills = filteredBills.filter(b => b.PaymentStatus !== 'Paid').length;

  const today = new Date().toDateString();
  const todaysRevenue = bills
    .filter(b => new Date(b.Date).toDateString() === today && b.PaymentStatus === 'Paid')
    .reduce((acc, b) => acc + b.NetAmount, 0);
  
  const currentMonth = new Date().getMonth();
  const thisMonthRevenue = bills
    .filter(b => new Date(b.Date).getMonth() === currentMonth && b.PaymentStatus === 'Paid')
    .reduce((acc, b) => acc + b.NetAmount, 0);

  const isFiltered = fromDate || toDate;

  const monthsList: string[] = [];
  const currentDate = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    monthsList.push(d.toLocaleString('default', { month: 'short' }));
  }

  const opData = [0, 0, 0, 0, 0, 0];
  const ipData = [0, 0, 0, 0, 0, 0];

  bills.forEach(bill => {
    if (bill.PaymentStatus === 'Paid') {
      const billDate = new Date(bill.Date);
      const monthDiff = (currentDate.getFullYear() - billDate.getFullYear()) * 12 + (currentDate.getMonth() - billDate.getMonth());
      
      if (monthDiff >= 0 && monthDiff <= 5) {
        const idx = 5 - monthDiff;
        if (bill.Type === 'OP') opData[idx] += bill.NetAmount;
        else if (bill.Type === 'IP') ipData[idx] += bill.NetAmount;
      }
    }
  });

  const areaOptions = {
    chart: { 
      type: 'area' as const, 
      fontFamily: 'inherit', 
      toolbar: { show: false }, 
      zoom: { enabled: false },
      dropShadow: {
        enabled: true,
        color: '#000',
        top: 8,
        left: 0,
        blur: 8,
        opacity: 0.15
      }
    },
    colors: ['#0ea5e9', '#8b5cf6'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth' as const, width: 4 },
    xaxis: {
      categories: monthsList,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: '#94a3b8', fontWeight: 500 } },
      crosshairs: { show: false },
      tooltip: { enabled: false }
    },
    yaxis: { 
      labels: { 
        formatter: (v: number) => `₹${v.toLocaleString()}`,
        style: { colors: '#94a3b8', fontWeight: 500 }
      } 
    },
    grid: { 
      borderColor: '#f1f5f9', 
      strokeDashArray: 4,
      padding: { left: 15, right: 15 },
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } }
    },
    fill: {
      type: 'gradient',
      gradient: { 
        shadeIntensity: 1, 
        type: 'vertical',
        opacityFrom: 0.6, 
        opacityTo: 0.0, 
        stops: [0, 100] 
      }
    },
    markers: {
      size: 0,
      hover: { size: 6, sizeOffset: 3, colors: ['#ffffff'], strokeWidth: 3 }
    },
    tooltip: { 
      theme: 'light' as const,
      y: { formatter: (v: number) => `₹${v.toLocaleString()}` },
      style: { fontSize: '12px' }
    },
    legend: { position: 'top' as const, horizontalAlign: 'right' as const }
  };

  const areaSeries = [
    { name: 'OP Revenue', data: opData },
    { name: 'IP Revenue', data: ipData }
  ];

  const donutOptions = {
    chart: { type: 'donut' as const, fontFamily: 'inherit' },
    colors: ['#10b981', '#ef4444', '#f59e0b'],
    labels: ['Paid', 'Pending', 'Refunded'],
    legend: { position: 'bottom' as const },
    dataLabels: { enabled: true },
    plotOptions: { pie: { donut: { size: '65%' } } },
    stroke: { show: false }
  };

  const donutSeries = [paidBills || 0, unpaidBills || 0, 0];

  const stats = [
    { id: 'TOTAL', label: 'Total Bills', value: totalBills, icon: FileText, color: 'bg-blue-100 text-blue-600', sub: isFiltered ? 'Filtered' : 'All time' },
    { id: 'OP', label: 'OP Bills', value: opBills, icon: CreditCard, color: 'bg-purple-100 text-purple-600', sub: 'Outpatient' },
    { id: 'IP', label: 'IP Bills', value: ipBills, icon: TrendingUp, color: 'bg-amber-100 text-amber-600', sub: 'Inpatient' },
    { id: 'PAID', label: 'Paid', value: paidBills, icon: CheckCircle, color: 'bg-green-100 text-green-600', sub: 'Cleared bills' },
    { id: 'PENDING', label: 'Pending', value: unpaidBills, icon: Clock, color: 'bg-red-100 text-red-600', sub: 'Awaiting' },
    { id: 'NONE', label: 'Today Revenue', value: `₹${todaysRevenue.toLocaleString()}`, icon: IndianRupee, color: 'bg-emerald-100 text-emerald-600', sub: 'Collections today' },
    { id: 'NONE', label: 'Monthly Revenue', value: `₹${thisMonthRevenue.toLocaleString()}`, icon: IndianRupee, color: 'bg-emerald-100 text-emerald-600', sub: 'This month' },
  ];

  let currentItems = filteredBills;
  if (activeView === 'OP') currentItems = filteredBills.filter(b => b.Type === 'OP');
  else if (activeView === 'IP') currentItems = filteredBills.filter(b => b.Type === 'IP');
  else if (activeView === 'PAID') currentItems = filteredBills.filter(b => b.PaymentStatus === 'Paid');
  else if (activeView === 'PENDING') currentItems = filteredBills.filter(b => b.PaymentStatus !== 'Paid');

  const itemsPerPage = 5;
  const totalPages = Math.ceil(currentItems.length / itemsPerPage);
  const paginatedItems = currentItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Billing Dashboard</h1>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-3 shadow-sm">
          <DateFilter
            dateFrom={fromDate}
            dateTo={toDate}
            onDateFromChange={setFromDate}
            onDateToChange={setToDate}
            onSearch={() => {}}
            onReset={() => { setFromDate(''); setToDate(''); }}
          />
        </div>
      </div>

      {isFiltered && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-3 text-sm text-blue-800 font-medium">
          Showing results from <span className="font-bold">{fromDate}</span> to <span className="font-bold">{toDate || 'today'}</span> — {totalBills} bill(s) found
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        {stats.map((stat) => (
          <div 
            key={stat.label} 
            onClick={() => stat.id !== 'NONE' ? setActiveView(stat.id as any) : undefined}
            className={`bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm transition-all duration-200
              ${stat.id !== 'NONE' ? 'cursor-pointer hover:shadow-md hover:border-blue-300' : ''}
              ${activeView === stat.id && stat.id !== 'NONE' ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/30' : ''}`}
          >
            <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center mb-2`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{stat.label}</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">{stat.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-1">Revenue Trends</h3>
          <p className="text-xs text-slate-400 mb-4">OP vs IP Revenue (Last 6 Months)</p>
          <div className="h-72">
            <Chart options={areaOptions} series={areaSeries} type="area" height="100%" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-1">Bill Status</h3>
          <p className="text-xs text-slate-400 mb-4">Paid vs Unpaid Breakdown</p>
          <div className="h-72">
            <Chart options={donutOptions} series={donutSeries} type="donut" height="100%" />
          </div>
        </div>
      </div>

      {/* Detailed Drill-Down Table */}
      {activeView !== 'NONE' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                {activeView === 'TOTAL' ? 'Total Bills Details' :
                 activeView === 'OP' ? 'OP Bills Details' :
                 activeView === 'IP' ? 'IP Bills Details' :
                 activeView === 'PAID' ? 'Paid Bills Details' : 'Pending Bills Details'}
              </h3>
            </div>
            <button onClick={() => setActiveView('NONE')} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Bill ID</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Patient</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedItems.map(bill => {
                  const isIP = bill.Type === 'IP';
                  const isPaid = bill.PaymentStatus === 'Paid';
                  return (
                    <tr key={bill.BillNumber} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 text-slate-500">{new Date(bill.Date).toISOString().split('T')[0]}</td>
                      <td className="px-6 py-3 font-mono font-medium text-slate-900">{bill.BillNumber}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${isIP ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {bill.Type}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-700">{bill.PatientName}</td>
                      <td className="px-6 py-3 font-bold text-slate-800">₹{bill.NetAmount.toLocaleString()}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {bill.PaymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-500">{bill.PaymentMode}</td>
                    </tr>
                  );
                })}
                {currentItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No {activeView === 'IP' ? 'IP' : activeView === 'OP' ? 'OP' : activeView === 'PAID' ? 'Paid' : activeView === 'PENDING' ? 'Pending' : ''} bills found for the selected date range.
                    </td>
                  </tr>
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

      {/* Recent Bills Table */}
      {activeView === 'NONE' && (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">
            {isFiltered ? `Filtered Bills (${filteredBills.length})` : 'Recent Bills'}
          </h3>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Bill ID</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Patient</th>
              <th className="px-6 py-3">Amount</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Mode</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedItems.map(bill => {
              const isIP = bill.Type === 'IP';
              const isPaid = bill.PaymentStatus === 'Paid';
              return (
                <tr key={bill.BillNumber} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-slate-500">{new Date(bill.Date).toISOString().split('T')[0]}</td>
                  <td className="px-6 py-3 font-mono font-medium text-slate-900">{bill.BillNumber}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${isIP ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {bill.Type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-700">{bill.PatientName}</td>
                  <td className="px-6 py-3 font-bold text-slate-800">₹{bill.NetAmount.toLocaleString()}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {bill.PaymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-500">{bill.PaymentMode}</td>
                </tr>
              );
            })}
            {currentItems.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">No bills found for the selected date range.</td>
              </tr>
            )}
          </tbody>
        </table>
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
  );
};
