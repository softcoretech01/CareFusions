import { useState } from 'react';
import { DateFilter } from '../../components/ui/DateFilter';
import { useExecutiveData } from './hooks/useExecutiveData';
import { ShieldCheck, FileText, Bug, CheckCircle } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

const QualityKPICard = ({ title, value, subValue, icon: Icon, alert }: any) => (
  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-primary/50 transition-colors group">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2.5 rounded-lg bg-slate-50 text-slate-500 group-hover:bg-primary/10 ${alert ? 'group-hover:text-rose-600' : 'group-hover:text-primary'} transition-colors`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <div>
      <h4 className="text-slate-500 text-sm font-medium mb-1">{title}</h4>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${alert ? 'text-rose-600' : 'text-slate-800'}`}>{value}</span>
        {subValue && <span className="text-sm font-medium text-slate-400">{subValue}</span>}
      </div>
    </div>
  </div>
);

export const QualityCompliancePage = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const data = useExecutiveData();
  const quality = data.hr.quality;

  const radarOptions: ApexOptions = {
    chart: { type: 'radar', toolbar: { show: false }, fontFamily: 'Inter' },
    colors: ['#01684c'],
    labels: ['Patient Safety', 'Hygiene & Infection', 'Clinical Documentation', 'Medication Safety', 'Facility Management', 'Staff Training'],
    stroke: { width: 2 },
    fill: { opacity: 0.2 },
    markers: { size: 4 },
    yaxis: { show: false, min: 0, max: 100 }
  };

  const incidents = [
    { id: 'INC-2024-081', date: '2024-03-12', type: 'Medication Error', dept: 'ICU', severity: 'High', status: 'Under Investigation' },
    { id: 'INC-2024-082', date: '2024-03-14', type: 'Patient Fall', dept: 'Orthopedics', severity: 'Medium', status: 'Resolved' },
    { id: 'INC-2024-083', date: '2024-03-15', type: 'Equipment Failure', dept: 'Radiology', severity: 'High', status: 'Resolved' },
  ];

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
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Quality & Compliance</h1>
          <p className="text-sm text-slate-500 mt-1">Track accreditations, audits, and clinical incident reports.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <QualityKPICard title="NABH Compliance" value={`${quality.nabhCompliance}%`} icon={ShieldCheck} />
        <QualityKPICard title="JCI Compliance" value={`${quality.jciCompliance}%`} icon={ShieldCheck} />
        <QualityKPICard title="Open Audit Findings" value={quality.openAuditFindings} alert icon={FileText} />
        <QualityKPICard title="Infection Rate" value={`${quality.infectionRate}%`} alert icon={Bug} />
        <QualityKPICard title="Corrective Actions" value={quality.correctiveActions} icon={CheckCircle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Compliance Radar</h3>
          <Chart options={radarOptions} series={[{ name: 'Score', data: [94, 98, 85, 92, 95, 88] }]} type="radar" height={360} />
        </div>
        
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">Critical Incidents Log</h3>
            <button className="text-sm font-semibold text-primary">View All &rarr;</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-4 px-6">Incident ID</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Type</th>
                  <th className="py-4 px-6">Department</th>
                  <th className="py-4 px-6">Severity</th>
                  <th className="py-4 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incidents.map((inc, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 font-medium text-slate-800">{inc.id}</td>
                    <td className="py-4 px-6 text-slate-600">{inc.date}</td>
                    <td className="py-4 px-6 text-slate-600">{inc.type}</td>
                    <td className="py-4 px-6 text-slate-600">{inc.dept}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${inc.severity === 'High' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-xs font-medium ${inc.status === 'Resolved' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {inc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
