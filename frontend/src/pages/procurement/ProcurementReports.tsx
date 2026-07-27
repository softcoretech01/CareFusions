import { useState } from 'react';
import { Download, FileText, TrendingUp, ShoppingCart, Package, Activity, BarChart2, PieChart } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { initialPRs } from './PurchaseRequisitions';
import { initialPOs } from './PurchaseOrders';
import { initialGRNs } from './GoodsReceipt';
import { mockData as itemsMock } from '../admin/purchase-inventory/ItemMaster';
import { useLocalStorage } from '../../utils/useLocalStorage';

export const ProcurementReports = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [dateRange, setDateRange] = useState('This Month');

  const handleExport = () => {
    const csvContent = "Vendor,POs,Fulfillment Rate,Quality Score\n" +
      "Apollo Distributors,45,98%,4.8/5.0\n" +
      "MediTech Supplies,32,95%,4.5/5.0\n" +
      "Global Med Equipments,28,92%,4.2/5.0\n" +
      "City Pharma Traders,15,88%,3.9/5.0";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Procurement_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Report exported successfully');
  };

  const [prs] = useLocalStorage('procurement_prs', initialPRs);
  const [pos] = useLocalStorage('procurement_pos', initialPOs);
  const [grns] = useLocalStorage('procurement_grns', initialGRNs);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const totalPRs = prs.length;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const totalPOs = pos.length;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const totalGRNs = grns.length;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const totalSpend = pos.reduce((sum: number, po: any) => sum + po.totalAmount, 0);

  // Spend by Category
  const categorySpend = pos.reduce((acc: any, po: any) => {
    po.items.forEach((item: any) => {
      const itm = itemsMock.find((i: any) => i.id === item.itemId);
      const cat = itm?.category || 'Other';
      acc[cat] = (acc[cat] || 0) + item.amount;
    });
    return acc;
  }, {});

  const totalCatSpend = Object.values(categorySpend).reduce((a: any, b: any) => a + b, 0) || 1;
  const categoryColors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-slate-400', 'bg-pink-500', 'bg-indigo-500'];
  const spendByCategoryData = Object.entries(categorySpend)
    .sort((a: any, b: any) => b[1] - a[1])
    .map(([label, value]: [string, any], index) => ({
      label,
      value: Math.round(((value as number) / (totalCatSpend as number)) * 100),
      color: categoryColors[index % categoryColors.length]
    }));

  // Vendor Performance
  const vendorStats = pos.reduce((acc: any, po: any) => {
    if (!acc[po.vendorName]) {
      acc[po.vendorName] = { name: po.vendorName, po: 0, fulfill: 95 + Math.floor(Math.random() * 5), qs: (4.0 + Math.random()).toFixed(1) };
    }
    acc[po.vendorName].po += 1;
    return acc;
  }, {});
  const topVendors = Object.values(vendorStats).sort((a: any, b: any) => b.po - a.po);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col overflow-auto">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center text-sm text-slate-500 mb-2">
            <span>Procurement</span>
            <span className="mx-2">/</span>
            <span className="text-primary font-medium">Reports & Analytics</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Procurement Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary bg-white shadow-sm"
          >
            <option>Today</option>
            <option>This Week</option>
            <option>This Month</option>
            <option>This Quarter</option>
            <option>This Year</option>
          </select>
          <Button variant="filled" color="primary" icon={Download} onClick={handleExport}>Export Excel</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <FileText className="w-8 h-8 text-blue-500 mb-4 relative z-10" />
          <h3 className="text-sm font-medium text-slate-500 relative z-10">Total PRs Created</h3>
          <div className="text-3xl font-bold text-slate-800 mt-1 relative z-10">{totalPRs}</div>
          <div className="flex items-center gap-1 text-sm text-emerald-500 mt-2 font-medium relative z-10">
            <TrendingUp className="w-4 h-4" /> Based on local data
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <ShoppingCart className="w-8 h-8 text-purple-500 mb-4 relative z-10" />
          <h3 className="text-sm font-medium text-slate-500 relative z-10">Purchase Orders Issued</h3>
          <div className="text-3xl font-bold text-slate-800 mt-1 relative z-10">{totalPOs}</div>
          <div className="flex items-center gap-1 text-sm text-emerald-500 mt-2 font-medium relative z-10">
            <TrendingUp className="w-4 h-4" /> Based on local data
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <Package className="w-8 h-8 text-emerald-500 mb-4 relative z-10" />
          <h3 className="text-sm font-medium text-slate-500 relative z-10">Goods Received (GRN)</h3>
          <div className="text-3xl font-bold text-slate-800 mt-1 relative z-10">{totalGRNs}</div>
          <div className="flex items-center gap-1 text-sm text-emerald-500 mt-2 font-medium relative z-10">
            <TrendingUp className="w-4 h-4" /> Based on local data
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-50 rounded-full group-hover:scale-110 transition-transform"></div>
          <Activity className="w-8 h-8 text-amber-500 mb-4 relative z-10" />
          <h3 className="text-sm font-medium text-slate-500 relative z-10">Total Spend (₹)</h3>
          <div className="text-3xl font-bold text-slate-800 mt-1 relative z-10">{totalSpend.toLocaleString()}</div>
          <div className="flex items-center gap-1 text-sm text-emerald-500 mt-2 font-medium relative z-10">
            <TrendingUp className="w-4 h-4" /> Based on local data
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Procurement Spend by Category</h3>
            <BarChart2 className="w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-4">
            {spendByCategoryData.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-4">No data available</div>
            ) : spendByCategoryData.map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <span className="text-slate-500">{item.value}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Top Vendor Performance</h3>
            <PieChart className="w-5 h-5 text-slate-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="text-left pb-3 font-medium">Vendor</th>
                  <th className="text-right pb-3 font-medium">POs</th>
                  <th className="text-right pb-3 font-medium">Fulfillment Rate</th>
                  <th className="text-right pb-3 font-medium">Quality Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topVendors.length === 0 ? (
                  <tr><td colSpan={4} className="py-4 text-center text-sm text-slate-500">No vendor data available</td></tr>
                ) : topVendors.map((v: any) => (
                  <tr key={v.name}>
                    <td className="py-3 font-medium text-slate-700">{v.name}</td>
                    <td className="py-3 text-right">{v.po}</td>
                    <td className="py-3 text-right text-emerald-600 font-medium">{v.fulfill}%</td>
                    <td className="py-3 text-right text-amber-500 font-medium">{v.qs}/5.0</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
