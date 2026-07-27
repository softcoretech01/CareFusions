import { Printer } from 'lucide-react';

export interface EMRRecord {
  uhid: string;
  patientName: string;
  age: number;
  gender: string;
  bloodGroup: string;
  contact?: string;
  address?: string;
  visitType: 'OP' | 'IP' | 'Emergency';
  visitId: string;
  visitDate: string;
  visitDateValue: string;
  doctor: string;
  specialty: string;
  department?: string;
  dischargeStatus?: string;
  billingStatus?: string;
  chiefComplaint: string;
  historyOfPresentIllness?: string;
  diagnosis: string;
  clinicalNotes: string;
  doctorAdvice?: string;
  icdCodes?: Array<{ code: string; description: string }>;
  labOrders?: Array<{ test: string; status: string; priority: string }>;
  radiologyOrders?: Array<{ study: string; status: string }>;
  progressNotes?: Array<{ date: string; author: string; note: string }>;
  nursingNotes?: Array<{ date: string; nurse: string; note: string }>;
  medicationRecords?: Array<{ medication: string; route: string; dose: string; frequency: string; status: string }>;
  fluidBalance?: string;
  painAssessment?: string;
  labResults?: Array<{ test: string; result: string; normal: string; comments?: string }>;
  radiologyResults?: Array<{ study: string; result: string; impression?: string }>;
  procedureNotes?: string;
  operationNotes?: string;
  anesthesiaNotes?: string;
  bloodTransfusion?: string;
  dietPlan?: string;
  finalDiagnosis?: string;
  treatmentSummary?: string;
  hospitalCourse?: string;
  dischargeMedication?: string;
  dischargeAdvice?: string;
  billingSummary?: string;
  vitals?: {
    bp?: string;
    pulse?: string;
    temp?: string;
    spo2?: string;
    weight?: string;
    height?: string;
  };
  investigations?: Array<{ test: string; result: string; normalRange?: string }>;
  prescriptions?: Array<{ medicine: string; dosage: string; frequency: string; duration: string; instructions?: string }>;
  followUpDate?: string;
  dischargeDate?: string;
  admissionDate?: string;
  admissionTime?: string;
  ward?: string;
  bed?: string;
  admissionDiagnosis?: string;
  consultant?: string;
  dob?: string;
  nationality?: string;
  occupation?: string;
  mobile?: string;
  email?: string;
  visitTime?: string;
  consultationType?: string;
  tokenNumber?: string;
  visitStatus?: string;
  referralSource?: string;
  pastMedicalHistory?: string[];
  surgicalHistory?: string[];
  familyHistory?: string;
  allergyHistory?: string;
  personalHistory?: string;
  followUp?: {
    date?: string;
    doctor?: string;
    department?: string;
    reason?: string;
  };
  socialHistory?: {
    smoking?: string;
    alcohol?: string;
    occupation?: string;
    foodHabit?: string;
  };
  height?: string;
  weight?: string;
  bmi?: string;
  temperature?: string;
  pulse?: string;
  respiration?: string;
  bloodPressure?: string;
  spo2?: string;
  painScale?: string;
  generalExamination?: string;
  systemicExamination?: string;
  generatedOn?: string;
}

interface EMRPrintTemplateProps {
  record: EMRRecord;
}

