import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useIPD } from '../../contexts/IPDContext';
import { Search, CheckCircle, Eye, Printer, AlertCircle, FileText, Edit, X } from 'lucide-react';
import { IpdErrorBanner } from './IpdErrorBanner';
import { DischargePrintTemplate } from '../../components/discharge/DischargePrintTemplate';
import { DischargePrescription, type DischargeItem } from '../../components/discharge/DischargePrescription';
import { WardTransferHistory } from '../../components/discharge/WardTransferHistory';
import { DateFilter } from '../../components/ui/DateFilter';
import toast from 'react-hot-toast';

// No mock billing anymore, we fetch real bills from API

export const Discharges = () => {
  const navigate = useNavigate();
  const { patients, beds, wards, dischargePatient, requestDischarge, refreshAll } = useIPD();

  const [bills, setBills] = useState<any[]>([]);

  // Bed and admission state moves constantly — re-pull whenever this screen
  // opens. Keyed to mount rather than the callback identity so it fires exactly
  // once per visit; the context holds an in-flight ref that prevents overlap.
  useEffect(() => { 
    refreshAll?.(); 
    axios.get(`${import.meta.env.VITE_API_URL}/ip-billing/`).then(res => setBills(res.data)).catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getBillingStatus = (uhid: string): 'Pending' | 'Cleared' | 'Partial' => {
    const patientBills = bills.filter(b => b.Uhid === uhid);
    if (patientBills.length === 0) return 'Pending';
    if (patientBills.some(b => b.PaymentStatus === 'Partial')) return 'Partial';
    return patientBills.some(b => b.PaymentStatus === 'Paid') ? 'Cleared' : 'Pending';
  };
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSummary, setEditSummary] = useState('');
  const [editMedicines, setEditMedicines] = useState<DischargeItem[]>([]);
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
      if (p.status === 'Discharge Requested') {
        // Pending requests should always be visible so they aren't missed
        matchesDate = true;
      } else {
        const pDate = p.dischargeInfo?.dischargeDate
          ? new Date(p.dischargeInfo.dischargeDate).toISOString().split('T')[0]
          : new Date(p.admissionDate).toISOString().split('T')[0];
        matchesDate = pDate >= appliedDateFrom && pDate <= appliedDateTo;
      }
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

  const openEditModal = (patient: typeof patients[0]) => {
    setSelectedPatient(patient);
    setEditSummary(patient.dischargeInfo?.dischargeSummary || '');
    setEditMedicines(patient.dischargeInfo?.medicines.map(m => ({ ...m, id: m.medicineId.toString() })) || []);
    setShowEditModal(true);
  };

  const handleEditSave = () => {
    if (!selectedPatient) return;
    
    const dischargeInfo = {
      dischargeDate: selectedPatient.dischargeInfo?.dischargeDate || new Date().toISOString().split('T')[0],
      dischargeSummary: editSummary,
      dischargedBy: selectedPatient.dischargeInfo?.dischargedBy || 'Admin',
      medicines: editMedicines.map(m => ({
        medicineId: m.medicineId,
        medicineName: m.medicineName,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        quantity: m.quantity,
        notes: m.notes || ''
      }))
    };

    if (selectedPatient.status === 'Discharge Requested') {
      requestDischarge(selectedPatient.id, dischargeInfo);
    } else {
      dischargePatient(selectedPatient.id, dischargeInfo);
    }
    
    toast.success('Discharge information updated successfully');
    setShowEditModal(false);
    
    // Redirect to IP Billing Generate Bill page
    navigate('/billing/ip', {
      state: {
        uhid: selectedPatient.uhid,
        patientName: selectedPatient.patientName
      }
    });
    
    setSelectedPatient(null);
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
                          const billing = getBillingStatus(patient.uhid);
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
                        {patient.status === 'Discharge Requested' ? (() => {
                          const billingStatus = getBillingStatus(patient.uhid);
                          const isCleared = billingStatus === 'Cleared';
                          return (
                            <button
                              onClick={() => isCleared && openDischargeModal(patient)}
                              disabled={!isCleared}
                              title={!isCleared ? "Billing must be cleared first" : ""}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                                isCleared 
                                  ? 'bg-primary text-white hover:bg-primary/90' 
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              Final Discharge <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          );
                        })() : (
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
                            onClick={() => openEditModal(patient)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit discharge details"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          {getBillingStatus(patient.uhid) !== 'Cleared' && (
                            <button
                              onClick={() => navigate('/billing/ip', { state: { autoLoadUhid: patient.uhid } })}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Generate Bill"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              const billing = getBillingStatus(patient.uhid);
                              const cleared = billing === 'Cleared';
                              if (cleared) openPrintModal(patient);
                            }}
                            disabled={getBillingStatus(patient.uhid) !== 'Cleared'}
                            className={`p-2 rounded-lg transition-colors ${getBillingStatus(patient.uhid) === 'Cleared' ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-300 cursor-not-allowed'}`}
                            title={getBillingStatus(patient.uhid) === 'Cleared' ? 'Print discharge summary' : 'Billing not cleared'}
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

      {/* Edit Discharge Info Modal */}
      {showEditModal && selectedPatient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">Edit Discharge Information</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 block mb-1">Patient Name</span>
                    <span className="font-bold text-slate-800">{selectedPatient.patientName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">UHID</span>
                    <span className="font-bold text-slate-800">{selectedPatient.uhid}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Admission No</span>
                    <span className="font-bold text-slate-800">{selectedPatient.admissionNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Status</span>
                    <span className="font-bold text-primary">{selectedPatient.status}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-t border-slate-200 pt-6">
                  <DischargePrescription 
                    items={editMedicines}
                    onItemsChange={setEditMedicines}
                    dischargeSummary={editSummary}
                    onSummaryChange={setEditSummary}
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 mt-auto">
              <button 
                onClick={() => setShowEditModal(false)}
                className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleEditSave}
                className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
              >
                Save Changes
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
