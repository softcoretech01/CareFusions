
import { TrendingUp, TrendingDown, Users, Activity, Heart, Package, Shield, Settings, AlertTriangle, Crosshair } from 'lucide-react';

const KPICard = ({ title, value, subValue, trend, trendValue, icon: Icon }: any) => (
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

export const KPISection = ({ data }: { data: any }) => {
  const formatCurrency = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    return `₹${val.toLocaleString()}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {/* Financial KPIs */}
      <KPICard 
        title="Total Revenue (Today)" 
        value={formatCurrency(data.revenue.today)} 
        trend="up" 
        trendValue={data.revenue.growth}
        icon={TrendingUp} 
      />
      <KPICard 
        title="Monthly Revenue" 
        value={formatCurrency(data.revenue.thisMonth)} 
        trend="up" 
        trendValue={14.2}
        icon={Activity} 
      />
      <KPICard 
        title="Net Profit (MTD)" 
        value={formatCurrency(data.revenue.netProfit)} 
        trend="up" 
        trendValue={8.5}
        icon={Shield} 
      />
      
      {/* Clinical KPIs */}
      <KPICard 
        title="Total Patients (Today)" 
        value={data.clinical.opVisitsToday + data.clinical.admissionsToday + data.clinical.emergencyToday || 1606} 
        trend="up" 
        trendValue={4.1}
        icon={Users} 
      />
      <KPICard 
        title="Bed Occupancy" 
        value={`${data.clinical.icuOccupancy}%`}
        subValue="ICU" 
        trend="down" 
        trendValue={2.1}
        icon={Heart} 
      />
      
      {/* Operational KPIs */}
      <KPICard 
        title="Avg ER Wait Time" 
        value={`${data.clinical.emergencyResponseTime}m`} 
        trend="down" 
        trendValue={12}
        icon={AlertTriangle} 
      />
      <KPICard 
        title="OT Utilization" 
        value={`${data.operational.otUtilization}%`} 
        trend="up" 
        trendValue={5.4}
        icon={Crosshair} 
      />
      
      {/* Inventory KPIs */}
      <KPICard 
        title="Inventory Value" 
        value={formatCurrency(data.inventory.totalValue)} 
        trend="up" 
        trendValue={1.2}
        icon={Package} 
      />
      <KPICard 
        title="Procurement Spend" 
        value={formatCurrency(data.revenue.operatingExpenses * 0.4)} 
        trend="down" 
        trendValue={3.4}
        icon={Settings} 
      />
      <KPICard 
        title="Active Doctors" 
        value={data.hr.doctors} 
        subValue="On Duty"
        icon={Users} 
      />
    </div>
  );
};
