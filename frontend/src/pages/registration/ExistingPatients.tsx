import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Edit2, Eye, Printer, Users, User, Download, FlaskConical, ScanLine, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL as string;
import { useInvestigations } from '../../contexts/InvestigationContext';
import { ResultViewer } from '../../components/investigations/ResultViewer';
import { exportToExcel } from '../../utils/exportToExcel';
import { DateFilter } from '../../components/ui/DateFilter';

export const ExistingPatients = () => {
  const navigate = useNavigate();

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

      // Sort by Registration Date descending
      allPatients.sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());

      setPatients(allPatients);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const { getOrdersByPatient } = useInvestigations();
  
  const [activeViewer, setActiveViewer] = useState<{ patientId: string; category: 'Lab' | 'Radiology' } | null>(null);
  
  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
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

  const handleEditProfile = (record: any) => {
    // Navigate to full registration screen with this record's UHID
    navigate('/registration/new', { state: { uhid: record.uhid } });
  };

  const handlePrint = (record: any) => {
    const printContent = `
      <html>
        <head>
          <title>Patient Registration Card - ${record.uhid}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; }
            .card { border: 2px solid #e2e8f0; padding: 30px; border-radius: 16px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
            .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px; }
            .header h2 { margin: 0; color: #0f172a; font-size: 24px; font-weight: 700; }
            .header h3 { margin: 8px 0 0; color: #64748b; font-size: 16px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .field { margin-bottom: 15px; }
            .label { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-bottom: 4px; }
            .value { color: #0f172a; font-size: 16px; font-weight: 500; }
            .barcode { margin-top: 30px; text-align: center; padding-top: 20px; border-top: 2px dashed #f1f5f9; }
            .barcode-placeholder { width: 80%; height: 60px; background: repeating-linear-gradient(90deg, #0f172a, #0f172a 2px, transparent 2px, transparent 4px, #0f172a 4px, #0f172a 8px, transparent 8px, transparent 10px); margin: 0 auto; }
            @media print {
              body { padding: 0; }
              .card { border: none; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h2>CareFusions Hospital</h2>
              <h3>Patient Registration Card</h3>
            </div>
            <div class="details">
              <div class="field">
                <div class="label">Patient Name</div>
                <div class="value">${record.patientName || ''}</div>
              </div>
              <div class="field">
                <div class="label">UHID</div>
                <div class="value">${record.uhid}</div>
              </div>
              <div class="field">
                <div class="label">Gender / Age</div>
                <div class="value">${record.gender} / ${record.age || 0} Yrs</div>
              </div>
              <div class="field">
                <div class="label">Mobile Number</div>
                <div class="value">${record.mobileNumber}</div>
              </div>
              <div class="field">
                <div class="label">Registration Date</div>
                <div class="value">${record.registrationDate}</div>
              </div>
              <div class="field">
                <div class="label">Patient Category</div>
                <div class="value">${record.patientCategory || 'General'}</div>
              </div>
            </div>
            <div class="barcode">
              <div class="barcode-placeholder"></div>
              <p style="margin-top: 10px; font-family: monospace; letter-spacing: 2px;">${record.uhid}</p>
            </div>
          </div>
          <script>
            window.onload = () => window.print();
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  const filteredRecords = patients.filter(record => {
    const matchesSearch = 
      record.uhid.toLowerCase().includes(appliedSearchTerm.toLowerCase()) ||
      (record.patientName || '').toLowerCase().includes(appliedSearchTerm.toLowerCase()) ||
      (record.mobileNumber || '').includes(appliedSearchTerm) ||
      (record.nationalId || '').toLowerCase().includes(appliedSearchTerm.toLowerCase());
    
    const matchesCategory = !filterCategory || record.patientCategory === filterCategory;
    const matchesStatus = !filterStatus || record.status === filterStatus;
    const matchesGender = !filterGender || record.gender === filterGender;
    
    // Fallback to today if registrationDate is missing for mock data
    const regDate = record.registrationDate ? record.registrationDate.split('T')[0] : todayStr;
    const matchesDate = (!appliedDateFrom || regDate >= appliedDateFrom) && (!appliedDateTo || regDate <= appliedDateTo);

    return matchesSearch && matchesCategory && matchesStatus && matchesGender && matchesDate;
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
          <Button variant="filled" color="primary" icon={User} onClick={() => navigate('/registration/new')}>
            Register New
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by UHID, Name, Mobile, National ID, Passport..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
              />
            </div>
            
            <div className="h-8 w-px bg-slate-200 mx-1" />

            <DateFilter
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              onSearch={handleSearch}
              onReset={handleReset}
            />
          </div>

          <Button
            variant={showFilters ? "filled" : "outline"}
            color="secondary"
            icon={Filter}
            onClick={() => setShowFilters(!showFilters)}
          >
            Advanced Filters
          </Button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-slate-200 bg-slate-50/50 p-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">All Categories</option>
                  <option value="General">General</option>
                  <option value="Corporate">Corporate</option>
                  <option value="Insurance">Insurance</option>
                </select>
                <select
                  value={filterGender}
                  onChange={(e) => setFilterGender(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <input
                  type="date"
                  placeholder="Date of Birth"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">UHID</th>
                <th className="px-4 py-3 font-medium">Patient Name</th>
                <th className="px-4 py-3 font-medium">Gender/Age</th>
                <th className="px-4 py-3 font-medium">Mobile Number</th>
                <th className="px-4 py-3 font-medium">National ID</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Reg. Date</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
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
                    <td className="px-4 py-3 text-slate-600">{record.nationalId}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {record.patientCategory}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{record.registrationDate}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        record.status === 'Active' 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => setViewModalRecord(record)}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" 
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handlePrint(record)}
                          className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" 
                          title="Print Card"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEditProfile(record)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Profile"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>
                        
                        {(() => {
                          const patientOrders = getOrdersByPatient(record.uhid);
                          const hasLab = patientOrders.some(o => o.category === 'Lab' && (o.status === 'Completed' || o.status === 'Partial' || o.status === 'Verified'));
                          const hasScan = patientOrders.some(o => o.category === 'Radiology' && (o.status === 'Completed' || o.status === 'Partial' || o.status === 'Verified'));
                          
                          return (
                            <>
                              <button 
                                onClick={() => hasLab && setActiveViewer({ patientId: record.uhid, category: 'Lab' })}
                                className={`p-1.5 rounded-lg transition-colors ${hasLab ? 'text-teal-600 bg-teal-50 hover:bg-teal-100' : 'text-slate-300 cursor-not-allowed'}`}
                                title={hasLab ? "View Lab Results" : "No Lab Results"}
                              >
                                <FlaskConical className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => hasScan && setActiveViewer({ patientId: record.uhid, category: 'Radiology' })}
                                className={`p-1.5 rounded-lg transition-colors ${hasScan ? 'text-purple-600 bg-purple-50 hover:bg-purple-100' : 'text-slate-300 cursor-not-allowed'}`}
                                title={hasScan ? "View Scan Reports" : "No Scan Reports"}
                              >
                                <ScanLine className="w-4 h-4" />
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
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

      {activeViewer && (
        <ResultViewer 
          patientId={activeViewer.patientId} 
          category={activeViewer.category} 
          onClose={() => setActiveViewer(null)} 
        />
      )}

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
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">National ID</p>
                    <p className="text-base font-semibold text-slate-800">{viewModalRecord.nationalId || '-'}</p>
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
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                    <p className="text-base font-semibold text-slate-800">
                      <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-bold ${
                        viewModalRecord.status === 'Active' 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                          : 'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {viewModalRecord.status || 'Unknown'}
                      </span>
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm md:col-span-2">
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
