import { API_BASE_URL } from '@/utils/apiBase';
import { useState, useEffect } from 'react';
import { Search, AlertCircle, Users } from 'lucide-react';
const API_BASE = API_BASE_URL;
import type { GlobalPatientRecord } from '../../contexts/PatientContext';

interface DuplicateGroup {
  id: string;
  matchType: string;
  records: GlobalPatientRecord[];
}

export const DuplicateCheck = () => {
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch(`${API_BASE}/patients/`);
        if (res.ok) {
          const data = await res.json();
          setPatients(data.map((d: any) => ({
            id: d.PatientId,
            uhid: d.Uhid,
            patientName: d.PatientName,
            firstName: d.PatientName,
            lastName: '',
            mobileNumber: d.MobileNumber,
            registrationDate: d.RegistrationDate,
            status: d.Status || 'Active'
          })));
        }
      } catch (e) {
        console.error('Failed to fetch patients', e);
      }
    };
    fetchPatients();
  }, []);

  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Duplicate detection logic: Grouping by UHID, Mobile Number, or Name
    const groups: Record<string, { matchType: string; records: GlobalPatientRecord[] }> = {};

    patients.forEach(p => {
      const uhidStr = (p.uhid || '').trim();
      const mobileStr = (p.mobileNumber || '').trim();
      const nameStr = (p.patientName || p.firstName || '').trim().toLowerCase();

      // Group by UHID Match
      if (uhidStr.length > 0) {
        const key = `uhid_${uhidStr}`;
        if (!groups[key]) {
          groups[key] = { matchType: 'UHID Match', records: [] };
        }
        if (!groups[key].records.find(r => r.id === p.id)) {
          groups[key].records.push(p);
        }
      }

      // Group by Mobile Number Match
      if (mobileStr.length > 0) {
        const key = `mobile_${mobileStr}`;
        if (!groups[key]) {
          groups[key] = { matchType: 'Mobile Match', records: [] };
        }
        if (!groups[key].records.find(r => r.id === p.id)) {
          groups[key].records.push(p);
        }
      }

      // Group by Name Match
      if (nameStr.length > 0) {
        const key = `name_${nameStr}`;
        if (!groups[key]) {
          groups[key] = { matchType: 'Name Match', records: [] };
        }
        if (!groups[key].records.find(r => r.id === p.id)) {
          groups[key].records.push(p);
        }
      }
    });

    const potentialDuplicates: DuplicateGroup[] = [];
    let groupId = 1;

    // Add groups with > 1 patient
    Object.keys(groups).forEach(k => {
      if (groups[k].records.length > 1) {
        potentialDuplicates.push({
          id: `grp_${groupId++}`,
          matchType: groups[k].matchType,
          records: groups[k].records
        });
      }
    });

    setDuplicateGroups(potentialDuplicates);
  }, [patients]);

  const filteredGroups = duplicateGroups.filter(g =>
    g.matchType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.records.some(r =>
      r.uhid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.mobileNumber?.includes(searchTerm)
    )
  );

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Duplicate Patient Check</h1>
        </div>

      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by UHID, Name or Mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>
          <div className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
            {filteredGroups.length} Potential Duplicate Groups Found
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {filteredGroups.length > 0 ? (
            filteredGroups.map(group => (
              <div key={group.id} className="border border-red-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-red-50/50 p-4 border-b border-red-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">Possible {group.matchType}</h3>
                      <p className="text-xs text-slate-500">{group.records.length} records sharing similar details</p>
                    </div>
                  </div>
                </div>
                <div className="p-0">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-2 font-medium border-b border-slate-100">UHID</th>
                        <th className="px-4 py-2 font-medium border-b border-slate-100">Patient Name</th>
                        <th className="px-4 py-2 font-medium border-b border-slate-100">Mobile</th>
                        <th className="px-4 py-2 font-medium border-b border-slate-100">Reg Date</th>
                        <th className="px-4 py-2 font-medium border-b border-slate-100 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.records.map(record => (
                        <tr key={record.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-primary">{record.uhid}</td>
                          <td className="px-4 py-3 font-medium text-slate-700">{record.patientName || `${record.firstName} ${record.lastName}`}</td>
                          <td className="px-4 py-3 text-slate-600">{record.mobileNumber || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{record.registrationDate}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${record.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                              }`}>
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
              <Users className="w-16 h-16 text-slate-200 mb-4" />
              <p className="text-xl font-bold text-slate-700">No Duplicates Found</p>
              <p className="text-sm mt-1">No matching records detected based on current criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
