import { useState } from 'react';
import { Search, CheckCircle, XCircle, Shield, Plus, X } from 'lucide-react';
import { usePatients } from '../../contexts/PatientContext';

const initialDatabase = [
  {
    name: 'Rahul Sharma',
    uhid: 'UHID-2023-0045',
    gender: 'M',
    age: 45,
    policyNumber: 'POL-982374-SH',
    insurer: 'Star Health',
    plan: 'Family Health Optima',
    status: 'Active',
    validUntil: '2025-12-31',
    sumInsured: 500000,
    balance: 420000,
    networkHospital: true,
    copayPercentage: 10,
    deductible: 5000
  },
  {
    name: 'Priya Patel',
    uhid: 'UHID-2023-0112',
    gender: 'F',
    age: 32,
    policyNumber: 'POL-112344-HD',
    insurer: 'HDFC ERGO',
    plan: 'Optima Restore',
    status: 'Active',
    validUntil: '2024-06-30',
    sumInsured: 1000000,
    balance: 850000,
    networkHospital: true,
    copayPercentage: 5,
    deductible: 0
  },
  {
    name: 'Amit Kumar',
    uhid: 'UHID-2022-0994',
    gender: 'M',
    age: 58,
    policyNumber: 'POL-445566-IC',
    insurer: 'ICICI Lombard',
    plan: 'Health AdvantEdge',
    status: 'Expired',
    validUntil: '2023-01-15',
    sumInsured: 300000,
    balance: 0,
    networkHospital: false,
    copayPercentage: 20,
    deductible: 10000
  },
  {
    name: 'Sneha Gupta',
    uhid: 'UHID-2023-0881',
    gender: 'F',
    age: 28,
    policyNumber: 'POL-998877-CH',
    insurer: 'Care Health',
    plan: 'Care Supreme',
    status: 'Active',
    validUntil: '2026-03-31',
    sumInsured: 700000,
    balance: 690000,
    networkHospital: true,
    copayPercentage: 10,
    deductible: 2000
  }
];

