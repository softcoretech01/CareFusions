
import { Bot, TrendingUp, AlertTriangle, Lightbulb, Activity, ArrowRight } from 'lucide-react';

export const AIInsights = ({ alerts }: { alerts: any[] }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* AI Summary Panel */}
      <div className="lg:col-span-2 bg-gradient-to-br from-indigo-900 to-indigo-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500 opacity-20 rounded-full translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Executive AI Summary</h3>
              <p className="text-indigo-200 text-sm">Generated just now</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed text-indigo-50"><strong className="text-white">Revenue increased by 14%</strong> compared to last month, primarily driven by a surge in Cardiology procedures.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex items-start gap-3">
              <Activity className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed text-indigo-50"><strong className="text-white">Lab Turnaround Time decreased by 12%</strong> following the new equipment installation in Pathology.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed text-indigo-50"><strong className="text-white">Pharmacy expiry loss up by 4%</strong>. Immediate action recommended for near-expiry cardiac medicines.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed text-indigo-50"><strong className="text-white">Purchase costs reduced</strong> due to better vendor pricing negotiated with Apollo Distributors.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Risk & Predictive Monitoring */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            Critical Monitoring
          </h3>
          <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            View All <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="p-2 flex-1 overflow-y-auto">
          {alerts.map((alert: any) => (
            <div key={alert.id} className="p-3 mb-2 rounded-xl flex items-start gap-3 hover:bg-slate-50 transition-colors">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                alert.type === 'critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' :
                alert.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
              }`}></div>
              <p className="text-sm text-slate-700">{alert.message}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
