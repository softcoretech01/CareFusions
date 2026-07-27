import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Edit2, Eye, Printer, Users, User, Download, FlaskConical, ScanLine } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { usePatients } from '../../contexts/PatientContext';
import { useInvestigations } from '../../contexts/InvestigationContext';
import { ResultViewer } from '../../components/investigations/ResultViewer';
import { exportToExcel } from '../../utils/exportToExcel';
import { DateFilter } from '../../components/ui/DateFilter';

export const ExistingPatients = () => {
  const navigate = useNavigate();
  const { patients } = usePatients();
  const { getOrdersByPatient } = useInvestigations();
  
  const [activeViewer, setActiveViewer] = useState<{ patientId: string; category: 'Lab' | 'Radiology' } | null>(null);
  
  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedDateFrom, setAppliedDateFrom] = useState(today);
  const [appliedDateTo, setAppliedDateTo] = useState(today);

  const handleEditProfile = () => {
    // Navigate to full registration screen with this record's ID
    navigate('/registration/new');
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
    const regDate = record.registrationDate ? record.registrationDate.split('T')[0] : today;
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
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
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
                        <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Print Card">
                          <Printer className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEditProfile()}
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
    </div>
  );
};
