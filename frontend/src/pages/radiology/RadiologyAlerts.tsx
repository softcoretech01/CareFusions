import { useState } from 'react';
import { useInvestigations } from '../../contexts/InvestigationContext';
import { AlertTriangle, Check, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { DateFilter, monthStart, today } from '../../components/ui/DateFilter';

export const RadiologyAlerts = () => {
  const { orders, acknowledgeRadiologyAlert } = useInvestigations();

  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(today());

  // Extract critical alerts from all radiology orders
  const criticalAlerts = orders
    .filter(o => o.category === 'Radiology')
    .filter(order => {
      if (fromDate && new Date(order.orderedAt) < new Date(fromDate)) return false;
      if (toDate && new Date(order.orderedAt) > new Date(toDate + 'T23:59:59')) return false;
      return true;
    })
    .flatMap(order => 
      order.tests
        .filter(test => test.isCritical && !test.acknowledgedAt)
        .map(test => ({
          testId: test.id,
          orderId: order.id,
          patientName: order.patientName,
          testName: test.name,
          value: test.resultValue || 'Critical Finding Identified',
          time: test.verifiedAt || test.completedAt || new Date().toISOString()
        }))
    )
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const handleAcknowledge = async (testId: string) => {
    await acknowledgeRadiologyAlert(testId);
    toast.success('Alert acknowledged');
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Critical Findings</h2>
        </div>
        <div className="flex justify-end">
          <DateFilter 
            dateFrom={fromDate}
            dateTo={toDate}
            onDateFromChange={setFromDate}
            onDateToChange={setToDate}
            onSearch={() => {}}
            onReset={() => { setFromDate(monthStart()); setToDate(today()); }}
          />
        </div>
      </div>
      


      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${criticalAlerts.length > 0 ? 'bg-red-400' : 'bg-slate-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${criticalAlerts.length > 0 ? 'bg-red-500' : 'bg-slate-500'}`}></span>
            </span>
            <span className="font-bold text-slate-700">Active Alerts ({criticalAlerts.length})</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {criticalAlerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">No Critical Findings</h3>
              <p className="text-slate-500 text-sm">All critical radiology results have been acknowledged.</p>
            </div>
          ) : (
            criticalAlerts.map(alert => (
              <div key={alert.testId} className="flex flex-col sm:flex-row gap-4 p-5 rounded-2xl border border-red-200 bg-red-50/40 hover:bg-red-50/60 transition-colors">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">{alert.patientName}</h4>
                      <p className="text-sm font-medium text-slate-600 flex items-center gap-2">
                        <span className="bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded text-xs">Order: {alert.orderId}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(alert.time).toLocaleString()}</span>
                      </p>
                    </div>
                    <button 
                      onClick={() => handleAcknowledge(alert.testId)}
                      className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold text-sm rounded-xl transition-all flex items-center gap-2 shadow-sm"
                    >
                      <Check className="w-4 h-4 text-green-500" /> Acknowledge
                    </button>
                  </div>
                  
                  <div className="bg-white p-4 rounded-xl border border-red-100 mt-3 flex flex-wrap gap-6 items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Scan Type</p>
                      <p className="font-semibold text-slate-800">{alert.testName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Finding</p>
                      <p className="font-bold text-red-600 text-lg">{alert.value}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Required Action</p>
                      <p className="text-sm font-medium text-red-700">Notify referring physician immediately</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
