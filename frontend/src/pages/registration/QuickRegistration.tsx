import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Filter, Edit2, Download, User, Phone, Activity, CreditCard, Info } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { usePatients } from '../../contexts/PatientContext';
import type { GlobalPatientRecord } from '../../contexts/PatientContext';
import { exportToExcel } from '../../utils/exportToExcel';

const initialFormState: Partial<GlobalPatientRecord> = {
  uhid: '',
  registrationDate: new Date().toISOString().split('T')[0],
  registrationTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  title: 'Mr.',
  patientName: '',
  gender: 'Male',
  dateOfBirth: '',
  age: 0,
  
  mobileNumber: '',
  alternateMobile: '',
  
  visitType: 'OP',
  department: '',
  doctor: '',
  priority: 'Normal',
  visitReason: '',
  
  consultationRequired: 'Yes',
  consultationFee: 500,
  paymentMode: 'Cash',
  insuranceRequired: 'No',
  
  status: 'Active',
  remarks: '',
  registrationType: 'Quick'
};

export const QuickRegistration = () => {
  const navigate = useNavigate();
  const { patients, addPatient, updatePatient } = usePatients();
  
  // Only show quick registrations
  const records = patients.filter(p => p.registrationType === 'Quick');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<GlobalPatientRecord | null>(null);
  const [formData, setFormData] = useState<Partial<GlobalPatientRecord>>(initialFormState);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterVisitType, setFilterVisitType] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const generateUHID = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `UHID-${year}-${random}`;
  };

  const handleCreateNew = () => {
    setFormData({ 
      ...initialFormState, 
      uhid: generateUHID(),
      registrationDate: new Date().toISOString().split('T')[0],
      registrationTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    setSelectedRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (record: GlobalPatientRecord) => {
    setFormData(record);
    setSelectedRecord(record);
    setIsFormOpen(true);
  };


  const handleSave = (e: React.FormEvent, action: 'Save' | 'SaveNew' | 'SaveBook' | 'SaveBill' = 'Save') => {
    e.preventDefault();
    if (selectedRecord) {
      updatePatient(selectedRecord.id, formData);
    } else {
      const newId = Math.max(...patients.map(r => r.id), 0) + 1;
      addPatient({ id: newId, ...formData } as GlobalPatientRecord);
    }

    if (action === 'SaveNew') {
      setFormData({ 
        ...initialFormState, 
        uhid: generateUHID(),
        registrationDate: new Date().toISOString().split('T')[0],
        registrationTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      setSelectedRecord(null);
    } else if (action === 'SaveBook') {
      navigate('/appointments/dashboard', { state: { pendingQuickBooking: formData } });
    } else {
      setIsFormOpen(false);
    }
  };

  const handleReset = () => {
    if (selectedRecord) {
      setFormData(selectedRecord);
    } else {
      setFormData({ 
        ...initialFormState, 
        uhid: generateUHID(),
        registrationDate: new Date().toISOString().split('T')[0],
        registrationTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      if (field === 'dateOfBirth') {
        newData.age = calculateAge(value);
      }
      return newData;
    });
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.uhid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.patientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.mobileNumber || '').includes(searchTerm);
    
    const matchesVisitType = !filterVisitType || record.visitType === filterVisitType;
    const matchesDepartment = !filterDepartment || record.department === filterDepartment;
    const matchesStatus = !filterStatus || record.status === filterStatus;

    return matchesSearch && matchesVisitType && matchesDepartment && matchesStatus;
  });

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col relative">
      {!isFormOpen ? (
        <>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Quick Registration</h1>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" icon={Download} onClick={() => exportToExcel(patients, 'QuickRegistration')}>Export</Button>
              <Button variant="filled" color="primary" icon={Plus} onClick={handleCreateNew}>
                Quick Reg
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by UHID, Name, Mobile..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                />
              </div>
              <Button
                variant={showFilters ? "filled" : "outline"}
                color="secondary"
                icon={Filter}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select
                      value={filterVisitType}
                      onChange={(e) => setFilterVisitType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Visit Types</option>
                      <option value="OP">OP</option>
                      <option value="Walk-In">Walk-In</option>
                      <option value="Emergency">Emergency</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Department..."
                      value={filterDepartment}
                      onChange={(e) => setFilterDepartment(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
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
                    <th className="px-4 py-3 font-medium">Visit Type</th>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium">Reg. Date & Time</th>
                    <th className="px-4 py-3 font-medium text-center">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-primary">{record.uhid}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {record.title} {record.patientName}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{record.gender} / {record.age} Yrs</td>
                        <td className="px-4 py-3 text-slate-600">{record.mobileNumber}</td>
                        <td className="px-4 py-3 text-slate-600">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            record.visitType === 'Emergency' ? 'bg-orange-100 text-orange-700' :
                            record.visitType === 'OP' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {record.visitType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{record.department}</td>
                        <td className="px-4 py-3 text-slate-600">{record.registrationDate} {record.registrationTime}</td>
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
                              onClick={() => handleEdit(record)}
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
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <User className="w-8 h-8 text-slate-400" />
                          <p>No patients found</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col bg-slate-50 rounded-3xl z-10 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-white border-b border-slate-200 shrink-0 shadow-sm z-20">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {selectedRecord ? 'Edit Quick Registration' : 'New Quick Registration'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold border border-primary/20">
                  {formData.uhid || 'Generating UHID...'}
                </span>
                <span className="text-sm text-slate-500">{formData.registrationDate} {formData.registrationTime}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button variant="outline" onClick={handleReset}>Reset</Button>
              {!selectedRecord && (
                <>
                </>
              )}
              <Button variant="filled" color="primary" onClick={(e) => handleSave(e, 'Save')}>
                {selectedRecord ? 'Update Record' : 'Save'}
              </Button>
            </div>
          </div>

          {/* Form Content - Scrolling */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            
            {/* Section 1 - Basic Information */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <User className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-800">Basic Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <select
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="Mr.">Mr.</option>
                    <option value="Mrs.">Mrs.</option>
                    <option value="Miss">Miss</option>
                    <option value="Dr.">Dr.</option>
                    <option value="Mast.">Mast.</option>
                    <option value="Baby">Baby</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Patient Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.patientName}
                    onChange={(e) => handleInputChange('patientName', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Full Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gender <span className="text-red-500">*</span></label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Age <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Section 2 - Contact Information */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <Phone className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-800">Contact Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.mobileNumber}
                    onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="10-digit mobile number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Alternate Mobile</label>
                  <input
                    type="text"
                    value={formData.alternateMobile}
                    onChange={(e) => handleInputChange('alternateMobile', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Section 3 - Visit Information */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <Activity className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-800">Visit Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Visit Type <span className="text-red-500">*</span></label>
                  <select
                    value={formData.visitType}
                    onChange={(e) => handleInputChange('visitType', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="OP">OP (Outpatient)</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Walk-In">Walk-In</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department <span className="text-red-500">*</span></label>
                  <select
                    value={formData.department || ''}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select Department</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Neurology">Neurology</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="Pediatrics">Pediatrics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Doctor <span className="text-red-500">*</span></label>
                  <select
                    value={formData.doctor || ''}
                    onChange={(e) => handleInputChange('doctor', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="">Select Doctor</option>
                    <option value="Dr. Sarah Jenkins">Dr. Sarah Jenkins</option>
                    <option value="Dr. Michael Chen">Dr. Michael Chen</option>
                    <option value="Dr. Emily Patel">Dr. Emily Patel</option>
                    <option value="Dr. James Wilson">Dr. James Wilson</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority <span className="text-red-500">*</span></label>
                  <select
                    value={formData.priority}
                    onChange={(e) => handleInputChange('priority', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Visit Reason / Chief Complaint</label>
                  <input
                    type="text"
                    value={formData.visitReason}
                    onChange={(e) => handleInputChange('visitReason', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Section 4 - Billing Information */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <CreditCard className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-800">Billing Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Consultation Required <span className="text-red-500">*</span></label>
                  <select
                    value={formData.consultationRequired}
                    onChange={(e) => handleInputChange('consultationRequired', e.target.value as 'Yes' | 'No')}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                {formData.consultationRequired === 'Yes' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Consultation Fee</label>
                      <input
                        type="number"
                        value={formData.consultationFee}
                        onChange={(e) => handleInputChange('consultationFee', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                      <select
                        value={formData.paymentMode}
                        onChange={(e) => handleInputChange('paymentMode', e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="Insurance">Insurance</option>
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Insurance Required <span className="text-red-500">*</span></label>
                  <select
                    value={formData.insuranceRequired}
                    onChange={(e) => handleInputChange('insuranceRequired', e.target.value as 'Yes' | 'No')}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 5 - System Information */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <Info className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-800">System Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status <span className="text-red-500">*</span></label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value as 'Active' | 'Inactive')}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => handleInputChange('remarks', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Padding */}
            <div className="h-10"></div>
          </div>
        </div>
      )}
    </div>
  );
};
