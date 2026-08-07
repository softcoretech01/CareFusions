import { useState, useEffect } from 'react';
import { useIPD } from '../../contexts/IPDContext';
import { Search, CheckCircle, Eye, Printer, AlertCircle } from 'lucide-react';
import { IpdErrorBanner } from './IpdErrorBanner';
import { DischargePrintTemplate } from '../../components/discharge/DischargePrintTemplate';
import { WardTransferHistory } from '../../components/discharge/WardTransferHistory';
import { DateFilter } from '../../components/ui/DateFilter';
import toast from 'react-hot-toast';

// Mock billing status map (patient id -> status)
const MOCK_BILLING: Record<number, 'Cleared' | 'Pending' | 'Partial'> = {
  1: 'Cleared',
  2: 'Pending',
  3: 'Partial',
  4: 'Cleared',   // Priya Sharma — Discharge Requested
  5: 'Pending',   // Ravi Kumar — Discharge Requested
  6: 'Cleared',   // Sunita Verma — Discharged
  7: 'Cleared',   // Arjun Mehta — Discharged
};

export const Discharges = () => {
  const { patients, beds, wards, dischargePatient, refreshAll } = useIPD();

  // Bed and admission state moves constantly — re-pull whenever this screen
  // opens. Keyed to mount rather than the callback identity so it fires exactly
  // once per visit; the context holds an in-flight ref that prevents overlap.
  useEffect(() => { refreshAll?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [search, setSearch] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedDateFrom, setAppliedDateFrom] = useState(today);
  const [appliedDateTo, setAppliedDateTo] = useState(today);

  // Modal states
  const [selectedPatient, setSelectedPatient] = useState<typeof patients[0] | null>(null);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [printPatient, setPrintPatient] = useState<typeof patients[0] | null>(null);

  const handlePrint = (patient: typeof patients[0]) => {
    setPrintPatient(patient);
    // Slight delay to allow React to render the template before print dialog
    setTimeout(() => window.print(), 300);
  };

  const handleSearch = () => {
    setAppliedSearch(search);
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
  };

  const handleReset = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setAppliedSearch('');
    setAppliedDateFrom('');
    setAppliedDateTo('');
  };

  const dischargePatients = patients.filter(p => p.status === 'Discharge Requested' || p.status === 'Discharged');

  const filteredPatients = dischargePatients.filter(p => {
    const matchesSearch = p.patientName.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      p.uhid.toLowerCase().includes(appliedSearch.toLowerCase());

    let matchesDate = true;
    if (appliedDateFrom && appliedDateTo) {
      const pDate = new Date(p.admissionDate).toISOString().split('T')[0];
      matchesDate = pDate >= appliedDateFrom && pDate <= appliedDateTo;
    }

    return matchesSearch && matchesDate;
  });

  const openDischargeModal = (patient: typeof patients[0]) => {
    setSelectedPatient(patient);
    setShowDischargeModal(true);
  };

  const handleDischarge = () => {
    if (!selectedPatient) return;

    const dischargeInfo = {
      dischargeDate: new Date().toISOString().split('T')[0],
      dischargeSummary: selectedPatient.dischargeInfo?.dischargeSummary || 'Patient discharged.',
      dischargedBy: 'Admin',
      medicines: selectedPatient.dischargeInfo?.medicines || []
    };

    dischargePatient(selectedPatient.id, dischargeInfo);
    toast.success(`${selectedPatient.patientName} has been discharged.`);
    setShowDischargeModal(false);
    setSelectedPatient(null);
  };

  const openViewModal = (patient: typeof patients[0]) => {
    setSelectedPatient(patient);
    setShowViewModal(true);
  };

  const openPrintModal = (patient: typeof patients[0]) => {
    handlePrint(patient);
  };



  return (
    <div className="space-y-4">
      <IpdErrorBanner />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Discharge Management</h1>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-10rem)]">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search active patients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <DateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onSearch={handleSearch}
            onReset={handleReset}
          />
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full">
            <thead className="bg-white text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 shadow-sm z-10 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left">Patient Details</th>
                <th className="px-4 py-3 text-left">Ward & Bed</th>
                <th className="px-4 py-3 text-left">Admission Date</th>
                <th className="px-4 py-3 text-left">Billing Status</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No matching patients found.
                  </td>
                </tr>
              ) : (
                filteredPatients.map(patient => {
                  const ward = wards.find(w => w.id === patient.currentWardId);
                  const bed = beds.find(b => b.id === patient.currentBedId);
                  const admitDate = new Date(patient.admissionDate);


                  return (
                    <tr key={patient.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{patient.patientName}</div>
                        <div className="text-xs text-slate-500">{patient.uhid}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-700">{bed?.bedNumber || 'Unassigned'}</div>
                        <div className="text-xs text-slate-500">{ward?.name || 'N/A'} • Room no {bed?.roomNumber || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-700">{admitDate.toLocaleDateString()}</div>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const billing = MOCK_BILLING[patient.id] || 'Pending';
                          const cls = billing === 'Cleared'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : billing === 'Partial'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-red-50 text-red-600 border-red-200';
                          return (
                            <span className={`px-3 py-1.5 text-xs font-bold rounded-lg border inline-block ${cls}`}>
                              {billing}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        {patient.status === 'Discharge Requested' ? (
                          <button
                            onClick={() => openDischargeModal(patient)}
                            className="px-3 py-1.5 bg-primary text-white hover:bg-primary/90 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                          >
                            Final Discharge <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-200 inline-block">
                            Discharged
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openViewModal(patient)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View patient details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const billing = MOCK_BILLING[patient.id] || 'Pending';
                              const cleared = billing === 'Cleared';
                              if (cleared) openPrintModal(patient);
                            }}
                            disabled={!(MOCK_BILLING[patient.id] === 'Cleared')}
                            className={`p-2 rounded-lg transition-colors ${MOCK_BILLING[patient.id] === 'Cleared' ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-300 cursor-not-allowed'}`}
                            title={MOCK_BILLING[patient.id] === 'Cleared' ? 'Print discharge summary' : 'Billing not cleared'}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Discharge Confirmation Modal */}
      {showDischargeModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Confirm Final Discharge</h2>
                <p className="text-sm text-slate-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Patient</p>
                <p className="font-bold text-slate-800 text-lg">{selectedPatient.patientName}</p>
                <p className="text-sm text-slate-500">{selectedPatient.uhid} · {selectedPatient.admissionNumber}</p>
              </div>
              <p className="text-sm text-slate-600">
                Are you sure you want to discharge this patient? The patient's status will be changed to <span className="font-bold text-primary">Discharged</span>.
              </p>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDischargeModal(false)}
                className="px-6 py-2.5 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDischarge}
                className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Yes, Discharge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Patient Details Modal */}
      {showViewModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Patient Details & Discharge Information</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-slate-500 hover:text-slate-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Patient Name</p>
                  <p className="font-bold text-slate-800">{selectedPatient.patientName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">UHID</p>
                  <p className="font-bold text-slate-800">{selectedPatient.uhid}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Age/Gender</p>
                  <p className="text-slate-700">{selectedPatient.age} years / {selectedPatient.gender}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Admission Number</p>
                  <p className="text-slate-700">{selectedPatient.admissionNumber}</p>
                </div>
              </div>

              {/* Discharge Info */}
              {selectedPatient.dischargeInfo && (
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="font-bold text-slate-800 mb-3">Discharge Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Discharge Date</p>
                      <p className="text-slate-700">{new Date(selectedPatient.dischargeInfo.dischargeDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Discharge Summary</p>
                      <p className="text-slate-700 whitespace-pre-wrap">{selectedPatient.dischargeInfo.dischargeSummary}</p>
                    </div>
                    {selectedPatient.dischargeInfo.medicines.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Discharge Medicines</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border border-slate-200">
                            <thead>
                              <tr className="bg-slate-100">
                                <th className="px-3 py-2 text-left font-semibold">Medicine</th>
                                <th className="px-3 py-2 text-left font-semibold">Dosage</th>
                                <th className="px-3 py-2 text-left font-semibold">Frequency</th>
                                <th className="px-3 py-2 text-left font-semibold">Duration</th>
                                <th className="px-3 py-2 text-left font-semibold">Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedPatient.dischargeInfo.medicines.map((med, idx) => (
                                <tr key={idx} className="border-t border-slate-200">
                                  <td className="px-3 py-2">{med.medicineName}</td>
                                  <td className="px-3 py-2">{med.dosage}</td>
                                  <td className="px-3 py-2">{med.frequency}</td>
                                  <td className="px-3 py-2">{med.duration}</td>
                                  <td className="px-3 py-2">{med.quantity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ward Transfer History */}
              {selectedPatient.wardTransferHistory.length > 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <WardTransferHistory transfers={selectedPatient.wardTransferHistory} />
                </div>
              )}
            </div>

            <div className="sticky bottom-0 px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-6 py-2.5 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden print-only discharge template — rendered off-screen, shown only via @media print */}
      {printPatient && printPatient.dischargeInfo && (
        <div id="discharge-print-area" className="hidden print:block">
          <DischargePrintTemplate
            patient={printPatient}
            medicines={printPatient.dischargeInfo.medicines.map(m => ({
              id: m.medicineId.toString(),
              medicineId: m.medicineId,
              medicineName: m.medicineName,
              dosage: m.dosage,
              frequency: m.frequency,
              duration: m.duration,
              quantity: m.quantity,
              notes: m.notes
            }))}
            dischargeSummary={printPatient.dischargeInfo.dischargeSummary}
            dischargeDate={new Date(printPatient.dischargeInfo.dischargeDate).toLocaleDateString()}
            dischargedBy={printPatient.dischargeInfo.dischargedBy}
          />
        </div>
      )}

      {/* Global print style — hide everything except print area */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #discharge-print-area { display: block !important; position: absolute; inset: 0; width: 100%; visibility: visible !important; }
          #discharge-print-area * { visibility: visible !important; }
        }
      `}</style>
    </div>
  );
};