export const EligibilityVerification = () => {
  const [database, setDatabase] = useState(initialDatabase);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [patient, setPatient] = useState<any>(null);
  const { patients, updatePatient } = usePatients();
  
  const handleClearFilters = () => {
    setSearch('');
    setFromDate('');
    setToDate('');
    setPatient(null);
    setNotFound(false);
  };
  const [notFound, setNotFound] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDetails, setNewDetails] = useState({
    uhid: '',
    name: '',
    insurer: '',
    policyNumber: '',
    validUntil: '',
    sumInsured: ''
  });

  const filteredDatabase = database.filter(p => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return p.name.toLowerCase().includes(s) || 
           p.uhid.toLowerCase().includes(s) || 
           p.policyNumber.toLowerCase().includes(s);
  });

  const handleSearch = (query?: string) => {
    const searchString = typeof query === 'string' ? query : search;
    const searchTerm = searchString.toLowerCase();
    
    if (searchTerm.trim()) {
      const exactMatch = database.find(p => 
        p.uhid.toLowerCase() === searchTerm ||
        p.policyNumber.toLowerCase() === searchTerm
      );

      if (exactMatch) {
        setPatient(exactMatch);
        setNotFound(false);
      } else {
        setPatient(null);
        // If they click search but there's no exact match, just let the table filtering handle it
        setNotFound(filteredDatabase.length === 0);
      }
    } else {
      setPatient(null);
      setNotFound(false);
    }
  };

  const handleUHIDChange = (uhid: string) => {
    setNewDetails({ ...newDetails, uhid });
    // Try to auto-fetch the patient name if they exist in our database
    const existingPatient = database.find(p => p.uhid.toLowerCase() === uhid.toLowerCase());
    if (existingPatient) {
      setNewDetails(prev => ({ ...prev, name: existingPatient.name }));
    } else {
      const globalPatient = patients.find(p => p.uhid.toLowerCase() === uhid.toLowerCase());
      if (globalPatient) {
        setNewDetails(prev => ({ ...prev, name: globalPatient.patientName || '' }));
      } else if (uhid.trim() === '') {
        setNewDetails(prev => ({ ...prev, name: '' }));
      }
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry = {
      name: newDetails.name || 'Unknown Patient',
      gender: 'Unknown',
      age: 0,
      uhid: newDetails.uhid,
      policyNumber: newDetails.policyNumber,
      insurer: newDetails.insurer,
      plan: 'Standard Plan',
      status: 'Active',
      validUntil: newDetails.validUntil,
      sumInsured: Number(newDetails.sumInsured) || 500000,
      balance: Number(newDetails.sumInsured) || 500000,
      networkHospital: true,
      copayPercentage: 10,
      deductible: 2000
    };

    // Update global patient profile with insurance details
    const existingGlobalPatient = patients.find(p => p.uhid.toLowerCase() === newDetails.uhid.toLowerCase());
    if (existingGlobalPatient) {
      updatePatient(existingGlobalPatient.id, { 
        insurer: newDetails.insurer,
        policyNumber: newDetails.policyNumber 
      });
    }

    setDatabase([newEntry, ...database]);
    setShowAddModal(false);
    setSearch(newDetails.uhid);
    setPatient(newEntry);
    setNotFound(false);
    setNewDetails({ uhid: '', name: '', insurer: '', policyNumber: '', validUntil: '', sumInsured: '' });
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Eligibility & Verification</h1>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-600 font-medium"
                />
                <span className="text-slate-400 text-sm font-medium">to</span>
                <input 
                  type="date" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-600 font-medium"
                />
              </div>
              <div className="h-6 w-px bg-slate-200"></div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleSearch()}
                  className="px-5 py-1.5 bg-primary text-white rounded-xl text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors"
                >
                  Search
                </button>
                <button 
                  onClick={handleClearFilters}
                  className="px-5 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm h-[52px]"
            >
              <Plus className="w-5 h-5" />
              Add Insurance
            </button>
          </div>
        </div>
      </div>



      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
        <div className="relative w-96 shrink-0">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by UHID, Patient Name, or Policy Number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium text-sm"
          />
        </div>
      </div>

      {notFound && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
          <XCircle className="w-6 h-6 text-rose-500 shrink-0" />
          <div>
            <h4 className="font-bold text-rose-800">No Patient Found</h4>
            <p className="text-sm text-rose-700">We couldn't find any patient matching "{search}". Please try another UHID, Name, or Policy Number.</p>
          </div>
        </div>
      )}

      {patient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden relative">
            <button 
              onClick={() => {
                setPatient(null);
                setSearch('');
              }}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center pr-16">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{patient.insurer}</h2>
                  <p className="text-sm font-medium text-slate-500">{patient.plan}</p>
                </div>
              </div>
              <span className={`px-3 py-1 text-sm font-bold rounded-lg flex items-center gap-1 ${
                patient.status === 'Active' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-rose-100 text-rose-700'
              }`}>
                {patient.status === 'Active' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {patient.status} Policy
              </span>
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Patient Name</p>
                <p className="font-bold text-slate-800">{patient.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{patient.uhid}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Gender / Age</p>
                <p className="font-bold text-slate-800">{patient.gender || 'U'} / {patient.age || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Policy Number</p>
                <p className="font-bold text-slate-800">{patient.policyNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Valid Until</p>
                <p className="font-bold text-slate-800">{patient.validUntil}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Sum Insured</p>
                <p className="font-bold text-slate-800">₹{patient.sumInsured.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Available Balance</p>
                <p className="font-bold text-primary text-lg">₹{patient.balance.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Network Status</p>
                <p className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Network Hospital
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reference Data Table (Always Shown) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-6">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="font-bold text-lg text-slate-800">Recent Verifications (Reference Data)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 text-left">Patient Name</th>
                  <th className="px-6 py-4 text-left">Gender/Age</th>
                  <th className="px-6 py-4 text-left">Insurer</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDatabase.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{row.name}</div>
                      <div className="text-xs text-slate-500">{row.uhid}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{row.gender || 'U'} / {row.age || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">{row.insurer}</td>
                    <td className="px-6 py-4">
                      {row.status === 'Active' ? (
                        <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg flex items-center gap-1 w-max">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-lg flex items-center gap-1 w-max">
                          <XCircle className="w-3 h-3" /> Expired
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => {
                          setSearch(row.policyNumber);
                          setNotFound(false);
                          handleSearch(row.policyNumber);
                        }}
                        className="text-primary text-sm font-bold hover:underline"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      {/* Add Details Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">Add Patient Insurance Details</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Patient UHID</label>
                  <input 
                    required
                    type="text" 
                    value={newDetails.uhid}
                    onChange={(e) => handleUHIDChange(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="e.g. UHID-2023-..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Patient Name</label>
                  <input 
                    required
                    type="text" 
                    value={newDetails.name}
                    onChange={(e) => setNewDetails({...newDetails, name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-slate-800 font-medium"
                    placeholder="Enter or auto-fetch name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Insurance Provider</label>
                  <select 
                    required
                    value={newDetails.insurer}
                    onChange={(e) => setNewDetails({...newDetails, insurer: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select Insurer...</option>
                    <option value="Star Health">Star Health</option>
                    <option value="HDFC ERGO">HDFC ERGO</option>
                    <option value="Care Health">Care Health</option>
                    <option value="ICICI Lombard">ICICI Lombard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Policy Number</label>
                  <input 
                    required
                    type="text" 
                    value={newDetails.policyNumber}
                    onChange={(e) => setNewDetails({...newDetails, policyNumber: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="e.g. POL-123456"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Expiry Date</label>
                  <input 
                    required
                    type="date" 
                    value={newDetails.validUntil}
                    onChange={(e) => setNewDetails({...newDetails, validUntil: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Sum Insured (₹)</label>
                  <input 
                    required
                    type="number" 
                    min="0"
                    value={newDetails.sumInsured}
                    onChange={(e) => setNewDetails({...newDetails, sumInsured: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="500000"
                  />
                </div>
              </div>
              <div className="pt-6 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Save Insurance Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
