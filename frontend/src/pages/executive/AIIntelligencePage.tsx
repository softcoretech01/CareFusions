import { useState } from 'react';
import { DateFilter } from '../../components/ui/DateFilter';
import { Bot, Sparkles, TrendingUp, AlertTriangle, ArrowRight, Activity } from 'lucide-react';
import { NoDataNotice } from './components/NoDataNotice';

export const AIIntelligencePage = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  return (
    <div className="space-y-6 max-w-6xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <NoDataNotice
        title="Conversational analytics"
        needs="AI Analytics Service"
        detail="The chat transcript is a fixed script — the input box and suggested queries have no handlers."
      />
      <div className="flex justify-end">
        <DateFilter
          dateFrom={fromDate}
          dateTo={toDate}
          onDateFromChange={setFromDate}
          onDateToChange={setToDate}
        />
      </div>
      <div className="flex justify-between items-end mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" /> CF-AI Executive Intelligence
          </h1>
          <p className="text-sm text-slate-500 mt-1">Natural language insights and automated anomaly detection.</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        
        {/* Suggested Queries */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide shrink-0">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600 hover:border-primary hover:text-primary transition-colors whitespace-nowrap">
            <TrendingUp className="w-4 h-4" /> Why did revenue drop in Cardiology?
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600 hover:border-primary hover:text-primary transition-colors whitespace-nowrap">
            <AlertTriangle className="w-4 h-4" /> Show ICU bottlenecks this week
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600 hover:border-primary hover:text-primary transition-colors whitespace-nowrap">
            <Activity className="w-4 h-4" /> Predict inventory shortages for next month
          </button>
        </div>

        {/* AI Insight Panel */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-y-auto p-6 lg:p-8 space-y-8 relative custom-scrollbar">
          
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-slate-600">CEO</span>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none p-4 text-slate-700 text-sm">
              Generate a comprehensive summary of our clinical and financial performance over the last 7 days. Identify any critical bottlenecks.
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-5 flex-1">
              <div className="bg-white border border-primary/20 shadow-sm rounded-2xl rounded-tl-none p-6 text-sm text-slate-700">
                <div className="flex items-center gap-2 mb-4 text-primary font-bold">
                  <Sparkles className="w-4 h-4" /> Executive Summary Generated
                </div>
                
                <p className="mb-4 leading-relaxed">
                  Over the past 7 days, overall hospital performance has been strong with a <strong>14.2% increase in revenue</strong> compared to the previous week, driven primarily by elective surgeries in Orthopedics. However, operational bottlenecks are beginning to form in critical care units.
                </p>

                <h5 className="font-bold text-slate-800 mt-6 mb-2">Financial Highlights</h5>
                <ul className="list-disc pl-5 space-y-1 mb-4 text-slate-600">
                  <li>Total Revenue reached ₹8.54 Cr (12% above target).</li>
                  <li>Collection efficiency dropped slightly to 92% due to delayed corporate insurance payouts.</li>
                  <li>Pharmacy procurement savings hit ₹1.25 L by optimizing vendor contracts.</li>
                </ul>

                <h5 className="font-bold text-slate-800 mt-6 mb-2">Clinical Bottlenecks (Action Required)</h5>
                <ul className="list-disc pl-5 space-y-1 mb-4 text-rose-600 font-medium">
                  <li>ICU occupancy sustained at 94% for 3 consecutive days. Wait times for step-down beds have increased to 4 hours.</li>
                  <li>ER wait times averaged 22 minutes on weekend nights, exceeding the 15-minute SLA.</li>
                </ul>

                <div className="bg-slate-50 p-4 rounded-lg mt-6 border border-slate-100">
                  <h6 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><ArrowRight className="w-4 h-4" /> AI Recommendations</h6>
                  <p className="text-slate-600 mb-2">1. Expedite discharges in the General Ward to free up step-down beds for ICU step-downs.</p>
                  <p className="text-slate-600">2. Roster 2 additional triage nurses in the ER during weekend night shifts to manage volume spikes.</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Input Area */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-2 shrink-0">
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              placeholder="Ask CF-AI to analyze metrics, generate reports, or find anomalies..." 
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-4 py-2 text-slate-700 placeholder-slate-400 outline-none"
            />
            <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Analyze
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
