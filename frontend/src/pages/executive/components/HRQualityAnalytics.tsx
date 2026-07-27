
import { Users, UserMinus, ShieldCheck, Bug, Scale } from 'lucide-react';

export const HRQualityAnalytics = ({ hr }: { hr: any }) => {
  return (
    <div className="space-y-6">
      
      {/* HR Overview */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-800">Human Resources</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-indigo-500" />
            <p className="text-slate-500 text-sm font-medium">Total Headcount</p>
          </div>
          <h4 className="text-2xl font-bold text-slate-800">{hr.totalEmployees}</h4>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <UserMinus className="w-5 h-5 text-rose-500" />
            <p className="text-slate-500 text-sm font-medium">Attrition Rate</p>
          </div>
          <h4 className="text-2xl font-bold text-slate-800">{hr.attritionRate}%</h4>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Scale className="w-5 h-5 text-emerald-500" />
            <p className="text-slate-500 text-sm font-medium">Attendance Rate</p>
          </div>
          <h4 className="text-2xl font-bold text-slate-800">{hr.attendanceRate}%</h4>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-blue-500" />
            <p className="text-slate-500 text-sm font-medium">Doctors on Staff</p>
          </div>
          <h4 className="text-2xl font-bold text-slate-800">{hr.doctors}</h4>
        </div>
      </div>

      {/* Quality Overview */}
      <div className="flex items-center justify-between mt-8">
        <h3 className="text-xl font-bold text-slate-800">Quality & Compliance</h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-6">
            <ShieldCheck className="w-10 h-10 text-emerald-500" />
            <div>
              <h4 className="text-lg font-bold text-slate-800">NABH Compliance Score</h4>
              <p className="text-slate-500">Current audit standing</p>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-4 mb-2">
            <div className="bg-emerald-500 h-4 rounded-full" style={{ width: `${hr.quality.nabhCompliance}%` }}></div>
          </div>
          <div className="flex justify-between text-sm font-bold">
            <span className="text-slate-500">Target: 95%</span>
            <span className="text-emerald-600">{hr.quality.nabhCompliance}%</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1 flex items-center gap-2"><Bug className="w-4 h-4 text-rose-500"/> Infection Rate</p>
            <h4 className="text-2xl font-bold text-slate-800">{hr.quality.infectionRate}%</h4>
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1">Open Audit Findings</p>
            <h4 className="text-2xl font-bold text-slate-800">{hr.quality.openAuditFindings}</h4>
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1">Medication Errors</p>
            <h4 className="text-2xl font-bold text-slate-800">{hr.quality.medicationErrors}</h4>
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1">Patient Complaints</p>
            <h4 className="text-2xl font-bold text-slate-800">{hr.quality.patientComplaints}</h4>
          </div>
        </div>
      </div>
    </div>
  );
};
