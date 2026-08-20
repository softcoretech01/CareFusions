import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, Users, User, Download, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL as string;
import { exportToExcel } from '../../utils/exportToExcel';
import { DateFilter } from '../../components/ui/DateFilter';

export const ExistingPatients = () => {
  const [patients, setPatients] = useState<any[]>([]);

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
          id: d.PatientRegistrationId,
          uhid: d.Uhid,
          patientName: d.PatientName,
          gender: d.Gender,
          age: d.Age,
          mobileNumber: d.MobileNumber,
          nationalId: d.NationalId,
          patientCategory: d.PatientCategory,
          registrationDate: d.RegistrationDate,
          status: d.Status
        })));
      }

      if (quickRes.ok) {
        const data = await quickRes.json();
        allPatients = allPatients.concat(data.map((d: any) => ({
          id: d.QuickRegistrationId,
          uhid: d.Uhid,
          patientName: d.PatientName,
          gender: d.Gender,
          age: d.Age,
          mobileNumber: d.MobileNumber,
          nationalId: '',
          patientCategory: '',
          registrationDate: d.RegistrationDate,
          status: d.Status
        })));
      }

      if (emergencyRes.ok) {
        const data = await emergencyRes.json();
        allPatients = allPatients.concat(data.map((d: any) => ({
          id: d.EmergencyRegistrationId,
          uhid: d.Uhid,
          patientName: d.PatientName,
          gender: d.Gender,
          age: d.ApproximateAge,
          mobileNumber: d.EmergencyContactPhone,
          nationalId: '',
          patientCategory: '',
          registrationDate: d.RegistrationDate,
          status: d.Status
        })));
      }

      // Deduplicate by UHID, prioritizing Patient > Emergency > Quick
      const uniquePatients = new Map();
      allPatients.forEach(p => {
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

      // Sort by UHID descending to show latest records first
      allPatients.sort((a, b) => {
        if (a.uhid < b.uhid) return 1;
        if (a.uhid > b.uhid) return -1;
        return 0;
      });

      setPatients(allPatients);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  // Format local date manually to avoid UTC offset issues
  const formatYYYYMMDD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const dToday = new Date();
  const dFirstDay = new Date(dToday.getFullYear(), dToday.getMonth(), 1);

  const todayStr = formatYYYYMMDD(dToday);
  const firstDayStr = formatYYYYMMDD(dFirstDay);

  const [dateFrom, setDateFrom] = useState(firstDayStr);
  const [dateTo, setDateTo] = useState(todayStr);

  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedDateFrom, setAppliedDateFrom] = useState(firstDayStr);
  const [appliedDateTo, setAppliedDateTo] = useState(todayStr);

  const [viewModalRecord, setViewModalRecord] = useState<any | null>(null);

  const filteredRecords = patients.filter(record => {
    const sTerm = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !sTerm ||
      record.uhid.toLowerCase().includes(sTerm) ||
      (record.patientName || '').toLowerCase().includes(sTerm) ||
      (record.mobileNumber || '').includes(sTerm) ||
      (record.nationalId || '').toLowerCase().includes(sTerm);

    // Fallback to today if registrationDate is missing for mock data
    const regDate = record.registrationDate ? record.registrationDate.split('T')[0] : todayStr;
    const matchesDate = (!appliedDateFrom || regDate >= appliedDateFrom) && (!appliedDateTo || regDate <= appliedDateTo);

    return matchesSearch && matchesDate;
  });

  const handleSearch = () => {
    setAppliedSearchTerm(searchTerm);
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
  };

  const handleReset = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setAppliedSearchTerm('');
    setAppliedDateFrom('');
    setAppliedDateTo('');
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Existing Patients</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" icon={Download} onClick={() => exportToExcel(patients, 'ExistingPatients')}>Export List</Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by UHID, Name, Mobile, National ID, Passport..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>

          <div className="ml-auto">
            <DateFilter
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              onSearch={handleSearch}
              onReset={handleReset}
            />
          </div>

        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">UHID</th>
                <th className="px-4 py-3 font-medium">Patient Name</th>
                <th className="px-4 py-3 font-medium">Gender/Age</th>
                <th className="px-4 py-3 font-medium">Mobile Number</th>
                {/* <th className="px-4 py-3 font-medium">Category</th> */}
                <th className="px-4 py-3 font-medium">Reg. Date</th>
                <th className="px-4 py-3 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record, index) => (
                  <tr key={`${record.uhid}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-primary">{record.uhid}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{record.patientName}</td>
                    <td className="px-4 py-3 text-slate-600">{record.gender} / {record.age} Yrs</td>
                    <td className="px-4 py-3 text-slate-600">{record.mobileNumber}</td>
                    {/* <td className="px-4 py-3 text-slate-600">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {record.patientCategory}
                      </span>
                    </td> */}
                    <td className="px-4 py-3 text-slate-600">{record.registrationDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setViewModalRecord(record)}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-400" />
                      <p>No patients found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Details Modal */}
      <AnimatePresence>
        {viewModalRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 text-primary p-3 rounded-2xl">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Patient Details</h3>
                    <p className="text-sm font-medium text-slate-500 mt-1">{viewModalRecord.uhid}</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewModalRecord(null)}
                  className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Patient Name</p>
                    <p className="text-base font-semibold text-slate-800">{viewModalRecord.patientName || '-'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Gender / Age</p>
                    <p className="text-base font-semibold text-slate-800">{viewModalRecord.gender} / {viewModalRecord.age || 0} Yrs</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mobile Number</p>
                    <p className="text-base font-semibold text-slate-800">{viewModalRecord.mobileNumber || '-'}</p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Patient Category</p>
                    <p className="text-base font-semibold text-slate-800">
                      <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                        {viewModalRecord.patientCategory || 'General'}
                      </span>
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Registration Date</p>
                    <p className="text-base font-semibold text-slate-800">{viewModalRecord.registrationDate || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-end">
                <Button variant="outline" onClick={() => setViewModalRecord(null)}>Close Details</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
