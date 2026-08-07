import { useState } from 'react';
import { useInvestigations, type QCLog } from '../../contexts/InvestigationContext';
import { Plus, Check, Beaker, FileSpreadsheet, X } from 'lucide-react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import toast from 'react-hot-toast';
import { DateFilter } from '../../components/ui/DateFilter';

export const LabQualityControl = () => {
  const { qcLogs, addQCLog } = useInvestigations();
  const [showAddForm, setShowAddForm] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  const filteredLogs = qcLogs.filter(log => {
    if (fromDate && new Date(log.date) < new Date(fromDate)) return false;
    if (toDate && new Date(log.date) > new Date(toDate + 'T23:59:59')) return false;
    return true;
  });

  const [formData, setFormData] = useState<Partial<QCLog>>({
    date: new Date().toISOString().split('T')[0],
    machineName: 'Sysmex XN-1000',
    testName: 'Hemoglobin',
    status: 'Pass'
  });

  const handleSave = () => {
    if (!formData.expectedValue || !formData.actualValue) {
      toast.error('Please fill all required fields');
      return;
    }
    
    const deviationVal = parseFloat(formData.actualValue) - parseFloat(formData.expectedValue);
    const deviationStr = deviationVal > 0 ? `+${deviationVal.toFixed(2)}` : deviationVal.toFixed(2);
    
    addQCLog({
      id: `QC-${Math.floor(1000 + Math.random() * 9000)}`,
      date: formData.date || new Date().toISOString().split('T')[0],
      machineName: formData.machineName || '',
      testName: formData.testName || '',
      expectedValue: formData.expectedValue,
      actualValue: formData.actualValue,
      deviation: deviationStr,
      status: Math.abs(deviationVal) > 1.0 ? 'Fail' : 'Pass', // Mock simple rule
      remarks: formData.remarks
    });
    
    toast.success('QC Log saved successfully');
    setShowAddForm(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      machineName: 'Sysmex XN-1000',
      testName: 'Hemoglobin',
      status: 'Pass'
    });
  };

  const chartOptions: ApexOptions = {
    chart: { type: 'line', toolbar: { show: false }, fontFamily: 'inherit' },
    colors: ['#3b82f6'],
    stroke: { curve: 'straight', width: 2 },
    markers: { size: 4 },
    xaxis: { categories: filteredLogs.slice().reverse().map(l => l.date) },
    yaxis: { title: { text: 'Deviation' } },
    annotations: {
      yaxis: [
        { y: 1, borderColor: '#ef4444', label: { text: '+1 SD', style: { color: '#fff', background: '#ef4444' } } },
        { y: -1, borderColor: '#ef4444', label: { text: '-1 SD', style: { color: '#fff', background: '#ef4444' } } }
      ]
    }
  };

  const chartSeries = [{
    name: 'Deviation',
    data: filteredLogs.slice().reverse().map(l => parseFloat(l.deviation))
  }];

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-800">Quality Control</h2>
        </div>
        <div className="flex items-center gap-4">
          <DateFilter 
            dateFrom={fromDate}
            dateTo={toDate}
            onDateFromChange={setFromDate}
            onDateToChange={setToDate}
            onSearch={() => {}}
            onReset={() => { setFromDate(''); setToDate(''); }}
          />
          <button 
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" /> Log QC Run
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Beaker className="w-5 h-5 text-blue-500"/> New QC Log</h3>
            <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500"/></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
              <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Machine</label>
              <input type="text" value={formData.machineName} onChange={e => setFormData({...formData, machineName: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Test Name</label>
              <input type="text" value={formData.testName} onChange={e => setFormData({...formData, testName: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Remarks</label>
              <input type="text" value={formData.remarks || ''} onChange={e => setFormData({...formData, remarks: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Expected Value</label>
              <input type="number" step="0.01" value={formData.expectedValue || ''} onChange={e => setFormData({...formData, expectedValue: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. 14.0" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Actual Value</label>
              <input type="number" step="0.01" value={formData.actualValue || ''} onChange={e => setFormData({...formData, actualValue: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. 14.2" />
            </div>
            <div className="md:col-span-2 flex items-end">
              <button onClick={handleSave} className="w-full px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                Save QC Data
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="font-bold text-slate-700 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-slate-500"/> QC History</h3>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-3">Date & ID</th>
                  <th className="px-4 py-3">Machine / Test</th>
                  <th className="px-4 py-3 text-right">Expected</th>
                  <th className="px-4 py-3 text-right">Actual</th>
                  <th className="px-4 py-3 text-center">Deviation</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{log.date}</div>
                      <div className="text-xs text-slate-500">{log.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{log.machineName}</div>
                      <div className="text-xs text-slate-500">{log.testName}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{log.expectedValue}</td>
                    <td className="px-4 py-3 text-right font-mono">{log.actualValue}</td>
                    <td className={`px-4 py-3 text-center font-bold font-mono ${parseFloat(log.deviation) > 1 || parseFloat(log.deviation) < -1 ? 'text-red-600' : 'text-slate-700'}`}>
                      {log.deviation}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold flex items-center justify-center gap-1 w-16 mx-auto ${log.status === 'Pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {log.status === 'Pass' ? <Check className="w-3 h-3"/> : <X className="w-3 h-3"/>} {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-4">Deviation Trend (L-J Chart)</h3>
          <p className="text-xs text-slate-500 mb-4">Tracking {filteredLogs[0]?.testName || 'test'} on {filteredLogs[0]?.machineName || 'machine'}</p>
          <div className="flex-1 min-h-[300px]">
             <Chart options={chartOptions} series={chartSeries} type="line" height="100%" />
          </div>
        </div>
      </div>
    </div>
  );
};
