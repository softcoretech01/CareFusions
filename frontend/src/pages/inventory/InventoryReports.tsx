import { useState } from 'react';
import { motion } from 'framer-motion';
import { exportToExcel } from '../../utils/exportToExcel';
import { BarChart3, Download, FileText, CalendarDays, LineChart, PieChart } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export const InventoryReports = () => {
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const reports = [
    { title: 'Stock Valuation Report', icon: BarChart3, desc: 'Current value of inventory by category and store', type: 'Financial' },
    { title: 'Consumption Analysis', icon: PieChart, desc: 'Department-wise item consumption trends', type: 'Analytics' },
    { title: 'Expiry Tracker', icon: CalendarDays, desc: 'List of items nearing expiry or expired', type: 'Compliance' },
    { title: 'Fast & Slow Moving', icon: FileText, desc: 'Identify most and least utilized inventory items', type: 'Analytics' },
    { title: 'Stock Reconciliation', icon: FileText, desc: 'Physical vs System stock variance report', type: 'Audit' },
    { title: 'Vendor Performance', icon: LineChart, desc: 'Delivery timelines and rejection rates by vendor', type: 'Analytics' }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center text-sm text-slate-500 mb-2">
            <span>Inventory</span>
            <span className="mx-2">/</span>
            <span className="text-primary font-medium">Reports</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Inventory Reports</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report, i) => (
          <div key={i} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 group hover:shadow-md transition-all hover:border-primary/20 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <report.icon className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-full">
                {report.type}
              </span>
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-2">{report.title}</h3>
            <p className="text-slate-500 text-sm mb-6 flex-1">{report.desc}</p>
            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedReport(report)}
                className="flex-1 py-2 bg-slate-50 hover:bg-primary text-slate-700 hover:text-white rounded-xl text-sm font-medium transition-colors border border-slate-100 hover:border-transparent flex justify-center items-center gap-2"
              >
                <EyeIcon /> View
              </button>
              <button 
                onClick={() => exportToExcel([{ report: report.title, status: 'Generated' }], report.title.replace(/\s+/g, '_'))}
                className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-medium transition-colors border border-slate-100 flex justify-center items-center gap-2"
              >
                <Download className="w-4 h-4" /> Export
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title={selectedReport?.title || 'Report Preview'} size="5xl">
        {selectedReport && (
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800">{selectedReport.title} Overview</h4>
                <p className="text-sm text-slate-500">{selectedReport.desc}</p>
              </div>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" /> Download Full PDF
              </Button>
            </div>

            <div className="h-64 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-slate-400">
              <selectedReport.icon className="w-16 h-16 mb-4 text-slate-300 opacity-50" />
              <p className="font-medium">Report preview visualization would be rendered here.</p>
              <p className="text-sm">Connects to live inventory BI metrics.</p>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium">
                  <tr>
                    <th className="py-3 px-4">Metric</th>
                    <th className="py-3 px-4">Current Value</th>
                    <th className="py-3 px-4 text-right">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4">Primary Indicator</td>
                    <td className="py-3 px-4 font-bold text-slate-800">4,520</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-500">+12%</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4">Secondary Indicator</td>
                    <td className="py-3 px-4 font-bold text-slate-800">$12,050.00</td>
                    <td className="py-3 px-4 text-right font-bold text-red-500">-3%</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4">Tertiary Indicator</td>
                    <td className="py-3 px-4 font-bold text-slate-800">85.4%</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-500">+2%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setSelectedReport(null)}>Close Preview</Button>
            </div>
          </div>
        )}
      </Modal>

    </motion.div>
  );
};

const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>;
