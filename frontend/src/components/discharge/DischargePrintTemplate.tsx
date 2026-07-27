import { Printer } from 'lucide-react';
import type { IPDPatient } from '../../contexts/IPDContext';
import type { DischargeItem } from './DischargePrescription';

interface DischargePrintTemplateProps {
  patient: IPDPatient;
  medicines: DischargeItem[];
  dischargeSummary: string;
  dischargeDate: string;
  dischargedBy: string;
}

export const DischargePrintTemplate = ({
  patient,
  medicines,
  dischargeSummary,
  dischargeDate,
  dischargedBy
}: DischargePrintTemplateProps) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print:p-0 p-6 bg-slate-50 min-h-screen font-sans">
      {/* Print Button */}
      <div className="mb-6 flex justify-end print:hidden max-w-[210mm] mx-auto">
        <button
          onClick={handlePrint}
          className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Printer className="w-5 h-5" /> Print Discharge Summary
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
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-widest">Discharge Summary</h2>
            <p className="text-sm text-slate-500 mt-1">Admission: <span className="font-bold text-slate-700">{patient.admissionNumber}</span></p>
            <p className="text-sm text-slate-500">Date: <span className="font-bold text-slate-700">{dischargeDate}</span></p>
          </div>
        </div>

        <div className="px-8 py-6">
          
          {/* Patient Demographics & Encounter Info */}
          <div className="border-2 border-slate-800 rounded-lg p-0 mb-6 flex flex-col">
            <div className="grid grid-cols-4 bg-slate-100 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-600 divide-x divide-slate-800">
              <div className="p-2">Patient Name</div>
              <div className="p-2">UHID</div>
              <div className="p-2">Age / Gender</div>
              <div className="p-2">Admission No</div>
            </div>
            <div className="grid grid-cols-4 border-b-2 border-slate-800 text-sm font-semibold text-slate-900 divide-x divide-slate-800">
              <div className="p-2 truncate">{patient.patientName}</div>
              <div className="p-2">{patient.uhid}</div>
              <div className="p-2">{patient.age} Y / {patient.gender}</div>
              <div className="p-2">{patient.admissionNumber}</div>
            </div>
            
            <div className="grid grid-cols-4 bg-slate-100 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-600 divide-x divide-slate-800">
              <div className="p-2">Admitting Doctor</div>
              <div className="p-2">Specialty</div>
              <div className="p-2">Admission Date</div>
              <div className="p-2">Discharge Date</div>
            </div>
            <div className="grid grid-cols-4 text-sm font-semibold text-slate-900 divide-x divide-slate-800">
              <div className="p-2 truncate">Dr. {patient.admittingDoctor}</div>
              <div className="p-2 truncate">{patient.specialty}</div>
              <div className="p-2">{new Date(patient.admissionDate).toLocaleDateString()}</div>
              <div className="p-2">{dischargeDate}</div>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 mb-2 pb-1">Diagnosis</h3>
              <p className="text-sm text-slate-800 font-bold whitespace-pre-wrap leading-relaxed">{patient.provisionalDiagnosis || 'No diagnosis recorded'}</p>
            </div>
            
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 mb-2 pb-1">Clinical Summary</h3>
              <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{dischargeSummary || 'No clinical summary provided.'}</p>
            </div>
          </div>

          {/* Discharge Medicines */}
          {medicines.length > 0 && (
            <div className="mb-8 print-page-break">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 mb-3 pb-1">Discharge Medications</h3>
              <table className="w-full text-sm border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700 w-12 text-center">#</th>
                    <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">Medicine</th>
                    <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">Dosage & Freq</th>
                    <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">Duration</th>
                    <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">Qty</th>
                    <th className="border border-slate-300 px-3 py-2 text-left font-bold text-slate-700">Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {medicines.map((medicine, idx) => (
                    <tr key={medicine.id}>
                      <td className="border border-slate-300 px-3 py-2 text-center text-slate-500 font-bold">{idx + 1}</td>
                      <td className="border border-slate-300 px-3 py-2 font-bold text-slate-900">{medicine.medicineName}</td>
                      <td className="border border-slate-300 px-3 py-2">{medicine.dosage} - {medicine.frequency}</td>
                      <td className="border border-slate-300 px-3 py-2">{medicine.duration}</td>
                      <td className="border border-slate-300 px-3 py-2 text-center font-semibold">{medicine.quantity}</td>
                      <td className="border border-slate-300 px-3 py-2 text-slate-600 italic">{medicine.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Advice & Follow up */}
          <div className="mb-12">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 mb-2 pb-1">Follow-Up Instructions</h3>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <ul className="text-sm text-slate-700 list-disc list-inside space-y-1">
                <li>Follow prescribed medicines strictly as per frequency and duration.</li>
                <li>Avoid strenuous activities and heavy lifting for the next few days.</li>
                <li>Maintain a proper, healthy diet and stay hydrated.</li>
                <li>Report immediately to the emergency department if symptoms worsen.</li>
                <li>Do not discontinue medications without consulting your doctor.</li>
              </ul>
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
                <p className="font-bold text-slate-800 text-sm uppercase">Dr. {dischargedBy}</p>
                <p className="text-xs text-slate-500 font-medium">Authorizing Doctor</p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Ribbon */}
        <div className="bg-slate-800 text-white text-center py-3 text-xs mt-auto print:absolute print:bottom-0 print:w-[210mm]">
          <p>This is a digitally generated Discharge Summary from Care Fusions EMR System.</p>
          <p className="text-white/60">Generated on: {new Date().toLocaleString()}</p>
        </div>

      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:border-0 {
            border: none !important;
          }
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print-page-break {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
};
