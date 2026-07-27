import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportToExcel } from '../../utils/exportToExcel';
import { 
  Package, AlertTriangle, XOctagon, Clock,
  Download, PackageOpen, LayoutList, TrendingUp, TrendingDown
} from 'lucide-react';
import Chart from 'react-apexcharts';
import { useLocalStorage } from '../../utils/useLocalStorage';
import { initialStock, initialStockLedger } from './mockData';
import { DateFilter } from '../../components/ui/DateFilter';

export const InventoryDashboard = () => {
  const [stockRecords] = useLocalStorage('inventory_stock', initialStock);
  const [ledgerRecords] = useLocalStorage('inventory_stock_ledger', initialStockLedger);
  const [selectedStore, setSelectedStore] = useState('All Stores');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');

  const [activeKpiId, setActiveKpiId] = useState('totalItems');

  const handleSearch = () => {
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
  };

  const handleCancel = () => {
    setFromDate('');
    setToDate('');
    setAppliedFromDate('');
    setAppliedToDate('');
  };

  const filteredStock = useMemo(() => {
    if (selectedStore === 'All Stores') return stockRecords;
    return stockRecords.filter((s: any) => s.store === selectedStore);
  }, [stockRecords, selectedStore]);

  const stats = useMemo(() => {
    const totalItems = filteredStock;
    const criticalOuts = filteredStock.filter((s: any) => s.availableQty === 0);
    const lowStock = filteredStock.filter((s: any) => s.availableQty > 0 && s.availableQty <= 50);
    
    const today = new Date();
    const defaultDateStr = today.toISOString().split('T')[0];
    const startDate = appliedFromDate || defaultDateStr;
    const endDate = appliedToDate || defaultDateStr;

    const expiringSoon = filteredStock.filter((s: any) => {
      if (!s.expiry) return false;
      const expDate = new Date(s.expiry);
      const diffTime = expDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 30; // 30 days
    }).map((s: any) => {
      const expDate = new Date(s.expiry);
      const diffTime = expDate.getTime() - today.getTime();
      return { ...s, daysLeft: Math.ceil(diffTime / (1000 * 60 * 60 * 24)) };
    });

    const periodLedger = ledgerRecords.filter((r: any) => {
      if (!r.date) return false;
      if (selectedStore !== 'All Stores' && r.store !== selectedStore) return false;
      return r.date >= startDate && r.date <= endDate;
    });

    const periodInward = periodLedger.filter((r: any) => r.transactionType === 'IN');
    const periodOutward = periodLedger.filter((r: any) => r.transactionType === 'OUT');

    return { totalItems, criticalOuts, lowStock, expiringSoon, periodInward, periodOutward };
  }, [filteredStock, ledgerRecords, selectedStore, appliedFromDate, appliedToDate]);

  const kpis = [
    { id: 'totalItems', label: 'Total Items', value: stats.totalItems.length, data: stats.totalItems, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'todayInward', label: (appliedFromDate || appliedToDate) ? "Period Inward" : "Today's Inward", value: stats.periodInward.reduce((sum: number, r: any) => sum + r.qty, 0), data: stats.periodInward, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'todayOutward', label: (appliedFromDate || appliedToDate) ? "Period Outward" : "Today's Outward", value: stats.periodOutward.reduce((sum: number, r: any) => sum + Math.abs(r.qty), 0), data: stats.periodOutward, icon: TrendingDown, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'lowStock', label: 'Low Stock Items', value: stats.lowStock.length, data: stats.lowStock, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'criticalOuts', label: 'Critical Stock-Outs', value: stats.criticalOuts.length, data: stats.criticalOuts, icon: XOctagon, color: 'text-red-600', bg: 'bg-red-50' },
    { id: 'expiringSoon', label: 'Expiring Items', value: stats.expiringSoon.length, data: stats.expiringSoon, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const activeKpi = kpis.find(k => k.id === activeKpiId) || kpis[0];

  const trendChartData = useMemo(() => {
    const dates = [];
    const stockIn = [];
    const stockOut = [];
    
    // If date filter is applied, use that range, else default to current week (Monday to Sunday)
    let startD = new Date();
    const day = startD.getDay();
    const diffToMonday = startD.getDate() - day + (day === 0 ? -6 : 1);
    startD.setDate(diffToMonday);
    
    let endD = new Date(startD);
    endD.setDate(startD.getDate() + 6);

    if (appliedFromDate && appliedToDate) {
      startD = new Date(appliedFromDate);
      endD = new Date(appliedToDate);
    }

    // Generate date array
    const dateArray = [];
    let curr = new Date(startD);
    while (curr <= endD && dateArray.length < 60) { // Limit to 60 days max for UI
      dateArray.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }

    for (const d of dateArray) {
      const dateStr = d.toISOString().split('T')[0];
      dates.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      
      const dayRecords = ledgerRecords.filter((r: any) => r.date && r.date.startsWith(dateStr));
      let inQty = dayRecords.filter((r: any) => r.transactionType === 'IN').reduce((sum: number, r: any) => sum + (r.qty || 0), 0);
      let outQty = dayRecords.filter((r: any) => r.transactionType === 'OUT').reduce((sum: number, r: any) => sum + Math.abs(r.qty || 0), 0);
      
      if (inQty === 0 && outQty === 0 && !appliedFromDate && !appliedToDate) {
        // mock randoms only for default view
        inQty = Math.floor(Math.random() * 80) + 10;
        outQty = Math.floor(Math.random() * 60) + 5;
      }
      
      stockIn.push(inQty);
      stockOut.push(outQty);
    }

    return {
      series: [
        { name: 'Stock In', data: stockIn },
        { name: 'Stock Out', data: stockOut }
      ],
      options: {
        chart: { type: 'area', toolbar: { show: false } },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        xaxis: { categories: dates, labels: { style: { colors: '#64748b' } } },
        yaxis: { show: false },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        colors: ['#3b82f6', '#10b981'], 
        legend: { position: 'top', horizontalAlign: 'center' },
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 90, 100] } }
      }
    };
  }, [ledgerRecords]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col gap-6">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <div className="flex items-center text-sm text-slate-500 mb-2">
            <span>Inventory</span>
            <span className="mx-2">/</span>
            <span className="text-primary font-medium">Dashboard</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Inventory Dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-0">
          <DateFilter
            dateFrom={fromDate}
            dateTo={toDate}
            onDateFromChange={setFromDate}
            onDateToChange={setToDate}
            onSearch={handleSearch}
            onReset={handleCancel}
          />
          <select 
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm outline-none focus:border-primary"
          >
            <option value="All Stores">All Stores</option>
            <option value="Central Medical Store">Central Medical Store</option>
            <option value="Pharmacy Store">Pharmacy Store</option>
            <option value="General Store">General Store</option>
          </select>
          <button onClick={() => exportToExcel(kpis, 'Inventory_Dashboard')} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium shadow-sm hover:bg-primary/90 flex items-center gap-2">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 shrink-0">
        {kpis.map((kpi, i) => (
          <div 
            key={i} 
            onClick={() => setActiveKpiId(kpi.id)}
            className={`bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-3 cursor-pointer transition-all ${
              activeKpiId === kpi.id ? 'border-primary ring-2 ring-primary/20 shadow-md' : 'border-slate-100 hover:border-slate-300'
            }`}
          >
            <div className={`w-10 h-10 ${kpi.bg} ${kpi.color} rounded-xl flex items-center justify-center shrink-0`}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 truncate" title={kpi.label}>{kpi.label}</p>
              <h3 className="text-xl font-black text-slate-800">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[500px] mb-6">
        
        {/* Trend Chart */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 text-lg">
              {(appliedFromDate && appliedToDate) ? 'Movement Trend' : 'Current Week Trend'}
            </h3>
          </div>
          <div className="flex-1 w-full min-h-[300px]">
            {/* @ts-ignore */}
            <Chart options={trendChartData.options as any} series={trendChartData.series} type="area" height="100%" />
          </div>
        </div>

        {/* Selected KPI List */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <LayoutList className="w-5 h-5 text-primary" /> {activeKpi.label}
            </h3>
            <span className="px-3 py-1 bg-white text-slate-600 rounded-full text-xs font-bold border border-slate-200">{activeKpi.data.length} Records</span>
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar relative">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 font-bold uppercase tracking-wider bg-white sticky top-0 shadow-sm z-10">
                <tr>
                  {(activeKpi.id === 'todayInward' || activeKpi.id === 'todayOutward') ? (
                    <>
                      <th className="py-4 px-6">Transaction ID</th>
                      <th className="py-4 px-6">Item Name</th>
                      <th className="py-4 px-6">Store</th>
                      <th className="py-4 px-6 text-right">Qty {activeKpi.id === 'todayInward' ? 'In' : 'Out'}</th>
                    </>
                  ) : (
                    <>
                      <th className="py-4 px-6">Item Name</th>
                      <th className="py-4 px-6">Category</th>
                      <th className="py-4 px-6">Store</th>
                      <th className="py-4 px-6 text-right">Qty</th>
                      {activeKpi.id === 'expiringSoon' && <th className="py-4 px-6 text-right">Days Left</th>}
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence mode="popLayout">
                  {activeKpi.data.length > 0 ? activeKpi.data.map((item: any, i: number) => (
                    <motion.tr 
                      key={item.id || item.itemCode || i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15, delay: i * 0.02 }}
                      className="hover:bg-slate-50"
                    >
                      {(activeKpi.id === 'todayInward' || activeKpi.id === 'todayOutward') ? (
                        <>
                          <td className="py-4 px-6 font-bold text-slate-800">
                            {item.id}
                            <span className="block text-[10px] font-bold tracking-wider text-slate-400 mt-0.5">{item.referenceNo}</span>
                          </td>
                          <td className="py-4 px-6 text-slate-600 font-medium">{item.itemName}</td>
                          <td className="py-4 px-6 text-slate-600">{item.store}</td>
                          <td className={`py-4 px-6 text-right font-bold text-lg ${activeKpi.id === 'todayInward' ? 'text-emerald-600' : 'text-purple-600'}`}>
                            {Math.abs(item.qty)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-4 px-6 font-bold text-slate-800">
                            {item.itemName} 
                            <span className="block text-[10px] font-bold tracking-wider text-slate-400 mt-0.5">{item.itemCode}</span>
                          </td>
                          <td className="py-4 px-6 text-slate-600">{item.category}</td>
                          <td className="py-4 px-6 text-slate-600">{item.store}</td>
                          <td className={`py-4 px-6 text-right font-bold text-lg ${item.availableQty === 0 ? 'text-red-600' : 'text-emerald-600'}`}>{item.availableQty}</td>
                          {activeKpi.id === 'expiringSoon' && (
                            <td className="py-4 px-6 text-right font-bold text-amber-600">{item.daysLeft} d</td>
                          )}
                        </>
                      )}
                    </motion.tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-slate-400">
                        <PackageOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="font-medium">No records match this criteria.</p>
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </motion.div>
  );
};
