import { useState, useEffect } from 'react';
import { Printer, Download, Eye, X, Shield, Pill, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DateFilter } from '../../components/ui/DateFilter';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL as string;

export const BillingReports = () => {
  const navigate = useNavigate();

  const [bills, setBills] = useState<any[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBill, setSelectedBill] = useState<any>(null);

  const [insuranceDetails, setInsuranceDetails] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    fetchBills();
  }, []);

  useEffect(() => {
    if (selectedBill) {
      const fetchDetails = async () => {
        setIsLoadingDetails(true);
        setInsuranceDetails(null);
        setPrescriptions([]);

        try {
          if (selectedBill.PatientId) {
            // 1. Fetch Insurance
            try {
              const insRes = await axios.get(`${API_BASE}/insurance/policies/search?q=${selectedBill.PatientId}`);
              const policy = insRes.data;
              if (policy) {
                const validUntilDate = policy.validUntil ? new Date(policy.validUntil) : null;
                if (policy.status === 'Active' && (!validUntilDate || validUntilDate >= new Date(new Date().setHours(0, 0, 0, 0)))) {
                  setInsuranceDetails(policy);
                }
              }
            } catch (e) {
              // No insurance or error
            }

            // 2. Fetch Prescriptions
            let foundPrescriptions: any[] = [];
            try {
              if (selectedBill.Type === 'OP') {
                const opRes = await axios.get(`${API_BASE}/opd-visits/schedule`);
                const ops = opRes.data;
                const visit = ops.find((o: any) => o.uhid === selectedBill.PatientId);
                if (visit) {
                  const detRes = await axios.get(`${API_BASE}/opd-visits/${visit.id}/details`);
                  if (detRes.data.prescriptions) foundPrescriptions = detRes.data.prescriptions;
                }
              } else if (selectedBill.Type === 'IP') {
                const ipRes = await axios.get(`${API_BASE}/ipd-visits/schedule`);
                const ips = ipRes.data;
                const admission = ips.find((i: any) => i.uhid === selectedBill.PatientId);
                if (admission) {
                  const visitId = admission.admissionId || admission.id;
                  const detRes = await axios.get(`${API_BASE}/ipd-visits/${visitId}/details`);
                  if (detRes.data.prescriptions) foundPrescriptions = detRes.data.prescriptions;
                  if (!foundPrescriptions.length && detRes.data.medications) {
                    foundPrescriptions = detRes.data.medications.map((m: any) => ({
                      MedicineName: m.MedicineName || m.medicine,
                      Dosage: m.Dosage || m.dosage,
                      Frequency: m.Frequency || m.frequency,
                      Duration: m.Duration || m.duration,
                      Alerts: m.Route || m.instructions
                    }));
                  }
                }
              }
              setPrescriptions(foundPrescriptions);
            } catch (e) {
              console.error("Prescriptions fetch error", e);
            }
          }
        } finally {
          setIsLoadingDetails(false);
        }
      };

      fetchDetails();
    }
  }, [selectedBill]);

  const fetchBills = async () => {
    try {
      // Add a timestamp to bypass Nginx/Browser caching on Live
      const response = await axios.get(`${API_BASE}/billing-reports/?t=${new Date().getTime()}`);
      setBills(response.data);
    } catch (error) {
      console.error("Failed to fetch billing reports", error);
    }
  };

  const filteredBills = bills.filter(bill => {
    const billDate = new Date(bill.Date);
    const startDate = fromDate ? new Date(fromDate) : null;
    const endDate = toDate ? new Date(toDate) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    const matchesFrom = !startDate || billDate >= startDate;
    const matchesTo = !endDate || billDate <= endDate;
    const matchesSearch =
      bill.BillNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.PatientName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFrom && matchesTo && matchesSearch;
  });

  const handleMarkPaid = async (billNumber: string) => {
    try {
      await axios.patch(`${API_BASE}/billing-reports/${billNumber}/pay`);
      fetchBills(); // Refresh list after payment
    } catch (error) {
      console.error("Failed to mark bill as paid", error);
      alert("Failed to mark bill as paid. See console for details.");
    }
  };

  const handlePrint = (billId: string) => {
    navigate(`/billing/print/${billId}`);
  };

  const exportToCSV = () => {
    if (filteredBills.length === 0) return;

    const headers = ['Bill ID', 'Type', 'Patient Name', 'Date', 'Amount', 'Status'];
    const rows = filteredBills.map(bill => {
      return [
        bill.BillNumber,
        bill.Type,
        bill.PatientName || 'Walk-in',
        new Date(bill.Date).toLocaleDateString(),
        bill.NetAmount.toFixed(2),
        bill.PaymentStatus
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `billing_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col space-y-6 w-full">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Billing Reports</h2>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
            <div className="flex-1 w-full md:w-auto">
              <DateFilter
                dateFrom={fromDate}
                dateTo={toDate}
                onDateFromChange={setFromDate}
                onDateToChange={setToDate}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSearch={() => { }}
                onReset={() => { setFromDate(''); setToDate(''); setSearchQuery(''); }}
              />
            </div>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg font-bold text-slate-700 flex items-center justify-center gap-2 transition-colors w-full md:w-auto shrink-0"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        <div className="p-8">
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Bill ID</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">UHID / IP No</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Pay</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-14 text-center text-slate-400">
                      No bills found matching your criteria.
                    </td>
                  </tr>
                ) : filteredBills.map(bill => {
                  const isPaid = bill.PaymentStatus === 'Paid';
                  const isIP = bill.Type === 'IP';
                  return (
                    <tr key={bill.BillNumber} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-slate-900">{bill.BillNumber}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${isIP ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {bill.Type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{bill.PatientId || '-'}</td>
                      <td className="px-6 py-4 text-slate-700 font-medium">{bill.PatientName}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(bill.Date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">₹{bill.NetAmount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                          {bill.PaymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {!isPaid ? (
                          <button
                            onClick={() => handleMarkPaid(bill.BillNumber)}
                            className="px-3 py-1.5 text-xs font-bold bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-sm hover:shadow active:scale-95"
                            title="Mark as Paid"
                          >
                            Pay Bill
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedBill(bill)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="View Bill Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => isPaid && handlePrint(bill.BillNumber)}
                            disabled={!isPaid}
                            className={`p-2 rounded-lg transition-all ${isPaid
                              ? 'text-primary hover:bg-primary/10 hover:shadow-sm cursor-pointer'
                              : 'text-slate-300 cursor-not-allowed'
                              }`}
                            title={isPaid ? 'Print Bill' : 'Mark as Paid to enable printing'}
                          >
                            <Printer className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Bill Details - {selectedBill.BillNumber}</h3>
              <button
                onClick={() => setSelectedBill(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Patient Name</p>
                  <p className="font-bold text-slate-800">{selectedBill.PatientName || 'Walk-in'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">UHID / IP No</p>
                  <p className="font-mono font-bold text-slate-800">{selectedBill.PatientId || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Bill Date</p>
                  <p className="font-bold text-slate-800">{new Date(selectedBill.Date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Payment Status</p>
                  <span className={`px-2 py-1 text-xs font-bold rounded-md inline-block mt-1 ${selectedBill.PaymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                    {selectedBill.PaymentStatus}
                  </span>
                </div>
              </div>

              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-6 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Loading details...
                </div>
              ) : (
                <>
                  {insuranceDetails && (
                    <div>
                      <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-500" />
                        Active Insurance Details
                      </h4>
                      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Provider</p>
                          <p className="font-bold text-slate-800">{insuranceDetails.insurerName || insuranceDetails.providerId}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Policy Number</p>
                          <p className="font-bold text-slate-800">{insuranceDetails.policyNumber}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Sum Insured</p>
                          <p className="font-bold text-slate-800">₹{Number(insuranceDetails.sumInsured || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Co-pay & Deductible</p>
                          <p className="font-bold text-slate-800">{insuranceDetails.copayPercentage}% / ₹{Number(insuranceDetails.deductible || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {prescriptions && prescriptions.length > 0 && (
                    <div>
                      <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                        <Pill className="w-4 h-4 text-emerald-500" />
                        Prescription Details
                      </h4>
                      <div className="space-y-2">
                        {prescriptions.map((p: any, idx: number) => (
                          <div key={idx} className="bg-emerald-50/30 p-3 rounded-lg border border-emerald-100/50 text-sm flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-slate-800">{p.MedicineName || p.medicineName || p.medicine}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                {p.Type || p.type ? `[${p.Type || p.type}] ` : ''}
                                {p.Dosage || p.dosage || p.Quantity || p.quantity || ''}
                                {p.Frequency || p.frequency ? ` • ${p.Frequency || p.frequency}` : ''}
                                {p.Duration || p.duration ? ` • ${p.Duration || p.duration}` : ''}
                              </p>
                            </div>
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded">
                              {p.Alerts || p.instructions || 'Standard'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Items</h4>
                <div className="space-y-3">
                  {(selectedBill.Items || []).map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                      <div>
                        <p className="font-semibold text-slate-800">{item.ItemDescription}</p>
                        <p className="text-xs text-slate-500">Qty: {item.Quantity} × ₹{item.UnitPrice.toFixed(2)}</p>
                      </div>
                      <p className="font-bold text-slate-800">₹{item.Subtotal.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex flex-col items-end gap-2 text-sm">
                <div className="flex justify-between w-48 text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-medium">₹{selectedBill.TotalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-48 text-slate-600">
                  <span>Discount:</span>
                  <span className="font-medium text-emerald-600">-₹{selectedBill.Discount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-48 text-slate-600">
                  <span>Tax:</span>
                  <span className="font-medium text-slate-800">₹{selectedBill.Tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between w-48 text-lg font-bold text-slate-800 border-t border-slate-100 pt-2 mt-2">
                  <span>Total:</span>
                  <span className="text-primary">₹{selectedBill.NetAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setSelectedBill(null)}
                className="px-6 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              {selectedBill.PaymentStatus === 'Paid' && (
                <button
                  onClick={() => {
                    handlePrint(selectedBill.BillNumber);
                    setSelectedBill(null);
                  }}
                  className="px-6 py-2 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Print Bill
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
