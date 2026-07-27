
import Chart from 'react-apexcharts';
import { Package, AlertTriangle, TrendingDown, ShoppingCart } from 'lucide-react';

export const InventoryProcurementAnalytics = ({ inventory }: { inventory: any }) => {
  const consumptionOptions = {
    chart: { type: 'bar', stacked: true, toolbar: { show: false } },
    colors: ['#3b82f6', '#8b5cf6', '#10b981'],
    dataLabels: { enabled: false },
    xaxis: { categories: inventory.consumptionTrend.map((t: any) => t.month) },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    legend: { position: 'top' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-800">Inventory & Procurement</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1">Low Stock Items</p>
            <h4 className="text-2xl font-bold text-slate-800">{inventory.lowStockItems}</h4>
          </div>
          <AlertTriangle className="w-6 h-6 text-amber-500 opacity-50" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between border-l-4 border-l-rose-500">
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1">Out of Stock</p>
            <h4 className="text-2xl font-bold text-slate-800">{inventory.outOfStockItems}</h4>
          </div>
          <Package className="w-6 h-6 text-rose-500 opacity-50" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1">Pending POs</p>
            <h4 className="text-2xl font-bold text-slate-800">{inventory.procurement.pendingPO}</h4>
          </div>
          <ShoppingCart className="w-6 h-6 text-blue-500 opacity-50" />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1">Stock Accuracy</p>
            <h4 className="text-2xl font-bold text-slate-800">{inventory.stockAccuracy}%</h4>
          </div>
          <TrendingDown className="w-6 h-6 text-emerald-500 opacity-50" />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <h4 className="font-bold text-slate-800 mb-6">Inventory Consumption Trend</h4>
        <div className="h-80 w-full">
          <Chart 
            options={consumptionOptions as any} 
            series={[
              { name: 'Medicines', data: inventory.consumptionTrend.map((t: any) => t.medicines) },
              { name: 'Surgicals', data: inventory.consumptionTrend.map((t: any) => t.surgical) },
              { name: 'Consumables', data: inventory.consumptionTrend.map((t: any) => t.consumables) }
            ]} 
            type="bar" 
            height="100%" 
          />
        </div>
      </div>
    </div>
  );
};
