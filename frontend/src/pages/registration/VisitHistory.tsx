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
  const [loadingPatients, setLoadingPatients] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUhid, setSelectedUhid] = useState<string>('');
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loadingVisits, setLoadingVisits] = useState<boolean>(false);

  useEffect(() => {
    const fetchPatients = async () => {
      setLoadingPatients(true);
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
            uhid: d.Uhid,
            patientName: d.PatientName || 'Unnamed Patient',
            registrationDate: d.RegistrationDate || '-',
            patientType: d.PatientType || '-',
            department: d.Department || '-',
            primaryDoctor: d.PrimaryDoctor || '-',
            sourceType: 'Patient'
          })));
        }

        if (quickRes.ok) {
          const data = await quickRes.json();
          allPatients = allPatients.concat(data.map((d: any) => ({
            uhid: d.Uhid,
            patientName: d.PatientName || 'Unnamed Patient',
            registrationDate: d.RegistrationDate || '-',
            patientType: d.VisitType || '-',
            department: d.Department || '-',
            primaryDoctor: d.Doctor || '-',
            sourceType: 'Quick'
          })));
        }

        if (emergencyRes.ok) {
          const data = await emergencyRes.json();
          allPatients = allPatients.concat(data.map((d: any) => ({
            uhid: d.Uhid,
            patientName: d.PatientName || 'Unnamed Patient',
            registrationDate: d.RegistrationDate || '-',
            patientType: 'Emergency',
            department: '-',
            primaryDoctor: '-',
            sourceType: 'Emergency'
          })));
        }

        const uniquePatients = new Map();
        allPatients.forEach(p => {
          if (!p.uhid) return;
          if (!uniquePatients.has(p.uhid)) {
            uniquePatients.set(p.uhid, p);
          } else {
            const existing = uniquePatients.get(p.uhid);
            if (p.sourceType === 'Patient') {
              uniquePatients.set(p.uhid, p);
            } else if (p.sourceType === 'Emergency' && existing.sourceType === 'Quick') {
              uniquePatients.set(p.uhid, p);
            }
          }
        });
        
        allPatients = Array.from(uniquePatients.values());

        const getSeq = (uhid: string) => {
          if (!uhid) return 0;
          const match = uhid.match(/\d+$/);
          return match ? parseInt(match[0], 10) : 0;
        };
        allPatients.sort((a, b) => getSeq(b.uhid) - getSeq(a.uhid));

        setPatients(allPatients);
        if (allPatients.length > 0 && !selectedUhid) {
          setSelectedUhid(allPatients[0].uhid);
        }
      } catch (e) {
        console.error('Failed to fetch patients', e);
      } finally {
        setLoadingPatients(false);
      }
    };
    fetchPatients();
  }, []);

  const filteredPatients = patients.filter(p => 
    p.uhid.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.patientName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedPatient = patients.find(p => p.uhid === selectedUhid);

  useEffect(() => {
    if (selectedUhid) {
      const fetchVisits = async () => {
        setLoadingVisits(true);
        try {
          const res = await fetch(`${API_BASE}/appointments/?search=${selectedUhid}`);
          if (res.ok) {
            const data = await res.json();
            const mappedVisits: VisitRecord[] = data.map((v: any) => ({
              id: v.id ? v.id.toString() : String(Math.random()),
              date: v.date || '-',
              time: v.timeSlot || '',
              type: v.type || 'Appointment',
              department: v.department || '-',
              doctor: v.doctor || '-',
              status: v.status || 'Recorded',
              notes: v.notes || '-'
            }));
            // Sort chronologically (latest encounter first)
            mappedVisits.sort((a, b) => new Date(`${b.date} ${b.time}`).getTime() - new Date(`${a.date} ${a.time}`).getTime());
            setVisits(mappedVisits);
          } else {
            setVisits([]);
          }
        } catch (e) {
          console.error('Failed to fetch visits', e);
          setVisits([]);
        } finally {
          setLoadingVisits(false);
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
        <Button 
          variant="outline" 
          color="primary" 
          icon={FileText} 
          disabled={!selectedUhid || visits.length === 0}
          onClick={() => exportToExcel(visits, `VisitSummary_${selectedPatient?.uhid || 'Unknown'}`)}
        >
          Export Summary
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 flex-1 min-h-0">
        
        {/* Left Column - Patient Search */}
        <div className="flex flex-col gap-6 min-h-0">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col h-full min-h-0">
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
              {loadingPatients ? (
                <div className="flex justify-center items-center py-8 text-slate-400">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                  <span className="text-sm">Loading patients...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPatients.map(patient => (
                    <div 
                      key={patient.uhid}
                      onClick={() => setSelectedUhid(patient.uhid)}
                      className={`p-4 rounded-xl cursor-pointer transition-all border flex gap-3 ${
                        selectedUhid === patient.uhid 
                          ? 'bg-primary/5 border-primary text-primary shadow-xs' 
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
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Timeline */}
        <div className="flex flex-col h-full min-h-0">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden min-h-0">
            
            {selectedUhid && selectedPatient ? (
              <>
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">
                        {selectedPatient.patientName}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        UHID: {selectedPatient.uhid}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                  {loadingVisits ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8">
                      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                      <p className="text-sm font-medium">Retrieving clinical encounters...</p>
                    </div>
                  ) : visits.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 text-sm">
                            <th className="px-6 py-4 font-semibold">Date & Time</th>
                            <th className="px-6 py-4 font-semibold">Type</th>
                            <th className="px-6 py-4 font-semibold">Department</th>
                            <th className="px-6 py-4 font-semibold">Doctor</th>
                            <th className="px-6 py-4 font-semibold">Status</th>
                            <th className="px-6 py-4 font-semibold">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {visits.map((visit, idx) => (
                            <tr key={visit.id || idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 text-sm">
                                <div className="font-semibold text-slate-800">{visit.date}</div>
                                <div className="text-slate-500 text-xs mt-0.5">{visit.time}</div>
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-lg font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                  {visit.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-slate-700">{visit.department}</td>
                              <td className="px-6 py-4 text-sm font-medium text-slate-700">{visit.doctor}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${
                                  visit.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  visit.status === 'In-Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {visit.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600 max-w-[200px] truncate" title={visit.notes}>
                                {visit.notes}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
