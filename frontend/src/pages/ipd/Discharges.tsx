import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useIPD } from '../../contexts/IPDContext';
import { Search, CheckCircle, Eye, Printer, AlertCircle, Edit, X, Activity, FileText, FlaskConical, Stethoscope } from 'lucide-react';
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
  const [appliedSearch, setAppliedSearch] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const firstDay = `${today.split('-')[0]}-${today.split('-')[1]}-01`;
  const [dateFrom, setDateFrom] = useState(firstDay);
  const [dateTo, setDateTo] = useState(today);
  const [appliedDateFrom, setAppliedDateFrom] = useState(firstDay);
  const [appliedDateTo, setAppliedDateTo] = useState(today);

  // Modal states
  const [selectedPatient, setSelectedPatient] = useState<typeof patients[0] | null>(null);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSummary, setEditSummary] = useState('');
  const [editMedicines, setEditMedicines] = useState<DischargeItem[]>([]);
  const [printPatient, setPrintPatient] = useState<typeof patients[0] | null>(null);

  // EMR & Order States
  const [activeTab, setActiveTab] = useState<'overview' | 'emr' | 'investigations' | 'discharge'>('overview');
  const [emrData, setEmrData] = useState({ vitals: [], rounds: [], medications: [] });
  const [labOrders, setLabOrders] = useState<any[]>([]);
  const [radOrders, setRadOrders] = useState<any[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);

  useEffect(() => {
    if (showViewModal && selectedPatient) {
      setActiveTab('overview');
      const fetchPatientDetails = async () => {
        setIsFetchingData(true);
        try {
          const admissionId = selectedPatient.id;
          const uhid = selectedPatient.uhid;
          const API = import.meta.env.VITE_API_URL;

          const [vitals, rounds, meds, labReq, radReq] = await Promise.allSettled([
            axios.get(`${API}/ipd/admissions/${admissionId}/vitals`),
            axios.get(`${API}/ipd/admissions/${admissionId}/rounds`),
            axios.get(`${API}/ipd/admissions/${admissionId}/medications`),
            axios.get(`${API}/lab/orders?uhid=${uhid}`),
            axios.get(`${API}/radiology/orders`)
          ]);

          setEmrData({
            vitals: vitals.status === 'fulfilled' ? vitals.value.data : [],
            rounds: rounds.status === 'fulfilled' ? rounds.value.data : [],
            medications: meds.status === 'fulfilled' ? meds.value.data : []
          });

          setLabOrders(labReq.status === 'fulfilled' ? labReq.value.data : []);
          
          if (radReq.status === 'fulfilled') {
            // filter locally since endpoint doesn't support uhid
            const allRad = radReq.value.data;
            setRadOrders(allRad.filter((r: any) => r.uhid === uhid));
          } else {
            setRadOrders([]);
          }
        } catch (error) {
          console.error("Failed to fetch detailed records", error);
        } finally {
          setIsFetchingData(false);
        }
      };
      fetchPatientDetails();
    }
  }, [showViewModal, selectedPatient]);

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
    setDateFrom(firstDay);
    setDateTo(today);
    setSearch('');
    setAppliedSearch('');
    setAppliedDateFrom(firstDay);
    setAppliedDateTo(today);
  };

  const dischargePatients = patients.filter(p => p.status === 'Discharge Requested' || p.status === 'Discharged');

  const filteredPatients = dischargePatients.filter(p => {
    const matchesSearch = p.patientName.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      p.uhid.toLowerCase().includes(appliedSearch.toLowerCase());

    let matchesDate = true;
    if (appliedDateFrom && appliedDateTo) {
      const pDate = p.dischargeInfo?.dischargeDate
        ? p.dischargeInfo.dischargeDate.substring(0, 10)
        : p.admissionDate.substring(0, 10);
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
                <th className="px-4 py-3 text-left">Dates</th>
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
                        <div className="text-sm font-medium text-slate-700" title="Admission Date">Admit: {admitDate.toLocaleDateString()}</div>
                        {patient.dischargeInfo?.dischargeDate && (
                          <div className="text-xs text-slate-500 mt-0.5" title="Discharge Date">Disc: {new Date(patient.dischargeInfo.dischargeDate).toLocaleDateString()}</div>
                        )}
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
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 bg-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-lg">
                  {selectedPatient.patientName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedPatient.patientName}</h2>
                  <p className="text-slate-300 text-sm">{selectedPatient.uhid} • {selectedPatient.age}y / {selectedPatient.gender}</p>
                </div>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex border-b border-slate-200 shrink-0 bg-slate-50 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: FileText },
                { id: 'emr', label: 'EMR Details', icon: Activity },
                { id: 'investigations', label: 'Investigations', icon: FlaskConical },
                { id: 'discharge', label: 'Discharge Info', icon: Stethoscope }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-slate-50/50">
              {isFetchingData ? (
                <div className="flex items-center justify-center h-40">
                  <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-primary" /> Admission Summary
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Admission No</p>
                            <p className="font-bold text-slate-800">{selectedPatient.admissionNumber}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Admission Date</p>
                            <p className="font-medium text-slate-800">{new Date(selectedPatient.admissionDate).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Admission Source</p>
                            <p className="font-bold text-indigo-600">
                              {selectedPatient.admissionType === 'Emergency' ? 'Direct IP' : 'OP to IP'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Status</p>
                            <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-bold rounded border border-green-200 inline-block">
                              {selectedPatient.status}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Admitting Doctor</p>
                            <p className="text-slate-700">{selectedPatient.admittingDoctor || 'N/A'}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Provisional Diagnosis</p>
                            <p className="text-slate-700">{selectedPatient.provisionalDiagnosis || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Ward Transfer History */}
                      {selectedPatient.wardTransferHistory.length > 0 && (
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                          <h3 className="font-bold text-slate-800 mb-4">Ward Transfers</h3>
                          <WardTransferHistory transfers={selectedPatient.wardTransferHistory} />
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'emr' && (
                    <div className="space-y-6">
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4">Clinical Rounds</h3>
                        {emrData.rounds.length === 0 ? (
                          <p className="text-sm text-slate-500">No rounds recorded for this admission.</p>
                        ) : (
                          <div className="space-y-4">
                            {emrData.rounds.map((round: any) => (
                              <div key={round.id} className="border border-slate-100 rounded-lg p-4 bg-slate-50/50">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="font-bold text-slate-800">{round.doctor_name}</p>
                                    <p className="text-xs text-slate-500">{new Date(round.round_time).toLocaleString()}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                  <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase">Notes</p>
                                    <p className="text-sm text-slate-700">{round.notes}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase">Plan</p>
                                    <p className="text-sm text-slate-700">{round.plan}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4">Vitals</h3>
                        {emrData.vitals.length === 0 ? (
                          <p className="text-sm text-slate-500">No vitals recorded.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                <tr>
                                  <th className="px-4 py-3">Time</th>
                                  <th className="px-4 py-3">BP (mmHg)</th>
                                  <th className="px-4 py-3">Pulse (bpm)</th>
                                  <th className="px-4 py-3">Temp (°F)</th>
                                  <th className="px-4 py-3">SpO2 (%)</th>
                                  <th className="px-4 py-3">Recorded By</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {emrData.vitals.map((v: any) => (
                                  <tr key={v.id}>
                                    <td className="px-4 py-3">{new Date(v.recorded_at).toLocaleString()}</td>
                                    <td className="px-4 py-3">{v.blood_pressure || '-'}</td>
                                    <td className="px-4 py-3">{v.heart_rate || '-'}</td>
                                    <td className="px-4 py-3">{v.temperature || '-'}</td>
                                    <td className="px-4 py-3">{v.spo2 || '-'}</td>
                                    <td className="px-4 py-3">{v.recorded_by}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4">Medications</h3>
                        {emrData.medications.length === 0 ? (
                          <p className="text-sm text-slate-500">No medications prescribed.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                <tr>
                                  <th className="px-4 py-3">Medicine</th>
                                  <th className="px-4 py-3">Dosage</th>
                                  <th className="px-4 py-3">Frequency</th>
                                  <th className="px-4 py-3">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {emrData.medications.map((m: any) => (
                                  <tr key={m.id}>
                                    <td className="px-4 py-3 font-medium text-slate-800">{m.medicine_name}</td>
                                    <td className="px-4 py-3">{m.dosage}</td>
                                    <td className="px-4 py-3">{m.frequency}</td>
                                    <td className="px-4 py-3">
                                      <span className={`px-2 py-1 text-xs font-bold rounded ${m.status === 'Active' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {m.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'investigations' && (
                    <div className="space-y-6">
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4">Laboratory Orders</h3>
                        {labOrders.length === 0 ? (
                          <p className="text-sm text-slate-500">No lab orders found.</p>
                        ) : (
                          <div className="space-y-4">
                            {labOrders.map((order: any) => (
                              <div key={order.order_id} className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                  <div>
                                    <span className="font-bold text-slate-800">{order.order_number}</span>
                                    <span className="text-xs text-slate-500 ml-3">{new Date(order.ordered_at).toLocaleString()}</span>
                                  </div>
                                  <span className={`px-2 py-1 text-xs font-bold rounded ${order.status === 'Completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                    {order.status}
                                  </span>
                                </div>
                                <table className="w-full text-sm text-left">
                                  <thead className="bg-slate-50/50 text-xs text-slate-500">
                                    <tr>
                                      <th className="px-4 py-2">Test Name</th>
                                      <th className="px-4 py-2">Status</th>
                                      <th className="px-4 py-2">Result</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {(order.tests || []).map((t: any) => (
                                      <tr key={t.order_test_id}>
                                        <td className="px-4 py-3">{t.test_name}</td>
                                        <td className="px-4 py-3">{t.status}</td>
                                        <td className="px-4 py-3 font-medium text-slate-800">{t.result_value || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4">Radiology Orders</h3>
                        {radOrders.length === 0 ? (
                          <p className="text-sm text-slate-500">No radiology orders found.</p>
                        ) : (
                          <div className="space-y-4">
                            {radOrders.map((order: any) => (
                              <div key={order.order_id} className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                  <div>
                                    <span className="font-bold text-slate-800">{order.order_number}</span>
                                    <span className="text-xs text-slate-500 ml-3">{new Date(order.ordered_at).toLocaleString()}</span>
                                  </div>
                                  <span className={`px-2 py-1 text-xs font-bold rounded ${order.status === 'Completed' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                    {order.status}
                                  </span>
                                </div>
                                <table className="w-full text-sm text-left">
                                  <thead className="bg-slate-50/50 text-xs text-slate-500">
                                    <tr>
                                      <th className="px-4 py-2">Test Name</th>
                                      <th className="px-4 py-2">Status</th>
                                      <th className="px-4 py-2">Notes/Result</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {(order.tests || []).map((t: any) => (
                                      <tr key={t.order_test_id}>
                                        <td className="px-4 py-3">{t.test_name}</td>
                                        <td className="px-4 py-3">{t.status}</td>
                                        <td className="px-4 py-3 text-slate-700 text-xs">{t.notes || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'discharge' && (
                    <div className="space-y-6">
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4">Discharge Information</h3>
                        {!selectedPatient.dischargeInfo ? (
                          <div className="text-center py-8">
                            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-medium">Patient has not been discharged yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Discharge Date</p>
                                <p className="font-medium text-slate-800">{new Date(selectedPatient.dischargeInfo.dischargeDate).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Discharged By</p>
                                <p className="font-medium text-slate-800">{selectedPatient.dischargeInfo.dischargedBy}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Discharge Summary</p>
                                <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap border border-slate-100">
                                  {selectedPatient.dischargeInfo.dischargeSummary || 'No summary provided.'}
                                </div>
                              </div>
                            </div>

                            {selectedPatient.dischargeInfo.medicines.length > 0 && (
                              <div>
                                <h4 className="font-bold text-slate-800 mb-3">Discharge Medications</h4>
                                <div className="overflow-hidden border border-slate-200 rounded-lg">
                                  <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                                      <tr>
                                        <th className="px-4 py-3">Medicine</th>
                                        <th className="px-4 py-3">Dosage</th>
                                        <th className="px-4 py-3">Frequency</th>
                                        <th className="px-4 py-3">Duration</th>
                                        <th className="px-4 py-3">Qty</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {selectedPatient.dischargeInfo.medicines.map((med, idx) => (
                                        <tr key={idx}>
                                          <td className="px-4 py-3 font-medium text-slate-800">{med.medicineName}</td>
                                          <td className="px-4 py-3">{med.dosage}</td>
                                          <td className="px-4 py-3">{med.frequency}</td>
                                          <td className="px-4 py-3">{med.duration}</td>
                                          <td className="px-4 py-3 font-bold">{med.quantity}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-slate-800">Edit Discharge Info: {selectedPatient.patientName}</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Discharge Summary</label>
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  rows={4}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:bg-white transition-colors"
                  placeholder="Enter discharge summary, diagnosis, and post-discharge instructions..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Discharge Medicines</label>
                <DischargePrescription
                  medicines={editMedicines}
                  onChange={setEditMedicines}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  className="px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 font-bold transition-colors"
                >
                  Save & Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {printPatient && (
        <DischargePrintTemplate patient={printPatient} />
      )}
    </div>
  );
};
