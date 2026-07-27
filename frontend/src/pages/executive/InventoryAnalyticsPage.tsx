import { useState } from 'react';
import { DateFilter } from '../../components/ui/DateFilter';
import { useExecutiveData } from './hooks/useExecutiveData';
import { TrendingUp, TrendingDown, Package, AlertCircle, ShieldAlert, CheckCircle, Activity } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

const InventoryKPICard = ({ title, value, subValue, trend, trendValue, icon: Icon }: any) => (
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
        {subValue && <span className="text-sm font-medium text-slate-400">{subValue}</span>}
      </div>
    </div>
  </div>
);

const formatINR = (value: number) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
};

export const InventoryAnalyticsPage = () => {
  const data = useExecutiveData();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const inventory = data.inventory;

  const areaOptions: ApexOptions = {
    chart: { type: 'area', stacked: true, toolbar: { show: false }, fontFamily: 'Inter' },
    colors: ['#01684c', '#0ea5e9', '#f5a623'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.6, opacityTo: 0.1, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: inventory.consumptionTrend.map((t: any) => t.month), labels: { style: { colors: '#64748b' } } },
    yaxis: { labels: { formatter: (val) => `₹${(val / 100000).toFixed(0)}L`, style: { colors: '#64748b' } } },
    legend: { position: 'top' }
  };

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', fontFamily: 'Inter' },
    labels: ['Medicines', 'Surgicals', 'Consumables', 'Implants', 'Others'],
    colors: ['#01684c', '#0ea5e9', '#f5a623', '#8b5cf6', '#94a3b8'],
    dataLabels: { enabled: false },
    legend: { position: 'bottom' },
    stroke: { width: 0 }
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Inventory Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Track stock levels, consumption trends, and wastage across the hospital.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <InventoryKPICard title="Total Inventory Value" value={formatINR(inventory.totalValue)} trend="up" trendValue={1.2} icon={Package} />
        <InventoryKPICard title="Low Stock Items" value={inventory.lowStockItems} trend="up" trendValue={5.4} icon={AlertCircle} />
        <InventoryKPICard title="Out of Stock" value={inventory.outOfStockItems} trend="up" trendValue={2.1} icon={ShieldAlert} />
        <InventoryKPICard title="Stock Accuracy" value={`${inventory.stockAccuracy}%`} trend="up" trendValue={0.5} icon={CheckCircle} />
        <InventoryKPICard title="Expiry Loss (MTD)" value={formatINR(inventory.expiredStockValue)} trend="down" trendValue={18.4} icon={Activity} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Consumption Trend (Last 12 Months)</h3>
          <Chart 
            options={areaOptions} 
            series={[
              { name: 'Medicines', data: inventory.consumptionTrend.map((t: any) => t.medicines) },
              { name: 'Surgicals', data: inventory.consumptionTrend.map((t: any) => t.surgical) },
              { name: 'Consumables', data: inventory.consumptionTrend.map((t: any) => t.consumables) }
            ]} 
            type="area" 
            height={360} 
          />
        </div>
        
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Inventory Value Distribution</h3>
          <div className="flex-1 flex items-center justify-center">
            <Chart 
              options={donutOptions} 
              series={[45000000, 22000000, 8400000, 6500000, 3500000]} 
              type="donut" 
              height={320} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};
