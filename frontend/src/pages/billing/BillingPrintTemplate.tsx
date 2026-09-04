
import { API_BASE_URL } from '@/utils/apiBase';
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Printer, ArrowLeft, Stethoscope } from 'lucide-react';
import axios from 'axios';

const API_BASE = API_BASE_URL;

export const BillingPrintTemplate = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bill, setBill] = useState<any>(null);
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBillAndDetails = async () => {
      try {
        const response = await axios.get(`${API_BASE}/billing-reports/`);
        const found = response.data.find((b: any) => b.BillNumber === id);
        setBill(found);

        if (found && found.PatientId) {
          let foundDiagnoses: any[] = [];
          
          // Try fetching OP diagnoses
          try {
            const opRes = await axios.get(`${API_BASE}/opd-visits/schedule`);
            const ops = opRes.data;
            const visit = ops.find((o: any) => o.uhid === found.PatientId);
            if (visit) {
              const detRes = await axios.get(`${API_BASE}/opd-visits/${visit.id}/details`);
              if (detRes.data.diagnoses) foundDiagnoses = [...foundDiagnoses, ...detRes.data.diagnoses];
            }
          } catch(e) {}

          // For IP bills, also check IPD admission diagnoses
          if (found.Type === 'IP') {
            try {
              const ipRes = await axios.get(`${API_BASE}/ipd-visits/schedule`);
              const ips = ipRes.data;
              const admission = ips.find((i: any) => i.uhid === found.PatientId);
              if (admission) {
                const visitId = admission.admissionId || admission.id;
                const detRes = await axios.get(`${API_BASE}/ipd-visits/${visitId}/details`);
                if (detRes.data.diagnoses) foundDiagnoses = [...foundDiagnoses, ...detRes.data.diagnoses];
              }
            } catch (e) {}
          }
          
          // Remove duplicates
          const uniqueDiagnoses = Array.from(new Map(foundDiagnoses.map(item => [item.description || item.Description, item])).values());
          setDiagnoses(uniqueDiagnoses);
        }
      } catch (err) {
        console.error("Failed to fetch bill or details", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBillAndDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-slate-500 text-lg">Loading bill...</p>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-slate-500 text-lg">Bill not found.</p>
        <button onClick={() => navigate(-1)} className="text-primary underline">Go Back</button>
      </div>
    );
  }

  const isIP = bill.Type === 'IP';
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      {/* Screen controls - hidden on print */}
      <div className="max-w-4xl mx-auto py-6 px-4 print:hidden flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <button
          onClick={() => window.print()}
          className="ml-auto flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Printer className="w-5 h-5" /> Print Bill
        </button>
      </div>

      {/* Printable Invoice */}
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl print:shadow-none print:rounded-none print:max-w-full overflow-hidden">

        {/* Header */}
        <div className="bg-primary px-10 py-8 text-white print:px-6 print:py-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-wide">CareFusions</h1>
              <p className="text-white/80 text-sm mt-1 print:text-xs">123, Hospital Road, Health City — 600001</p>
              <p className="text-white/80 text-sm print:text-xs">Phone: +91 44 1234 5678 | Email: billing@carefusions.in</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold bg-white/20 px-4 py-2 rounded-xl print:text-xl print:px-3 print:py-1">
                {isIP ? 'IP BILL' : 'OP BILL'}
              </div>
              <p className="text-white/70 text-xs mt-2 print:mt-1">{today}</p>
            </div>
          </div>
        </div>

        {/* Bill Meta */}
        <div className="grid grid-cols-2 gap-6 px-10 py-6 border-b border-slate-200 bg-slate-50 print:px-6 print:py-3 print:gap-4">
          <div className="space-y-1 print:space-y-0.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider print:text-[10px]">Bill To</p>
            <p className="text-xl font-bold text-slate-900 print:text-lg">{bill.PatientName || 'Walk-in'}</p>
            <p className="text-sm text-slate-500 print:text-xs">{bill.PatientId || '-'}</p>
          </div>
          <div className="text-right space-y-1 print:space-y-0.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider print:text-[10px]">Bill Details</p>
            <p className="text-sm print:text-xs"><span className="font-semibold">Bill No:</span> {bill.BillNumber}</p>
            <p className="text-sm print:text-xs"><span className="font-semibold">Date:</span> {new Date(bill.Date).toLocaleDateString('en-IN')}</p>
            <p className="text-sm print:text-xs"><span className="font-semibold">Mode:</span> {bill.PaymentMode || 'Cash'}</p>
            <span className={`inline-block mt-1 px-3 py-1 text-xs font-bold rounded-full print:mt-0 ${bill.PaymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {bill.PaymentStatus}
            </span>
          </div>
        </div>

        {/* Diagnoses */}
        {diagnoses && diagnoses.length > 0 && (
          <div className="px-10 py-6 border-b border-slate-200 print:px-6 print:py-3">
            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm print:text-xs">
              <Stethoscope className="w-4 h-4 text-purple-500" />
              Diagnosis Details
            </h4>
            <div className="space-y-2 print:space-y-1">
              {diagnoses.map((d: any, idx: number) => (
                <div key={idx} className="bg-purple-50/30 p-3 rounded-lg border border-purple-100/50 flex justify-between items-center print:bg-transparent print:border-slate-100 print:border print:p-2">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm print:text-xs">{d.Description || d.description}</p>
                    {/* {d.CodeId && <p className="text-xs text-slate-500 mt-1 print:text-[10px] print:mt-0">Code: {d.CodeId}</p>} */}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="px-10 py-6 print:px-6 print:py-3 print:text-xs">
          <table className="w-full text-sm print:text-xs">
            <thead>
              <tr className="bg-primary/5 border border-slate-200 rounded-lg">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider print:py-2">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider print:py-2">Description</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider print:py-2">Unit Price (₹)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider print:py-2">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider print:py-2">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {bill.Items && bill.Items.length > 0 ? (
                bill.Items.map((item: any, idx: number) => (
                  <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-4 py-3 text-slate-500 print:py-1.5">{idx + 1}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium print:py-1.5">{item.ItemDescription}</td>
                    <td className="px-4 py-3 text-right text-slate-700 print:py-1.5">₹{parseFloat(item.UnitPrice).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center text-slate-700 print:py-1.5">{item.Quantity}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 print:py-1.5">₹{parseFloat(item.Subtotal).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 print:py-4">No items found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="px-10 py-6 border-t border-slate-200 print:px-6 print:py-3">
          <div className="flex flex-col items-end gap-2 text-sm print:text-xs print:gap-1">
            <div className="flex justify-between w-64 print:w-48">
              <span className="text-slate-500">Subtotal:</span>
              <span className="font-medium text-slate-900">₹{(bill.TotalAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-64 print:w-48">
              <span className="text-slate-500">Discount:</span>
              <span className="font-medium text-emerald-600">- ₹{(bill.Discount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between w-64 pt-2 border-t border-slate-200 print:w-48 print:pt-1">
              <span className="font-bold text-slate-700">Net Total:</span>
              <span className="text-2xl font-black text-primary print:text-xl">₹{(bill.NetAmount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-10 py-6 text-center text-xs text-slate-400 print:px-6 print:py-2 print:text-[10px]">
          <p>This is a computer-generated invoice and does not require a signature.</p>
          <p className="mt-1 print:mt-0.5">Thank you for choosing CareFusions. Wishing you a speedy recovery!</p>
        </div>
      </div>
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};
