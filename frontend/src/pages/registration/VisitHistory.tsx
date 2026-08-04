import { useState } from 'react';
import { Search, History, Calendar, User, Activity, Clock, FileText } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL as string;
import { exportToExcel } from '../../utils/exportToExcel';

interface VisitRecord {
  id: string;
  date: string;
  time: string;
  type: string;
  department: string;
  doctor: string;
  status: string;
  notes: string;
}

export const VisitHistory = () => {

  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch(`${API_BASE}/patients/`);
        if (res.ok) {
          const data = await res.json();
          setPatients(data.map((d: any) => ({
            uhid: d.Uhid,
            patientName: d.PatientName,
            registrationDate: d.RegistrationDate,
            patientType: d.PatientType || 'OP',
            department: d.Department || 'General Medicine',
            primaryDoctor: d.PrimaryDoctor || 'Dr. Assigned'
          })));
        }
      } catch (e) {
        console.error('Failed to fetch patients', e);
      }
    };
    fetchPatients();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUhid, setSelectedUhid] = useState<string>('');

  const filteredPatients = patients.filter(p => 
    p.uhid.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.patientName || '').toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);

  const selectedPatient = patients.find(p => p.uhid === selectedUhid);

  const [visits, setVisits] = useState<VisitRecord[]>([]);

  useEffect(() => {
    if (selectedUhid) {
      const fetchVisits = async () => {
        try {
          const res = await fetch(`${API_BASE}/visits/${selectedUhid}`);
          if (res.ok) {
            const data = await res.json();
            setVisits(data.map((v: any) => ({
              id: v.VisitId.toString(),
              date: v.VisitDate,
              time: v.VisitTime || '00:00',
              type: v.VisitType,
              department: v.Department || 'General',
              doctor: v.Doctor || '-',
              status: v.Status || 'Scheduled',
              notes: v.Notes || ''
            })));
          } else {
            setVisits([]);
          }
        } catch (e) {
          console.error('Failed to fetch visits', e);
          setVisits([]);
        }
      };
      fetchVisits();
    } else {
      setVisits([]);
    }
  }, [selectedUhid]);




  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Visit History</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        
        {/* Left Column - Patient Search */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col h-full">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Select Patient</h3>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by UHID or Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                {filteredPatients.map(patient => (
                  <div 
                    key={patient.uhid}
                    onClick={() => setSelectedUhid(patient.uhid)}
                    className={`p-4 rounded-xl cursor-pointer transition-all border flex gap-3 ${
                      selectedUhid === patient.uhid 
                        ? 'bg-primary/5 border-primary text-primary' 
                        : 'bg-white border-slate-200 hover:border-primary/50 text-slate-700'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold truncate">{patient.uhid}</div>
                      <div className="text-sm opacity-80 truncate">{patient.patientName || 'Unknown'}</div>
                    </div>
                  </div>
                ))}
                {filteredPatients.length === 0 && (
                  <div className="text-center text-slate-500 py-8">
                    No patients found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Timeline */}
        <div className="lg:col-span-3 flex flex-col h-full">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            
            {selectedUhid && selectedPatient ? (
              <>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                      <History className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">
                        Encounter Timeline
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {selectedPatient.patientName} ({selectedPatient.uhid})
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" color="primary" icon={FileText} onClick={() => exportToExcel(visits, 'VisitSummary')}>
                    Export Summary
                  </Button>
                </div>


                <div className="flex-1 overflow-y-auto p-8">
                  {visits.length > 0 ? (
                    <div className="relative border-l-2 border-slate-200 ml-6 space-y-10">
                      {visits.map((visit, idx) => (
                        <div key={idx} className="relative pl-8">
                          <div className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-white border-4 border-primary shadow-sm" />
                          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-sm font-bold">
                                  {visit.type}
                                </span>
                                <span className="text-slate-400 text-sm flex items-center gap-1.5">
                                  <Calendar className="w-4 h-4" /> {visit.date}
                                </span>
                                <span className="text-slate-400 text-sm flex items-center gap-1.5">
                                  <Clock className="w-4 h-4" /> {visit.time}
                                </span>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                visit.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {visit.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <div>
                                <div className="text-slate-500 mb-1 flex items-center gap-1.5"><Activity className="w-4 h-4"/> Department</div>
                                <div className="font-semibold text-slate-800">{visit.department}</div>
                              </div>
                              <div>
                                <div className="text-slate-500 mb-1 flex items-center gap-1.5"><User className="w-4 h-4"/> Doctor</div>
                                <div className="font-semibold text-slate-800">{visit.doctor}</div>
                              </div>
                              <div className="sm:col-span-2">
                                <div className="text-slate-500 mb-1">Visit Notes</div>
                                <div className="text-slate-700">{visit.notes}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                      <History className="w-16 h-16 text-slate-200 mb-4 opacity-50" />
                      <p className="text-xl font-bold text-slate-600">No Visits Found</p>
                      <p className="text-sm mt-1 max-w-sm">This patient has no clinical encounters logged in the system.</p>
                    </div>
                  )}
                </div>

              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                <History className="w-16 h-16 text-slate-200 mb-4" />
                <p className="text-xl font-bold text-slate-600">Select a patient</p>
                <p className="text-sm mt-1 max-w-sm">Search and select a patient from the left panel to view their complete encounter history.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
