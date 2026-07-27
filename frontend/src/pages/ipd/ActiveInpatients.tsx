import { useState } from 'react';
import { useIPD } from '../../contexts/IPDContext';
import { useInvestigations } from '../../contexts/InvestigationContext';
import { ResultViewer } from '../../components/investigations/ResultViewer';
import { Search, FileText, FlaskConical, ScanLine } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DateFilter } from '../../components/ui/DateFilter';

export const ActiveInpatients = () => {
  const { patients, beds, wards } = useIPD();
  const { getOrdersByPatient } = useInvestigations();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const wardIdParam = searchParams.get('ward');
  const selectedWard = wardIdParam ? wards.find(w => w.id === Number(wardIdParam)) : null;
  
  const [activeViewer, setActiveViewer] = useState<{ patientId: string; category: 'Lab' | 'Radiology' } | null>(null);
  
  const [search, setSearch] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [appliedDateFrom, setAppliedDateFrom] = useState(today);
  const [appliedDateTo, setAppliedDateTo] = useState(today);
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string>('All');

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
    setSelectedRoom('All');
  };

  const activePatients = patients.filter(p => p.status === 'Admitted');
  
  const filteredPatients = activePatients.filter(p => {
    const matchesSearch = p.patientName.toLowerCase().includes(appliedSearch.toLowerCase()) || 
                          p.uhid.toLowerCase().includes(appliedSearch.toLowerCase());
    
    let matchesDate = true;
    if (appliedDateFrom && appliedDateTo) {
      const pDate = new Date(p.admissionDate).toISOString().split('T')[0];
      matchesDate = pDate >= appliedDateFrom && pDate <= appliedDateTo;
    }

    const bed = beds.find(b => b.id === p.currentBedId);
    const matchesRoom = selectedRoom === 'All' || bed?.roomNumber === selectedRoom;
    const matchesWard = !wardIdParam || p.currentWardId === Number(wardIdParam);

    return matchesSearch && matchesDate && matchesRoom && matchesWard;
  });

  // Get unique rooms — scoped to the selected ward if one is active
  const wardBeds = wardIdParam
    ? beds.filter(b => b.wardId === Number(wardIdParam))
    : beds;
  const availableRooms = Array.from(new Set(wardBeds.map(b => b.roomNumber))).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            {selectedWard ? selectedWard.name : 'Active Inpatients'}
          </h1>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-10rem)]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50 flex-wrap">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients..."
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

          <select 
            value={selectedRoom} 
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary"
          >
            <option value="All">All Rooms</option>
            {availableRooms.map(r => <option key={r} value={r}>Room no {r}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full">
            <thead className="bg-white text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 shadow-sm z-10 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left">Patient & UHID</th>
                <th className="px-6 py-4 text-left">Ward & Bed</th>
                <th className="px-6 py-4 text-left">Admitting Doctor</th>
                <th className="px-6 py-4 text-left">Admission Date</th>
                <th className="px-6 py-4 text-left">LOS</th>
                <th className="px-6 py-4 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No active inpatients found.
                  </td>
                </tr>
              ) : (
                filteredPatients.map(patient => {
                  const ward = wards.find(w => w.id === patient.currentWardId);
                  const bed = beds.find(b => b.id === patient.currentBedId);
                  
                  const admitDate = new Date(patient.admissionDate);
                  const losDays = Math.max(0, Math.floor((Date.now() - admitDate.getTime()) / (1000 * 60 * 60 * 24)));

                  return (
                    <tr key={patient.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{patient.patientName}</div>
                        <div className="text-xs text-slate-500">{patient.uhid} • {patient.age}y {patient.gender}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-700">{bed?.bedNumber || 'Unassigned'}</div>
                        <div className="text-xs text-slate-500">{ward?.name || 'N/A'} • Room no {bed?.roomNumber || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                        {patient.admittingDoctor}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-700">{admitDate.toLocaleDateString()}</div>
                        <div className="text-xs text-slate-500">{admitDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">
                        {losDays} Days
                      </td>
                      <td className="px-6 py-4 flex items-center gap-2">
                        <button 
                          onClick={() => navigate(`/ipd/visit/${patient.id}`)}
                          className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" /> View EMR
                        </button>
                        
                        {(() => {
                          const patientOrders = getOrdersByPatient(patient.uhid);
                          const hasLab = patientOrders.some(o => o.category === 'Lab' && (o.status === 'Completed' || o.status === 'Partial' || o.status === 'Verified'));
                          const hasScan = patientOrders.some(o => o.category === 'Radiology' && (o.status === 'Completed' || o.status === 'Partial' || o.status === 'Verified'));
                          
                          return (
                            <>
                              <button 
                                onClick={() => hasLab && setActiveViewer({ patientId: patient.uhid, category: 'Lab' })}
                                className={`p-1.5 rounded-lg transition-colors ${hasLab ? 'text-teal-600 bg-teal-50 hover:bg-teal-100' : 'text-slate-300 cursor-not-allowed'}`}
                                title={hasLab ? "View Lab Results" : "No Lab Results"}
                              >
                                <FlaskConical className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => hasScan && setActiveViewer({ patientId: patient.uhid, category: 'Radiology' })}
                                className={`p-1.5 rounded-lg transition-colors ${hasScan ? 'text-purple-600 bg-purple-50 hover:bg-purple-100' : 'text-slate-300 cursor-not-allowed'}`}
                                title={hasScan ? "View Scan Reports" : "No Scan Reports"}
                              >
                                <ScanLine className="w-4 h-4" />
                              </button>
                            </>
                          );
                        })()}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeViewer && (
        <ResultViewer 
          patientId={activeViewer.patientId} 
          category={activeViewer.category} 
          onClose={() => setActiveViewer(null)} 
        />
      )}
    </div>
  );
};
