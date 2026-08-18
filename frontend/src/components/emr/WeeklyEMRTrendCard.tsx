import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { TrendingUp, Users, Activity } from 'lucide-react';
import type { EMRRecord } from './EMRPrintTemplate';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface WeeklyEMRTrendCardProps {
  records: EMRRecord[];
}

export const WeeklyEMRTrendCard = ({ records }: WeeklyEMRTrendCardProps) => {
  // Calculate current week's dates (Monday to Sunday)
  const { opData, ipData, totals } = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + distanceToMonday + i);
      return d;
    });

    const getFormattedDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const op = dates.map(date => {
      const dateStr = getFormattedDate(date);
      return records.filter(r => r.visitType !== 'IP' && r.visitType !== 'Emergency' && (r.visitDateValue?.startsWith(dateStr) || r.visitDateValue === dateStr || (r.visitDate && r.visitDate.includes(dateStr)))).length;
    });

    const ip = dates.map(date => {
      const dateStr = getFormattedDate(date);
      return records.filter(r => r.visitType === 'IP' && (r.visitDateValue?.startsWith(dateStr) || r.visitDateValue === dateStr || (r.visitDate && r.visitDate.includes(dateStr)))).length;
    });

    const dayTotals = dates.map((_, i) => op[i] + ip[i]);

    return { opData: op, ipData: ip, totals: dayTotals };
  }, [records]);

  // Analytics Calculations
  const getHighestDay = (data: number[]) => {
    const max = Math.max(...data);
    if (max === 0) return 'None';
    return SHORT_DAYS[data.indexOf(max)];
  };

  const getLowestVolumeDay = () => {
    // Only consider days up to today to avoid saying "Sunday" has 0 visits if it hasn't happened yet
    const todayIndex = (new Date().getDay() + 6) % 7; 
    let min = Infinity;
    let minIndex = 0;
    
    for (let i = 0; i <= todayIndex; i++) {
      if (totals[i] < min) {
        min = totals[i];
        minIndex = i;
      }
    }
    return min === Infinity || min === 0 ? 'None' : SHORT_DAYS[minIndex];
  };

  const highestOP = getHighestDay(opData);
  const highestIP = getHighestDay(ipData);
  const lowestVol = getLowestVolumeDay();
  
  const totalWeekPatients = totals.reduce((a, b) => a + b, 0);
  const averagePatients = Math.round(totalWeekPatients / 7);
  const mockGrowth = 14.2; // Keep mock percentage

  // Chart Configuration
  const options: ApexOptions = {
    chart: {
      type: 'bar',
      fontFamily: 'Inter, sans-serif',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '60%',
        borderRadius: 4,
        dataLabels: { position: 'top' },
      },
    },
    dataLabels: {
      enabled: true,
      offsetY: -20,
      style: {
        fontSize: '11px',
        colors: ['#64748b'],
        fontWeight: 600,
      },
      formatter: (val) => val === 0 ? '' : val.toString()
    },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: {
      categories: DAYS,
      labels: {
        style: { colors: '#64748b', fontSize: '12px', fontWeight: 500 }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      title: { text: 'Number of Patients', style: { color: '#64748b', fontWeight: 500 } },
      labels: { style: { colors: '#64748b' } }
    },
    fill: { opacity: 1 },
    colors: ['#3b82f6', '#8b5cf6'], // OP (Blue), IP (Purple)
    grid: {
      borderColor: '#f1f5f9',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    legend: { show: false }, // We use a custom legend
    tooltip: {
      custom: function ({ series, dataPointIndex, w }) {
        const day = w.globals.labels[dataPointIndex];
        const op = series[0][dataPointIndex];
        const ip = series[1][dataPointIndex];
        const total = op + ip;

        return `
          <div class="px-4 py-3 bg-white shadow-xl rounded-xl border border-slate-100 min-w-[200px]">
            <h4 class="font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100">${day}</h4>
            <div class="space-y-2 mb-3">
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2 text-slate-600">
                  <div class="w-3 h-3 rounded-full bg-blue-500"></div> OP Visits
                </div>
                <span class="font-bold text-slate-800">${op}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2 text-slate-600">
                  <div class="w-3 h-3 rounded-full bg-purple-500"></div> IP Admissions
                </div>
                <span class="font-bold text-slate-800">${ip}</span>
              </div>
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-slate-100">
              <span class="text-sm font-bold text-slate-700">Total Patients</span>
              <span class="font-bold text-lg text-primary">${total}</span>
            </div>
          </div>
        `;
      }
    }
  };

  const series = [
    { name: 'OP Visits', data: opData },
    { name: 'IP Admissions', data: ipData }
  ];

  return (
    <div className="bg-white rounded-[16px] shadow-sm border border-slate-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-6 border-b border-slate-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Weekly EMR Activity Trend</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Legend */}
          <div className="hidden xl:flex items-center gap-4 mr-4 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100/50">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> OP Visits
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div> IP Admissions
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-6 pb-2 relative z-0">
        <Chart options={options} series={series} type="bar" height={380} />
      </div>

      {/* Analytics Footer */}
      <div className="bg-blue-50/30 border-t border-slate-100 p-6">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Weekly Insights
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">Highest OP Day</p>
            <p className="font-extrabold text-lg text-slate-800">{highestOP}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">Highest IP Day</p>
            <p className="font-extrabold text-lg text-slate-800">{highestIP}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">Lowest Volume</p>
            <p className="font-extrabold text-lg text-slate-800">{lowestVol}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">Weekly Growth</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="bg-emerald-100 p-1 rounded-md">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="font-extrabold text-lg text-emerald-600">+{mockGrowth}%</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">Avg. Patients/Day</p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="bg-blue-100 p-1 rounded-md">
                <Users className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <p className="font-extrabold text-lg text-slate-800">{averagePatients}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
