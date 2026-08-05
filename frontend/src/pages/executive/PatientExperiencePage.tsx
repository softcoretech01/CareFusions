import { useState } from 'react';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { DateFilter } from '../../components/ui/DateFilter';
import { TrendingUp, TrendingDown, Heart, Star, MessageSquare, AlertCircle } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import { NoDataNotice } from './components/NoDataNotice';

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

export const PatientExperiencePage = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const radialOptions: ApexOptions = {
    chart: { type: 'radialBar', fontFamily: 'Inter' },
    plotOptions: {
      radialBar: {
        hollow: { size: '70%' },
        dataLabels: {
          name: { offsetY: -10, color: '#64748b', fontSize: '14px', fontWeight: 500 },
          value: { color: '#1e293b', fontSize: '36px', fontWeight: 800, show: true }
        }
      }
    },
    colors: ['#01684c'],
    labels: ['NPS Score'],
  };

  const barOptions: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter' },
    colors: ['#01684c'],
    plotOptions: { bar: { borderRadius: 4, horizontal: true } },
    dataLabels: { enabled: false },
    xaxis: { categories: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Emergency'] }
  };

  const feedback = [
    { patient: 'P-10452', dept: 'Cardiology', text: 'Excellent care from Dr. Smith and the nursing staff.', sentiment: 'Positive' },
    { patient: 'P-10453', dept: 'Emergency', text: 'Wait time was too long, but treatment was good.', sentiment: 'Neutral' },
    { patient: 'P-10454', dept: 'Billing', text: 'Insurance claim process was very confusing and delayed.', sentiment: 'Negative' },
    { patient: 'P-10455', dept: 'Orthopedics', text: 'The facilities are world class. Highly recommended.', sentiment: 'Positive' },
  ];

  const { page, setPage, pageSize, total, paged } = usePagination(feedback);

  return (
    <div className="space-y-6">
      <NoDataNotice
        title="NPS, satisfaction ratings and patient feedback"
        needs="Patient Feedback"
        detail="No survey or feedback capture exists; the scores and testimonials shown here were written into the page."
      />
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
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Patient Experience</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor patient satisfaction, NPS, and feedback sentiment.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Net Promoter Score" value="78" trend="up" trendValue={4.2} icon={Heart} />
        <KPICard title="Average Rating" value="4.6" subValue="/ 5.0" trend="up" trendValue={1.1} icon={Star} />
        <KPICard title="Total Feedback" value="1,245" trend="up" trendValue={12.5} icon={MessageSquare} />
        <KPICard title="Complaints (MTD)" value="12" trend="down" trendValue={8.4} icon={AlertCircle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-center">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Overall Satisfaction</h3>
          <p className="text-sm text-slate-500 mb-4">Aggregate score across all departments.</p>
          <div className="flex-1 flex items-center justify-center -my-4">
            <Chart options={radialOptions} series={[78]} type="radialBar" height={320} />
          </div>
        </div>
        
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Department-wise Satisfaction (/5.0)</h3>
          <Chart options={barOptions} series={[{ name: 'Rating', data: [4.8, 4.6, 4.7, 4.9, 3.8] }]} type="bar" height={320} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-800">Recent Patient Feedback</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="py-4 px-6">Patient ID</th>
                <th className="py-4 px-6">Department</th>
                <th className="py-4 px-6 w-1/2">Feedback</th>
                <th className="py-4 px-6">Sentiment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 font-medium text-slate-800">{item.patient}</td>
                  <td className="py-4 px-6 text-slate-600">{item.dept}</td>
                  <td className="py-4 px-6 text-slate-600 italic">"{item.text}"</td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      item.sentiment === 'Positive' ? 'bg-emerald-100 text-emerald-700' :
                      item.sentiment === 'Neutral' ? 'bg-blue-100 text-blue-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {item.sentiment}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} />
      </div>
    </div>
  );
};
