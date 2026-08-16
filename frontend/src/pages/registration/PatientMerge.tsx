import { useState } from 'react';
import { Search, Merge, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL as string;
import type { GlobalPatientRecord } from '../../contexts/PatientContext';

export const PatientMerge = () => {

  const [patients, setPatients] = useState<any[]>([]);


  
  const [primaryUhid, setPrimaryUhid] = useState('');
  const [secondaryUhid, setSecondaryUhid] = useState('');
  
  const [primaryPatient, setPrimaryPatient] = useState<GlobalPatientRecord | null>(null);
  const [secondaryPatient, setSecondaryPatient] = useState<GlobalPatientRecord | null>(null);
  
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const [patientsRes, quickRes, emergencyRes] = await Promise.all([
          fetch(`${API_BASE}/patients/`),
          fetch(`${API_BASE}/quick-registrations/`),
          fetch(`${API_BASE}/emergency-registrations/`)
        ]);

        let allPatients: any[] = [];

        if (patientsRes.ok) {
          const data = await patientsRes.json();
          allPatients = allPatients.concat(data.map((d: any) => ({
            id: d.PatientId,
            uhid: d.Uhid,
            patientName: d.PatientName,
            firstName: d.PatientName,
            lastName: '',
            gender: d.Gender,
            age: d.Age,
            mobileNumber: d.MobileNumber,
            registrationDate: d.RegistrationDate,
            status: d.Status || 'Active',
            source: 'patients',
            _originalData: d
          })));
        }

        if (quickRes.ok) {
          const data = await quickRes.json();
          allPatients = allPatients.concat(data.map((d: any) => ({
            id: d.QuickRegistrationId,
            uhid: d.Uhid,
            patientName: d.PatientName,
            firstName: d.PatientName,
            lastName: '',
            gender: d.Gender,
            age: d.Age,
            mobileNumber: d.MobileNumber,
            registrationDate: d.RegistrationDate,
            status: d.Status || 'Active',
            source: 'quick-registrations',
            _originalData: d
          })));
        }

        if (emergencyRes.ok) {
          const data = await emergencyRes.json();
          allPatients = allPatients.concat(data.map((d: any) => ({
            id: d.EmergencyRegistrationId,
            uhid: d.Uhid,
            patientName: d.PatientName,
            firstName: d.PatientName,
            lastName: '',
            gender: d.Gender,
            age: d.ApproximateAge,
            mobileNumber: d.EmergencyContactPhone,
            registrationDate: d.RegistrationDate,
            status: d.Status || 'Active',
            source: 'emergency-registrations',
            _originalData: d
          })));
        }

        setPatients(allPatients);
      } catch (e) {
        console.error('Failed to fetch patients', e);
      }
    };
    fetchPatients();
  }, [mergeSuccess]); // Re-fetch when a merge completes


  const handleSearchPrimary = () => {
    const p = patients.find(p => p.uhid.toLowerCase() === primaryUhid.toLowerCase());
    setPrimaryPatient(p || null);
  };

  const handleSearchSecondary = () => {
    const p = patients.find(p => p.uhid.toLowerCase() === secondaryUhid.toLowerCase());
    setSecondaryPatient(p || null);
  };


  const handleMerge = async () => {
    if (primaryPatient && secondaryPatient) {
      try {
        // Construct the full update payload using the secondary patient's original data
        const updatePayload = {
          ...secondaryPatient._originalData,
          Status: 'Inactive',
          Remarks: `Merged into ${primaryPatient.uhid}`
        };

        const res = await fetch(`${API_BASE}/${secondaryPatient.source}/${secondaryPatient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload)
        });

        if (res.ok) {
          setIsMergeModalOpen(false);
          setMergeSuccess(true);
          setTimeout(() => setMergeSuccess(false), 5000);
          
          // Clear forms
          setPrimaryUhid('');
          setSecondaryUhid('');
          setPrimaryPatient(null);
          setSecondaryPatient(null);
        } else {
          alert('Merge failed - Database error');
        }
      } catch (e) {
        console.error('Merge failed', e);
        alert('Merge failed - Network error');
      }
    }
  };


  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Patient Merge</h1>
        </div>
      </div>

      {mergeSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          <div className="font-medium">Patients successfully merged! The secondary UHID has been deactivated.</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 min-h-0">
        
        {/* Primary Patient */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Primary Record</h3>
              <p className="text-sm text-slate-500">This UHID will be kept active.</p>
            </div>
          </div>
          
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              placeholder="Enter Primary UHID..."
              value={primaryUhid}
              onChange={(e) => setPrimaryUhid(e.target.value)}
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Button variant="filled" color="primary" onClick={handleSearchPrimary}>Search</Button>
          </div>

          {primaryPatient ? (
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4 flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-slate-500">Patient Name</div>
                  <div className="text-lg font-bold text-slate-800">{primaryPatient.patientName || `${primaryPatient.firstName} ${primaryPatient.lastName}`}</div>
                </div>
                <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                  {primaryPatient.status}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <div className="text-xs text-slate-500">Gender / Age</div>
                  <div className="font-medium text-slate-700">{primaryPatient.gender} / {primaryPatient.age}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Mobile Number</div>
                  <div className="font-medium text-slate-700">{primaryPatient.mobileNumber || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Registration Date</div>
                  <div className="font-medium text-slate-700">{primaryPatient.registrationDate}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
              <Search className="w-10 h-10 mb-2 opacity-50" />
              <p>Search for primary record</p>
            </div>
          )}
        </div>

        {/* Secondary Patient */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Secondary Record</h3>
              <p className="text-sm text-slate-500">This UHID will be merged and deactivated.</p>
            </div>
          </div>
          
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              placeholder="Enter Secondary UHID..."
              value={secondaryUhid}
              onChange={(e) => setSecondaryUhid(e.target.value)}
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Button variant="filled" color="secondary" onClick={handleSearchSecondary}>Search</Button>
          </div>

          {secondaryPatient ? (
            <div className="bg-red-50/50 rounded-2xl p-6 border border-red-100 space-y-4 flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-slate-500">Patient Name</div>
                  <div className="text-lg font-bold text-slate-800">{secondaryPatient.patientName || `${secondaryPatient.firstName} ${secondaryPatient.lastName}`}</div>
                </div>
                <div className="bg-slate-200 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">
                  {secondaryPatient.status}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-red-100">
                <div>
                  <div className="text-xs text-slate-500">Gender / Age</div>
                  <div className="font-medium text-slate-700">{secondaryPatient.gender} / {secondaryPatient.age}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Mobile Number</div>
                  <div className="font-medium text-slate-700">{secondaryPatient.mobileNumber || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Registration Date</div>
                  <div className="font-medium text-slate-700">{secondaryPatient.registrationDate}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
              <Search className="w-10 h-10 mb-2 opacity-50" />
              <p>Search for secondary record</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Button 
          variant="filled" 
          color="primary" 
          size="lg" 
          icon={Merge}
          disabled={!primaryPatient || !secondaryPatient || primaryPatient.uhid === secondaryPatient.uhid}
          onClick={() => setIsMergeModalOpen(true)}
          className="w-full md:w-auto px-12 py-4 text-lg shadow-lg hover:shadow-xl transition-all"
        >
          Merge Records
        </Button>
      </div>

      {/* Merge Confirmation Modal */}
      {isMergeModalOpen && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border-2 border-red-500">
            <div className="p-6 bg-red-50 border-b border-red-100 flex items-center gap-4">
              <ShieldAlert className="w-8 h-8 text-red-600" />
              <div>
                <h2 className="text-xl font-bold text-red-700">Confirm Merge Action</h2>
                <p className="text-sm text-red-600/80 mt-1">This action cannot be fully undone.</p>
              </div>
            </div>
            
            <div className="p-8 text-center space-y-6">
              <p className="text-slate-600 text-lg">
                Are you sure you want to merge <br/>
                <strong className="text-slate-800">{secondaryPatient?.uhid}</strong> into <strong className="text-slate-800">{primaryPatient?.uhid}</strong>?
              </p>
              
              <div className="flex items-center justify-center gap-4 text-slate-400">
                <div className="bg-red-50 text-red-700 px-4 py-2 rounded-xl border border-red-100 font-mono">
                  {secondaryPatient?.uhid}
                </div>
                <ArrowRight className="w-6 h-6" />
                <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 font-mono">
                  {primaryPatient?.uhid}
                </div>
              </div>
              
              <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">
                All clinical history, documents, and bills belonging to the secondary record will be reassigned to the primary record. The secondary UHID will be marked as <strong>Inactive</strong>.
              </p>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsMergeModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="filled" className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleMerge}>
                Yes, Merge Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
