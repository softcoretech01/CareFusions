import { useState } from 'react';
import { Download, Printer, FileText, ChevronRight, CheckCircle2, Activity, DollarSign, Users, Package, FileCheck, Stethoscope, HeartPulse, Building2, BarChart3, ShieldCheck, Sparkles, Filter } from 'lucide-react';
import Chart from 'react-apexcharts';
import { NoDataNotice } from '../../components/ui/NoDataNotice';

type Step = 'select-analysis' | 'configure' | 'generating' | 'preview';

export const ReportBuilderPage = () => {
  const [step, setStep] = useState<Step>('select-analysis');
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };
  
  // Configuration State
  const [reportType, setReportType] = useState('Revenue Overview');
  const [timePeriod, setTimePeriod] = useState('This Month');
  const [hospital, setHospital] = useState('All Branches');
  
  const handleSelectAnalysis = (name: string) => {
    setSelectedAnalysis(name);
    setStep('configure');
  };

  const handleGenerate = () => {
    setStep('generating');
    setTimeout(() => {
      setStep('preview');
    }, 2500); // Fake generation time
  };

  const handleReset = () => {
    setSelectedAnalysis(null);
    setStep('select-analysis');
  };

  // Mock Data for Charts
  const revenueTrendOptions: any = {
    chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'Inter, sans-serif' },
    colors: ['#0ea5e9'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: { categories: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (val: number) => `₹${val / 100000}L` } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
  };

  const revenueTrendSeries = [{ name: 'Revenue', data: [4500000, 5200000, 4800000, 6100000] }];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col relative overflow-hidden -mx-4 -my-4 lg:-mx-8 lg:-my-8 bg-slate-50">
      <NoDataNotice
        title="Generated reports"
        needs="Reporting Service"
        detail="The preview is a fixed layout with placeholder figures, and Print / PDF / Excel only show a toast. A report-run service is needed to produce real output."
      />
      
      {/* Toast Notification */}
      {toast && (
        <div className="absolute bottom-6 right-6 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-2xl text-sm flex items-center gap-3 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          {toast}
        </div>
      )}

      {/* Wizard Header */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === 'select-analysis' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>1</div>
            <span className={`font-semibold text-sm ${step === 'select-analysis' ? 'text-slate-800' : 'text-slate-500'}`}>Select Analysis</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${(step === 'configure' || step === 'generating') ? 'bg-primary text-white' : (step === 'preview' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400')}`}>2</div>
            <span className={`font-semibold text-sm ${(step === 'configure' || step === 'generating') ? 'text-slate-800' : (step === 'preview' ? 'text-slate-500' : 'text-slate-400')}`}>Configure & Filters</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step === 'preview' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>3</div>
            <span className={`font-semibold text-sm ${step === 'preview' ? 'text-slate-800' : 'text-slate-400'}`}>Review & Export</span>
          </div>
        </div>
        
        {step === 'preview' && (
          <div className="flex items-center gap-3">
            <button onClick={handleReset} className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-semibold transition-colors mr-2">Start Over</button>
            <div className="h-6 w-px bg-slate-200"></div>
            <button onClick={() => showToast('Printing report...')} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={() => showToast('Generating PDF document...')} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
              <FileText className="w-4 h-4" /> PDF
            </button>
            <button onClick={() => showToast('Exporting to Excel...')} className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors shadow-sm flex items-center gap-2">
              <Download className="w-4 h-4" /> Excel
            </button>
          </div>
        )}
      </div>

      {/* Dynamic Content Area */}
      <div className="flex-1 overflow-auto custom-scrollbar p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          
          {/* STEP 1: Select Analysis */}
          {step === 'select-analysis' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <div className="mb-8 text-center max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">What would you like to analyze?</h1>
                <p className="text-slate-500">Select an enterprise module below to generate a highly structured, professional business report packed with AI insights.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { name: 'Executive Analysis', icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
                  { name: 'Financial Analysis', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                  { name: 'Clinical Analysis', icon: Stethoscope, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
                  { name: 'Operational Analysis', icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                  { name: 'Patient Analysis', icon: HeartPulse, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
                  { name: 'HR Analysis', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
                  { name: 'Inventory Analysis', icon: Package, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
                  { name: 'Procurement Analysis', icon: Building2, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100' },
                  { name: 'Quality Analysis', icon: ShieldCheck, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
                  { name: 'Laboratory Analysis', icon: FileCheck, color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-100' },
                ].map((item) => (
                  <button 
                    key={item.name}
                    onClick={() => handleSelectAnalysis(item.name)}
                    className="bg-white border border-slate-200 rounded-xl p-6 text-left hover:border-primary hover:shadow-lg hover:shadow-primary/5 transition-all group flex flex-col items-start gap-4"
                  >
                    <div className={`w-12 h-12 rounded-xl ${item.bg} ${item.color} ${item.border} border flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 group-hover:text-primary transition-colors">{item.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">Configure the period and scope for this analysis.</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Configure & Filters */}
          {step === 'configure' && (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
              <button onClick={handleReset} className="text-sm font-semibold text-slate-500 hover:text-slate-800 mb-6 flex items-center gap-1">
                ← Back to Categories
              </button>
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50">
                  <h2 className="text-xl font-bold text-slate-800">Configure: {selectedAnalysis}</h2>
                  <p className="text-sm text-slate-500 mt-1">Select your report type and apply advanced filters.</p>
                </div>
                
                <div className="p-6 space-y-8">
                  {/* Report Type & Time */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Select Report Template</label>
                      <select 
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                      >
                        {selectedAnalysis === 'Financial Analysis' ? (
                          <>
                            <option>Revenue Overview</option>
                            <option>Profit & Loss</option>
                            <option>Cash Flow</option>
                            <option>Expense Analysis</option>
                            <option>Budget vs Actual</option>
                          </>
                        ) : selectedAnalysis === 'Executive Analysis' ? (
                          <>
                            <option>Hospital Scorecard</option>
                            <option>CEO Summary</option>
                            <option>Operations Summary</option>
                          </>
                        ) : (
                          <>
                            <option>Detailed Summary Report</option>
                            <option>Trend Analysis</option>
                            <option>Top Performers</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Select Time Period</label>
                      <select 
                        value={timePeriod}
                        onChange={(e) => setTimePeriod(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                      >
                        <option>Today</option>
                        <option>Yesterday</option>
                        <option>Last 7 Days</option>
                        <option>Last 30 Days</option>
                        <option>This Month</option>
                        <option>Last Month</option>
                        <option>Financial Year (YTD)</option>
                        <option>Custom Date Range...</option>
                      </select>
                      {timePeriod === 'Custom Date Range...' && (
                        <div className="flex items-center gap-2 mt-4 animate-in fade-in">
                          <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">From Date</label>
                            <input type="date" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary" />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">To Date</label>
                            <input type="date" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Advanced Filters */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Filter className="w-4 h-4 text-primary" /> Advanced Filters (Optional)</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Hospital / Branch</label>
                        <select 
                          value={hospital}
                          onChange={(e) => setHospital(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                        >
                          <option>All Branches</option>
                          <option>Main Hospital</option>
                          <option>North Clinic</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Department</label>
                        <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary">
                          <option>All Departments</option>
                          <option>Cardiology</option>
                          <option>Orthopedics</option>
                          <option>Neurology</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Doctor</label>
                        <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary">
                          <option>All Doctors</option>
                          <option>Dr. Sarah Connor</option>
                          <option>Dr. James Smith</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Patient Type</label>
                        <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary">
                          <option>All</option>
                          <option>OPD</option>
                          <option>IPD</option>
                          <option>Emergency</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Payment Mode</label>
                        <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary">
                          <option>All</option>
                          <option>Cash</option>
                          <option>Insurance</option>
                          <option>Credit Card</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
                        <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary">
                          <option>All</option>
                          <option>Completed</option>
                          <option>Pending</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end">
                  <button onClick={handleGenerate} className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" /> Generate Professional Report
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Generating Loading State */}
          {step === 'generating' && (
            <div className="h-96 flex flex-col items-center justify-center animate-in fade-in">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full border-4 border-slate-100"></div>
                <div className="w-20 h-20 rounded-full border-4 border-primary border-t-transparent animate-spin absolute top-0 left-0"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Generating Report...</h2>
              <div className="flex flex-col items-center gap-2 text-slate-500 text-sm font-medium">
                <p className="animate-pulse">Analyzing {timePeriod} data...</p>
                <p className="animate-pulse delay-75">Compiling KPI Dashboards...</p>
                <p className="animate-pulse delay-150">Generating AI Recommendations...</p>
              </div>
            </div>
          )}

          {/* STEP 4: Preview Canvas (The massive printable report) */}
          {step === 'preview' && (
            <div className="max-w-[1000px] mx-auto bg-white rounded-sm shadow-[0_10px_40px_rgba(0,0,0,0.1)] mb-20 animate-in fade-in slide-in-from-bottom-8">
              {/* Paper Layout */}
              <div className="p-12 print:p-0">
                
                {/* Header Branding */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-8 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center font-bold text-xl text-white">CF</div>
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">CareFusions</h1>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Enterprise Intelligence</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-bold text-slate-800">{reportType}</h2>
                    <p className="text-sm text-slate-600 mt-1">{selectedAnalysis}</p>
                    <p className="text-sm text-slate-500 mt-1">Generated: Today, {new Date().toLocaleTimeString()}</p>
                  </div>
                </div>

                {/* Report Metadata */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-8 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                  <div><span className="font-bold text-slate-700">Period:</span> <span className="text-slate-600">{timePeriod}</span></div>
                  <div><span className="font-bold text-slate-700">Branch:</span> <span className="text-slate-600">{hospital}</span></div>
                  <div><span className="font-bold text-slate-700">Department:</span> <span className="text-slate-600">All Departments</span></div>
                  <div><span className="font-bold text-slate-700">Prepared By:</span> <span className="text-slate-600">System Admin</span></div>
                </div>

                {/* Section 1: Executive Summary */}
                <div className="mb-10">
                  <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">1. Executive Summary</h3>
                  <p className="text-slate-700 leading-relaxed text-sm">
                    This report provides a comprehensive overview of the {reportType.toLowerCase()} across {hospital} for {timePeriod}. Total performance metrics indicate a strong upward trajectory, with key departments exceeding baseline targets by an average of 14%. However, operational costs have marginally increased, necessitating closer monitoring of procurement pipelines in the upcoming quarter.
                  </p>
                </div>

                {/* Section 2: KPI Dashboard */}
                <div className="mb-10">
                  <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">2. KPI Dashboard</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 p-4 rounded-xl">
                      <div className="text-xs font-bold text-slate-500 uppercase mb-1">Total Metric 1</div>
                      <div className="text-2xl font-black text-slate-800">₹2.06 Cr</div>
                      <div className="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1">↑ 14.5% vs Last Period</div>
                    </div>
                    <div className="bg-white border border-slate-200 p-4 rounded-xl">
                      <div className="text-xs font-bold text-slate-500 uppercase mb-1">Metric 2</div>
                      <div className="text-2xl font-black text-slate-800">4,192</div>
                      <div className="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1">↑ 8.2% vs Last Period</div>
                    </div>
                    <div className="bg-white border border-slate-200 p-4 rounded-xl">
                      <div className="text-xs font-bold text-slate-500 uppercase mb-1">Metric 3</div>
                      <div className="text-2xl font-black text-slate-800">12.4%</div>
                      <div className="text-xs font-bold text-rose-600 mt-2 flex items-center gap-1">↓ 1.1% vs Last Period</div>
                    </div>
                    <div className="bg-white border border-slate-200 p-4 rounded-xl">
                      <div className="text-xs font-bold text-slate-500 uppercase mb-1">Metric 4</div>
                      <div className="text-2xl font-black text-slate-800">98.2%</div>
                      <div className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-1">- 0.0% vs Last Period</div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Trend Analysis (Chart) */}
                <div className="mb-10">
                  <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">3. Trend Analysis</h3>
                  <div className="h-64 bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <Chart options={revenueTrendOptions} series={revenueTrendSeries} type="area" height="100%" />
                  </div>
                </div>

                {/* Section 4: Detailed Data Table */}
                <div className="mb-10">
                  <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">4. Department Breakdown</h3>
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-y-2 border-slate-300">
                      <tr>
                        <th className="py-3 px-4 border-r border-slate-200">Department</th>
                        <th className="py-3 px-4 border-r border-slate-200 text-right">Metric 1</th>
                        <th className="py-3 px-4 text-right">Metric 2</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 border-b-2 border-slate-300">
                      <tr>
                        <td className="py-2 px-4 border-r border-slate-200 font-medium">Cardiology</td>
                        <td className="py-2 px-4 border-r border-slate-200 text-right">₹85.0 L</td>
                        <td className="py-2 px-4 text-right">38.2%</td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="py-2 px-4 border-r border-slate-200 font-medium">Orthopedics</td>
                        <td className="py-2 px-4 border-r border-slate-200 text-right">₹54.0 L</td>
                        <td className="py-2 px-4 text-right">44.6%</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 border-r border-slate-200 font-medium">Neurology</td>
                        <td className="py-2 px-4 border-r border-slate-200 text-right">₹48.0 L</td>
                        <td className="py-2 px-4 text-right">40.0%</td>
                      </tr>
                      <tr className="bg-slate-50">
                        <td className="py-2 px-4 border-r border-slate-200 font-medium">General Surgery</td>
                        <td className="py-2 px-4 border-r border-slate-200 text-right">₹41.0 L</td>
                        <td className="py-2 px-4 text-right">30.4%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section 5: AI Insights */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-primary flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5" /> AI Generated Insights
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-bold text-slate-800 mb-1">Key Observations</h4>
                      <ul className="list-disc pl-5 text-slate-700 space-y-1">
                        <li>Orthopedics has the highest efficiency margin (44.6%) despite lower total volume than Cardiology.</li>
                        <li>Week 4 showed a massive spike, contributing to 30% of the total monthly metric.</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 mb-1">Top Risks</h4>
                      <ul className="list-disc pl-5 text-rose-700 space-y-1">
                        <li>General Surgery margins (30.4%) are dropping below the 35% baseline requirement.</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 mb-1">Recommendations</h4>
                      <ul className="list-disc pl-5 text-emerald-700 space-y-1">
                        <li>Audit General Surgery consumables to identify cost-leakage affecting margins.</li>
                        <li>Capitalize on the Week 4 demand spike by ensuring adequate staff allocation in Q3.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Print Footer */}
                <div className="mt-16 pt-6 border-t border-slate-200 flex justify-between items-end text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <div>CareFusions HMS • Internal Use Only</div>
                  <div>Page 1 of 1</div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
