import { useState } from 'react';import { Search, Plus, Edit2, Download, User, Phone } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL as string;
type GlobalPatientRecord = any;

import { exportToExcel } from '../../utils/exportToExcel';
import { DateFilter } from '../../components/ui/DateFilter';

const initialFormState: Partial<GlobalPatientRecord> = {
  uhid: '',
  registrationDate: new Date().toISOString().split('T')[0],
  registrationTime: new Date().toTimeString().split(' ')[0],
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

  const [patients, setPatients] = useState<any[]>([]);
  const [options, setOptions] = useState<any>({
    Title: [], Gender: [], YesNo: [], Priority: [], VisitType: [],
    Status: [], PaymentMode: [], Departments: [], Doctors: []
  });

  const fetchOptions = async () => {
    try {
      const res = await fetch(`${API_BASE}/quick-registrations/options`);
      if (res.ok) setOptions(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch(`${API_BASE}/quick-registrations/`);
      if (res.ok) {
        const data = await res.json();
        const mappedData = data.map((d: any) => ({
          id: d.QuickRegistrationId,
          uhid: d.Uhid,
          registrationDate: d.RegistrationDate,
          registrationTime: d.RegistrationTime,
          title: d.Title,
          patientName: d.PatientName,
          gender: d.Gender,
          dateOfBirth: d.DateOfBirth,
          age: d.Age,
          mobileNumber: d.MobileNumber,
          alternateMobile: d.AlternateMobile,
          visitType: d.VisitType,
          department: d.Department,
          doctor: d.Doctor,
          priority: d.Priority,
          visitReason: d.VisitReason,
          consultationRequired: d.ConsultationRequired,
          consultationFee: d.ConsultationFee,
          paymentMode: d.PaymentMode,
          insuranceRequired: d.InsuranceRequired,
          status: d.Status,
          remarks: d.Remarks,
          registrationType: 'Quick'
        }));
        setPatients(mappedData);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchOptions();
    fetchPatients();
  }, []);

  const records = patients;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<GlobalPatientRecord | null>(null);
  const [formData, setFormData] = useState<Partial<GlobalPatientRecord>>(initialFormState);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');;
  const [filterVisitType, setFilterVisitType] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const firstDay = `${today.split('-')[0]}-${today.split('-')[1]}-01`;
  const [dateFrom, setDateFrom] = useState(firstDay);
  const [dateTo, setDateTo] = useState(today);
  const [appliedDateFrom, setAppliedDateFrom] = useState(firstDay);
  const [appliedDateTo, setAppliedDateTo] = useState(today);

  const handleSearch = () => {
    setAppliedSearchTerm(searchTerm);
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
  };

  const handleDateReset = () => {
    setSearchTerm('');
    setAppliedSearchTerm('');
    setDateFrom(firstDay);
    setDateTo(today);
    setAppliedDateFrom(firstDay);
    setAppliedDateTo(today);
    setFilterVisitType('');
    setFilterDepartment('');
    setFilterStatus('');
  };

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

  const formatAgeDisplay = (dob: string) => {
    if (!dob) return '';
    const birthDate = new Date(dob);
    const today = new Date();

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    if (years > 0) {
      return `${years} ${years === 1 ? 'Year' : 'Years'}`;
    } else if (months > 0) {
      return `${months} ${months === 1 ? 'Month' : 'Months'}`;
    } else {
      return `${days} ${days === 1 ? 'Day' : 'Days'}`;
    }
  };


  const handleCreateNew = () => {
    setFormData({
      ...initialFormState,
      uhid: '',
      registrationDate: new Date().toISOString().split('T')[0],
      registrationTime: new Date().toTimeString().split(' ')[0]
    });
    setSelectedRecord(null);
    setIsFormOpen(true);
  };

  const handleEdit = (record: GlobalPatientRecord) => {
    const sanitizedRecord = Object.fromEntries(
      Object.entries(record).map(([k, v]) => [k, v === null ? '' : v])
    );
    setFormData(sanitizedRecord);
    setSelectedRecord(record);
    setIsFormOpen(true);
  };



  const handleSave = async (e: React.FormEvent, action: 'Save' | 'SaveNew' | 'SaveBook' | 'SaveBill' = 'Save') => {
    e.preventDefault();
    const payload = {
      RegistrationDate: formData.registrationDate,
      RegistrationTime: formData.registrationTime,
      Title: formData.title,
      PatientName: formData.patientName,
      Gender: formData.gender,
      DateOfBirth: formData.dateOfBirth || null,
      Age: formData.age || 0,
      MobileNumber: formData.mobileNumber,
      AlternateMobile: formData.alternateMobile || null,
      VisitType: formData.visitType || 'OP',
      Department: formData.department || null,
      Doctor: formData.doctor || null,
      Priority: formData.priority || 'Normal',
      VisitReason: formData.visitReason || null,
      ConsultationRequired: formData.consultationRequired || 'Yes',
      ConsultationFee: formData.consultationFee || 0,
      PaymentMode: formData.paymentMode || 'Cash',
      InsuranceRequired: formData.insuranceRequired || 'No',
      Status: formData.status || 'Active',
      Remarks: formData.remarks || null
    };

    if (!payload.PatientName || payload.PatientName.trim() === '') {
      toast.error('Patient Name is required');
      return;
    }

    if (!payload.MobileNumber || !/^\d{10}$/.test(payload.MobileNumber)) {
      toast.error('Mobile Number must be exactly 10 digits');
      return;
    }

    try {
      let res;
      if (selectedRecord) {
        res = await fetch(`${API_BASE}/quick-registrations/${selectedRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_BASE}/quick-registrations/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        toast.success(selectedRecord ? 'Record updated' : 'Quick Registration saved');
        await fetchPatients();

        if (action === 'SaveNew') {
          setFormData({ ...initialFormState, uhid: '', registrationDate: new Date().toISOString().split('T')[0], registrationTime: new Date().toTimeString().split(' ')[0] });
          setSelectedRecord(null);
        } else if (action === 'SaveBook') {
          navigate('/appointments/dashboard', { state: { pendingQuickBooking: formData } });
        } else {
          setIsFormOpen(false);
          setSelectedRecord(null);
        }
      } else {
        const err = await res.json();
        const errorMessage = Array.isArray(err.detail) ? err.detail.map((e: any) => `${e.loc.join('.')}: ${e.msg}`).join(', ') : (err.detail || 'Failed to save');
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error(error);
      toast.error('Network error');
    }
  };


  const handleReset = () => {
    if (selectedRecord) {
      setFormData(selectedRecord);
    } else {
      setFormData({
        ...initialFormState,
        uhid: '',
        registrationDate: new Date().toISOString().split('T')[0],
        registrationTime: new Date().toTimeString().split(' ')[0]
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
      record.uhid.toLowerCase().includes(appliedSearchTerm.toLowerCase()) ||
      (record.patientName || '').toLowerCase().includes(appliedSearchTerm.toLowerCase()) ||
      (record.mobileNumber || '').includes(appliedSearchTerm);

    const matchesVisitType = !filterVisitType || record.visitType === filterVisitType;
    const matchesDepartment = !filterDepartment || record.department === filterDepartment;
    const matchesStatus = !filterStatus || record.status === filterStatus;

    const recordDate = record.registrationDate ? record.registrationDate.substring(0, 10) : '';
    const matchesDate = (!appliedDateFrom || recordDate >= appliedDateFrom) && (!appliedDateTo || recordDate <= appliedDateTo);

    return matchesSearch && matchesVisitType && matchesDepartment && matchesStatus && matchesDate;
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

              <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block" />

              <DateFilter
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
                onSearch={handleSearch}
                onReset={handleDateReset}
              />


            </div>



            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">UHID</th>
                    <th className="px-4 py-3 font-medium">Patient Name</th>
                    <th className="px-4 py-3 font-medium">Gender/Age</th>
                    <th className="px-4 py-3 font-medium">Mobile Number</th>
                    <th className="px-4 py-3 font-medium">Visit Type</th>
                    <th className="px-4 py-3 font-medium">Reg. Date & Time</th>
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
                        <td className="px-4 py-3 text-slate-600">{record.gender} / {record.dateOfBirth ? formatAgeDisplay(record.dateOfBirth) : `${record.age} Yrs`}</td>
                        <td className="px-4 py-3 text-slate-600">{record.mobileNumber}</td>
                        <td className="px-4 py-3 text-slate-600">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${record.visitType === 'Emergency' ? 'bg-orange-100 text-orange-700' :
                            record.visitType === 'OP' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                            {record.visitType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{record.registrationDate} {record.registrationTime}</td>
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
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <select
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {options.Title.map((o: string) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
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
                    {options.Gender.map((o: string) => <option key={o} value={o}>{o}</option>)}
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
                  {formData.dateOfBirth ? (
                    <input
                      type="text"
                      value={formatAgeDisplay(formData.dateOfBirth)}
                      readOnly
                      className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl focus:outline-none text-slate-500"
                    />
                  ) : (
                    <input
                      type="number"
                      value={formData.age}
                      onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  )}
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
                    onChange={(e) => { const val = e.target.value; if (/^\d{0,10}$/.test(val)) handleInputChange('mobileNumber', val); }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="10-digit mobile number" maxLength={10} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Alternate Mobile</label>
                  <input
                    type="text"
                    value={formData.alternateMobile}
                    onChange={(e) => { const val = e.target.value; if (/^\d{0,10}$/.test(val)) handleInputChange('alternateMobile', val); }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary" maxLength={10} />
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
