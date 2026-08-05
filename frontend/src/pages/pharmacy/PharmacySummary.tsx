import { useState, useEffect } from 'react';
import { Pill, Receipt, LayoutDashboard, FileText, AlertOctagon, TrendingUp } from 'lucide-react';
import { usePharmacyBilling } from '../../contexts/PharmacyBillingContext';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { DateFilter } from '../../components/ui/DateFilter';

export const PharmacySummary = () => {
  const { medicines, bills, checkLowStock, refresh } = usePharmacyBilling();

  // Pull the latest sales/stock every time the dashboard is opened, so paying
  // a bill or making a sale on another screen is reflected here immediately.
  useEffect(() => { refresh(); }, [refresh]);
  const [activeTab, setActiveTab] = useState<'bills' | 'lowStock' | 'outOfStock'>('bills');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filteredBills = bills.filter(b => {
    const bDate = new Date(b.date);
    const startDate = fromDate ? new Date(fromDate) : null;
    const endDate = toDate ? new Date(toDate) : null;
    const matchesFrom = !startDate || bDate >= startDate;
    const matchesTo = !endDate || bDate <= endDate;
    return matchesFrom && matchesTo;
  });

  const lowStockItems = checkLowStock();
  const outOfStockItems = medicines.filter(m => m.quantity === 0);

  const outOfStockCount = outOfStockItems.length;
  const lowStockCount = lowStockItems.length;
  const totalBillsCount = filteredBills.length;
  
  const today = new Date().toDateString();
  const todaysBills = bills.filter(b => new Date(b.date).toDateString() === today && b.paymentStatus === 'Paid');
  const todaysRevenue = todaysBills.reduce((acc, b) => acc + b.netAmount, 0);
  
  const now = new Date();
  const thisMonthBills = bills.filter(b => {
    const d = new Date(b.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && b.paymentStatus === 'Paid';
  });
  const thisMonthRevenue = thisMonthBills.reduce((acc, b) => acc + b.netAmount, 0);

  // Revenue Trend Logic
  const todayDate = new Date();
  const trendDates = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - (6 - index));
    return d;
  });

  const trendLabels = trendDates.map(date => date.toLocaleDateString('en-US', { weekday: 'short' }));
  const trendData = trendDates.map(date => {
    const dateStr = date.toDateString();
    return filteredBills
      .filter(b => new Date(b.date).toDateString() === dateStr && b.paymentStatus === 'Paid')
      .reduce((sum, b) => sum + b.netAmount, 0);
  });

  const trendSeries = [{ name: 'Revenue (₹)', data: trendData }];
  const trendOptions: ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'Inter' },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    xaxis: { categories: trendLabels, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (val) => `₹${val.toFixed(0)}` } },
    colors: ['#10b981'],
    tooltip: { theme: 'light' }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Overview Dashboard</h2>
          <p className="text-slate-500 text-xs">Summary of pharmacy stock and billing revenue</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-2 shadow-sm">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div 
          onClick={() => setActiveTab('bills')}
          className={`p-4 rounded-2xl shadow-sm border flex flex-col justify-center cursor-pointer transition-colors ${
            activeTab === 'bills' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'bg-white border-slate-100 hover:border-primary/30'
          }`}
        >
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-medium text-slate-600">Total Bills</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalBillsCount}</p>
          <p className="text-sm text-slate-500 mt-1">{fromDate || toDate ? 'In selected range' : 'Lifetime generated'}</p>
        </div>

        <div 
          onClick={() => setActiveTab('lowStock')}
          className={`p-4 rounded-2xl shadow-sm border flex flex-col justify-center cursor-pointer transition-colors ${
            activeTab === 'lowStock' ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/50' : 'bg-white border-amber-200 bg-amber-50/30 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <Pill className="w-5 h-5" />
            </div>
            <h3 className="font-medium text-slate-800">Low Stock Alerts</h3>
          </div>
          <p className="text-2xl font-bold text-amber-700">{lowStockCount}</p>
          <p className="text-sm text-amber-600 mt-1">Items need restocking</p>
        </div>

        <div 
          onClick={() => setActiveTab('outOfStock')}
          className={`p-4 rounded-2xl shadow-sm border flex flex-col justify-center cursor-pointer transition-colors ${
            activeTab === 'outOfStock' ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/50' : 'bg-white border-red-200 bg-red-50/30 hover:border-red-400'
          }`}
        >
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2 bg-red-100 text-red-700 rounded-lg">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <h3 className="font-medium text-slate-800">Out of Stock</h3>
          </div>
          <p className="text-2xl font-bold text-red-700">{outOfStockCount}</p>
          <p className="text-sm text-red-600 mt-1">Zero inventory</p>
        </div>
        
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="font-medium text-slate-600">Today's Revenue</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">₹{todaysRevenue.toFixed(2)}</p>
          <p className="text-sm text-slate-500 mt-1">From {todaysBills.length} bills</p>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <h3 className="font-medium text-slate-600">Monthly Revenue</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800">₹{thisMonthRevenue.toFixed(2)}</p>
          <p className="text-sm text-slate-500 mt-1">From {thisMonthBills.length} bills</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-800">
              {activeTab === 'bills' && 'Recent Bills'}
              {activeTab === 'lowStock' && 'Low Stock Medicines'}
              {activeTab === 'outOfStock' && 'Out of Stock Medicines'}
            </h3>
          </div>
          {activeTab === 'bills' ? (
            <div className="flex-1 overflow-x-auto p-4 pt-0">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-l-lg">Bill ID</th>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 font-medium text-center rounded-r-lg">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBills.slice(0, 5).map(bill => (
                    <tr key={bill.billId}>
                      <td className="px-4 py-2.5 font-medium text-primary">{bill.billId}</td>
                      <td className="px-4 py-2.5 text-slate-800">{bill.patientName}</td>
                      <td className="px-4 py-2.5 text-slate-600">{new Date(bill.date).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-800">₹{bill.netAmount.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${
                          bill.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          : bill.paymentStatus === 'Refunded' ? 'bg-red-50 text-red-600 border-red-200'
                          : 'bg-amber-50 text-amber-600 border-amber-200'
                        }`}>
                          {bill.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredBills.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No bills found for this date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto p-4 pt-0">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-l-lg">Medicine Name</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium text-right rounded-r-lg">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(activeTab === 'lowStock' ? lowStockItems : outOfStockItems).map(med => (
                    <tr key={med.id}>
                      <td className="px-4 py-3 font-medium text-slate-800">{med.name}</td>
                      <td className="px-4 py-3 text-slate-600">{med.category}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          med.quantity === 0 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
                        }`}>
                          {med.quantity}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(activeTab === 'lowStock' ? lowStockItems : outOfStockItems).length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                        No medicines found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col p-6">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
          <h3 className="text-lg font-bold text-slate-800">Revenue Trend</h3>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold">
            <TrendingUp className="w-3.5 h-3.5" /> Last 7 Days
          </div>
        </div>
        <div className="flex-1 min-h-[240px]">
          <Chart options={trendOptions} series={trendSeries} type="area" height="100%" />
        </div>
      </div>
      </div>
    </div>
  );
};
