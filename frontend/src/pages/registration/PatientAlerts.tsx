import { API_BASE_URL } from '@/utils/apiBase';
import { useState } from 'react';
import { Search, BellRing, AlertTriangle, ShieldAlert, HeartPulse } from 'lucide-react';
import { useEffect } from 'react';

const API_BASE = API_BASE_URL;

export const PatientAlerts = () => {

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
            allergies: d.Allergies || 'none',
            chronicDiseases: d.ChronicDiseases || 'none',
            patientCategory: d.PatientType || 'General'
          })));
        }
      } catch (e) {
        console.error('Failed to fetch patients', e);
      }
    };
    fetchPatients();
  }, []);

  
  // Find patients that have some sort of alert criteria
  const alertPatients = patients.filter(p => 
    (p.allergies && p.allergies.toLowerCase() !== 'none' && p.allergies !== '') ||
    (p.chronicDiseases && p.chronicDiseases.toLowerCase() !== 'none' && p.chronicDiseases !== '') ||
    (p.patientCategory && p.patientCategory.toLowerCase() === 'vip') ||
    (p.patientCategory && p.patientCategory.toLowerCase() === 'high risk')
  );
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');

  const filteredRecords = alertPatients.filter(record => {
    const matchesSearch = 
      record.uhid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.patientName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesType = true;
    if (filterType === 'Allergy') matchesType = !!(record.allergies && record.allergies.toLowerCase() !== 'none' && record.allergies !== '');
    if (filterType === 'Chronic') matchesType = !!(record.chronicDiseases && record.chronicDiseases.toLowerCase() !== 'none' && record.chronicDiseases !== '');
    if (filterType === 'VIP') matchesType = (record.patientCategory?.toLowerCase() === 'vip');

    return matchesSearch && matchesType;
  });

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Patient Alerts</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-red-600/80 font-medium">Allergy Alerts</p>
            <p className="text-2xl font-bold text-red-700">
              {alertPatients.filter(p => p.allergies && p.allergies.toLowerCase() !== 'none' && p.allergies !== '').length}
            </p>
          </div>
        </div>
        <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-orange-600/80 font-medium">Chronic Diseases</p>
            <p className="text-2xl font-bold text-orange-700">
              {alertPatients.filter(p => p.chronicDiseases && p.chronicDiseases.toLowerCase() !== 'none' && p.chronicDiseases !== '').length}
            </p>
          </div>
        </div>
        <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-purple-600/80 font-medium">VIP / Special Cases</p>
            <p className="text-2xl font-bold text-purple-700">
              {alertPatients.filter(p => p.patientCategory?.toLowerCase() === 'vip').length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by UHID or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
          >
            <option value="">All Alert Types</option>
            <option value="Allergy">Allergies</option>
            <option value="Chronic">Chronic Diseases</option>
            <option value="VIP">VIP Patients</option>
          </select>
        </div>

        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-medium">UHID / Name</th>
                <th className="px-4 py-3 font-medium">Alert Types</th>
                <th className="px-4 py-3 font-medium">Allergies</th>
                <th className="px-4 py-3 font-medium">Chronic Conditions</th>
                <th className="px-4 py-3 font-medium">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => {
                  const hasAllergy = record.allergies && record.allergies.toLowerCase() !== 'none' && record.allergies !== '';
                  const hasChronic = record.chronicDiseases && record.chronicDiseases.toLowerCase() !== 'none' && record.chronicDiseases !== '';
                  const isVip = record.patientCategory?.toLowerCase() === 'vip';

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-primary">{record.uhid}</div>
                        <div className="text-slate-600 text-xs mt-0.5">{record.patientName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {hasAllergy && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">Allergy</span>}
                          {hasChronic && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-medium">Chronic</span>}
                          {isVip && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-medium">VIP</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-red-600">{hasAllergy ? record.allergies : '-'}</td>
                      <td className="px-4 py-3 text-orange-600">{hasChronic ? record.chronicDiseases : '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{record.patientCategory || 'General'}</td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <BellRing className="w-10 h-10 text-slate-300" />
                      <p className="text-lg font-medium text-slate-600">No active alerts found</p>
                      <p className="text-sm">Patients flagged with allergies or chronic diseases will appear here.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
