import { useState } from 'react';
import { DateFilter } from '../../components/ui/DateFilter';
import { useExecutiveData } from './hooks/useExecutiveData';
import { TrendingUp, TrendingDown, DollarSign, Activity, FileText, PieChart, ShieldCheck, CreditCard } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

// Minimal KPI Card without background colors/gradients
const FinancialKPICard = ({ title, value, trend, trendValue, icon: Icon }: any) => (
  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-primary/50 transition-colors group">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2.5 rounded-lg bg-slate-50 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-sm font-semibold ${trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {trendValue}%
        </div>
      )}
    </div>
    
    <div>
      <h4 className="text-slate-500 text-sm font-medium mb-1">{title}</h4>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-800">{value}</span>
      </div>
    </div>
  </div>
);

const formatINR = (value: number) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
};

export const FinancialAnalyticsPage = () => {
  const data = useExecutiveData();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const revenue = data.revenue;

  const barOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter' },
    colors: ['#01684c', '#f5a623'],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
    dataLabels: { enabled: false },
    xaxis: { categories: data.revenue.expenses.map((e: any) => e.category) },
    legend: { position: 'top' },
    stroke: { width: 0 }
  };

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'Inter' },
    labels: data.revenue.byPaymentMode.map((m: any) => m.name),
    colors: ['#01684c', '#0ea5e9', '#f5a623', '#8b5cf6'],
    dataLabels: { enabled: false },
    legend: { position: 'bottom' },
    stroke: { width: 0 }
  };

  const lineOptions: ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, fontFamily: 'Inter' },
    colors: ['#01684c'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.2, opacityTo: 0.05, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], labels: { style: { colors: '#64748b' } } },
    yaxis: { labels: { formatter: (val) => `₹${(val / 100000).toFixed(0)}L`, style: { colors: '#64748b' } } }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <DateFilter
          dateFrom={fromDate}
          dateTo={toDate}
          onDateFromChange={setFromDate}
          onDateToChange={setToDate}
        />
      </div>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Financial Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Enterprise financial performance, P&L, and cash flow analysis.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            Export PDF
          </button>
          <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
            Generate Report
          </button>
        </div>
      </div>

      {/* 12 Executive KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <FinancialKPICard title="Revenue (Today)" value={formatINR(revenue.today)} trend="up" trendValue={12.4} icon={TrendingUp} />
        <FinancialKPICard title="Revenue (This Month)" value={formatINR(revenue.thisMonth)} trend="up" trendValue={14.2} icon={Activity} />
        <FinancialKPICard title="Gross Profit" value={formatINR(revenue.grossProfit)} trend="up" trendValue={8.5} icon={DollarSign} />
        <FinancialKPICard title="Net Profit (YTD)" value={formatINR(revenue.netProfit)} trend="up" trendValue={11.2} icon={PieChart} />
        <FinancialKPICard title="Operating Expenses" value={formatINR(revenue.operatingExpenses)} trend="down" trendValue={2.1} icon={Activity} />
        <FinancialKPICard title="Cash Flow" value={formatINR(revenue.cashFlow)} trend="up" trendValue={5.4} icon={DollarSign} />
        <FinancialKPICard title="Accounts Receivable" value={formatINR(revenue.accountsReceivable.total)} trend="down" trendValue={1.8} icon={FileText} />
        <FinancialKPICard title="Accounts Payable" value={formatINR(revenue.accountsPayable.total)} trend="up" trendValue={3.2} icon={FileText} />
        <FinancialKPICard title="Insurance Receivable" value={formatINR(revenue.insurancePending)} trend="up" trendValue={4.5} icon={ShieldCheck} />
        <FinancialKPICard title="Collection Efficiency" value="94.5%" trend="up" trendValue={2.1} icon={TrendingUp} />
        <FinancialKPICard title="EBITDA" value={formatINR(revenue.ebitda)} trend="up" trendValue={9.8} icon={Activity} />
        <FinancialKPICard title="Cash in Hand" value={formatINR(revenue.cashInHand)} trend="down" trendValue={1.2} icon={CreditCard} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Revenue Trend (YTD)</h3>
            <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary">
              <option>Monthly</option>
              <option>Quarterly</option>
            </select>
          </div>
          <Chart options={lineOptions} series={[{ name: 'Revenue', data: [12500000, 14200000, 13800000, 16500000, 18200000, 21500000] }]} type="area" height={320} />
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Revenue Distribution</h3>
          <Chart options={donutOptions} series={data.revenue.byPaymentMode.map((m: any) => m.value)} type="donut" height={320} />
        </div>
      </div>

      {/* P&L Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-800">Profit & Loss Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="py-4 px-6">Metric</th>
                <th className="py-4 px-6 text-right">Current Month</th>
                <th className="py-4 px-6 text-right">Previous Month</th>
                <th className="py-4 px-6 text-right">Year to Date (YTD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {revenue.pnlSummary.map((item: any, idx: number) => (
                <tr key={idx} className={`hover:bg-slate-50 transition-colors ${item.metric.includes('Profit') ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
                  <td className="py-4 px-6">{item.metric}</td>
                  <td className={`py-4 px-6 text-right ${item.current < 0 ? 'text-rose-600' : ''}`}>{formatINR(item.current)}</td>
                  <td className={`py-4 px-6 text-right ${item.previous < 0 ? 'text-rose-600' : ''}`}>{formatINR(item.previous)}</td>
                  <td className={`py-4 px-6 text-right ${item.ytd < 0 ? 'text-rose-600' : ''}`}>{formatINR(item.ytd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Analysis & Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Expense Analysis (Budget vs Actual)</h3>
          <Chart 
            options={barOptions} 
            series={[
              { name: 'Budget', data: revenue.expenses.map((e: any) => e.budget) },
              { name: 'Actual', data: revenue.expenses.map((e: any) => e.actual) }
            ]} 
            type="bar" 
            height={320} 
          />
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Accounts Receivable Aging</h3>
          <div className="space-y-4">
            {revenue.accountsReceivable.aging.map((age: any, idx: number) => {
              const percentage = (age.value / revenue.accountsReceivable.total) * 100;
              return (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-slate-700">{age.period}</span>
                    <span className="font-bold text-slate-800">{formatINR(age.value)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${idx === 0 ? 'bg-emerald-500' : idx === 1 ? 'bg-blue-500' : idx === 2 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