export const EMRPrintTemplate = ({ record }: EMRPrintTemplateProps) => {
  const handlePrint = () => window.print();


  return (
    <div className="print:p-0 p-6 bg-slate-50 min-h-screen font-sans">
      {/* Print Button */}
      <div className="mb-6 flex justify-end print:hidden max-w-[210mm] mx-auto">
        <button
          onClick={handlePrint}
          className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Printer className="w-5 h-5" /> Print Medical Record
        </button>
      </div>

      <div className="bg-white mx-auto print:border-0 border border-slate-200 shadow-sm print:shadow-none" style={{ maxWidth: '210mm', minHeight: '297mm' }}>
        
        {/* Professional Hospital Header */}
        <div className="border-b-4 border-primary px-8 py-6 flex justify-between items-center bg-white print:bg-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary text-white rounded-lg flex items-center justify-center font-black text-3xl">
              CF
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">CARE FUSIONS HOSPITAL</h1>
              <p className="text-sm text-slate-500 font-medium tracking-wide">Excellence in Healthcare</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-widest">{record.visitType === 'IP' ? 'Inpatient Record' : 'Outpatient Record'}</h2>
            <p className="text-sm text-slate-500 mt-1">ID: <span className="font-bold text-slate-700">{record.visitId}</span></p>
            <p className="text-sm text-slate-500">Date: <span className="font-bold text-slate-700">{record.visitDate}</span></p>
          </div>
        </div>

        <div className="px-8 py-6">
          
          {/* Patient Demographics & Encounter Info */}
          <div className="border-2 border-slate-800 rounded-lg p-0 mb-6 flex flex-col">
            <div className="grid grid-cols-4 bg-slate-100 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-600 divide-x divide-slate-800">
              <div className="p-2">Patient Name</div>
              <div className="p-2">UHID</div>
              <div className="p-2">Age / Gender</div>
              <div className="p-2">Blood Group</div>
            </div>
            <div className="grid grid-cols-4 border-b-2 border-slate-800 text-sm font-semibold text-slate-900 divide-x divide-slate-800">
              <div className="p-2 truncate">{record.patientName}</div>
              <div className="p-2">{record.uhid}</div>
              <div className="p-2">{record.age} Y / {record.gender}</div>
              <div className="p-2">{record.bloodGroup || '—'}</div>
            </div>
            
            <div className="grid grid-cols-4 bg-slate-100 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-600 divide-x divide-slate-800">
              <div className="p-2">Consultant</div>
              <div className="p-2">Department</div>
              {record.visitType === 'IP' ? (
                <>
                  <div className="p-2">Admission Date</div>
                  <div className="p-2">Ward & Bed</div>
                </>
              ) : (
                <>
                  <div className="p-2">Visit Type</div>
                  <div className="p-2">Billing Status</div>
                </>
              )}
            </div>
            <div className="grid grid-cols-4 text-sm font-semibold text-slate-900 divide-x divide-slate-800">
              <div className="p-2 truncate">{record.doctor}</div>
              <div className="p-2 truncate">{record.department || record.specialty}</div>
              {record.visitType === 'IP' ? (
                <>
                  <div className="p-2">{record.admissionDate || record.visitDate}</div>
                  <div className="p-2">{record.ward || 'General'} - {record.bed || 'Unassigned'}</div>
                </>
              ) : (
                <>
                  <div className="p-2">{record.visitType}</div>
                  <div className="p-2">{record.billingStatus || 'Cleared'}</div>
                </>
              )}
            </div>
          </div>

          {/* Vitals Section */}
          {record.vitals && Object.values(record.vitals).some(Boolean) && (
            <div className="mb-6">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 mb-3 pb-1">Vitals</h3>
              <div className="flex gap-4 flex-wrap">
                {record.vitals.bp && <div className="text-sm"><span className="text-slate-500 font-bold">BP:</span> <span className="font-bold">{record.vitals.bp}</span> mmHg</div>}
                {record.vitals.pulse && <div className="text-sm"><span className="text-slate-500 font-bold">PR:</span> <span className="font-bold">{record.vitals.pulse}</span> bpm</div>}
                {record.vitals.temp && <div className="text-sm"><span className="text-slate-500 font-bold">Temp:</span> <span className="font-bold">{record.vitals.temp}</span> °F</div>}
                {record.vitals.spo2 && <div className="text-sm"><span className="text-slate-500 font-bold">SpO2:</span> <span className="font-bold">{record.vitals.spo2}</span> %</div>}
                {record.vitals.weight && <div className="text-sm"><span className="text-slate-500 font-bold">Wt:</span> <span className="font-bold">{record.vitals.weight}</span> kg</div>}
              </div>
            </div>
          )}

          {/* Core Clinical Data (OP & IP Baseline) */}
          <div className="space-y-5 mb-8">
            {record.chiefComplaint && (
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 mb-2 pb-1">Chief Complaint</h3>
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{record.chiefComplaint}</p>
              </div>
            )}
            
            {record.historyOfPresentIllness && (
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 mb-2 pb-1">History of Present Illness</h3>
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{record.historyOfPresentIllness}</p>
              </div>
            )}

            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 mb-2 pb-1">Diagnosis</h3>
              <p className="text-sm text-slate-800 font-bold whitespace-pre-wrap leading-relaxed">{record.diagnosis || record.finalDiagnosis || 'Pending evaluation'}</p>
            </div>
            
            {record.clinicalNotes && (
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 mb-2 pb-1">Clinical / Progress Notes</h3>
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{record.clinicalNotes}</p>
              </div>
            )}
          </div>

          {/* INPATIENT SPECIFIC SECTIONS */}
          {record.visitType === 'IP' && (
            <div className="space-y-6 mb-8 border-t-2 border-dashed border-slate-300 pt-6">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest text-center bg-slate-100 py-2">Inpatient Course</h2>
              
              {record.hospitalCourse && (
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 mb-2 pb-1">Hospital Course Summary</h3>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{record.hospitalCourse}</p>
                </div>
              )}

              {record.procedureNotes && (
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 mb-2 pb-1">Procedures / Surgeries Performed</h3>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{record.procedureNotes}</p>
                </div>
              )}

              {record.dietPlan && (
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 mb-2 pb-1">Diet & Nutrition</h3>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{record.dietPlan}</p>
                </div>
              )}
            </div>
          )}

          {/* Investigations */}
          {record.investigations && record.investigations.length > 0 && (
            <div className="mb-6 print-page-break">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 mb-3 pb-1">Investigations & Results</h3>
              <table className="w-full text-sm border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">Test / Investigation</th>
                    <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">Result</th>
                    <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">Normal Range</th>
                  </tr>
                </thead>
                <tbody>
                  {record.investigations.map((inv, idx) => (
                    <tr key={idx}>
                      <td className="border border-slate-300 px-3 py-1.5 font-medium">{inv.test}</td>
                      <td className="border border-slate-300 px-3 py-1.5 font-bold">{inv.result}</td>
                      <td className="border border-slate-300 px-3 py-1.5 text-slate-600">{inv.normalRange || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Medications / Prescriptions */}
          {record.prescriptions && record.prescriptions.length > 0 && (
            <div className="mb-8 print-page-break">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 mb-3 pb-1">
                {record.visitType === 'IP' ? 'Discharge Medications' : 'Prescriptions'}
              </h3>
              <table className="w-full text-sm border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700 w-12 text-center">#</th>
                    <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">Medicine</th>
                    <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">Dosage & Freq</th>
                    <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">Duration</th>
                    <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {record.prescriptions.map((rx, idx) => (
                    <tr key={idx}>
                      <td className="border border-slate-300 px-3 py-2 text-center text-slate-500 font-bold">{idx + 1}</td>
                      <td className="border border-slate-300 px-3 py-2 font-bold text-slate-900">{rx.medicine}</td>
                      <td className="border border-slate-300 px-3 py-2">{rx.dosage} - {rx.frequency}</td>
                      <td className="border border-slate-300 px-3 py-2">{rx.duration}</td>
                      <td className="border border-slate-300 px-3 py-2 text-slate-600 italic">{rx.instructions || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Advice & Follow up */}
          <div className="mb-12">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 mb-2 pb-1">Advice & Follow-Up</h3>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <p className="text-sm font-bold text-slate-900 mb-1">
                Next Follow-up Date: <span className="text-primary">{record.followUpDate || 'As needed'}</span>
              </p>
              {record.dischargeAdvice ? (
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{record.dischargeAdvice}</p>
              ) : (
                <ul className="text-sm text-slate-700 list-disc list-inside space-y-1 mt-2">
                  <li>Take medications strictly as prescribed.</li>
                  <li>In case of emergency, visit the casualty ward immediately.</li>
                </ul>
              )}
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-16">
            <div className="text-center">
              <div className="border-t-2 border-slate-800 pt-2 px-8 inline-block">
                <p className="font-bold text-slate-800 text-sm">Patient / Guardian Signature</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-slate-800 pt-2 px-8 inline-block">
                <p className="font-bold text-slate-800 text-sm uppercase">{record.doctor}</p>
                <p className="text-xs text-slate-500 font-medium">{record.specialty} • {record.department}</p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Ribbon */}
        <div className="bg-slate-800 text-white text-center py-3 text-xs mt-auto print:absolute print:bottom-0 print:w-[210mm]">
          <p>This is a digitally generated report from Care Fusions EMR System.</p>
          <p className="text-white/60">Generated on: {new Date().toLocaleString()}</p>
        </div>

      </div>
    </div>
  );
};
