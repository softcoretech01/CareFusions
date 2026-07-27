import { useState } from 'react';
import { Search, ShieldCheck, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { usePatients } from '../../contexts/PatientContext';

export const InsuranceVerification = () => {
  const { patients, updatePatient } = usePatients();
  
  // Get all patients with insurance
  const insurancePatients = patients.filter(p => p.insuranceRequired === 'Yes');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [verificationRemarks, setVerificationRemarks] = useState('');

  const filteredRecords = insurancePatients.filter(record => {
    const matchesSearch = 
      record.uhid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.patientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.policyNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // We don't have a strict verificationStatus in the context yet, so we mock it based on remarks or assume Pending
    // Let's just treat "status" as our filter for now or mock a verification state
    const matchesStatus = !filterStatus || record.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleVerifyClick = (patient: any) => {
    setSelectedPatient(patient);
    setVerificationRemarks(patient.remarks || '');
    setIsVerificationOpen(true);
  };

  const handleStatusUpdate = (status: 'Active' | 'Inactive') => {
    if (selectedPatient) {
      updatePatient(selectedPatient.id, { 
        status: status,
        remarks: verificationRemarks 
      });
      setIsVerificationOpen(false);
    }
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Insurance Verification</h1>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by UHID, Name, or Policy No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
          >
            <option value="">All Verification Status</option>
            <option value="Active">Verified (Active)</option>
            <option value="Waiting">Pending (Waiting)</option>
            <option value="Inactive">Rejected (Inactive)</option>
          </select>
        </div>

        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-medium">UHID / Name</th>
                <th className="px-4 py-3 font-medium">Insurance Provider</th>
                <th className="px-4 py-3 font-medium">TPA</th>
                <th className="px-4 py-3 font-medium">Policy No.</th>
                <th className="px-4 py-3 font-medium">Valid Till</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-primary">{record.uhid}</div>
                      <div className="text-slate-600 text-xs mt-0.5">{record.patientName}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{record.insuranceProvider || 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-600">{record.tpa || 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-600">{record.policyNumber || 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-600">{record.validTill || 'N/A'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        record.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                        record.status === 'Waiting' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                        'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        {record.status === 'Active' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {record.status === 'Waiting' && <AlertCircle className="w-3.5 h-3.5" />}
                        {record.status === 'Inactive' && <XCircle className="w-3.5 h-3.5" />}
                        {record.status === 'Active' ? 'Verified' : record.status === 'Waiting' ? 'Pending' : 'Rejected'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleVerifyClick(record)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Verify / Update"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <ShieldCheck className="w-10 h-10 text-slate-300" />
                      <p className="text-lg font-medium text-slate-600">No insurance records found</p>
                      <p className="text-sm">Patients with 'Insurance Required' set to Yes will appear here.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Modal */}
      {isVerificationOpen && selectedPatient && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Verify Insurance</h2>
                  <p className="text-sm text-slate-500">{selectedPatient.uhid} - {selectedPatient.patientName}</p>
                </div>
              </div>
              <button onClick={() => setIsVerificationOpen(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <div className="text-slate-500 mb-1">Provider</div>
                  <div className="font-semibold text-slate-800">{selectedPatient.insuranceProvider || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">TPA</div>
                  <div className="font-semibold text-slate-800">{selectedPatient.tpa || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Policy No.</div>
                  <div className="font-semibold text-slate-800">{selectedPatient.policyNumber || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Valid Till</div>
                  <div className="font-semibold text-slate-800">{selectedPatient.validTill || 'N/A'}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Verification Remarks</label>
                <textarea
                  value={verificationRemarks}
                  onChange={(e) => setVerificationRemarks(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 h-24 resize-none"
                  placeholder="Enter pre-auth numbers, coverage limits, or rejection reasons..."
                />
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <Button variant="filled" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleStatusUpdate('Active')}>
                Approve (Active)
              </Button>
              <Button variant="filled" className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => handleStatusUpdate('Inactive')}>
                Reject (Inactive)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
