import { useState } from 'react';
import { Search, Edit2, Activity, User, Phone, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { toast } from 'react-hot-toast';
import { useEffect } from 'react';
import { DateFilter } from '../../components/ui/DateFilter';
const API_BASE = import.meta.env.VITE_API_URL as string;
type GlobalPatientRecord = any;


const initialFormState: Partial<GlobalPatientRecord> = {
  uhid: '',
  registrationDate: new Date().toISOString().split('T')[0],
  registrationTime: new Date().toTimeString().split(' ')[0],
  patientName: '',
  gender: '',
  approximateAge: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  status: 'Active',
  registrationType: 'Emergency'
};

export const EmergencyRegistration = () => {

  const [patients, setPatients] = useState<any[]>([]);
  const [options, setOptions] = useState<any>({ Gender: [], Status: [] });

  const fetchOptions = async () => {
    try {
      const res = await fetch(`${API_BASE}/emergency-registrations/options`);
      if (res.ok) setOptions(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPatients = async () => {
    try {
      const res = await fetch(`${API_BASE}/emergency-registrations/`);
      if (res.ok) {
        const data = await res.json();
        const mappedData = data.map((d: any) => ({
          id: d.EmergencyRegistrationId,
          uhid: d.Uhid,
          registrationDate: d.RegistrationDate,
          registrationTime: d.RegistrationTime,
          patientName: d.PatientName,
          gender: d.Gender,
          approximateAge: d.ApproximateAge,
          emergencyContactName: d.EmergencyContactName,
          emergencyContactPhone: d.EmergencyContactPhone,
          status: d.Status,
          registrationType: 'Emergency'
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

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleCreateNew = () => {
    setFormData({
      ...initialFormState,
      uhid: '',
      registrationDate: new Date().toISOString().split('T')[0],
      registrationTime: new Date().toTimeString().split(' ')[0],
      patientName: ''
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



  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      RegistrationDate: formData.registrationDate,
      RegistrationTime: formData.registrationTime,
      PatientName: formData.patientName || '',
      Gender: formData.gender || '',
      ApproximateAge: formData.approximateAge || 0,
      EmergencyContactName: formData.emergencyContactName || null,
      EmergencyContactPhone: formData.emergencyContactPhone || null,
      Status: formData.status || 'Active'
    };

    try {
      let res;
      if (selectedRecord) {
        res = await fetch(`${API_BASE}/emergency-registrations/${selectedRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_BASE}/emergency-registrations/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        toast.success(selectedRecord ? 'Emergency record updated' : 'Emergency record saved');
        await fetchPatients();
        setIsFormOpen(false);
        setSelectedRecord(null);
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


  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.uhid.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          record.patientName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const recordDate = record.registrationDate ? record.registrationDate.substring(0, 10) : '';
    const matchesDate = (!dateFrom || recordDate >= dateFrom) && (!dateTo || recordDate <= dateTo);
    
    return matchesSearch && matchesDate;
  });

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col relative">
      {!isFormOpen ? (
        <>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Emergency Registration</h1>
            </div>
            <Button variant="filled" color="danger" icon={Activity} onClick={handleCreateNew}>
              Emergency Reg
            </Button>
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
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger text-sm"
                />
              </div>

              <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block" />

              <DateFilter
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
                onReset={() => { setDateFrom(''); setDateTo(''); }}
              />
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">UHID</th>
                    <th className="px-4 py-3 font-medium">Patient Name</th>
                    <th className="px-4 py-3 font-medium">Gender/Age</th>
                    <th className="px-4 py-3 font-medium">Arrival Time</th>
                    <th className="px-4 py-3 font-medium">Emergency Contact</th>
                    <th className="px-4 py-3 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-danger">{record.uhid}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{record.patientName}</td>
                        <td className="px-4 py-3 text-slate-600">{record.gender} / ~{record.approximateAge} Yrs</td>
                        <td className="px-4 py-3 text-slate-600">{record.registrationDate} {record.registrationTime}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {record.emergencyContactName ? (
                            <span>{record.emergencyContactName} ({record.emergencyContactPhone})</span>
                          ) : <span className="text-slate-400 italic">None Provided</span>}
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
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <ShieldAlert className="w-8 h-8 text-slate-400" />
                          <p>No emergency records found</p>
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
                {selectedRecord ? 'Edit Emergency Registration' : 'New Emergency Registration'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-danger/10 text-danger px-3 py-1 rounded-full text-sm font-semibold border border-danger/20">
                  {formData.uhid || 'Generating UHID...'}
                </span>
                <span className="text-sm text-slate-500">{formData.registrationDate} {formData.registrationTime}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button variant="filled" color="danger" onClick={handleSave}>
                {selectedRecord ? 'Update Record' : 'Save Emergency Record'}
              </Button>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Emergency Protocol Active</h4>
                <p className="text-sm text-red-700/80 mt-1">Capture minimal details to generate UHID immediately. You can complete the full registration later.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <User className="w-5 h-5 text-danger" />
                <h3 className="text-lg font-bold text-slate-800">Basic Info (Minimal)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Patient Name</label>
                  <input
                    type="text"
                    value={formData.patientName}
                    onChange={(e) => handleInputChange('patientName', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-danger/20 focus:border-danger text-lg font-medium"
                    placeholder="E.g., John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-danger/20 focus:border-danger"
                  >
                    <option value="">Select Gender</option>
                    {options.Gender.filter((o: string) => o !== 'Unknown').map((o: string) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Approximate Age</label>
                  <input
                    type="number"
                    value={formData.approximateAge}
                    onChange={(e) => handleInputChange('approximateAge', e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-danger/20 focus:border-danger"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <Phone className="w-5 h-5 text-danger" />
                <h3 className="text-lg font-bold text-slate-800">Emergency Contact (If Available)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-danger/20 focus:border-danger"
                    placeholder="Name of relative/bystander"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.emergencyContactPhone || ""} maxLength={10} pattern="\d{10}" title="Exactly 10 numeric digits required"
                    onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-danger/20 focus:border-danger"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
