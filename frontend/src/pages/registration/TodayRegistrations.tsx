import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, CalendarDays, Activity, Zap, Eye, Edit2, X, User } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL as string;

export const TodayRegistrations = () => {
  const navigate = useNavigate();

  const [records, setRecords] = useState<any[]>([]);
  const [viewModalRecord, setViewModalRecord] = useState<any | null>(null);
  
  const fetchTodayRegistrations = async () => {
    try {
      const res = await fetch(`${API_BASE}/patients/today`);
      if (res.ok) {
        const data = await res.json();
        const mappedData = data.map((d: any, idx: number) => ({
          id: idx, // or use Uhid
          uhid: d.Uhid,
          patientName: d.PatientName,
          registrationType: d.RegistrationType,
          department: d.Department,
          doctor: d.Doctor,
          registrationTime: d.RegistrationTime,
          status: d.Status,
          gender: d.Gender || 'Unknown',
          age: d.Age || d.ApproximateAge || 0,
          mobileNumber: d.MobileNumber || d.EmergencyContactPhone || ''
        }));

        const uniqueRecords = new Map();
        mappedData.forEach((p: any) => {
          if (!uniqueRecords.has(p.uhid)) {
            uniqueRecords.set(p.uhid, p);
          } else {
            const existing = uniqueRecords.get(p.uhid);
            if (p.registrationType === 'New') {
              uniqueRecords.set(p.uhid, p);
            } else if (p.registrationType === 'Emergency' && existing.registrationType === 'Quick') {
              uniqueRecords.set(p.uhid, p);
            }
          }
        });

        const finalRecords = Array.from(uniqueRecords.values());
        
        // Sort by UHID ascending (1, 2, 3...)
        const getSeq = (uhid: string) => {
          if (!uhid) return 0;
          const match = uhid.match(/\d+$/);
          return match ? parseInt(match[0], 10) : 0;
        };

        finalRecords.sort((a: any, b: any) => getSeq(a.uhid) - getSeq(b.uhid));

        setRecords(finalRecords);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTodayRegistrations();
  }, []);


  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');

  const stats = {
    total: records.length,
    new: records.filter(r => r.registrationType === 'New').length,
    quick: records.filter(r => r.registrationType === 'Quick').length,
    emergency: records.filter(r => r.registrationType === 'Emergency').length,
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.uhid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.patientName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !filterType || record.registrationType === filterType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col relative">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Today's Registrations</h1>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Registrations</p>
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">New</p>
            <p className="text-2xl font-bold text-slate-800">{stats.new}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Quick</p>
            <p className="text-2xl font-bold text-slate-800">{stats.quick}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-danger/10 text-danger flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Emergency</p>
            <p className="text-2xl font-bold text-slate-800">{stats.emergency}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by UHID, Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
          >
            <option value="">All Registration Types</option>
            <option value="New">New</option>
            <option value="Quick">Quick</option>
            <option value="Emergency">Emergency</option>
          </select>
        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">UHID</th>
                <th className="px-4 py-3 font-medium">Patient Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Gender/Age</th>
                <th className="px-4 py-3 font-medium">Mobile Number</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-primary">{record.uhid}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{record.patientName}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        record.registrationType === 'Emergency' ? 'bg-red-100 text-red-700' :
                        record.registrationType === 'Quick' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {record.registrationType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {record.gender} / {record.age} Yrs
                    </td>
                    <td className="px-4 py-3 text-slate-600">{record.mobileNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{record.registrationTime}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        record.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 
                        record.status === 'Checked-In' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => setViewModalRecord(record)}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" 
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => navigate('/registration/new', { state: { uhid: record.uhid } })}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CalendarDays className="w-8 h-8 text-slate-400" />
                      <p>No registrations found for today</p>
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
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Registration Type</p>
                    <p className="text-base font-semibold text-slate-800">
                      <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">
                        {viewModalRecord.registrationType || '-'}
                      </span>
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Department</p>
                    <p className="text-base font-semibold text-slate-800">{viewModalRecord.department || '-'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Doctor</p>
                    <p className="text-base font-semibold text-slate-800">{viewModalRecord.doctor || '-'}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                    <p className="text-base font-semibold text-slate-800">
                      <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-bold ${
                        viewModalRecord.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                        viewModalRecord.status === 'Checked-In' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        viewModalRecord.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        'bg-slate-50 text-slate-600 border border-slate-100'
                      }`}>
                        {viewModalRecord.status || 'Unknown'}
                      </span>
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Registration Time</p>
                    <p className="text-base font-semibold text-slate-800">{viewModalRecord.registrationTime || '-'}</p>
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
